import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';
import { 
  Home,
  Shield,
  FileCheck,
  MapPin,
  Building2,
  Truck,
  ChefHat,
  Scale,
  BookOpen,
  ExternalLink,
  Search,
  Award,
  AlertTriangle,
  CheckCircle2,
  Info,
  Globe,
  Flame,
  Droplets,
  Zap,
  DollarSign,
  Clock,
  Users,
  GraduationCap,
  Car,
  Store,
  Sparkles,
  ArrowRight
} from 'lucide-react';

// ANSI-Accredited Certification Providers
const CERTIFICATION_PROVIDERS = [
  {
    name: 'ServSafe',
    organization: 'National Restaurant Association Solutions',
    type: 'Manager & Handler',
    description: 'Most universally recognized credential in the industry. Covers microbiology, HACCP principles, allergen management, and cross-contamination prevention.',
    url: 'https://www.servsafe.com',
    accepted: 'All 50 states',
    cost: '$36 (Handler) / $195 (Manager)',
    features: ['Proctored exams', 'Food Safety First Principles', 'Advanced management training', 'Allergen modules available']
  },
  {
    name: 'StateFoodSafety (Certus)',
    organization: 'StateFoodSafety.com',
    type: 'Manager & Handler',
    description: 'Often partnered directly with local health departments for digital delivery. Integration with local government portals makes verification seamless.',
    url: 'https://www.statefoodsafety.com',
    accepted: 'All 50 states',
    cost: '$10-$15 (Handler) / $78 (Manager)',
    features: ['Digital-first delivery', 'Health department integrations', 'Mobile-friendly', 'Fast results']
  },
  {
    name: 'NRFSP',
    organization: 'National Registry of Food Safety Professionals',
    type: 'Manager',
    description: 'Provides the International Certified Food Safety Manager credential. Widely accepted for complex supply chains or international franchising.',
    url: 'https://www.nrfsp.com',
    accepted: 'All 50 states',
    cost: '$125-$175',
    features: ['International recognition', 'Complex supply chain focus', 'Prometric testing centers']
  },
  {
    name: 'Learn2Serve (360training)',
    organization: '360training.com',
    type: 'Manager & Handler',
    description: 'Popular for online-based training, particularly for Food Handler requirements due to cost-effectiveness and accessibility.',
    url: 'https://www.learn2serve.com',
    accepted: 'All 50 states',
    cost: '$7.95 (Handler) / $99 (Manager)',
    features: ['Budget-friendly', 'Self-paced online', 'Alcohol training available', 'Cannabis vendor training']
  },
  {
    name: 'Always Food Safe',
    organization: 'The Always Food Safe Company',
    type: 'Manager & Handler',
    description: 'Emerging provider focusing on video-based learning with user-friendly interface while maintaining full ANSI accreditation.',
    url: 'https://www.alwaysfoodsafe.com',
    accepted: 'All 50 states',
    cost: '$9.99 (Handler) / $89 (Manager)',
    features: ['Video-based learning', 'User-friendly interface', 'Mobile compatible']
  },
  {
    name: 'Prometric',
    organization: 'Prometric Testing',
    type: 'Manager (CPFM)',
    description: 'Major testing organization offering the Certified Professional Food Manager (CPFM) exam at testing centers nationwide.',
    url: 'https://www.prometric.com',
    accepted: 'All 50 states',
    cost: '$120-$150',
    features: ['In-person testing centers', 'Scheduled exams', 'Professional proctoring']
  }
];

// Specialized Training
const SPECIALIZED_TRAINING = [
  {
    category: 'Allergen Awareness',
    requirement: 'Required in IL, MA, MD, and increasingly other states',
    providers: [
      { name: 'MenuTrinfo AllerTrain', url: 'https://www.menutrinfo.com', note: 'ANSI-accredited, designed for state mandates' },
      { name: 'ServSafe Allergens', url: 'https://www.servsafe.com', note: 'Add-on module to manager certification' }
    ],
    covers: 'Big 9 allergens: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame'
  },
  {
    category: 'Alcohol Service',
    requirement: 'Required for alcohol retail/delivery',
    providers: [
      { name: 'ServSafe Alcohol', url: 'https://www.servsafe.com', note: 'Industry standard for responsible service' },
      { name: 'Learn2Serve TABC/Alcohol', url: 'https://www.learn2serve.com', note: 'State-specific programs' }
    ],
    covers: 'ID checking, intoxication signs, delivery regulations by state'
  }
];

