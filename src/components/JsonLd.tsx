import { useEffect } from 'react';

interface JsonLdProps {
  schema: object | object[];
}

/**
 * Component to inject JSON-LD structured data into the page head.
 * Automatically handles cleanup on unmount.
 */
const JsonLd = ({ schema }: JsonLdProps) => {
  useEffect(() => {
    const scriptId = `json-ld-${Math.random().toString(36).substring(7)}`;
    
    // Remove any existing JSON-LD scripts we've added
    const existingScripts = document.querySelectorAll('script[data-json-ld="true"]');
    existingScripts.forEach(script => script.remove());
    
    // Create new script element
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.setAttribute('data-json-ld', 'true');
    
    // Handle array of schemas or single schema
    if (Array.isArray(schema)) {
      script.textContent = JSON.stringify(schema);
    } else {
      script.textContent = JSON.stringify(schema);
    }
    
    document.head.appendChild(script);
    
    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [schema]);
  
  return null;
};

export default JsonLd;

// ============= Enhanced Schema Generators =============

export const generateLocalBusinessSchema = (city: string, state: string) => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: `Vendibook - ${city}`,
  description: `Rent or buy food trucks, food trailers, ghost kitchens, and vendor lots in ${city}, ${state}.`,
  url: `https://vendibook.com/${city.toLowerCase().replace(' ', '-')}/browse`,
  areaServed: {
    '@type': 'City',
    name: city,
    containedInPlace: {
      '@type': 'State',
      name: state,
    },
  },
  parentOrganization: {
    '@type': 'Organization',
    name: 'Vendibook',
    url: 'https://vendibook.com',
  },
});

export const generateServiceSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Food Truck & Mobile Vendor Marketplace',
  provider: {
    '@type': 'Organization',
    name: 'Vendibook',
    url: 'https://vendibook.com',
  },
  serviceType: 'Marketplace',
  description: 'Rent or buy food trucks, food trailers, ghost kitchens, and vendor lots across the United States.',
  areaServed: {
    '@type': 'Country',
    name: 'United States',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Mobile Food Assets',
    itemListElement: [
      {
        '@type': 'OfferCatalog',
        name: 'Food Trucks',
        description: 'Fully-equipped mobile kitchens for rent or sale',
      },
      {
        '@type': 'OfferCatalog',
        name: 'Food Trailers',
        description: 'Towable commercial food preparation units',
      },
      {
        '@type': 'OfferCatalog',
        name: 'Ghost Kitchens',
        description: 'Commercial kitchen space for delivery-only concepts',
      },
      {
        '@type': 'OfferCatalog',
        name: 'Vendor Lots',
        description: 'Prime locations for mobile food vendors',
      },
    ],
  },
});

export const generateBlogPostSchema = (post: {
  title: string;
  description: string;
  slug: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  category?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.description,
  url: `https://vendibook.com/blog/${post.slug}`,
  image: post.image || 'https://vendibook.com/images/vendibook-og-image.jpg',
  author: {
    '@type': 'Person',
    name: post.author,
  },
  publisher: {
    '@type': 'Organization',
    name: 'Vendibook',
    logo: {
      '@type': 'ImageObject',
      url: 'https://vendibook.com/images/vendibook-logo.png',
    },
  },
  datePublished: post.datePublished,
  dateModified: post.dateModified || post.datePublished,
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': `https://vendibook.com/blog/${post.slug}`,
  },
  articleSection: post.category || 'Industry Insights',
});

export const generateBlogListSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Vendibook Blog',
  description: 'Industry insights, tips, and guides for food truck entrepreneurs, ghost kitchen operators, and mobile food vendors.',
  url: 'https://vendibook.com/blog',
  publisher: {
    '@type': 'Organization',
    name: 'Vendibook',
    url: 'https://vendibook.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://vendibook.com/images/vendibook-logo.png',
    },
  },
});

export const generateCityServiceSchema = (
  city: string,
  state: string,
  category: 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_lot',
  mode: 'rent' | 'sale'
) => {
  const categoryLabels: Record<string, string> = {
    food_truck: 'Food Trucks',
    food_trailer: 'Food Trailers',
    ghost_kitchen: 'Ghost Kitchens',
    vendor_lot: 'Vendor Lots',
  };

  const modeLabel = mode === 'rent' ? 'for Rent' : 'for Sale';

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${categoryLabels[category]} ${modeLabel} in ${city}, ${state}`,
    provider: {
      '@type': 'Organization',
      name: 'Vendibook',
      url: 'https://vendibook.com',
    },
    areaServed: {
      '@type': 'City',
      name: city,
      containedInPlace: {
        '@type': 'State',
        name: state,
      },
    },
    serviceType: 'Marketplace Listing',
  };
};
