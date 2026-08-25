/**
 * Phase 7 — Vendibook Authority / Backlink Opportunity Database
 *
 * Curated, internal-only prospect list. Priorities and competitor-link
 * observations are grounded in the Semrush backlink gap pull (Aug 2026).
 *
 * Hard rules baked into this dataset:
 * - No PBN / masslinker / Telegram link-seller / scraper domains. Ever.
 * - No disavow file (no manual action; spam links are ignored by Google).
 * - Relevance beats raw Authority Score.
 * - Never ask a site to remove a competitor link — earn our own inclusion.
 * - Natural branded anchors only: "Vendibook", "Vendibook marketplace",
 *   "PricePilot by Vendibook", raw URL.
 */

export type OpportunityType =
  | 'Industry association'
  | 'Food truck builder'
  | 'Trailer manufacturer'
  | 'Equipment supplier'
  | 'Commissary'
  | 'Financing/business resource'
  | 'Entrepreneur resource'
  | 'SBDC/SCORE'
  | 'Culinary program'
  | 'Local government'
  | 'Local business resource'
  | 'News/media'
  | 'Startup publication'
  | 'Food-business blog'
  | 'Marketplace directory'
  | 'Partner'
  | 'Data/journalism opportunity';

export type OpportunityPriority = 'high' | 'medium' | 'stretch';

export type OpportunityStatus =
  | 'not_started'
  | 'researching'
  | 'contact_identified'
  | 'pitched'
  | 'in_discussion'
  | 'earned'
  | 'declined'
  | 'on_hold';

export interface BacklinkOpportunity {
  domain: string;
  name: string;
  type: OpportunityType;
  priority: OpportunityPriority;
  /** Competitor observed receiving a link from this domain, if any. */
  competitorLinked?: string;
  /** Vendibook asset to pitch. */
  pitchAsset: string;
  /** Likely landing URL on Vendibook. */
  destination: string;
  angle: string;
  difficulty: 'low' | 'medium' | 'high';
  status: OpportunityStatus;
}

/* ------------------------------------------------------------------ */
/* HIGH PRIORITY — most realistic + valuable                           */
/* ------------------------------------------------------------------ */