// State-by-State Mobile Food Regulations
const STATE_REGULATIONS = [
  {
    state: 'Arizona',
    regions: [
      {
        name: 'Maricopa County (Phoenix)',
        agency: 'Maricopa County Environmental Services',
        requirements: [
          'Type I/II/III classification based on food prep complexity',
          'Pre-Operational Attestation required before first inspection',
          'Daily commissary return mandatory',
          'Out of County Commissary requires special approval',
          'Reciprocity available for neighboring county permits'
        ],
        keyForms: ['Mobile Food Pre-Operational Attestation', 'Type Classification Application', 'Commissary Agreement'],
        url: 'https://www.maricopa.gov/mobileFood',
        notes: 'Tax Code 062 for mobile vendors; specific location-tied Mobile Vending License required'
      },
      {
        name: 'Pima County (Tucson)',
        agency: 'Pima County Health Department',
        requirements: [
          'Type 3 Menu classification for full-service cooking',
          'Minimum 30 gallons fresh water for 3-compartment sink',
          'Wastewater tank must be 15% larger than fresh water tank',
          'Route sheet required; restroom access for stops over 1 hour',
          'Commissary agreement must be approved before payment'
        ],
        keyForms: ['MFU Plan Review Application', 'Servicing Area Agreement'],
        url: 'https://www.pima.gov/mfu'
      }
    ]
  },
  {
    state: 'California',
    regions: [
      {
        name: 'Los Angeles County',
        agency: 'LA County Department of Public Health',
        requirements: [
          'Plan Check required before operation',
          'Supplemental Application with Route Sheet',
          'Must use approved commissary from published list',
          'CMFO (Compact Mobile Food Operation) for sidewalk vendors',
          'Letter grading system similar to restaurants'
        ],
        keyForms: ['Supplemental Application for Mobile Food Facility', 'Commissary Letter'],
        url: 'https://publichealth.lacounty.gov',
        notes: 'Published list includes Soho Commissary, A-1 Catering, etc.'
      },
      {
        name: 'San Diego County',
        agency: 'Department of Environmental Health and Quality',
        requirements: [
          'Visible letter grading system (A/B/C)',
          'Construction Guides for carts and trucks',
          'Written Standard Operating Procedures required',
          'Different requirements for packaged vs unpackaged push carts'
        ],
        keyForms: ['SOPs Document', 'Plan Check Guide'],
        url: 'https://www.sandiegocounty.gov/deh'
      },
      {
        name: 'Santa Clara County',
        agency: 'Santa Clara County DEH',
        requirements: [
          'HCD Insignia required for occupied vehicles (step-in trucks)',
          'State Housing and Community Development certification',
          'San Jose: Fresh fruit exemption for whole uncut produce',
          'Administrative Permit for private property vending over 2 hours'
        ],
        keyForms: ['HCD Insignia Proof', 'Administrative Permit Application'],
        url: 'https://www.sccgov.org/deh',
        notes: 'No vending in residential zones; 500-foot distance from other vendors'
      }
    ]
  },
  {
    state: 'Texas',
    regions: [
      {
        name: 'Harris County (Houston)',
        agency: 'Harris County Public Health',
        requirements: [
          'Metal Medallion system - physical badge on vehicle',
          'Physical inspection required at 8000 North Stadium Drive',
          'Notarized Commissary Letter required',
          'Property Agreement Letter with notarized restroom access',
          'Change of Ownership voids grandfathered variances'
        ],
        keyForms: ['Equipment List', 'Medallion Application', 'Property Agreement Letter'],
        url: 'https://publichealth.harriscountytx.gov',
        notes: 'Truck must be brought to office for inspection'
      },
      {
        name: 'Dallas County',
        agency: 'Dallas County Health and Human Services',
        requirements: [
          'Class IV for fully enclosed trucks with cooking',
          'Class III for trailers with external covered cooking',
          'Fire Department propane permit is prerequisite',
          'Home-based operations explicitly NOT allowed'
        ],
        keyForms: ['Dallas Commissary Approval Form', 'Fire Permit Application'],
        url: 'https://www.dallascounty.org/hhsd'
      },
      {
        name: 'Travis County (Austin)',
        agency: 'Austin Public Health',
        requirements: [
          'Notarized Central Preparation Facility (CPF) Contract',
          'CPF must verify grease trap pumping frequency',
          'Separate fire inspection required (~$200)',
          'Fire inspection must precede health permit'
        ],
        keyForms: ['CPF Contract', 'Fire Safety Permit'],
        url: 'https://www.austintexas.gov/aph'
      },
      {
        name: 'Bexar County (San Antonio)',
        agency: 'San Antonio Metro Health',
        requirements: [
          'Background checks for frozen confection vendors (ice cream)',
          'SAPD manages background check process',
          '300-foot distance from school property lines during school hours',
          'Distinction between Mobile Vending and Temporary Events'
        ],
        keyForms: ['Background Check Application', 'Mobile Vending Permit'],
        url: 'https://www.sanantonio.gov/health'
      }
    ]
  },
  {
    state: 'Illinois',
    regions: [
      {
        name: 'Chicago',
        agency: 'Chicago Department of Public Health',
        requirements: [
          'Mobile Food Dispenser: pre-packaged only',
          'Mobile Food Preparer: can cook on board ($1,000 vs $700)',
          'Mandatory GPS tracking device with 95% accuracy',
          'Real-time location data to city-accessible service',
          'Cannot stay in one location over 2 hours (unless designated)',
          'ServSafe must be registered with CDPH for City certificate'
        ],
        keyForms: ['GPS Device Certification', 'City of Chicago Food Service Sanitation Manager Certificate'],
        url: 'https://www.chicago.gov/cdph',
        notes: 'GPS must be active during vending and servicing'
      }
    ]
  },
  {
    state: 'New York',
    regions: [
      {
        name: 'New York City',
        agency: 'NYC DOHMH / Dept of Consumer and Worker Protection',
        requirements: [
          'Mobile Food Vending License (individual ID card)',
          'Mobile Food Vending Unit Permit (truck decal)',
          'Permit cap with years-long waitlist',
          'Supervisory License required to apply for new permits',
          'Green Carts: easier permits for raw produce in specific precincts',
          'Restricted Area Permits for private property/parks'
        ],
        keyForms: ['Waiting List Application', 'Supervisory License Application', 'Green Cart Permit'],
        url: 'https://www.nyc.gov/dohmh',
        notes: 'Black market permit rentals are illegal but common; new Supervisory License system aims to curb this'
      }
    ]
  },
  {
    state: 'Pennsylvania',
    regions: [
      {
        name: 'Philadelphia',
        agency: 'Philadelphia Dept of Public Health',
        requirements: [
          'Commercial Activity License from Dept of Revenue first',
          'Tax account required before health permit',
          'Support Facility Information with recent inspection report',
          'Out-of-city support facilities need that jurisdiction\'s food license'
        ],
        keyForms: ['Commercial Activity License', 'Support Facility Information Form'],
        url: 'https://www.phila.gov/health'
      }
    ]
  },
  {
    state: 'Florida',
    regions: [
      {
        name: 'Statewide',
        agency: 'DBPR Division of Hotels and Restaurants',
        requirements: [
          'Mobile Food Dispensing Vehicle (MFDV) license',
          'Plan Review (HR-7031) for new vehicles',
          'Commissary Notification (HR-7022) for water/waste',
          'Self-sufficient vehicles may be exempt from daily visits',
          'Special sub-category for theme park food carts'
        ],
        keyForms: ['HR-7031 Plan Review', 'HR-7022 Commissary Notification'],
        url: 'https://www.myfloridalicense.com/dbpr',
        notes: 'State-level preemption simplifies some aspects'
      }
    ]
  }
];

