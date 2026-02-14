import { useEffect } from 'react';

interface JsonLdProps {
  schema: object | object[];
}

// Product listing item for ItemList schema
export interface ProductListItem {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string | null;
  mode: 'rent' | 'sale';
  category: string;
  price_daily?: number | null;
  price_weekly?: number | null;
  price_sale?: number | null;
  status: string;
}
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
  description: `Rent or buy food trucks, food trailers, shared kitchens, and Vendor Spaces in ${city}, ${state}.`,
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
  description: 'Rent or buy food trucks, food trailers, shared kitchens, and Vendor Spaces across the United States.',
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
        name: 'Shared Kitchens',
        description: 'Commercial kitchen space for delivery-only concepts',
      },
      {
        '@type': 'OfferCatalog',
        name: 'Vendor Spaces',
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
  description: 'Industry insights, tips, and guides for food truck entrepreneurs, shared kitchen operators, and mobile food vendors.',
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
    ghost_kitchen: 'Shared Kitchens',
    vendor_lot: 'Vendor Spaces',
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

// Product schema for Google Shopping - supports both rentals and sales
export const generateProductSchema = (listing: {
  id: string;
  title: string;
  description: string;
  category: string;
  mode: 'rent' | 'sale';
  price_daily?: number | null;
  price_weekly?: number | null;
  price_sale?: number | null;
  cover_image_url?: string | null;
  image_urls?: string[];
  address?: string | null;
  status: string;
  host_name?: string | null;
  average_rating?: number | null;
  review_count?: number;
  length_inches?: number | null;
  width_inches?: number | null;
  height_inches?: number | null;
  weight_lbs?: number | null;
}) => {
  const categoryLabels: Record<string, string> = {
    food_truck: 'Food Truck',
    food_trailer: 'Food Trailer',
    ghost_kitchen: 'Shared Kitchen',
    vendor_lot: 'Vendor Space',
  };

  const categoryLabel = categoryLabels[listing.category] || 'Mobile Food Asset';
  const isRental = listing.mode === 'rent';
  const modeLabel = isRental ? 'for Rent' : 'for Sale';

  // Extract city/state for SEO-rich product name
  const locationParts = listing.address?.split(',').map(s => s.trim()) || [];
  const city = locationParts.length >= 2 ? locationParts[locationParts.length - 2] : undefined;
  const state = locationParts.length >= 1 ? locationParts[locationParts.length - 1]?.split(' ')[0] : undefined;
  const locationShort = city && state ? `${city}, ${state}` : city || '';
  const seoName = locationShort
    ? `${categoryLabel} ${modeLabel} in ${locationShort} - ${listing.title}`
    : `${categoryLabel} ${modeLabel} - ${listing.title}`;
  
  // Determine price and availability
  const price = isRental 
    ? (listing.price_daily || listing.price_weekly || 0)
    : (listing.price_sale || 0);
  
  const priceLabel = isRental
    ? (listing.price_daily ? '/day' : '/week')
    : '';

  // Build image array
  const images = listing.image_urls?.length 
    ? listing.image_urls 
    : (listing.cover_image_url ? [listing.cover_image_url] : ['https://vendibook.com/placeholder.svg']);

  // city/state already extracted above for seoName

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: seoName,
    description: listing.description?.slice(0, 5000) || `${categoryLabel} ${isRental ? 'for rent' : 'for sale'}`,
    url: `https://vendibook.com/listing/${listing.id}`,
    image: images,
    sku: listing.id,
    mpn: listing.id,
    brand: {
      '@type': 'Brand',
      name: 'Vendibook',
    },
    category: `Commercial Kitchen Equipment > ${categoryLabel}`,
    offers: {
      '@type': 'Offer',
      url: `https://vendibook.com/listing/${listing.id}`,
      priceCurrency: 'USD',
      price: price.toString(),
      priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: listing.status === 'published' 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/UsedCondition',
      seller: {
        '@type': 'Organization',
        name: listing.host_name || 'Vendibook Host',
      },
    },
  };

  // Add aggregate rating if available
  if (listing.average_rating && listing.review_count && listing.review_count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: listing.average_rating.toFixed(1),
      bestRating: '5',
      worstRating: '1',
      reviewCount: listing.review_count.toString(),
    };
  }

  // Add additionalProperty for specs
  const additionalProperties: Array<{ '@type': string; name: string; value: string }> = [];
  if (listing.length_inches) {
    additionalProperties.push({ '@type': 'PropertyValue', name: 'Length', value: `${Math.floor(listing.length_inches / 12)}ft ${listing.length_inches % 12}in` });
  }
  if (listing.width_inches) {
    additionalProperties.push({ '@type': 'PropertyValue', name: 'Width', value: `${Math.floor(listing.width_inches / 12)}ft ${listing.width_inches % 12}in` });
  }
  if (listing.height_inches) {
    additionalProperties.push({ '@type': 'PropertyValue', name: 'Height', value: `${Math.floor(listing.height_inches / 12)}ft ${listing.height_inches % 12}in` });
  }
  if (listing.weight_lbs) {
    additionalProperties.push({ '@type': 'PropertyValue', name: 'Weight', value: `${listing.weight_lbs.toLocaleString()} lbs` });
  }
  if (additionalProperties.length > 0) {
    schema.additionalProperty = additionalProperties;
  }

  // Add rental-specific fields using extended offer
  if (isRental) {
    schema.offers.priceSpecification = {
      '@type': 'UnitPriceSpecification',
      price: price.toString(),
      priceCurrency: 'USD',
      unitCode: listing.price_daily ? 'DAY' : 'WK',
      unitText: listing.price_daily ? 'per day' : 'per week',
    };
  }

  // Add location if available
  if (city && state) {
    schema.offers.areaServed = {
      '@type': 'City',
      name: city,
      containedInPlace: {
        '@type': 'State',
        name: state,
      },
    };
  }

  return schema;
};