const HIGH: BacklinkOpportunity[] = [
  {
    domain: 'jayde.com', name: 'Jayde Business Directory', type: 'Marketplace directory',
    priority: 'high', competitorLinked: 'Concession Nation',
    pitchAsset: 'Marketplace listing', destination: '/',
    angle: 'Legitimate, long-running B2B directory that already lists a competitor marketplace. Submit Vendibook under food service equipment / marketplaces.',
    difficulty: 'low', status: 'not_started',
  },
  {
    domain: 'intently.co', name: 'Intently Directory', type: 'Marketplace directory',
    priority: 'high', competitorLinked: 'UsedFoodTrucks',
    pitchAsset: 'Marketplace listing', destination: '/',
    angle: 'Already links a food-truck marketplace; add Vendibook as the rental + sale + financing alternative.',
    difficulty: 'low', status: 'not_started',
  },
  {
    domain: 'foodtruckoperator.com', name: 'Food Truck Operator (Networld Media)', type: 'News/media',
    priority: 'high',
    pitchAsset: 'PricePilot market data', destination: '/food-truck-prices',
    angle: 'The trade publication for the industry. Pitch a data story: "What food trucks actually cost in 2026 — asking-price data from a live marketplace." Offer charts with attribution.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'mobile-cuisine.com', name: 'Mobile Cuisine', type: 'Food-business blog',
    priority: 'high',
    pitchAsset: 'Startup resources + pricing data', destination: '/tools/startup-guide',
    angle: 'Long-running food truck startup blog. Offer Vendibook as a buy/sell/rent resource for their "getting started" content, plus citable pricing data.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'foodtruckr.com', name: 'FoodTruckr', type: 'Food-business blog',
    priority: 'high',
    pitchAsset: 'Startup guide + marketplace', destination: '/tools/startup-guide',
    angle: 'Startup-focused food truck publication; pitch the free Startup Guide and marketplace as resources for new operators.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'roaminghunger.com', name: 'Roaming Hunger', type: 'Partner',
    priority: 'high',
    pitchAsset: 'Rental marketplace / event supply', destination: '/food-trucks-for-rent',
    angle: 'Adjacent (booking/catering) rather than direct competitor. Explore a genuine referral relationship for equipment purchase/rental intent they can\'t serve.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'score.org', name: 'SCORE', type: 'SBDC/SCORE',
    priority: 'high',
    pitchAsset: 'Startup guide + PricePilot', destination: '/tools/startup-guide',
    angle: 'National small-business mentoring org with food-business resource pages. Pitch Vendibook as a free marketplace + pricing resource for food entrepreneurs.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'azsbdc.net', name: 'Arizona SBDC Network', type: 'SBDC/SCORE',
    priority: 'high',
    pitchAsset: 'Startup guide + marketplace', destination: '/tools/startup-guide',
    angle: 'Home-state SBDC. Tucson/Arizona angle: local founder building tools for mobile food businesses. Ask for inclusion in food-business startup resource lists.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'azcommerce.com', name: 'Arizona Commerce Authority', type: 'Local government',
    priority: 'high',
    pitchAsset: 'Company profile / startup story', destination: '/what-is-vendibook',
    angle: 'State economic-development body; Arizona startup building a national marketplace. Explore small-business resource listings and ACA programs.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'tucson.com', name: 'Arizona Daily Star / This Is Tucson', type: 'News/media',
    priority: 'high',
    pitchAsset: 'Local startup story + PricePilot data', destination: '/press',
    angle: 'Local paper covering Tucson entrepreneurship and the food-truck economy. Pitch: Tucson-built marketplace + original pricing data on the mobile food industry.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'azcentral.com', name: 'azcentral / Arizona Republic', type: 'News/media',
    priority: 'high',
    pitchAsset: 'Local startup story + pricing data', destination: '/press',
    angle: 'Statewide reach; Arizona small-business and food scene coverage. Data-driven story about food truck prices in Arizona vs. national medians.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'cronkitenews.azpbs.org', name: 'Cronkite News (ASU)', type: 'News/media',
    priority: 'high',
    pitchAsset: 'Marketplace data story', destination: '/food-truck-prices',
    angle: 'Student-run professional newsroom covering Arizona business. Accessible first media target; pitch the pricing-data story with charts.',
    difficulty: 'low', status: 'not_started',
  },
  {
    domain: 'equinoxfunding.com', name: 'Equinox Funding (financing partner)', type: 'Financing/business resource',
    priority: 'high',
    pitchAsset: 'Partner/vendor page', destination: '/financing',
    angle: 'ACTIVE financing partner already referenced in Vendibook\'s footer. Ask whether they maintain a dealer/vendor or marketplace-partner page where Vendibook belongs.',
    difficulty: 'low', status: 'not_started',
  },
  {
    domain: 'sdgtrailers.com', name: 'SDG Trailers', type: 'Trailer manufacturer',
    priority: 'high',
    pitchAsset: 'Seller storefront / listed-on-Vendibook', destination: '/search',
    angle: 'Builder whose units already appear on Vendibook. Offer a genuine "our equipment is listed on Vendibook" pathway plus resale-marketplace resource for their buyers. Do NOT replicate their sister-site link schemes.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'unifiedtrailers.com', name: 'Unified Trailers', type: 'Trailer manufacturer',
    priority: 'high', competitorLinked: 'ConcessionTrailer.com',
    pitchAsset: 'Resale marketplace resource', destination: '/food-trailers-for-sale',
    angle: 'Already links a competitor marketplace. Pitch Vendibook as an additional resale channel resource for their customers.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'bqfoodtrucksandtrailers.com', name: 'BQ Food Trucks & Trailers', type: 'Food truck builder',
    priority: 'high', competitorLinked: 'ConcessionTrailer.com',
    pitchAsset: 'Resale marketplace resource', destination: '/food-trucks-for-sale',
    angle: 'Builder already linking a competitor; offer Vendibook as the place their clients can later resell or rent out builds.',
    difficulty: 'low', status: 'not_started',
  },
  {
    domain: 'foodtruckbuildersofphoenix.com', name: 'Food Truck Builders of Phoenix', type: 'Food truck builder',
    priority: 'high',
    pitchAsset: 'Listed-on-Vendibook / resale channel', destination: '/food-trucks-for-sale/arizona',
    angle: 'Arizona builder already ranking for shared keywords. Local partner angle: resale + rental marketplace for their clients, Arizona state marketplace page.',
    difficulty: 'low', status: 'not_started',
  },
  {
    domain: 'thefoodtruckempire.co', name: 'Food Truck Empire', type: 'Food-business blog',
    priority: 'high',
    pitchAsset: 'Pricing data + startup resources', destination: '/food-truck-prices',
    angle: 'Popular food-truck startup blog and organic keyword neighbor. Pitch citable pricing data and the free startup toolkit.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'nraef.org', name: 'National Restaurant Association Educational Foundation', type: 'Industry association',
    priority: 'high',
    pitchAsset: 'Entrepreneurship resources', destination: '/tools/startup-guide',
    angle: 'Association resource pages for food entrepreneurship; long-lead but highly credible inclusion.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'foodtrucknation.us', name: 'Food Truck Nation (US Chamber Foundation)', type: 'Industry association',
    priority: 'high',
    pitchAsset: 'Marketplace + regulatory/pricing resources', destination: '/',
    angle: 'Chamber-backed food truck advocacy project with resource links. Pitch Vendibook as a marketplace resource for operators.',
    difficulty: 'high', status: 'not_started',
  },
];