// Cottage Food Laws Comparison
const COTTAGE_FOOD_LAWS = [
  {
    state: 'Florida',
    model: 'Food Freedom (High Revenue)',
    revenueCap: '$250,000',
    permitRequired: 'No',
    inspection: 'No',
    allowedFoods: 'Non-TCS: loaf breads, honey, nut butters, jams, cookies',
    prohibited: 'Salsa, BBQ sauce, ketchup (pH risks), cream cheese frosting, pumpkin pie',
    salesVenues: 'Direct, Internet, Mail',
    labelRequirement: '"Made in a cottage food operation that is not subject to Florida\'s food safety regulations"',
    agency: 'FDACS'
  },
  {
    state: 'Texas',
    model: 'SB 541 (Updated)',
    revenueCap: '$150,000 (inflation indexed)',
    permitRequired: 'No (unless TCS)',
    inspection: 'No',
    allowedFoods: 'Non-TCS + acidified canned goods (pickles, salsas if pH < 4.6)',
    prohibited: 'Meat, poultry, seafood, raw milk',
    salesVenues: 'Direct, Internet',
    labelRequirement: 'Standard cottage food label',
    agency: 'DSHS',
    notes: 'Local health departments prohibited from regulating cottage food'
  },
  {
    state: 'New York',
    model: 'Home Processor (Article 20-C)',
    revenueCap: 'None',
    permitRequired: 'Registration',
    inspection: 'No (unless complaint)',
    allowedFoods: 'Breads, rolls, cookies, double-crust fruit pies',
    prohibited: 'Chocolate tempering, pickles, internet sales for direct transactions',
    salesVenues: 'Wholesale & Retail (in-state only)',
    labelRequirement: 'Standard food label',
    agency: 'Dept of Ag & Markets'
  },
  {
    state: 'Illinois',
    model: 'Cottage Food Operation',
    revenueCap: '$75,000',
    permitRequired: 'Registration',
    inspection: 'No',
    allowedFoods: 'Baked goods, jams, jellies, candy',
    prohibited: 'Garlic in oil, pumpkin pies (custard), sprouts, cut leafy greens',
    salesVenues: 'Direct sales',
    labelRequirement: 'Standard cottage food label',
    agency: 'Local health department'
  },
  {
    state: 'Pennsylvania',
    model: 'Limited Food Establishment',
    revenueCap: 'None',
    permitRequired: 'Registration + Plan Review',
    inspection: 'Yes',
    allowedFoods: 'Non-TCS + acidified foods + fermented foods',
    prohibited: 'TCS foods (unless separate kitchen area)',
    salesVenues: 'Direct, Wholesale, Internet',
    labelRequirement: 'Standard food label',
    agency: 'Dept of Agriculture',
    notes: 'Allows salsa, pickles, fermented foods - unique middle ground'
  }
];