// Breadcrumb schema for listing detail pages
export const generateListingBreadcrumbSchema = (listing: {
  id: string;
  title: string;
  category: string;
  mode: 'rent' | 'sale';
}) => {
  const categoryLabels: Record<string, string> = {
    food_truck: 'Food Trucks',
    food_trailer: 'Food Trailers',
    ghost_kitchen: 'Shared Kitchens',
    vendor_lot: 'Vendor Spaces',
  };

  const modeLabel = listing.mode === 'rent' ? 'For Rent' : 'For Sale';
  const categoryLabel = categoryLabels[listing.category] || 'Listings';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://vendibook.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: modeLabel,
        item: `https://vendibook.com/search?mode=${listing.mode}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryLabel,
        item: `https://vendibook.com/search?mode=${listing.mode}&category=${listing.category}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: listing.title,
        item: `https://vendibook.com/listing/${listing.id}`,
      },
    ],
  };
};

// ItemList schema for search results - helps Google index multiple products
export const generateItemListSchema = (
  listings: ProductListItem[],
  searchParams?: {
    mode?: 'rent' | 'sale' | 'all';
    category?: string;
    query?: string;
    location?: string;
  }
) => {
  const categoryLabels: Record<string, string> = {
    food_truck: 'Food Trucks',
    food_trailer: 'Food Trailers',
    ghost_kitchen: 'Shared Kitchens',
    vendor_lot: 'Vendor Spaces',
  };

  // Build list name based on filters
  let listName = 'Mobile Food Assets';
  if (searchParams?.category && searchParams.category !== 'all') {
    listName = categoryLabels[searchParams.category] || listName;
  }
  if (searchParams?.mode && searchParams.mode !== 'all') {
    listName += searchParams.mode === 'rent' ? ' for Rent' : ' for Sale';
  }
  if (searchParams?.location) {
    listName += ` in ${searchParams.location}`;
  }

  // Build URL for the list
  const urlParams = new URLSearchParams();
  if (searchParams?.mode && searchParams.mode !== 'all') urlParams.set('mode', searchParams.mode);
  if (searchParams?.category && searchParams.category !== 'all') urlParams.set('category', searchParams.category);
  if (searchParams?.query) urlParams.set('q', searchParams.query);
  const listUrl = `https://vendibook.com/search${urlParams.toString() ? '?' + urlParams.toString() : ''}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    url: listUrl,
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 50).map((listing, index) => {
      const price = listing.mode === 'rent'
        ? (listing.price_daily || listing.price_weekly || 0)
        : (listing.price_sale || 0);

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: listing.title,
          url: `https://vendibook.com/listing/${listing.id}`,
          image: listing.cover_image_url || 'https://vendibook.com/placeholder.svg',
          description: listing.description?.slice(0, 200) || `${categoryLabels[listing.category] || 'Asset'} ${listing.mode === 'rent' ? 'for rent' : 'for sale'}`,
          offers: {
            '@type': 'Offer',
            url: `https://vendibook.com/listing/${listing.id}`,
            priceCurrency: 'USD',
            price: price.toString(),
            availability: listing.status === 'published'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        },
      };
    }),
  };
};

