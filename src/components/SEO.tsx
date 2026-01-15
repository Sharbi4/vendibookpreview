import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  type?: 'website' | 'article';
  image?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  noindex?: boolean;
}

const BASE_URL = 'https://vendibook.com';
const DEFAULT_IMAGE = `${BASE_URL}/images/vendibook-og-image.jpg`;
const SITE_NAME = 'Vendibook';

/**
 * SEO component that dynamically updates document head meta tags
 * for improved search engine visibility and social sharing.
 */
const SEO = ({
  title,
  description,
  canonical,
  type = 'website',
  image = DEFAULT_IMAGE,
  article,
  noindex = false,
}: SEOProps) => {
  const fullTitle = title.includes('Vendibook') ? title : `${title} | Vendibook`;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : BASE_URL;
  const imageUrl = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tags
    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to update or create link tags
    const setLink = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // Primary meta tags
    setMeta('description', description);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Canonical URL
    setLink('canonical', canonicalUrl);

    // Open Graph
    setMeta('og:type', type, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:image', imageUrl, true);
    setMeta('og:site_name', SITE_NAME, true);
    setMeta('og:locale', 'en_US', true);

    // Twitter
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:url', canonicalUrl);
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', imageUrl);

    // Article-specific meta (for blog posts, help articles, etc.)
    if (type === 'article' && article) {
      if (article.publishedTime) {
        setMeta('article:published_time', article.publishedTime, true);
      }
      if (article.modifiedTime) {
        setMeta('article:modified_time', article.modifiedTime, true);
      }
      if (article.author) {
        setMeta('article:author', article.author, true);
      }
      if (article.section) {
        setMeta('article:section', article.section, true);
      }
      if (article.tags) {
        article.tags.forEach((tag, index) => {
          setMeta(`article:tag:${index}`, tag, true);
        });
      }
    }

    // Cleanup on unmount - reset to defaults
    return () => {
      document.title = 'Vendibook | Food Truck & Mobile Vendor Marketplace';
    };
  }, [fullTitle, description, canonicalUrl, type, imageUrl, article, noindex]);

  return null;
};

export default SEO;

// JSON-LD structured data helpers
export const generateOrganizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Vendibook',
  url: 'https://vendibook.com',
  logo: 'https://vendibook.com/images/vendibook-logo.png',
  description: 'Rent or buy food trucks, food trailers, ghost kitchens, and vendor lots.',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-877-8VENDI2',
    contactType: 'customer service',
    availableLanguage: 'English',
  },
  sameAs: [
    'https://twitter.com/vendibook',
    'https://facebook.com/vendibook',
    'https://instagram.com/vendibook',
  ],
});

export const generateWebSiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Vendibook',
  url: 'https://vendibook.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://vendibook.com/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
});

export const generateArticleSchema = (article: {
  title: string;
  description: string;
  slug: string;
  category: string;
  datePublished?: string;
  dateModified?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.title,
  description: article.description,
  url: `https://vendibook.com/help/${article.slug}`,
  author: {
    '@type': 'Organization',
    name: 'Vendibook',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Vendibook',
    logo: {
      '@type': 'ImageObject',
      url: 'https://vendibook.com/images/vendibook-logo.png',
    },
  },
  datePublished: article.datePublished || '2024-01-01',
  dateModified: article.dateModified || new Date().toISOString().split('T')[0],
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': `https://vendibook.com/help/${article.slug}`,
  },
  articleSection: article.category,
});

export const generateFAQSchema = (faqs: Array<{ question: string; answer: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

export const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `https://vendibook.com${item.url}`,
  })),
});