/* ------------------------------------------------------------------ */
/* MEDIUM PRIORITY — strong but harder                                 */
/* ------------------------------------------------------------------ */

const MEDIUM: BacklinkOpportunity[] = [
  {
    domain: 'onlyfoodtrucks.com', name: 'Only Food Trucks', type: 'Marketplace directory',
    priority: 'medium',
    pitchAsset: 'Marketplace profile', destination: '/',
    angle: 'Adjacent marketplace/community; explore resource or partner placement rather than competitive displacement.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'uscustomconcessions.com', name: 'US Custom Concessions', type: 'Food truck builder',
    priority: 'medium',
    pitchAsset: 'Resale marketplace resource', destination: '/sell-my-food-truck',
    angle: 'Custom builder; pitch "where your clients can resell or monetize their build" resource link.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'ranchotrailers.com', name: 'Rancho Trailers', type: 'Trailer manufacturer',
    priority: 'medium',
    pitchAsset: 'Resale marketplace resource', destination: '/food-trailers-for-sale',
    angle: 'Trailer manufacturer ranking for shared terms; resale-channel angle.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'sancheztrailers.net', name: 'Sanchez Trailers', type: 'Trailer manufacturer',
    priority: 'medium',
    pitchAsset: 'Resale marketplace resource', destination: '/food-trailers-for-sale',
    angle: 'Trailer builder with meaningful organic traffic; resale + financing pathway for their buyers.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'awesomefoodtrailers.com', name: 'Awesome Food Trailers', type: 'Trailer manufacturer',
    priority: 'medium',
    pitchAsset: 'Resale marketplace resource', destination: '/food-trailers-for-sale',
    angle: 'Builder with solid organic presence; "listed on Vendibook" resale and rental angle.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'flameboxtrailers.com', name: 'Flamebox Trailers', type: 'Trailer manufacturer',
    priority: 'medium',
    pitchAsset: 'Resale marketplace resource', destination: '/food-trailers-for-sale',
    angle: 'Builder partner candidate; resale-channel resource.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'specialtyvehicleexchange.com', name: 'Specialty Vehicle Exchange', type: 'Marketplace directory',
    priority: 'medium',
    pitchAsset: 'Marketplace listing', destination: '/',
    angle: 'Specialty-vehicle marketplace neighbor; directory/resource cross-listing where editorially appropriate.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'restaurantowner.com', name: 'RestaurantOwner.com', type: 'Food-business blog',
    priority: 'medium',
    pitchAsset: 'Pricing data + startup guide', destination: '/food-truck-prices',
    angle: 'Operator resource site; offer pricing data and startup tools for their food-truck-curious audience.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'pos.toasttab.com', name: 'Toast Blog (On the Line)', type: 'Food-business blog',
    priority: 'medium',
    pitchAsset: 'Pricing data citation', destination: '/food-truck-prices',
    angle: 'High-authority restaurant-industry publication. Pitch citable marketplace pricing data for their food-truck cost articles.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'squareup.com', name: 'Square (The Bottom Line)', type: 'Food-business blog',
    priority: 'medium',
    pitchAsset: 'Pricing data citation', destination: '/food-truck-prices',
    angle: 'Publishes "how much does a food truck cost" guides; offer original marketplace data as a citable source.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'nerdwallet.com', name: 'NerdWallet Small Business', type: 'Financing/business resource',
    priority: 'medium',
    pitchAsset: 'Financing education + pricing data', destination: '/financing',
    angle: 'Food-truck financing content; offer marketplace pricing data and financing-pathway education as citation material.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'sba.gov', name: 'U.S. Small Business Administration', type: 'Local government',
    priority: 'medium',
    pitchAsset: 'Startup resources', destination: '/tools/startup-guide',
    angle: 'SBA local-office resource pages occasionally list industry tools. Only pursue where inclusion genuinely helps their food-business audiences.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'tucsonchamber.org', name: 'Tucson Metro Chamber', type: 'Local business resource',
    priority: 'medium',
    pitchAsset: 'Member marketplace profile', destination: '/what-is-vendibook',
    angle: 'Local chamber membership directory + small-business resource pages.',
    difficulty: 'low', status: 'not_started',
  },
  {
    domain: 'phoenixchamber.com', name: 'Greater Phoenix Chamber', type: 'Local business resource',
    priority: 'medium',
    pitchAsset: 'Member directory', destination: '/what-is-vendibook',
    angle: 'Statewide business directory presence for an Arizona startup.',
    difficulty: 'low', status: 'not_started',
  },
  {
    domain: 'kgun9.com', name: 'KGUN 9 Tucson', type: 'News/media',
    priority: 'medium',
    pitchAsset: 'Local startup story', destination: '/press',
    angle: 'Tucson TV station; local-entrepreneur segment pitching the marketplace + food truck economy data.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'kold.com', name: 'KOLD 13 Tucson', type: 'News/media',
    priority: 'medium',
    pitchAsset: 'Local startup story', destination: '/press',
    angle: 'Tucson TV; consumer angle: what a food truck costs in Arizona, citing Vendibook marketplace data.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'bizjournals.com', name: 'Phoenix Business Journal', type: 'News/media',
    priority: 'medium',
    pitchAsset: 'Startup profile + marketplace data', destination: '/press',
    angle: 'Business-journal startup coverage; pitch Arizona marketplace growth + original pricing research.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'insider.azpbs.org', name: 'Arizona PBS', type: 'News/media',
    priority: 'medium',
    pitchAsset: 'Local business story', destination: '/press',
    angle: 'Public-media coverage of Arizona small business and food culture.',
    difficulty: 'medium', status: 'not_started',
  },
  {
    domain: 'webstaurantstore.com', name: 'WebstaurantStore (Resources blog)', type: 'Equipment supplier',
    priority: 'medium',
    pitchAsset: 'Pricing data citation', destination: '/food-truck-prices',
    angle: 'Major equipment supplier with a large resource blog covering food truck startup costs; offer citable marketplace data.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'foodtruckcatering.com', name: 'Food Truck Catering / event networks', type: 'Partner',
    priority: 'medium',
    pitchAsset: 'Rental marketplace', destination: '/food-trucks-for-rent',
    angle: 'Event-side networks encounter operators needing equipment; referral/resource relationship.',
    difficulty: 'medium', status: 'not_started',
  },
];