// City + Category breadcrumb schema for programmatic SEO pages
export const generateCityCategoryBreadcrumbSchema = (
  mode: string,
  categorySlug: string,
  categoryLabel: string,
  cityStateSlug: string,
  cityName: string,
  stateCode: string
) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://vendibook.com',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: mode === 'rent' ? 'For Rent' : 'For Sale',
      item: `https://vendibook.com/search?mode=${mode === 'buy' ? 'sale' : 'rent'}`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: categoryLabel,
      item: `https://vendibook.com/search?mode=${mode === 'buy' ? 'sale' : 'rent'}&category=${categorySlug}`,
    },
    {
      '@type': 'ListItem',
      position: 4,
      name: `${cityName}, ${stateCode}`,
      item: `https://vendibook.com/${mode}/${categorySlug}/${cityStateSlug}`,
    },
  ],
});

// Search results breadcrumb schema
export const generateSearchBreadcrumbSchema = (searchParams?: {
  mode?: 'rent' | 'sale' | 'all';
  category?: string;
}) => {
  const categoryLabels: Record<string, string> = {
    food_truck: 'Food Trucks',
    food_trailer: 'Food Trailers',
    ghost_kitchen: 'Shared Kitchens',
    vendor_lot: 'Vendor Spaces',
  };

  const items = [
    { name: 'Home', url: '/' },
    { name: 'Search', url: '/search' },
  ];

  if (searchParams?.mode && searchParams.mode !== 'all') {
    const modeLabel = searchParams.mode === 'rent' ? 'For Rent' : 'For Sale';
    items.push({ 
      name: modeLabel, 
      url: `/search?mode=${searchParams.mode}` 
    });
  }

  if (searchParams?.category && searchParams.category !== 'all') {
    const categoryLabel = categoryLabels[searchParams.category] || searchParams.category;
    const modeParam = searchParams.mode && searchParams.mode !== 'all' ? `mode=${searchParams.mode}&` : '';
    items.push({ 
      name: categoryLabel, 
      url: `/search?${modeParam}category=${searchParams.category}` 
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://vendibook.com${item.url}`,
    })),
  };
};

