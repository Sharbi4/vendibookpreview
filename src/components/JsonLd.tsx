import { useEffect } from 'react';
import { resolveListingBrand } from '@/lib/resolveListingBrand';

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
  description: `Shop food trucks, food trailers, carts and mobile food equipment nationwide. Buy, sell or rent with financing options, verified sellers and delivery. Find listings in ${city}, ${state}.`,
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
  name: 'Vendibook',
  provider: {
    '@type': 'Organization',
    name: 'Vendibook',
    url: 'https://vendibook.com',
  },
  serviceType: 'Marketplace',
  description: 'Shop food trucks, food trailers, carts and mobile food equipment nationwide. Buy, sell or rent with financing options, verified sellers and delivery.',
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
  image: post.image || 'https://vendibook.com/images/social/vendibook-og-default.jpg',
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

/**
 * FAQ schema specifically built for city+category landing pages.
 * Returns 6 high-intent questions optimized for "People Also Ask" boxes.
 */
export const generateCityCategoryFAQSchema = (
  city: string,
  state: string,
  categoryLabel: string,
  mode: 'rent' | 'buy' | 'sale',
) => {
  const isRent = mode === 'rent';
  const singular = categoryLabel.endsWith('s') ? categoryLabel.slice(0, -1) : categoryLabel;
  const lowerLabel = categoryLabel.toLowerCase();
  const lowerSingular = singular.toLowerCase();

  const faqs = isRent
    ? [
        {
          q: `How much does it cost to rent a ${lowerSingular} in ${city}, ${state}?`,
          a: `${city} ${lowerSingular} rentals on Vendibook typically range from $200–$500 per day, with weekly and monthly discounts available. Pricing varies by size, equipment, and host. Browse live ${city} listings for current rates.`,
        },
        {
          q: `Do I need a license to operate a ${lowerSingular} in ${city}?`,
          a: `Yes — operating a ${lowerSingular} in ${city}, ${state} requires a mobile food vendor permit, food handler certification, and (in most cases) a business license. Vendibook hosts can guide you through local ${state} requirements.`,
        },
        {
          q: `Can I book a ${lowerSingular} in ${city} instantly?`,
          a: `Many ${city} listings on Vendibook support Instant Book, allowing you to reserve a ${lowerSingular} immediately without waiting for host approval. Look for the ⚡ Instant badge on listings.`,
        },
        {
          q: `What\'s included when I rent a ${lowerSingular} in ${city}?`,
          a: `Most ${city} rentals include the fully-equipped ${lowerSingular}, basic kitchen equipment, propane/utility hookup guidance, and host support. Specific inclusions vary — check each listing for details on equipment, generators, and delivery options.`,
        },
        {
          q: `Can ${city} ${lowerLabel} be delivered to my event location?`,
          a: `Yes — many Vendibook hosts in ${city}, ${state} offer delivery within a defined radius for an additional fee. Filter by "delivery available" or message the host directly to arrange transport.`,
        },
        {
          q: `Is renting cheaper than buying a ${lowerSingular} in ${city}?`,
          a: `For most new operators in ${city}, renting is dramatically cheaper than buying. A new ${lowerSingular} costs $50K–$150K+ to purchase, while Vendibook rentals start under $300/day — letting you test concepts and locations before committing.`,
        },
      ]
    : [
        {
          q: `How much does a ${lowerSingular} cost to buy in ${city}, ${state}?`,
          a: `${city} ${lowerSingular}s for sale on Vendibook range from $15,000 for used trailers to $150,000+ for fully-equipped new builds. Browse current ${city} listings to see live pricing and condition reports.`,
        },
        {
          q: `Where can I find used ${lowerLabel} for sale in ${city}?`,
          a: `Vendibook lists verified used and new ${lowerLabel} for sale in ${city}, ${state} directly from owners and dealers. Each listing shows photos, equipment specs, mileage (where applicable), and seller contact details.`,
        },
        {
          q: `What financing options are available for buying a ${lowerSingular}?`,
          a: `Many ${city} buyers finance through SBA loans, equipment financing, or seller financing. Vendibook also supports Affirm and Klarna for qualifying purchases up to $30,000. Contact the seller directly to discuss financing.`,
        },
        {
          q: `Can I inspect a ${lowerSingular} before buying in ${city}?`,
          a: `Yes — every Vendibook listing in ${city} allows you to message the seller and arrange an in-person inspection before purchase. We strongly recommend a third-party inspection for any ${lowerSingular} purchase over $20K.`,
        },
        {
          q: `Do ${city} ${lowerLabel} for sale come with permits?`,
          a: `Permits are typically tied to the operator, not the ${lowerSingular} itself. After buying in ${city}, you\'ll need to apply for ${state} mobile food permits, health inspections, and a business license. The seller can often share their permit history to streamline your application.`,
        },
        {
          q: `Should I buy or rent a ${lowerSingular} in ${city}?`,
          a: `Buy if you\'ve validated demand and plan to operate full-time in ${city}, ${state}. Rent first if you\'re testing a concept, location, or need short-term capacity. Vendibook offers both options — start with a rental and convert to ownership when you\'re ready.`,
        },
      ];

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
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
  price_monthly?: number | null;
  price_sale?: number | null;
  cover_image_url?: string | null;
  image_urls?: string[];
  address?: string | null;
  status: string;
  host_name?: string | null;
  host_business_name?: string | null;
  brand?: string | null;
  make?: string | null;
  manufacturer?: string | null;
  average_rating?: number | null;
  review_count?: number;
  reviews?: Array<{ rating: number; review_text?: string | null; reviewer_name?: string; created_at: string }>;
  length_inches?: number | null;
  width_inches?: number | null;
  height_inches?: number | null;
  weight_lbs?: number | null;
  condition?: 'new' | 'used' | 'refurbished' | null;
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
  
  // Availability for Google rich results
  const isAvailable = listing.status === 'published';
  const availability = isAvailable
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  // itemCondition: Google requires a schema.org Condition URL
  const conditionMap: Record<string, string> = {
    new: 'https://schema.org/NewCondition',
    used: 'https://schema.org/UsedCondition',
    refurbished: 'https://schema.org/RefurbishedCondition',
  };
  const itemCondition = conditionMap[listing.condition || 'used'] || 'https://schema.org/UsedCondition';

  // Build image array
  const images = listing.image_urls?.length
    ? listing.image_urls
    : (listing.cover_image_url ? [listing.cover_image_url] : ['https://vendibook.com/placeholder.svg']);

  const today = new Date().toISOString().split('T')[0];
  const validThrough = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sellerOrg = {
    '@type': 'Organization',
    name: listing.host_name || 'Vendibook Host',
  };
  const listingUrl = `https://vendibook.com/listing/${listing.id}`;

  // Build offers — different shape for rent vs sale per Google guidelines
  let offers: any;
  if (isRental) {
    // Rental: one Offer per pricing tier (daily / weekly / monthly).
    // businessFunction = LeaseOut signals rental intent to Google.
    const tiers: Array<{ price: number; unitCode: 'DAY' | 'WK' | 'MON'; unitText: string }> = [];
    if (listing.price_daily) tiers.push({ price: listing.price_daily, unitCode: 'DAY', unitText: 'per day' });
    if (listing.price_weekly) tiers.push({ price: listing.price_weekly, unitCode: 'WK', unitText: 'per week' });
    if (listing.price_monthly) tiers.push({ price: listing.price_monthly, unitCode: 'MON', unitText: 'per month' });

    const buildRentOffer = (tier: { price: number; unitCode: string; unitText: string }) => ({
      '@type': 'Offer',
      url: listingUrl,
      priceCurrency: 'USD',
      price: tier.price.toString(),
      availability,
      itemCondition,
      businessFunction: 'http://purl.org/goodrelations/v1#LeaseOut',
      validFrom: today,
      seller: sellerOrg,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: tier.price.toString(),
        priceCurrency: 'USD',
        unitCode: tier.unitCode,
        unitText: tier.unitText,
        referenceQuantity: {
          '@type': 'QuantitativeValue',
          value: '1',
          unitCode: tier.unitCode,
        },
      },
    });

    if (tiers.length <= 1) {
      offers = buildRentOffer(tiers[0] ?? { price: 0, unitCode: 'DAY', unitText: 'per day' });
    } else {
      const prices = tiers.map(t => t.price);
      offers = {
        '@type': 'AggregateOffer',
        url: listingUrl,
        priceCurrency: 'USD',
        lowPrice: Math.min(...prices).toString(),
        highPrice: Math.max(...prices).toString(),
        offerCount: tiers.length.toString(),
        availability,
        itemCondition,
        seller: sellerOrg,
        offers: tiers.map(buildRentOffer),
      };
    }
  } else {
    // Sale: single Offer with sale price + priceValidUntil + return policy + shipping
    offers = {
      '@type': 'Offer',
      url: listingUrl,
      priceCurrency: 'USD',
      price: (listing.price_sale || 0).toString(),
      priceValidUntil: validThrough,
      availability,
      itemCondition,
      businessFunction: 'http://purl.org/goodrelations/v1#Sell',
      validFrom: today,
      seller: sellerOrg,
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'US',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
        merchantReturnLink: 'https://vendibook.com/terms',
      },
      ...((['food_truck', 'food_trailer'].includes(listing.category)) ? {
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'US',
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 14,
              unitCode: 'DAY',
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 21,
              unitCode: 'DAY',
            },
          },
        },
      } : {}),
    };
  }

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: seoName,
    description: listing.description?.slice(0, 5000) || `${categoryLabel} ${isRental ? 'for rent' : 'for sale'}`,
    url: listingUrl,
    image: images,
    sku: listing.id,
    mpn: listing.id,
    brand: {
      '@type': 'Brand',
      name: resolveListingBrand({
        category: listing.category,
        brand: listing.brand,
        make: listing.make,
        manufacturer: listing.manufacturer,
        host_business_name: listing.host_business_name,
        host_display_name: listing.host_name,
      }),
    },
    category: `Commercial Kitchen Equipment > ${categoryLabel}`,
    offers,
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

  // Add individual reviews for Google rich results
  if (listing.reviews && listing.reviews.length > 0) {
    schema.review = listing.reviews.slice(0, 5).map(r => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: r.reviewer_name || 'Vendibook User',
      },
      datePublished: r.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating.toString(),
        bestRating: '5',
        worstRating: '1',
      },
      ...(r.review_text ? { reviewBody: r.review_text.slice(0, 500) } : {}),
    }));
  }

  // additionalProperty for specs
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

  // Attach areaServed at the offer level so it travels with each pricing tier
  if (city && state) {
    const areaServed = {
      '@type': 'City',
      name: city,
      containedInPlace: { '@type': 'State', name: state },
    };
    if (offers['@type'] === 'AggregateOffer') {
      offers.areaServed = areaServed;
      offers.offers?.forEach((o: any) => { o.areaServed = areaServed; });
    } else {
      offers.areaServed = areaServed;
    }
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