/* ------------------------------------------------------------------ */
/* STRETCH — major publications needing a stronger story               */
/* ------------------------------------------------------------------ */

const STRETCH: BacklinkOpportunity[] = [
  {
    domain: 'entrepreneur.com', name: 'Entrepreneur', type: 'Startup publication',
    priority: 'stretch',
    pitchAsset: 'Annual marketplace research', destination: '/food-truck-prices',
    angle: 'Needs the annual "State of the Mobile Food Marketplace" report before pitching. Founder-led franchise/food-business coverage.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'qsrmagazine.com', name: 'QSR Magazine', type: 'News/media',
    priority: 'stretch',
    pitchAsset: 'Marketplace data story', destination: '/food-truck-prices',
    angle: 'Major food-service trade publication; pitch once the dataset is deeper (multi-quarter trends).',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'nrn.com', name: 'Nation\'s Restaurant News', type: 'News/media',
    priority: 'stretch',
    pitchAsset: 'Marketplace data story', destination: '/food-truck-prices',
    angle: 'Top-tier industry publication; requires statistically strong multi-state dataset.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'techcrunch.com', name: 'TechCrunch', type: 'Startup publication',
    priority: 'stretch',
    pitchAsset: 'Marketplace/startup milestone', destination: '/press',
    angle: 'Only on a real news event: meaningful marketplace milestone, major partnership, or funding. Not for data releases.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'forbes.com', name: 'Forbes (contributor network)', type: 'Startup publication',
    priority: 'stretch',
    pitchAsset: 'Founder commentary + data', destination: '/press',
    angle: 'Founder/expert commentary on the mobile food economy backed by PricePilot data.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'inc.com', name: 'Inc.', type: 'Startup publication',
    priority: 'stretch',
    pitchAsset: 'Founder story + marketplace data', destination: '/press',
    angle: 'Small-business angle: building a marketplace for the food-truck economy from Tucson.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'cnbc.com', name: 'CNBC Small Business', type: 'News/media',
    priority: 'stretch',
    pitchAsset: 'Annual report', destination: '/food-truck-prices',
    angle: '"What it costs to start a food truck" consumer coverage; requires the annual report and stronger AS.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'foodnetwork.com', name: 'Food Network / Discovery digital', type: 'News/media',
    priority: 'stretch',
    pitchAsset: 'Food truck economy data', destination: '/food-truck-prices',
    angle: 'Consumer food media occasionally covers food-truck economics; pitch with strong visual data assets.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'uspolicy?none', name: 'National Food Truck Association chapters', type: 'Industry association',
    priority: 'stretch',
    pitchAsset: 'Member marketplace resource', destination: '/',
    angle: 'Regional food-truck associations (NYCFTA, SoCal MFVA, etc.) maintain member resource pages. Map active chapters, then approach individually with member value.',
    difficulty: 'high', status: 'not_started',
  },
  {
    domain: 'kickstarter?none', name: 'Culinary incubators & commissary networks (national)', type: 'Culinary program',
    priority: 'stretch',
    pitchAsset: 'Marketplace + commissary listings', destination: '/shared-kitchens',
    angle: 'Incubators like shared-kitchen networks list resources for graduates; pitch Vendibook\'s commissary rentals + equipment marketplace once commissary inventory is deeper.',
    difficulty: 'high', status: 'not_started',
  },
];

