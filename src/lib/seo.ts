/**
 * Runtime SEO helper for the SPA hotel detail / listing pages.
 *
 * This app is a client-rendered Vite SPA (no SSR), so metadata is applied at
 * runtime after the data loads. Only verified listing fields are used - nothing
 * is fabricated, and no private Blob/token details are ever emitted.
 */

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface SeoInput {
  title: string;
  description?: string;
  canonicalPath?: string;
  imageUrl?: string;
  type?: string;
  structuredData?: Record<string, unknown> | null;
}

const JSON_LD_ID = 'qoder-hotel-jsonld';

export function applySeo({ title, description, canonicalPath, imageUrl, type = 'website', structuredData }: SeoInput) {
  document.title = title;
  if (description) {
    setMeta('name', 'description', description);
    setMeta('property', 'og:description', description);
    setMeta('name', 'twitter:description', description);
  }
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:type', type);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (canonicalPath && origin) {
    const url = `${origin}${canonicalPath}`;
    setLink('canonical', url);
    setMeta('property', 'og:url', url);
  }
  if (imageUrl && !imageUrl.includes('blob.vercel-storage.com')) {
    // Only reference our own delivery route, never a raw private Blob URL.
    setMeta('property', 'og:image', imageUrl);
    setMeta('name', 'twitter:image', imageUrl);
  }

  // Replace or inject structured data.
  document.getElementById(JSON_LD_ID)?.remove();
  if (structuredData) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSON_LD_ID;
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }
}

export function resetSeoToDefault(defaultTitle: string) {
  document.title = defaultTitle;
  document.getElementById(JSON_LD_ID)?.remove();
}