// MEHKO (Microenterprise Home Kitchen) Data
const MEHKO_DATA = {
  description: 'California\'s AB 626 allows preparation of meals (including meat and perishables) in home kitchens for public consumption. Counties must opt-in.',
  limits: 'Up to 30 meals/day or 90 meals/week',
  adoptedCounties: [
    {
      name: 'Riverside County',
      fee: 'Varies',
      requirements: ['Food Safety Manager Certificate', 'Kitchen inspection', 'Water testing if on private well'],
      form: 'Application/Registration to Operate'
    },
    {
      name: 'San Diego County',
      fee: '$588 initial (grants sometimes available)',
      requirements: ['Standard Operating Procedures', 'Same-day cook and serve (no leftovers sold)', 'Kitchen inspection'],
      form: 'MEHKO Application',
      notes: 'Approved in 2022'
    },
    {
      name: 'Los Angeles County',
      fee: '$597 initial',
      requirements: ['Rigorous review', 'Generally cannot use third-party delivery apps', 'Direct sales focus'],
      form: 'LA County MEHKO Application'
    },
    {
      name: 'Santa Clara County',
      fee: 'Varies',
      requirements: ['Standard requirements'],
      form: 'MEHKO Registration'
    },
    {
      name: 'Alameda County',
      fee: 'Varies',
      requirements: ['Standard requirements'],
      form: 'MEHKO Registration'
    }
  ]
};

// Commissary Resources
const COMMISSARY_RESOURCES = [
  {
    name: 'The Kitchen Door',
    description: 'Digital marketplace connecting chefs with underutilized commercial kitchens. Vets facilities for commercial licensing.',
    url: 'https://www.thekitchendoor.com',
    regions: ['Maryland', 'Arizona', 'Georgia', 'Nationwide expansion']
  },
  {
    name: 'LA County Approved Commissaries',
    description: 'Official list maintained by LA County DPH including Soho Commissary, A-1 Catering, and more.',
    url: 'https://publichealth.lacounty.gov',
    regions: ['Los Angeles County']
  },
  {
    name: 'Bay Area Commissaries',
    description: 'Alameda County directory including Kitchen by the Hour (Hayward), La Palmera (San Pablo).',
    url: 'https://www.acgov.org/aceh',
    regions: ['Alameda County', 'Bay Area']
  },
  {
    name: 'Amped Kitchens',
    description: 'Premium shared kitchen spaces with full commissary services.',
    url: 'https://www.ampedkitchens.com',
    regions: ['Los Angeles', 'Chicago']
  }
];

// Ghost Kitchen Regulations
const GHOST_KITCHEN_INFO = {
  definition: 'Ghost kitchens (dark kitchens) prepare food for delivery without a storefront.',
  classifications: [
    { jurisdiction: 'NYC', classification: 'Non-Retail Food Processing Establishment (no walk-ins) or Food Service Establishment (with walk-ins)' },
    { jurisdiction: 'General', classification: 'Standard business license + DBAs for each virtual brand' }
  ],
  alcoholDelivery: [
    { state: 'Georgia', rule: 'Retailers can deliver sealed containers' },
    { state: 'California', rule: 'Allowed if linked to bona fide meal; ghost kitchen must hold liquor license' }
  ],
  sharedKitchenModel: {
    chicago: {
      operator: { license: 'Shared Kitchen Operator', fee: '$660/2 years', responsibility: 'Facility maintenance' },
      user: { license: 'Shared Kitchen User', fee: '$330/2 years (long-term)', responsibility: 'Individual food safety' },
      supplemental: 'Existing restaurants can get "Shared Kitchen-Supplemental" to rent during off-hours'
    }
  }
};