export const BACKLINK_OPPORTUNITIES: BacklinkOpportunity[] = [...HIGH, ...MEDIUM, ...STRETCH];

/* ------------------------------------------------------------------ */
/* Baseline snapshot (Semrush pull, Aug 2026)                          */
/* ------------------------------------------------------------------ */

export interface AuthorityBaseline {
  measuredAt: string;
  authorityScore: number;
  trustScore: number;
  referringDomains: number;
  totalBacklinks: number;
  followLinks: number;
  nofollowLinks: number;
  /** Referring domains classified as suspicious spam/PBN in the pull. */
  suspiciousReferringDomains: number;
  /** Legitimate/relevant referring domains observed. */
  relevantReferringDomains: number;
  notes: string[];
}

export const AUTHORITY_BASELINE: AuthorityBaseline = {
  measuredAt: '2026-08-25',
  authorityScore: 6,
  trustScore: 6,
  referringDomains: 29,
  totalBacklinks: 40,
  followLinks: 14,
  nofollowLinks: 26,
  suspiciousReferringDomains: 9,
  relevantReferringDomains: 0,
  notes: [
    'No Google manual action — NO disavow file submitted. Weak links are diluted with earned authority, not panic-deleted.',
    'Top anchors are PBN/Fiverr spam ("premium pbn network", "Fiverr... dr15 to dr40") — evidence a paid link package was purchased historically. Never repeat.',
    'Every competitor profile (UsedVending, UsedFoodTrucks, ConcessionNation, ConcessionTrailer, SDG) contains the SAME spam cluster (masslinker, @seo_linkk_order, eurekster, vvedrada.gov.ua, assurances.gov.gh, barcelonadesignweek.es, carbonchemist.com). These are excluded from all targeting.',
    'UsedVending authority is inflated: ~15.4M of 24.7M backlinks come from ONE sister site (allusedtrailers.com) and ~8.8M from aggregator claz.org. Do not chase their raw numbers.',
    'Legitimate competitor links worth earning: jayde.com (Concession Nation), intently.co (UsedFoodTrucks), unifiedtrailers.com + bqfoodtrucksandtrailers.com (ConcessionTrailer).',
  ],
};

