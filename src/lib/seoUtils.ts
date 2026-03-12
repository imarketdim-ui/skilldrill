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
}) {
  document.title = options.title;

  setMeta('description', options.description);
  setMeta('og:title', options.title, 'property');
  setMeta('og:description', options.description, 'property');
  setMeta('twitter:title', options.title);
  setMeta('twitter:description', options.description);

  if (options.url) {
    setMeta('og:url', options.url, 'property');
  }
  if (options.image) {
    setMeta('og:image', options.image, 'property');
    setMeta('twitter:image', options.image);
  }
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
