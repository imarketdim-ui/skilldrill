/**
 * Update document meta tags dynamically for SEO.
 * Since this is a SPA, these only affect link previews when using
 * prerendering or server-side rendering in the future.
 */
export function updatePageMeta(options: {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: string;
  canonicalUrl?: string;
  robots?: string;
}) {
  if (typeof document === 'undefined') return;

  document.title = options.title;

  setMeta('description', options.description);
  setMeta('og:title', options.title, 'property');
  setMeta('og:description', options.description, 'property');
  setMeta('og:type', options.type || 'website', 'property');
  setMeta('twitter:title', options.title);
  setMeta('twitter:description', options.description);
  setMeta('twitter:card', options.image ? 'summary_large_image' : 'summary');

  if (options.robots) {
    setMeta('robots', options.robots);
  }

  if (options.url) {
    setMeta('og:url', options.url, 'property');
  }
  if (options.image) {
    setMeta('og:image', options.image, 'property');
    setMeta('twitter:image', options.image);
  }

  setCanonical(options.canonicalUrl || options.url);
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url?: string) {
  if (!url) return;

  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }

  el.setAttribute('href', url);
}

export function updateStructuredData(id: string, data: Record<string, unknown>) {
  if (typeof document === 'undefined') return;

  const scriptId = `structured-data-${id}`;
  let el = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = scriptId;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }

  el.textContent = JSON.stringify(data);
}

export function removeStructuredData(id: string) {
  if (typeof document === 'undefined') return;
  document.getElementById(`structured-data-${id}`)?.remove();
}

export function getPublicSiteUrl(path = '') {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  return `https://skilldrill.lovable.app${path}`;
}