const RegulationsHub = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  
  // Track page views with Google Analytics
  usePageTracking();

  const filteredStates = STATE_REGULATIONS.filter(state => 
    state.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
    state.regions.some(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <SEO
        title="Food Business Regulations Hub 2026: State Permits, ANSI Certifications & Compliance Guide | Vendibook"
        description="Complete 2026 guide to food truck permits, cottage food laws, health certifications, and mobile food regulations by state. ANSI-accredited training providers, commissary requirements, MEHKO laws, and city-specific compliance for food entrepreneurs."
      />
      {/* Article Schema for Google Search */}
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Food Business Regulations Hub 2026: State Permits, ANSI Certifications & Compliance Guide",
          "description": "Comprehensive regulatory guide for food trucks, cottage food, ghost kitchens, and mobile food operations in the United States. State-by-state permits, ANSI certifications, and compliance requirements.",
          "image": "https://vendibook.com/images/food-truck-marketplace-analytics.jpg",
          "author": {
            "@type": "Organization",
            "name": "Vendibook",
            "url": "https://vendibook.com"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Vendibook",
            "logo": {
              "@type": "ImageObject",
              "url": "https://vendibook.com/images/vendibook-email-logo.png"
            }
          },
          "datePublished": "2024-01-15",
          "dateModified": "2026-02-01",
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": "https://vendibook.com/tools/regulations-hub"
          },
          "articleSection": [
            "ANSI-Accredited Certifications",
            "State Mobile Food Regulations", 
            "Cottage Food Laws",
            "MEHKO Requirements",
            "Commissary Resources",
            "Ghost Kitchen Compliance"
          ]
        }}
      />
      {/* WebPage Schema */}
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Food Business Regulations Hub",
          "description": "Comprehensive regulatory guide for food trucks, cottage food, ghost kitchens, and mobile food operations in the United States.",
          "url": "https://vendibook.com/tools/regulations-hub",
          "inLanguage": "en-US",
          "isPartOf": {
            "@type": "WebSite",
            "name": "Vendibook",
            "url": "https://vendibook.com"
          },
          "about": [
            {
              "@type": "Thing",
              "name": "Food Truck Regulations"
            },
            {
              "@type": "Thing", 
              "name": "Mobile Food Permits"
            },
            {
              "@type": "Thing",
              "name": "Food Safety Certifications"
            },
            {
              "@type": "Thing",
              "name": "Cottage Food Laws"
            }
          ]
        }}
      />
      {/* FAQ Schema for Rich Results */}
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What certifications do I need to operate a food truck?",
              "acceptedAnswer": { "@type": "Answer", "text": "At minimum, you need a Certified Food Protection Manager (CFPM) certification from an ANSI-accredited provider like ServSafe ($195), StateFoodSafety ($78), or NRFSP ($125-$175). All staff need Food Handler cards ($7.95-$15). Some states require additional allergen awareness training. ANSI accreditation ensures nationwide recognition." }
            },
            {
              "@type": "Question",
              "name": "What is a commissary requirement for food trucks?",
              "acceptedAnswer": { "@type": "Answer", "text": "Most jurisdictions require food trucks to return daily to a licensed commissary for water filling, wastewater disposal, food prep, and equipment cleaning. The commissary must be approved by the local health department. Costs range from $400-$1,500/month for shared space. Required in most major cities including Los Angeles, Chicago, and New York." }
            },
            {
              "@type": "Question",
              "name": "What is cottage food and can I sell food from home?",
              "acceptedAnswer": { "@type": "Answer", "text": "Cottage food laws allow sale of low-risk foods (typically non-perpirishable baked goods, jams, honey) made in home kitchens. Requirements vary by state: Florida allows up to $250K/year with no permit, California requires registration and limits to $50K/year, while other states have stricter limits and inspection requirements." }
            },
            {
              "@type": "Question",
              "name": "What are MEHKO requirements?",
              "acceptedAnswer": { "@type": "Answer", "text": "Microenterprise Home Kitchen Operations (MEHKO) laws allow home-based food businesses with specific requirements: annual permits ($200-$500), kitchen inspections, food safety training, and revenue limits ($50K-$100K/year). Currently available in California, Oregon, Washington, and expanding to other states." }
            },
            {
              "@type": "Question",
              "name": "Do ghost kitchens need special permits?",
              "acceptedAnswer": { "@type": "Answer", "text": "Ghost kitchens require commercial kitchen permits, health department inspections, business licenses, and food handler certifications. They're exempt from some mobile food requirements but need proper ventilation, fire suppression, and delivery compliance. Costs range from $2,000-$10,000 for initial setup." }
            },
            {
              "@type": "Question",
              "name": "Which ANSI certification is most widely accepted?",
              "acceptedAnswer": { "@type": "Answer", "text": "ServSafe is the most universally recognized certification, accepted in all 50 states. StateFoodSafety (Certus) offers the most affordable option at $78 for managers. NRFSP provides international recognition for complex operations. All ANSI-accredited certifications meet federal food safety requirements." }
            },
            {
              "@type": "Question",
              "name": "How much do food truck permits cost?",
              "acceptedAnswer": { "@type": "Answer", "text": "Food truck permit costs vary by city: Los Angeles ($1,200/year), Chicago ($500-$1,000), New York ($200-$500), Houston ($250-$500). Additional costs include health inspections ($100-$300), fire inspections ($450-$1,000), and mobile food vendor permits. First-year costs typically range $2,000-$5,000." }
            },
            {
              "@type": "Question",
              "name": "What states have the most food truck friendly regulations?",
              "acceptedAnswer": { "@type": "Answer", "text": "Texas, Florida, Arizona, and North Carolina have the most food truck-friendly regulations with lower permit costs and fewer restrictions. California has strict requirements but large markets. Cities like Austin, Portland, and Denver offer streamlined permitting processes and food truck parks." }
            }
          ]
        }}
      />
      {/* ItemList Schema for Categories */}
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Food Business Regulation Categories",
          "description": "Complete regulatory compliance categories for food businesses",
          "numberOfItems": 6,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "ANSI-Accredited Certifications", "description": "Food safety manager and handler certifications from ServSafe, StateFoodSafety, NRFSP, and other ANSI providers" },
            { "@type": "ListItem", "position": 2, "name": "State Mobile Food Regulations", "description": "State-by-state mobile food vendor permits, health department requirements, and compliance guidelines" },
            { "@type": "ListItem", "position": 3, "name": "Cottage Food Laws", "description": "Home-based food business regulations, revenue limits, and permitted food types by state" },
            { "@type": "ListItem", "position": 4, "name": "MEHKO Requirements", "description": "Microenterprise Home Kitchen Operation permits and compliance for home-based food businesses" },
            { "@type": "ListItem", "position": 5, "name": "Commissary Resources", "description": "Commercial kitchen requirements, costs, and finding approved commissary partners" },
            { "@type": "ListItem", "position": 6, "name": "Ghost Kitchen Compliance", "description": "Delivery-only kitchen regulations, permits, and operational requirements" }
          ]
        }}
      />
      <Header />
      
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Hero Section - GRADIENT */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          {/* Orange Gradient Background - #FF5124 based, subtle */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF5124]/8 via-[#FF5124]/5 to-amber-200/4" />
          
          {/* Decorative orbs - subtle orange hints */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-20 w-96 h-96 bg-[#FF5124]/6 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-[#FF5124]/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF5124]/4 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-40 left-1/4 w-64 h-64 bg-amber-300/5 rounded-full blur-2xl" />
          </div>
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                      <Home className="h-4 w-4" />
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/tools" className="text-muted-foreground hover:text-foreground">Tools</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Regulations Hub</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Scale className="h-4 w-4" />
                Compliance Resource Center
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Regulations Hub
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Navigate the complex regulatory landscape of the food industry. Certifications, permits, state laws, and compliance protocols for food trucks, trailers, ghost kitchens, and cottage food operations.
              </p>

              {/* Darkshine CTA */}
              <div className="mb-8">
                <Button asChild size="lg" className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-800 text-white border border-zinc-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <Link to="/search?category=ghost_kitchen">
                    <Building2 className="h-5 w-5 mr-2" />
                    Find a Kitchen Near You
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Browse ghost kitchens, commissaries, and commercial kitchen spaces in your area
                </p>
              </div>

              {/* Search */}
              <div className="max-w-md mx-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by state or city..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="py-6 px-4 bg-gradient-to-r from-primary/5 via-amber-500/5 to-orange-500/5">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4">
                <p className="text-2xl font-bold text-primary">6+</p>
                <p className="text-xs text-muted-foreground">ANSI Providers</p>
              </div>
              <div className="p-4">
                <p className="text-2xl font-bold text-blue-600">50</p>
                <p className="text-xs text-muted-foreground">States Covered</p>
              </div>
              <div className="p-4">
                <p className="text-2xl font-bold text-purple-600">20+</p>
                <p className="text-xs text-muted-foreground">Major Cities</p>
              </div>
              <div className="p-4">
                <p className="text-2xl font-bold text-emerald-600">5</p>
                <p className="text-xs text-muted-foreground">MEHKO Counties</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Tabs */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <Tabs defaultValue="certifications" className="space-y-8">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2">
                <TabsTrigger value="certifications" className="gap-2 py-3">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Certifications</span>
                </TabsTrigger>
                <TabsTrigger value="mobile" className="gap-2 py-3">
                  <Truck className="h-4 w-4" />
                  <span className="hidden sm:inline">Mobile Food</span>
                </TabsTrigger>
                <TabsTrigger value="cottage" className="gap-2 py-3">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Cottage Food</span>
                </TabsTrigger>
                <TabsTrigger value="ghost" className="gap-2 py-3">
                  <Store className="h-4 w-4" />
                  <span className="hidden sm:inline">Ghost Kitchens</span>
                </TabsTrigger>
                <TabsTrigger value="commissary" className="gap-2 py-3">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Commissaries</span>
                </TabsTrigger>
              </TabsList>

              {/* Certifications Tab */}
              <TabsContent value="certifications" className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-2">ANSI-Accredited Food Safety Certifications</h2>
                  <p className="text-muted-foreground mb-6">
                    The foundational credential for any commercial food operation. These ANSI-accredited certifications are recognized nationwide.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {CERTIFICATION_PROVIDERS.map((provider) => (
                      <Card key={provider.name} className="border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-primary" />
                                {provider.name}
                              </CardTitle>
                              <CardDescription>{provider.organization}</CardDescription>
                            </div>
                            <Badge variant="outline">{provider.type}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">{provider.description}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="font-medium">{provider.cost}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {provider.features.map((feature, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{feature}</Badge>
                            ))}
                          </div>
                          <Button asChild variant="outline" size="sm" className="w-full gap-2">
                            <a href={provider.url} target="_blank" rel="noopener noreferrer">
                              Visit Website <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Specialized Training */}
                <div>
                  <h3 className="text-xl font-bold mb-4">Specialized Training Requirements</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {SPECIALIZED_TRAINING.map((training) => (
                      <Card key={training.category}>
                        <CardHeader>
                          <CardTitle className="text-lg">{training.category}</CardTitle>
                          <CardDescription>{training.requirement}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm"><strong>Covers:</strong> {training.covers}</p>
                          <div className="space-y-2">
                            {training.providers.map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  {p.name}
                                </a>
                                <span className="text-muted-foreground text-xs">{p.note}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Important Note */}
                <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="font-semibold mb-1">Local Registration Required</h4>
                        <p className="text-sm text-muted-foreground">
                          While certifications are national, registration is often local. For example, Chicago requires ServSafe holders to pay a fee to register with CDPH for a "City of Chicago Food Service Sanitation Manager Certificate." Always check your local jurisdiction.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Mobile Food Tab */}
              <TabsContent value="mobile" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Mobile Food Regulations by State</h2>
                  <p className="text-muted-foreground mb-6">
                    Click on a state to view detailed requirements for each jurisdiction.
                  </p>
                </div>

                <div className="grid gap-4">
                  {filteredStates.map((state) => (
                    <Card key={state.state} className="border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all">
                      <CardHeader 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedState(selectedState === state.state ? null : state.state)}
                      >
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            {state.state}
                          </CardTitle>
                          <Badge variant="outline">{state.regions.length} region{state.regions.length > 1 ? 's' : ''}</Badge>
                        </div>
                      </CardHeader>
                      {selectedState === state.state && (
                        <CardContent className="space-y-6">
                          {state.regions.map((region) => (
                            <div key={region.name} className="border-l-4 border-primary pl-4 space-y-3">
                              <div>
                                <h4 className="font-semibold text-lg">{region.name}</h4>
                                <p className="text-sm text-muted-foreground">{region.agency}</p>
                              </div>
                              
                              <div>
                                <h5 className="font-medium text-sm mb-2">Requirements:</h5>
                                <ul className="space-y-1">
                                  {region.requirements.map((req, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                      <span>{req}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <h5 className="font-medium text-sm mb-2">Key Forms:</h5>
                                <div className="flex flex-wrap gap-1">
                                  {region.keyForms.map((form, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{form}</Badge>
                                  ))}
                                </div>
                              </div>

                              {region.notes && (
                                <p className="text-sm bg-muted/50 p-2 rounded">
                                  <strong>Note:</strong> {region.notes}
                                </p>
                              )}

                              {region.url && (
                                <Button asChild variant="outline" size="sm" className="gap-2">
                                  <a href={region.url} target="_blank" rel="noopener noreferrer">
                                    Official Website <ExternalLink className="h-3 w-3" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Quick Comparison Table */}
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Quick Comparison: Major Cities</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>City</TableHead>
                            <TableHead>Permit Name</TableHead>
                            <TableHead>Unique Requirement</TableHead>
                            <TableHead>Commissary</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Houston, TX</TableCell>
                            <TableCell>Medallion</TableCell>
                            <TableCell>Physical inspection at office</TableCell>
                            <TableCell>Notarized Letter</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Chicago, IL</TableCell>
                            <TableCell>Mobile Food Preparer</TableCell>
                            <TableCell>GPS Tracking Device</TableCell>
                            <TableCell>Affidavit</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">NYC, NY</TableCell>
                            <TableCell>Unit Permit</TableCell>
                            <TableCell>Supervisory License / Waitlist</TableCell>
                            <TableCell>Approved Depot</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Los Angeles, CA</TableCell>
                            <TableCell>DPH Permit</TableCell>
                            <TableCell>Route Sheet Updates</TableCell>
                            <TableCell>Published List Only</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Phoenix, AZ</TableCell>
                            <TableCell>Type I/II/III</TableCell>
                            <TableCell>Pre-Operational Attestation</TableCell>
                            <TableCell>Daily Return</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cottage Food Tab */}
              <TabsContent value="cottage" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Cottage Food Laws by State</h2>
                  <p className="text-muted-foreground mb-6">
                    Cottage food laws allow sale of low-risk foods made in home kitchens. Requirements vary significantly by state.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>State</TableHead>
                        <TableHead>Revenue Cap</TableHead>
                        <TableHead>Permit</TableHead>
                        <TableHead>Inspection</TableHead>
                        <TableHead>Allowed Foods</TableHead>
                        <TableHead>Prohibited</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {COTTAGE_FOOD_LAWS.map((law) => (
                        <TableRow key={law.state}>
                          <TableCell className="font-medium">
                            {law.state}
                            <br />
                            <span className="text-xs text-muted-foreground">{law.model}</span>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">{law.revenueCap}</TableCell>
                          <TableCell>{law.permitRequired}</TableCell>
                          <TableCell>{law.inspection}</TableCell>
                          <TableCell className="text-xs max-w-[200px]">{law.allowedFoods}</TableCell>
                          <TableCell className="text-xs text-red-600 max-w-[200px]">{law.prohibited}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* MEHKO Section */}
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      MEHKO: Microenterprise Home Kitchen Operations
                    </CardTitle>
                    <CardDescription>
                      California's pioneering AB 626 allows full meal preparation (including meat) in home kitchens
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">
                      <strong>Limits:</strong> {MEHKO_DATA.limits}
                    </p>
                    
                    <h4 className="font-semibold">Opted-In Counties:</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {MEHKO_DATA.adoptedCounties.map((county) => (
                        <div key={county.name} className="bg-white dark:bg-zinc-900 p-3 rounded-lg border">
                          <h5 className="font-medium">{county.name}</h5>
                          <p className="text-sm text-muted-foreground">Fee: {county.fee}</p>
                          <ul className="text-xs mt-2 space-y-1">
                            {county.requirements.map((req, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Ghost Kitchen Tab */}
              <TabsContent value="ghost" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Ghost Kitchen & Shared Kitchen Regulations</h2>
                  <p className="text-muted-foreground mb-6">
                    {GHOST_KITCHEN_INFO.definition}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-primary" />
                        Classification by Jurisdiction
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {GHOST_KITCHEN_INFO.classifications.map((c, i) => (
                        <div key={i} className="border-l-2 border-primary pl-3">
                          <p className="font-medium">{c.jurisdiction}</p>
                          <p className="text-sm text-muted-foreground">{c.classification}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Droplets className="h-5 w-5 text-amber-500" />
                        Alcohol Delivery Rules
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {GHOST_KITCHEN_INFO.alcoholDelivery.map((rule, i) => (
                        <div key={i} className="border-l-2 border-amber-500 pl-3">
                          <p className="font-medium">{rule.state}</p>
                          <p className="text-sm text-muted-foreground">{rule.rule}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Chicago Shared Kitchen Model */}
                <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
                  <CardHeader>
                    <CardTitle>Chicago Shared Kitchen License Model</CardTitle>
                    <CardDescription>
                      Pioneering tiered licensing system that resolves liability questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Shared Kitchen Operator</h4>
                        <p className="text-sm text-muted-foreground mb-2">Owns building and equipment</p>
                        <Badge>$660/2 years</Badge>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Shared Kitchen User</h4>
                        <p className="text-sm text-muted-foreground mb-2">Chef/business renting space</p>
                        <Badge>$330/2 years</Badge>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Supplemental License</h4>
                        <p className="text-sm text-muted-foreground mb-2">Restaurants renting off-hours</p>
                        <Badge variant="secondary">Add-on</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Commissary Tab */}
              <TabsContent value="commissary" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Commissary Resources & Directories</h2>
                  <p className="text-muted-foreground mb-6">
                    A commissary must provide potable water, wastewater disposal, ware-washing facilities, and food storage. "Dump station only" facilities are insufficient for trucks that perform food prep.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {COMMISSARY_RESOURCES.map((resource) => (
                    <Card key={resource.name} className="hover:shadow-lg transition-all">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          {resource.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{resource.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {resource.regions.map((region, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{region}</Badge>
                          ))}
                        </div>
                        <Button asChild variant="outline" size="sm" className="w-full gap-2">
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            Visit Resource <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Commissary Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle>What a Valid Commissary Must Provide</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Droplets className="h-6 w-6 text-blue-500" />
                        <div>
                          <p className="font-medium">Potable Water</p>
                          <p className="text-xs text-muted-foreground">Fresh water filling</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Flame className="h-6 w-6 text-orange-500" />
                        <div>
                          <p className="font-medium">Wastewater Disposal</p>
                          <p className="text-xs text-muted-foreground">Grease trap access</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <ChefHat className="h-6 w-6 text-purple-500" />
                        <div>
                          <p className="font-medium">Ware-washing</p>
                          <p className="text-xs text-muted-foreground">3-compartment sink</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Building2 className="h-6 w-6 text-green-500" />
                        <div>
                          <p className="font-medium">Food Storage</p>
                          <p className="text-xs text-muted-foreground">Refrigeration/dry storage</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Launch Your Food Business?</h2>
            <p className="text-muted-foreground mb-8">
              Use our other tools to price your business, find specific permits, and create your listing.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-800 text-white border border-zinc-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 gap-2">
                <Link to="/tools/permitpath">
                  <FileCheck className="h-5 w-5" />
                  Find Your Permits
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-800 text-white border border-zinc-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 gap-2">
                <Link to="/tools/startup-guide">
                  <BookOpen className="h-5 w-5" />
                  Startup Checklist
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-800 text-white border border-zinc-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 gap-2">
                <Link to="/search?category=ghost_kitchen">
                  <Building2 className="h-5 w-5" />
                  Find Kitchens
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <ToolCrossLinks currentTool="regulations-hub" />
      </main>

      <Footer />
    </>
  );
};

export default RegulationsHub;
