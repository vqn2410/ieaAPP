import { useEffect } from 'react';

/**
 * Gestor dinámico de metadatos SEO para React SPA.
 * Actualiza document.title, description, canonical, robots y Open Graph/Twitter sin librerías externas pesadas.
 */
export default function SeoHead({
  title,
  description,
  canonicalUrl,
  noindex = false,
  ogType = 'website',
  ogImage = '/img/slider-hero.jpg',
  jsonLd = null,
}) {
  useEffect(() => {
    // 1. Título
    if (title) {
      document.title = title;
    }

    // Helper para actualizar o crear meta tags
    const setMetaTag = (attribute, name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attribute, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Meta description
    if (description) {
      setMetaTag('name', 'description', description);
    }

    // 3. Robots (index/noindex)
    const robotsContent = noindex
      ? 'noindex, nofollow, noarchive, nosnippet'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    setMetaTag('name', 'robots', robotsContent);
    setMetaTag('name', 'googlebot', robotsContent);

    // 4. Canonical URL
    const resolvedCanonical = canonicalUrl
      ? (canonicalUrl.startsWith('http') ? canonicalUrl : `${window.location.origin}${canonicalUrl}`)
      : window.location.href.split('?')[0];

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', resolvedCanonical);

    // 5. Open Graph & Twitter Cards
    const absoluteImage = ogImage.startsWith('http')
      ? ogImage
      : `${window.location.origin}${ogImage}`;

    setMetaTag('property', 'og:title', title || document.title);
    setMetaTag('property', 'og:description', description || '');
    setMetaTag('property', 'og:url', resolvedCanonical);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:image', absoluteImage);
    setMetaTag('property', 'og:site_name', 'Iglesia Extremo Amor (IEA)');
    setMetaTag('property', 'og:locale', 'es_AR');

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title || document.title);
    setMetaTag('name', 'twitter:description', description || '');
    setMetaTag('name', 'twitter:image', absoluteImage);

    // 6. JSON-LD específico de página
    let scriptJsonLd = document.getElementById('route-jsonld');
    if (jsonLd) {
      if (!scriptJsonLd) {
        scriptJsonLd = document.createElement('script');
        scriptJsonLd.id = 'route-jsonld';
        scriptJsonLd.type = 'application/ld+json';
        document.head.appendChild(scriptJsonLd);
      }
      scriptJsonLd.textContent = JSON.stringify(jsonLd);
    } else if (scriptJsonLd) {
      scriptJsonLd.remove();
    }
  }, [title, description, canonicalUrl, noindex, ogType, ogImage, jsonLd]);

  return null;
}
