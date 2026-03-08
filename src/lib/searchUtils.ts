/**
 * Keyboard layout auto-correction (EN ↔ RU)
 * and basic Russian morphological stemming for marketplace search.
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
    // User probably typed in EN while meaning RU
    variants.push(enToRu(trimmed));
  } else if (looksLikeRussian(trimmed)) {
    // User probably typed in RU while meaning EN  
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

/**
 * Check if a target string matches a search query,
 * considering layout variants and stemming.
 */
export const fuzzyMatch = (target: string, query: string): boolean => {
  if (!target || !query) return false;
  const lowerTarget = target.toLowerCase();
  const variants = getSearchVariants(query);
  
  return variants.some(variant => {
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