/** Phase 7 quality targets — not raw link counts. */
export const AUTHORITY_TARGETS = {
  milestone1: 'Earn 10–20 genuinely relevant new referring domains',
  milestone2: 'Earn 25–50 strong industry/business/media referring domains over time',
  kpis: [
    'Authority Score (Semrush)',
    'Referring domains (total / relevant / editorial)',
    'Referral sessions from earned links',
    'Links to /food-truck-prices (PricePilot)',
    'Links to marketplace category pages',
    'Unlinked brand mentions found → converted',
    'Signups, listing creation, financing actions from referral sources',
  ],
};

/** Domains permanently excluded from targeting (spam cluster + sister sites). */
export const EXCLUDED_DOMAINS: { domain: string; reason: string }[] = [
  { domain: 'allusedtrailers.com', reason: 'UsedVending sister-site mass links' },
  { domain: 'sellmyfoodtruck.com', reason: 'UsedVending sister site' },
  { domain: 'claz.org', reason: 'Aggregator mass links' },
  { domain: 'eurekster.com', reason: 'Spam cluster present across all competitors' },
  { domain: 'vvedrada.gov.ua', reason: 'Compromised/hacked gov domain link spam' },
  { domain: 'assurances.gov.gh', reason: 'Compromised/hacked gov domain link spam' },
  { domain: 'barcelonadesignweek.es', reason: 'Spam cluster' },
  { domain: 'carbonchemist.com', reason: 'Spam cluster' },
  { domain: 'antonioveras.com.br', reason: 'Spam cluster' },
  { domain: 'eastphoenixau.com', reason: 'Spam cluster' },
  { domain: 'masslinker.com', reason: 'Automated link-selling software anchors' },
  { domain: 'portailorange.net', reason: 'PBN anchor spam targeting Vendibook' },
  { domain: 'qwenterprise.com', reason: 'PBN anchor spam targeting Vendibook' },
  { domain: '8coint.com', reason: 'PBN anchor spam targeting Vendibook' },
  { domain: 'creativeposts.top', reason: 'PBN (.top) spam' },
  { domain: 'metamagic.top', reason: 'PBN (.top) spam' },
  { domain: 'optimizeflow.top', reason: 'PBN (.top) spam' },
  { domain: 'analyticshaven.top', reason: 'PBN (.top) spam' },
  { domain: 'shortenurls.eu', reason: 'Link-shortener spam' },
  { domain: 'toplikevideo.com', reason: 'PBN spam' },
  { domain: 'backlinks-checker.com', reason: 'SEO-tool scraper' },
  { domain: 'sdgdoors.com', reason: 'SDG sister site — do not replicate sister-site schemes' },
  { domain: 'sdgtrailersdirect.com', reason: 'SDG sister site' },
];
