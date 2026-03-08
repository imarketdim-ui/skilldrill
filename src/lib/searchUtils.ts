/**
 * Keyboard layout auto-correction (EN ↔ RU),
 * basic Russian morphological stemming,
 * synonym expansion, and geo-distance for marketplace search.
 */

const EN_TO_RU: Record<string, string> = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з',
  '[': 'х', ']': 'ъ', a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л',
  l: 'д', ';': 'ж', "'": 'э', z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь',
  ',': 'б', '.': 'ю',
};

const RU_TO_EN: Record<string, string> = {};
Object.entries(EN_TO_RU).forEach(([en, ru]) => {
  RU_TO_EN[ru] = en;
});

/** Convert a string typed in EN layout to RU layout */
export const enToRu = (text: string): string =>
  text.split('').map(ch => {
    const lower = ch.toLowerCase();
    const mapped = EN_TO_RU[lower];
    if (!mapped) return ch;
    return ch === lower ? mapped : mapped.toUpperCase();
  }).join('');

/** Convert a string typed in RU layout to EN layout */
export const ruToEn = (text: string): string =>
  text.split('').map(ch => {
    const lower = ch.toLowerCase();
    const mapped = RU_TO_EN[lower];
    if (!mapped) return ch;
    return ch === lower ? mapped : mapped.toUpperCase();
  }).join('');

/** Check if a string looks like it was typed in the wrong keyboard layout */
const looksLikeEnglish = (text: string): boolean =>
  /^[a-zA-Z\[\];',./\s]+$/.test(text);

const looksLikeRussian = (text: string): boolean =>
  /^[а-яА-ЯёЁ\s]+$/.test(text);

/**
 * Generate search variants with keyboard layout correction.
 * Returns array of search strings to match against.
 */
export const getSearchVariants = (query: string): string[] => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  
  const variants = [trimmed];
  
  if (looksLikeEnglish(trimmed)) {
    variants.push(enToRu(trimmed));
  } else if (looksLikeRussian(trimmed)) {
    variants.push(ruToEn(trimmed));
  }
  
  return variants;
};

/** Basic Russian stemming — strip common suffixes */
export const stemRu = (word: string): string =>
  word.toLowerCase().replace(
    /(ами|ями|ов|ев|ей|ий|ой|ый|ая|яя|ое|ее|ие|ые|ого|его|ому|ему|ых|их|ую|юю|ём|ем|ах|ях|ам|ям|ой|ей|ию|ью|ок|ек|ик|ки|ка|ку|ке|ек|ок|и|ы|у|е|а|о|ь)$/,
    ""
  );

// ── Synonym support ──

type SynonymEntry = { term: string; synonyms: string[] };
let synonymCache: SynonymEntry[] | null = null;
let synonymLoadPromise: Promise<SynonymEntry[]> | null = null;

/** Load synonyms from Supabase (cached) */
export const loadSynonyms = async (): Promise<SynonymEntry[]> => {
  if (synonymCache) return synonymCache;
  if (synonymLoadPromise) return synonymLoadPromise;

  synonymLoadPromise = (async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase.from('search_synonyms').select('term, synonyms');
      synonymCache = (data || []) as SynonymEntry[];
    } catch {
      synonymCache = [];
    }
    return synonymCache!;
  })();
  return synonymLoadPromise;
};

/** Expand query with synonyms (sync, uses cache) */
export const expandWithSynonyms = (query: string, synonyms: SynonymEntry[]): string[] => {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const expanded = new Set<string>([q]);

  for (const entry of synonyms) {
    const term = entry.term.toLowerCase();
    const syns = entry.synonyms.map(s => s.toLowerCase());
    const allTerms = [term, ...syns];

    if (allTerms.some(t => q.includes(t) || t.includes(q))) {
      allTerms.forEach(t => expanded.add(t));
    }
  }

  return Array.from(expanded);
};

/**
 * Check if a target string matches a search query,
 * considering layout variants, stemming, and synonyms.
 */
export const fuzzyMatch = (target: string, query: string, synonyms?: SynonymEntry[]): boolean => {
  if (!target || !query) return false;
  const lowerTarget = target.toLowerCase();
  const variants = getSearchVariants(query);

  // Expand variants with synonyms
  let allVariants = [...variants];
  if (synonyms && synonyms.length > 0) {
    for (const v of variants) {
      const expanded = expandWithSynonyms(v, synonyms);
      expanded.forEach(e => { if (!allVariants.includes(e)) allVariants.push(e); });
    }
  }
  
  return allVariants.some(variant => {
    if (lowerTarget.includes(variant)) return true;
    // Try stemmed match
    const stemmedVariant = stemRu(variant);
    if (stemmedVariant.length >= 2 && lowerTarget.includes(stemmedVariant)) return true;
    // Try word-by-word stem
    const words = variant.split(/\s+/);
    if (words.length > 1) {
      return words.every(w => {
        const s = stemRu(w);
        return s.length >= 2 && lowerTarget.includes(s);
      });
    }
    return false;
  });
};

// ── Geo-distance ──

/** Calculate distance between two points in km (Haversine formula) */
export const haversineDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Format distance for display */
export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  if (km < 10) return `${km.toFixed(1)} км`;
  return `${Math.round(km)} км`;
};
