export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  content: string;
  author: string;
  authorRole?: string;
  datePublished: string;
  dateModified?: string;
  category: string;
  tags: string[];
  image?: string;
  readingTime: number;
  featured?: boolean;
}

export const BLOG_CATEGORIES = [
  { slug: 'getting-started', label: 'Getting Started', description: 'Essential guides for new food entrepreneurs' },
  { slug: 'industry-insights', label: 'Industry Insights', description: 'Trends, data, and market analysis' },
  { slug: 'business-tips', label: 'Business Tips', description: 'Grow and manage your mobile food business' },
  { slug: 'success-stories', label: 'Success Stories', description: 'Learn from thriving food entrepreneurs' },
  { slug: 'equipment-guides', label: 'Equipment Guides', description: 'Buy, maintain, and upgrade your assets' },
  { slug: 'permits-regulations', label: 'Permits & Regulations', description: 'Navigate licensing and compliance' },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-start-food-truck-business-2025',
    title: 'How to Start a Food Truck Business in 2025: Complete Guide',
    description: 'Everything you need to know about starting a food truck business in 2025, from initial planning to your first day of sales.',
    excerpt: 'Starting a food truck business is one of the most accessible ways to enter the food industry. Learn the step-by-step process to launch your mobile kitchen.',
    content: `
# How to Start a Food Truck Business in 2025

Starting a food truck business is one of the most exciting and accessible ways to break into the food industry. With lower startup costs than a traditional restaurant and the flexibility to go where the customers are, food trucks have become a cornerstone of American culinary culture.

## Why 2025 Is the Perfect Time

The food truck industry continues to grow, with the market expected to reach $2.7 billion by 2027. Post-pandemic dining habits have shifted, and consumers are more open than ever to trying street food and mobile vendors.

## Step 1: Develop Your Concept

Your concept is your identity. Consider:
- **Cuisine type**: What food will you serve?
- **Target audience**: Who are your ideal customers?
- **Unique selling proposition**: What makes you different?

## Step 2: Create a Business Plan

A solid business plan helps you:
- Secure financing
- Plan for profitability
- Navigate challenges

## Step 3: Secure Funding

Typical startup costs range from $50,000 to $200,000. Options include:
- Small business loans
- Equipment financing
- Renting instead of buying

## Step 4: Get Licensed and Permitted

Requirements vary by location but typically include:
- Business license
- Food handler's permit
- Health department approval
- Mobile vendor permit

## Step 5: Find Your Truck

You can buy new, buy used, or rent. Renting is a great way to test your concept before committing to a major purchase.

## Ready to Get Started?

Browse available food trucks for rent on Vendibook and start your journey today.
    `,
    author: 'Vendibook Team',
    authorRole: 'Editorial',
    datePublished: '2025-01-15',
    category: 'getting-started',
    tags: ['food truck', 'startup', 'business plan', 'permits'],
    image: '/images/taco-truck-hero.png',
    readingTime: 8,
    featured: true,
  },
  {
    slug: 'food-truck-vs-food-trailer-which-is-right',
    title: 'Food Truck vs Food Trailer: Which Is Right for Your Business?',
    description: 'Compare food trucks and food trailers to determine which mobile kitchen option best fits your business model, budget, and goals.',
    excerpt: 'Choosing between a food truck and food trailer is a crucial decision. We break down the pros, cons, and costs of each option.',
    content: `
# Food Truck vs Food Trailer: Which Is Right for Your Business?

When launching a mobile food business, one of the first major decisions you'll face is whether to go with a food truck or a food trailer. Both have distinct advantages and considerations.

## Food Trucks: All-in-One Mobility

**Pros:**
- Self-propelled, no need for a tow vehicle
- Easier to navigate urban areas
- Often perceived as more professional
- Simpler setup at events

**Cons:**
- Higher upfront cost
- More complex maintenance
- If the truck breaks down, you can't operate

## Food Trailers: Flexibility and Cost

**Pros:**
- Lower initial investment
- More kitchen space per dollar
- Tow vehicle can be used for other purposes
- If the tow vehicle breaks down, the trailer still works

**Cons:**
- Requires a tow vehicle (additional expense)
- Harder to maneuver in tight spaces
- May require more setup time

## Cost Comparison

| Factor | Food Truck | Food Trailer |
|--------|-----------|--------------|
| Avg. Purchase Price | $75,000-$150,000 | $30,000-$80,000 |
| Tow Vehicle | Not needed | $20,000-$50,000 |
| Insurance | Higher | Lower |
| Maintenance | More complex | Simpler |

## Our Recommendation

Start with a rental to test your concept. Whether you choose a truck or trailer, renting allows you to validate your business model before making a major investment.
    `,
    author: 'Vendibook Team',
    authorRole: 'Editorial',
    datePublished: '2025-01-10',
    category: 'equipment-guides',
    tags: ['food truck', 'food trailer', 'comparison', 'equipment'],
    readingTime: 6,
    featured: true,
  },
  {
    slug: 'ghost-kitchen-startup-guide',
    title: 'Ghost Kitchen Startup Guide: Launch a Delivery-Only Restaurant',
    description: 'Learn how to start a ghost kitchen business, from concept development to delivery platform optimization.',
    excerpt: 'Ghost kitchens have revolutionized the restaurant industry. Learn how to launch your delivery-only concept with minimal overhead.',
    content: `
# Ghost Kitchen Startup Guide

Ghost kitchens, also known as cloud kitchens or dark kitchens, have transformed how food businesses operate. By eliminating the need for a traditional dining room, ghost kitchens offer a lower-cost entry point into the restaurant industry.

## What Is a Ghost Kitchen?

A ghost kitchen is a commercial cooking facility designed specifically for preparing food for delivery orders. There's no storefront, no dining room—just a kitchen optimized for efficiency.

## Benefits of Ghost Kitchens

1. **Lower overhead**: No need for front-of-house staff or dining room rent
2. **Flexibility**: Test multiple concepts from one location
3. **Scalability**: Expand to new markets quickly
4. **Data-driven**: Delivery platforms provide valuable customer insights

## Getting Started

### Find Your Space

You can:
- Rent a dedicated ghost kitchen space
- Share a commercial kitchen
- Convert existing restaurant space

### Choose Your Platforms

Major delivery platforms include:
- DoorDash
- Uber Eats
- Grubhub
- Direct ordering through your website

### Optimize for Delivery

Your menu should:
- Travel well
- Maintain quality during transit
- Be profitable after platform fees

## Ready to Launch?

Find ghost kitchen spaces for rent on Vendibook and start your delivery-only journey.
    `,
    author: 'Vendibook Team',
    authorRole: 'Editorial',
    datePublished: '2025-01-05',
    category: 'getting-started',
    tags: ['ghost kitchen', 'delivery', 'startup', 'cloud kitchen'],
    readingTime: 7,
  },
  {
    slug: 'vendor-lot-location-tips',
    title: '10 Tips for Choosing the Perfect Vendor Lot Location',
    description: 'Location can make or break your food truck business. Learn how to evaluate and select the best vendor lot for maximum sales.',
    excerpt: 'The right location is crucial for food truck success. Here are 10 factors to consider when choosing your vendor lot.',
    content: `
# 10 Tips for Choosing the Perfect Vendor Lot Location

In the food truck business, location isn't just important—it's everything. The right vendor lot can turn a slow day into a profitable one.

## 1. Foot Traffic Volume

Look for locations with consistent pedestrian traffic. Business districts, event venues, and university areas are prime spots.

## 2. Visibility

Can customers see your truck from the street? Corner lots and open spaces typically offer better visibility.

## 3. Parking Accessibility

Consider how customers will reach you. Is there nearby parking? Are you accessible by public transit?

## 4. Competition Analysis

Some competition is healthy, but too much can dilute your sales. Research what other vendors operate nearby.

## 5. Time-of-Day Patterns

Understand when traffic peaks. Breakfast spots differ from lunch locations, which differ from late-night venues.

## 6. Permit Requirements

Verify that the lot is properly zoned and permitted for food vending.

## 7. Utility Access

Do you need power hookups? Water access? Make sure the lot can support your operational needs.

## 8. Lease Terms

Negotiate favorable terms. Consider daily rates vs. monthly commitments.

## 9. Nearby Businesses

Complementary businesses (like bars without kitchens) can drive traffic your way.

## 10. Safety and Lighting

For evening operations, ensure the area is well-lit and safe for customers and staff.

## Find Your Spot

Browse available vendor lots on Vendibook and find your perfect location.
    `,
    author: 'Vendibook Team',
    authorRole: 'Editorial',
    datePublished: '2024-12-20',
    category: 'business-tips',
    tags: ['vendor lot', 'location', 'business strategy'],
    readingTime: 5,
  },
  {
    slug: 'food-truck-maintenance-checklist',
    title: 'The Complete Food Truck Maintenance Checklist',
    description: 'Keep your food truck running smoothly with this comprehensive maintenance checklist covering daily, weekly, and monthly tasks.',
    excerpt: 'Prevent costly breakdowns and health code violations with proper food truck maintenance. Here\'s your complete checklist.',
    content: `
# The Complete Food Truck Maintenance Checklist

A well-maintained food truck is a profitable food truck. Regular maintenance prevents costly breakdowns, keeps you health-code compliant, and extends the life of your investment.

## Daily Maintenance Tasks

- [ ] Check oil and fluid levels
- [ ] Inspect tires for wear and proper inflation
- [ ] Clean all food preparation surfaces
- [ ] Empty grease traps
- [ ] Check refrigeration temperatures
- [ ] Test all equipment functionality

## Weekly Maintenance Tasks

- [ ] Deep clean the entire truck interior
- [ ] Check propane lines and connections
- [ ] Inspect fire extinguisher accessibility
- [ ] Clean exhaust hood and filters
- [ ] Check generator oil (if applicable)

## Monthly Maintenance Tasks

- [ ] Full vehicle inspection
- [ ] HVAC system check
- [ ] Pest control inspection
- [ ] Inventory and replace worn equipment
- [ ] Review and update food safety logs

## Seasonal Maintenance

- [ ] Prepare for weather changes
- [ ] Update winterization/summer prep
- [ ] Schedule professional servicing

## Record Keeping

Keep detailed maintenance logs for:
- Health department inspections
- Insurance claims
- Resale value documentation

## Need Help?

Check our help center for detailed maintenance guides, or browse Vendibook's marketplace for equipment and supplies.
    `,
    author: 'Vendibook Team',
    authorRole: 'Editorial',
    datePublished: '2024-12-15',
    category: 'equipment-guides',
    tags: ['maintenance', 'food truck', 'checklist', 'food safety'],
    readingTime: 6,
  },
  {
    slug: 'mobile-food-permit-guide-by-state',
    title: 'Mobile Food Vendor Permits: A State-by-State Guide',
    description: 'Navigate the complex world of mobile food vendor permits with our comprehensive state-by-state breakdown.',
    excerpt: 'Permit requirements vary dramatically by state. Here\'s what you need to know to stay compliant wherever you operate.',
    content: `
# Mobile Food Vendor Permits: A State-by-State Guide

Navigating mobile food vendor permits can be overwhelming. Requirements vary not just by state, but often by city and county. Here's an overview to help you get started.

## Common Permit Types

### Business License
Required in virtually all jurisdictions. This establishes your legal right to operate a business.

### Food Handler's Permit
Also known as a food handler's card. Required for anyone handling food.

### Health Department Permit
Issued after your truck passes a health inspection.

### Mobile Vendor Permit
Specific to operating a mobile food business.

### Fire Department Permit
Required in many areas, especially if using propane or open flames.

## State Highlights

### California
- Strict requirements
- County-by-county regulations
- MFF (Mobile Food Facility) permit required

### Texas
- Generally business-friendly
- City permits typically required
- State food handler certification

### Florida
- Division of Hotels and Restaurants oversight
- License and inspection required
- Mobile food dispensing vehicle permit

### New York
- Highly competitive permit system in NYC
- Limited permit numbers
- Different rules by borough

## Getting Help

Our AI-powered Permit Path tool can help you identify the specific permits needed for your location and business type.

## Stay Compliant

Vendibook listings include information about local permit requirements to help you make informed decisions.
    `,
    author: 'Vendibook Team',
    authorRole: 'Editorial',
    datePublished: '2024-12-10',
    category: 'permits-regulations',
    tags: ['permits', 'regulations', 'compliance', 'licensing'],
    readingTime: 8,
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(post => post.slug === slug);
}

export function getBlogPostsByCategory(category: string): BlogPost[] {
  return BLOG_POSTS.filter(post => post.category === category);
}

export function getFeaturedPosts(): BlogPost[] {
  return BLOG_POSTS.filter(post => post.featured);
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const currentPost = getBlogPostBySlug(currentSlug);
  if (!currentPost) return BLOG_POSTS.slice(0, limit);
  
  return BLOG_POSTS
    .filter(post => post.slug !== currentSlug)
    .filter(post => 
      post.category === currentPost.category ||
      post.tags.some(tag => currentPost.tags.includes(tag))
    )
    .slice(0, limit);
}