// LocalBusiness schema for physical locations (kitchens, vendor spaces)
export const generateListingLocalBusinessSchema = (listing: {
  id: string;
  title: string;
  description: string;
  category: string;
  mode: 'rent' | 'sale';
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price_daily?: number | null;
  price_weekly?: number | null;
  price_sale?: number | null;
}) => {
  const categoryLabels: Record<string, string> = {
    ghost_kitchen: 'Shared Kitchen',
    vendor_lot: 'Vendor Space',
    vendor_space: 'Vendor Space',
  };
  const categoryLabel = categoryLabels[listing.category] || 'Commercial Kitchen';
  const locationParts = listing.address?.split(',').map(s => s.trim()) || [];
  const city = locationParts.length >= 2 ? locationParts[locationParts.length - 2] : undefined;
  const state = locationParts.length >= 1 ? locationParts[locationParts.length - 1]?.split(' ')[0] : undefined;

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: listing.title,
    description: listing.description?.slice(0, 500) || `${categoryLabel} available on Vendibook`,
    url: `https://vendibook.com/listing/${listing.id}`,
    '@id': `https://vendibook.com/listing/${listing.id}#business`,
  };

  if (listing.address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: locationParts.length >= 3 ? locationParts.slice(0, -2).join(', ') : undefined,
      addressLocality: city,
      addressRegion: state,
      addressCountry: 'US',
    };
  }

  if (listing.latitude && listing.longitude) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: listing.latitude,
      longitude: listing.longitude,
    };
  }

  const price = listing.mode === 'rent'
    ? (listing.price_daily || listing.price_weekly || 0)
    : (listing.price_sale || 0);

  schema.makesOffer = {
    '@type': 'Offer',
    url: `https://vendibook.com/listing/${listing.id}`,
    priceCurrency: 'USD',
    price: price.toString(),
    availability: 'https://schema.org/InStock',
  };

  return schema;
};

// FAQ schema auto-generated from listing data
export const generateListingFAQSchema = (listing: {
  category: string;
  mode: 'rent' | 'sale';
  status: string;
  address?: string | null;
  price_daily?: number | null;
  price_weekly?: number | null;
  price_sale?: number | null;
  instant_book?: boolean | null;
  fulfillment_type?: string;
}) => {
  const categoryLabels: Record<string, string> = {
    food_truck: 'food truck',
    food_trailer: 'food trailer',
    ghost_kitchen: 'shared kitchen',
    vendor_lot: 'vendor space',
    vendor_space: 'vendor space',
  };
  const cat = categoryLabels[listing.category] || 'listing';
  const isRental = listing.mode === 'rent';
  const locationParts = listing.address?.split(',').map(s => s.trim()) || [];
  const city = locationParts.length >= 2 ? locationParts[locationParts.length - 2] : undefined;

  const faqs: Array<{ question: string; answer: string }> = [];

  // Availability
  faqs.push({
    question: `Is this ${cat} available ${isRental ? 'for rent' : 'for sale'}?`,
    answer: listing.status === 'published'
      ? `Yes, this ${cat} is currently available ${isRental ? 'for rent' : 'for purchase'} on Vendibook.`
      : `This ${cat} is not currently available. Check back soon or browse similar listings on Vendibook.`,
  });

  // Pricing
  if (isRental && (listing.price_daily || listing.price_weekly)) {
    const priceInfo = listing.price_daily
      ? `$${listing.price_daily}/day`
      : `$${listing.price_weekly}/week`;
    faqs.push({
      question: `How much does it cost to rent this ${cat}?`,
      answer: `Rental pricing starts at ${priceInfo}. Contact the host for custom quotes or longer-term rates.`,
    });
  } else if (!isRental && listing.price_sale) {
    faqs.push({
      question: `What is the price of this ${cat}?`,
      answer: `This ${cat} is listed at $${listing.price_sale.toLocaleString()}. Make an offer or contact the seller on Vendibook.`,
    });
  }

  // Location
  if (city) {
    faqs.push({
      question: `Where is this ${cat} located?`,
      answer: `This ${cat} is located in ${locationParts.slice(-2).join(', ')}. View the full listing on Vendibook for exact location details.`,
    });
  }

  // Instant book
  if (isRental && listing.instant_book) {
    faqs.push({
      question: `Can I book this ${cat} instantly?`,
      answer: `Yes! This listing supports instant booking — you can reserve it immediately without waiting for host approval.`,
    });
  }

  // Delivery
  if (listing.fulfillment_type === 'delivery' || listing.fulfillment_type === 'both') {
    faqs.push({
      question: `Is delivery available for this ${cat}?`,
      answer: `Yes, the host offers delivery for this ${cat}. Check the listing for delivery radius and fees.`,
    });
  }

  if (faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
};
