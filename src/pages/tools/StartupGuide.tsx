import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import JsonLd from '@/components/JsonLd';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { 
  Truck, 
  ChefHat, 
  FileCheck, 
  DollarSign, 
  Wrench,
  Megaphone,
  Shield,
  Snowflake,
  Home,
  Sparkles,
  CheckCircle2,
  Circle,
  Info,
  ArrowRight,
  Flame,
  Zap,
  AlertTriangle,
  Clock,
  MapPin,
  Building,
  Building2,
  Calculator,
  Users,
  TrendingUp,
  Utensils,
  ThermometerSun,
  Fuel,
  Car,
  Package,
  Store,
  Star,
  Target,
  HelpCircle,
  XCircle,
  Beef,
  Pizza,
  Coffee,
  IceCream,
  Salad,
  Sandwich,
  Scale,
  Gauge,
  Thermometer,
  Droplets,
  Wind,
  ShieldCheck,
  Receipt,
  PiggyBank,
  BadgeDollarSign,
  CircleDollarSign,
  Banknote,
  CreditCard,
  FileWarning,
  CloudRain,
  Timer,
  Volume2,
  Trash2,
  BookOpen
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import ToolCrossLinks from '@/components/tools/ToolCrossLinks';

// Industry stats
const INDUSTRY_STATS = {
  marketSize: '$2.4B',
  year: '2023',
  growthRate: '7.5%',
  avgStartupCost: '$15,000 - $175,000',
  failureRate: '60%',
  avgTicketTime: '3 minutes'
};

// Menu Engineering Matrix
const MENU_MATRIX = [
  { 
    category: 'Stars', 
    profit: 'High', 
    popularity: 'High', 
    icon: Star,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    description: 'Flagship items that drive profit',
    action: 'Protect & Promote. Ensure ingredients are always in stock. Place in prime menu real estate (top right or center).'
  },
  { 
    category: 'Plowhorses', 
    profit: 'Low', 
    popularity: 'High',
    icon: Target,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    description: 'Traffic drivers with slim margins',
    action: 'Optimize. Slightly raise price, reduce portion, or swap expensive ingredients for cheaper alternatives.'
  },
  { 
    category: 'Puzzles', 
    profit: 'High', 
    popularity: 'Low',
    icon: HelpCircle,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    description: 'High-margin sleepers',
    action: 'Market or Rebrand. Use decoy pricing or run limited-time specials to drive trial.'
  },
  { 
    category: 'Dogs', 
    profit: 'Low', 
    popularity: 'Low',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    description: 'Underperformers consuming resources',
    action: 'Eliminate. Remove to streamline operations and free up storage space.'
  }
];

// Kitchen Layout Configurations by Cuisine
const KITCHEN_LAYOUTS = [
  {
    id: 'frying',
    name: 'Heavy Frying',
    icon: Flame,
    examples: 'Fried Chicken, Fish & Chips, Wings',
    color: 'from-orange-500 to-red-500',
    equipment: [
      { name: 'High-BTU Gas Floor Fryers', spec: '40-50 lb capacity', critical: true },
      { name: 'Type 1 Hood System', spec: 'High CFM extraction', critical: true },
      { name: 'Ansul Fire Suppression', spec: 'Nozzles aimed at fryer vats', critical: true },
      { name: 'Undercounter Freezer', spec: 'For frozen product storage', critical: false },
      { name: 'Heat Lamp Dump Station', spec: 'With salt station', critical: false }
    ],
    workflow: 'Freezer → Fryer → Dump Station (Heat Lamp + Salt) → Service Window',
    warnings: [
      'Countertop electric fryers are insufficient—they lose temp when frozen product is added',
      'Steel splash guards and locking covers required for transit',
      'Frying releases grease-laden vapors creating fire hazards'
    ],
    powerNeeds: '10,000W+',
    ventilation: 'Type 1 Hood with aggressive CFM mandatory'
  },
  {
    id: 'grilling',
    name: 'Heavy Grilling',
    icon: Beef,
    examples: 'Burgers, Steaks, Smash Burgers',
    color: 'from-red-500 to-pink-500',
    equipment: [
      { name: '36" or 48" Flat-Top Griddle', spec: 'For smash burgers, bacon, buns', critical: true },
      { name: 'Type 1 Hood System', spec: 'For grease extraction', critical: true },
      { name: 'Refrigerated Prep Table', spec: 'For toppings and patties', critical: true },
      { name: 'Bun Warmer/Toaster', spec: 'For consistent bun quality', critical: false }
    ],
    workflow: 'Prep Table → Griddle → Assembly Station → Service Window',
    warnings: [
      'Griddle vs Charbroiler: Griddle is faster (2-3 min) and easier to clean',
      'Charbroiler creates massive smoke requiring stronger ventilation',
      'For high-volume, griddle is the superior operational choice'
    ],
    powerNeeds: '7,000-10,000W',
    ventilation: 'Type 1 Hood required for grease-laden vapors'
  },
  {
    id: 'mexican',
    name: 'Authentic Mexican',
    icon: Utensils,
    examples: 'Tacos al Pastor, Carnitas, Burritos',
    color: 'from-green-500 to-emerald-500',
    equipment: [
      { name: 'Vertical Broiler (Trompo)', spec: 'For al pastor', critical: true },
      { name: 'Flat-Top Griddle', spec: 'For tortillas and meats', critical: true },
      { name: 'Steam Table', spec: 'For carnitas, barbacoa, rice, beans', critical: true },
      { name: 'Tortilla Press/Warmer', spec: 'Cold tortillas = quality failure', critical: true },
      { name: 'Refrigerated Prep Table', spec: 'For salsas and toppings', critical: false }
    ],
    workflow: 'Trompo/Griddle → Steam Table → Assembly → Salsa Station → Service',
    warnings: [
      'Health departments may classify vertical broilers as "specialty processing" requiring HACCP plan',
      'Trompo must be placed under Type 1 hood',
      'Serving cold tortillas is a quality failure'
    ],
    powerNeeds: '7,000-10,000W',
    ventilation: 'Type 1 Hood with trompo positioned underneath'
  },
  {
    id: 'asian',
    name: 'Asian Fusion (Wok)',
    icon: Flame,
    examples: 'Stir Fry, Noodles, Fried Rice',
    color: 'from-amber-500 to-orange-500',
    equipment: [
      { name: 'Commercial Wok Range', spec: '100,000+ BTU per burner', critical: true },
      { name: 'Water Cooling Lines', spec: 'Deck cooling and wok rinsing', critical: true },
      { name: 'High-Capacity Propane System', spec: 'Oversized regulators', critical: true },
      { name: 'Rice Cooker (Gas)', spec: 'Electric draws too much power', critical: false },
      { name: 'Prep Refrigeration', spec: 'For proteins and vegetables', critical: true }
    ],
    workflow: 'Prep Station → Wok Range → Plating → Service Window',
    warnings: [
      'Single wok burner can output 100,000+ BTUs—massive propane demand',
      'Water cooling lines increase grey water tank capacity requirements',
      'Regulators must be sized to prevent "freeze-up" during high demand',
      'Cook rice at commissary or use gas-powered cookers to save generator capacity'
    ],
    powerNeeds: '8,000-12,000W',
    ventilation: 'Maximum extraction hood system required'
  },
  {
    id: 'bbq',
    name: 'BBQ / Smoker',
    icon: Flame,
    examples: 'Brisket, Pulled Pork, Ribs',
    color: 'from-amber-700 to-red-700',
    equipment: [
      { name: 'Offset Smoker', spec: 'Often on rear "porch"', critical: true },
      { name: 'Hot Box/Holding Cabinet', spec: 'Alto-Shaam or equivalent', critical: true },
      { name: 'Meat Slicer', spec: 'Commercial grade', critical: true },
      { name: 'Steam Table', spec: 'For sides (beans, slaw, mac)', critical: false },
      { name: 'Heavy-Duty Axles', spec: 'Rated for smoker weight', critical: true }
    ],
    workflow: 'Smoker (overnight at commissary) → Hot Box → Slice → Plate → Service',
    warnings: [
      'Smokers often installed on open-air screened "porch" at rear of trailer',
      '500-gallon offset smoker is incredibly heavy—axles must be rated for uneven load',
      'Solid fuel (wood/charcoal) has stricter storage rules than propane',
      'Most BBQ trucks cannot smoke meat to order—prep happens overnight'
    ],
    powerNeeds: '5,000-7,000W',
    ventilation: 'Open-air porch configuration—screened enclosure'
  },
  {
    id: 'bakery',
    name: 'Mobile Bakery',
    icon: IceCream,
    examples: 'Cupcakes, Pastries, Donuts, Bread',
    color: 'from-pink-400 to-rose-500',
    equipment: [
      { name: 'Convection Oven', spec: 'Even airflow for pastries', critical: true },
      { name: 'Vertical Speed Racks', spec: 'Secured to walls', critical: true },
      { name: 'Mixer (if on-truck)', spec: 'Commercial stand mixer', critical: false },
      { name: 'Display Case', spec: 'Refrigerated or ambient', critical: true },
      { name: 'Climate Control', spec: 'A/C and heating', critical: true }
    ],
    workflow: 'Prep (commissary) → Oven → Cooling Racks → Display → Service',
    warnings: [
      'Deck ovens are too heavy and fragile for mobile use—use convection',
      'Chocolate and fondant melt in hot trucks; dough fails to rise in cold ones',
      'High-capacity A/C and heating are non-negotiable for product consistency',
      'Speed racks must be secured to walls to prevent tipping during transit'
    ],
    powerNeeds: '7,000-10,000W',
    ventilation: 'Standard exhaust—no Type 1 hood required if no frying'
  },
  {
    id: 'coffee',
    name: 'Coffee & Beverages',
    icon: Coffee,
    examples: 'Espresso, Cold Brew, Smoothies',
    color: 'from-amber-600 to-amber-800',
    equipment: [
      { name: 'Commercial Espresso Machine', spec: '2-3 group heads', critical: true },
      { name: 'Commercial Blenders', spec: 'Multiple for speed', critical: true },
      { name: 'Ice Maker', spec: 'High-capacity', critical: true },
      { name: 'Under-Counter Refrigeration', spec: 'For milk, cream, ingredients', critical: true },
      { name: 'Water Heater', spec: 'For cleaning and brewing', critical: true }
    ],
    workflow: 'Order → Espresso/Blend → Add-ins → Serve',
    warnings: [
      'Espresso machines and blenders together push smaller generators to their limit',
      'Invest in quiet generator—early-morning customers appreciate less noise',
      'No Type 1 hood required if no cooking',
      'Focus on handwashing sink and sanitation for code compliance'
    ],
    powerNeeds: '5,000-7,000W',
    ventilation: 'Standard exhaust only—no hood required'
  }
];

// Truck vs Trailer Comparison
const VEHICLE_COMPARISON = [
  { feature: 'Mobility', truck: 'High. Self-contained. Navigates tight streets easily.', trailer: 'Low. Requires heavy-duty tow vehicle. Difficult to maneuver/reverse.' },
  { feature: 'Kitchen Space', truck: 'Restricted (14-18 ft). Driver cab eats into space.', trailer: 'Expansive (up to 30ft+). No engine/cab takes up kitchen space.' },
  { feature: 'Mechanical Risk', truck: 'High. Engine failure = entire business closed.', trailer: 'Moderate. Tow vehicle replaceable. Kitchen remains operational.' },
  { feature: 'Cost', truck: '$50k - $175k. Motorized chassis adds cost.', trailer: '$30k - $100k. Cheaper per square foot.' },
  { feature: 'Crew Size', truck: '1-2 people typical', trailer: '4-5 people possible with larger units' },
  { feature: 'Best For', truck: 'Urban street vending, high mobility needs', trailer: 'Fixed lots, festivals, larger operations' }
];

// Startup Cost Breakdown
const STARTUP_COSTS = [
  { category: 'Vehicle Purchase', low: '$15,000', high: '$100,000', context: 'Used FedEx step van vs new custom chassis' },
  { category: 'Retrofit/Build-out', low: '$20,000', high: '$60,000', context: 'Walls, plumbing, electrical, gas lines (DIY vs Pro)' },
  { category: 'Kitchen Equipment', low: '$10,000', high: '$45,000', context: 'Hood, fire suppression, appliances, refrigeration' },
  { category: 'Wrap & Branding', low: '$2,500', high: '$5,000', context: 'Essential marketing—truck is the billboard' },
  { category: 'Permits & Licenses', low: '$2,000', high: '$5,000', context: 'Plan review, health permits, fire inspection' },
  { category: 'Initial Inventory', low: '$2,000', high: '$5,000', context: 'Food, paper products, packaging' },
  { category: 'POS System', low: '$500', high: '$2,000', context: 'Hardware + software subscription' },
  { category: 'Insurance Down Payment', low: '$1,000', high: '$3,000', context: '20-30% of annual premium' },
  { category: 'Professional Fees', low: '$500', high: '$2,500', context: 'Legal (LLC), Accounting setup' },
  { category: 'Cash Reserve', low: '$5,000', high: '$15,000', context: 'Buffer for repairs or rain-outs' }
];

// Monthly Operating Costs
const MONTHLY_COSTS = [
  { category: 'Food Cost (COGS)', percentage: '28-35%', notes: 'Higher unit prices than restaurants due to storage limits' },
  { category: 'Labor', percentage: '25-30%', notes: 'Include owner salary—working "free" distorts metrics' },
  { category: 'Commissary Rent', amount: '$400-$1,500', notes: 'Fixed cost regardless of sales' },
  { category: 'Fuel & Energy', amount: '$500-$1,300', notes: 'Gas/diesel for truck + generator + propane' },
  { category: 'Insurance', amount: '$200-$500', notes: 'Commercial auto + general liability' },
  { category: 'Maintenance Fund', amount: '$500', notes: 'Trucks vibrate—loosens fittings, plumbing, electrical' }
];

// Hidden Risks / "Silent Killers"
const HIDDEN_RISKS = [
  {
    title: 'Generator Failure',
    icon: Zap,
    description: 'The single most common failure point',
    details: [
      'Wet Stacking: Diesel generators under light load accumulate unburned fuel, leading to engine failure',
      'Oil changes required every 100-200 hours (every 2-3 weeks for daily operation)',
      'Noise regulations: 65-75 dB limit in many cities. "Contractor" generators too loud.',
      'Inverter generators (Honda EU series) or enclosed diesel units required'
    ],
    prevention: 'Run generator at full load periodically. Budget $500/month for maintenance.'
  },
  {
    title: 'Insurance Claim Denials',
    icon: ShieldCheck,
    description: 'Technicalities that void your coverage',
    details: [
      'Unlisted Drivers: Employee not on policy drives and crashes = claim denied',
      'Misrepresentation: Policy lists "catering" but truck is street vending',
      'Equipment Exclusions: Standard auto policies don\'t cover kitchen equipment',
      'Inland Marine rider required to cover fryers/ovens in crash or theft'
    ],
    prevention: 'Work with insurance agent experienced with food trucks. Update policy for any changes.'
  },
  {
    title: 'Fire Suppression (Ansul)',
    icon: Flame,
    description: 'Accidental discharge closes business for days',
    details: [
      'Fusible links melt at specific temperatures, triggering foam discharge',
      'Accidental discharge costs $300-$1,000 to recharge',
      'Massive cleanup required, closing business for days',
      'Mandatory semi-annual inspections by certified technician'
    ],
    prevention: 'Ensure proper ventilation to prevent ambient heat buildup. Protect manual pull station.'
  },
  {
    title: 'Weather Volatility',
    icon: CloudRain,
    description: 'A rainy Friday can eliminate 20% of weekly revenue',
    details: [
      'Outdoor customers disappear in bad weather',
      'No rent savings during rain-outs—costs continue',
      'Seasonal swings can mean zero income some months',
      'Insurance and loan payments continue year-round'
    ],
    prevention: 'Build 2-3 month emergency fund. Diversify with catering and private events.'
  },
  {
    title: 'Parking Fines',
    icon: Receipt,
    description: 'A line item in aggressive cities',
    details: [
      'NYC, LA, SF operators often budget $500/month for unavoidable violations',
      'Proximity bans: 300-500 ft from restaurants or schools',
      'Time limits: 2-4 hour parking limits force mid-shift moves',
      'Wrong permit for wrong zone = immediate ticket'
    ],
    prevention: 'Research local zoning before committing to locations. Build fines into budget.'
  },
  {
    title: 'Time Cost Reality',
    icon: Timer,
    description: '8-hour service shift = 12-14 hours actual work',
    details: [
      'Shopping for ingredients (limited storage = frequent trips)',
      'Driving to commissary, setup, teardown',
      'Cleaning truck, dumping waste water',
      'Prep work, inventory management, bookkeeping'
    ],
    prevention: 'Price your time into the business. Don\'t work for "free."'
  },
  {
    title: 'Grease Trap Failure',
    icon: Droplets,
    description: 'The 25% rule nobody tells you about',
    details: [
      'When trap is 25% full of FOG, efficiency drops to near zero',
      'Grease enters sewer system, causing clogs and fines',
      'Clean Water Act violations carry massive penalties',
      'Regular pumping is mandatory, not optional'
    ],
    prevention: 'Schedule regular grease trap pumping. Never dump in storm drains.'
  }
];

// Checklist sections with items
const CHECKLIST_SECTIONS = [
  {
    id: 'setup',
    title: 'Choose Your Setup',
    icon: Truck,
    color: 'from-orange-500 to-red-500',
    items: [
      { id: 'setup-1', text: 'Decide: Food Truck vs Food Trailer', priority: 'high' },
      { id: 'setup-2', text: 'Determine kitchen intensity (heavy cooking vs light prep)', priority: 'high' },
      { id: 'setup-3', text: 'Calculate power requirements (5,000-10,000+ watts)', priority: 'medium' },
      { id: 'setup-4', text: 'Plan ventilation needs (hood system if frying/grilling)', priority: 'high' },
      { id: 'setup-5', text: 'Research new vs used options', priority: 'medium' },
    ],
    details: {
      title: 'Choosing the Right Setup',
      content: `**Food Trucks** are all-in-one vehicles with built-in kitchens. Upfront costs range from $40,000 to $150,000+ for new, fully equipped trucks. Used step vans can start at $15,000-$25,000 with basic buildout. Benefits include quick mobility and single-unit maintenance. However, engine issues can sideline your entire business.

**Food Trailers** are towed separately, often costing less ($20,000-$40,000 new, $8,000-$15,000 used). They offer flexibility—if your tow vehicle breaks down, you can replace it. Trailers can offer more kitchen space for the cost.

**Kitchen Intensity Matters:**
- **Heavy Cooking** (frying, grilling): Requires commercial exhaust hood, fire suppression system, and 7,000-10,000+ watts of power
- **Light Prep** (coffee, smoothies, cold foods): Can operate on 3,000-5,000 watts with simpler ventilation`,
      tips: [
        'Match your vehicle choice to your business plan',
        'Your menu should drive equipment and layout decisions',
        'A compact trailer works for light assembly operations'
      ],
      costs: { low: '$15,000', mid: '$50,000', high: '$150,000+' }
    }
  },
  {
    id: 'cuisine',
    title: 'Design Your Menu',
    icon: ChefHat,
    color: 'from-purple-500 to-pink-500',
    items: [
      { id: 'cuisine-1', text: 'Choose cuisine type and concept', priority: 'high' },
      { id: 'cuisine-2', text: 'Design focused menu (5-8 core items)', priority: 'high' },
      { id: 'cuisine-3', text: 'Plan ingredient cross-utilization', priority: 'medium' },
      { id: 'cuisine-4', text: 'Calculate food costs per item', priority: 'high' },
      { id: 'cuisine-5', text: 'Set pricing strategy (3-4x food cost)', priority: 'high' },
      { id: 'cuisine-6', text: 'Create menu board design', priority: 'low' },
    ],
    details: {
      title: 'Menu Design & Pricing',
      content: `**Popular Cuisine Types:**
- **BBQ**: Needs smoker, long cook times, robust ventilation
- **Tacos/Mexican**: Griddle, fryer, steam tables, tortilla press
- **Fusion/Gourmet**: Versatile kitchen with multi-purpose appliances
- **Vegan/Health**: Focus on refrigeration, less heavy cooking
- **Desserts**: Ovens for baking, freezers for ice cream
- **Coffee/Drinks**: Espresso machine, blenders, ice maker

**Pricing Strategy:**
Price items at 3-4x their food cost, aiming for 25-30% food cost percentage. Research local market rates. Use psychological pricing ($9.99 vs $10).

**Menu Engineering:** Identify stars (high profit, popular) and feature them prominently. Track sales data to optimize over time.`,
      tips: [
        'A smaller, well-curated menu is easier to execute',
        'Design items to share overlapping ingredients',
        'Start small and expand based on demand'
      ],
      costs: { low: '$500', mid: '$2,000', high: '$5,000' }
    }
  },
  {
    id: 'equipment',
    title: 'Equipment & Buildout',
    icon: Wrench,
    color: 'from-blue-500 to-cyan-500',
    items: [
      { id: 'equip-1', text: 'Source cooking appliances (griddle, fryer, oven)', priority: 'high' },
      { id: 'equip-2', text: 'Install refrigeration (fridge, freezer, prep table)', priority: 'high' },
      { id: 'equip-3', text: 'Set up sinks (hand-wash + 3-compartment)', priority: 'high' },
      { id: 'equip-4', text: 'Install ventilation hood and fire suppression', priority: 'high' },
      { id: 'equip-5', text: 'Purchase generator (5,000-10,000W)', priority: 'high' },
      { id: 'equip-6', text: 'Get POS system and payment processing', priority: 'medium' },
      { id: 'equip-7', text: 'Stock smallwares (pans, utensils, containers)', priority: 'medium' },
      { id: 'equip-8', text: 'Purchase initial disposables and supplies', priority: 'low' },
    ],
    details: {
      title: 'Equipment Categories & Costs',
      content: `**Cooking Appliances** ($500-$5,000 each)
- Griddle/Flat-top: ~$1,500
- Fryer: $500-$2,000
- Range/Oven: $1,000-$10,000
- Combi oven: up to $8,000

**Refrigeration** ($500-$4,000 each)
- Under-counter fridges: $1,000-$3,000
- Refrigerated prep tables: $2,000-$5,000
- Ice makers: $1,000-$3,000

**Sinks & Plumbing** ($100-$1,500 per sink)
- Hand-wash sink: ~$300
- 3-compartment sink: $500-$2,000
- Water tanks, heater, pump included

**Ventilation & Fire Safety** ($2,000-$10,000 total)
- Hood: $1,000-$6,000
- Fire suppression: $2,000-$5,000
- Required for any grease-producing equipment

**Power Supply** ($500-$5,000+)
- Reliable generator: ~$3,000 for mid-size
- Most trucks need 5,000-7,000W minimum`,
      tips: [
        'Buy quality—cheap equipment fails when you need it most',
        'Used equipment can save 50-75% but inspect carefully',
        'Ensure all equipment is NSF-approved for code compliance'
      ],
      costs: { low: '$15,000', mid: '$40,000', high: '$80,000+' }
    }
  },
  {
    id: 'permits',
    title: 'Licenses & Permits',
    icon: FileCheck,
    color: 'from-green-500 to-emerald-500',
    items: [
      { id: 'permit-1', text: 'Register business entity (LLC recommended)', priority: 'high' },
      { id: 'permit-2', text: 'Get general business license', priority: 'high' },
      { id: 'permit-3', text: 'Apply for Mobile Food Vendor Permit', priority: 'high' },
      { id: 'permit-4', text: 'Pass health department inspection', priority: 'high' },
      { id: 'permit-5', text: 'Get fire department inspection/permit', priority: 'high' },
      { id: 'permit-6', text: 'Secure commissary agreement (if required)', priority: 'high' },
      { id: 'permit-7', text: 'Obtain food handler certifications', priority: 'high' },
      { id: 'permit-8', text: 'Register vehicle with DMV', priority: 'medium' },
      { id: 'permit-9', text: 'Get sales tax permit', priority: 'medium' },
      { id: 'permit-10', text: 'Apply for local parking/vending permits', priority: 'medium' },
    ],
    details: {
      title: 'Regulatory Requirements',
      content: `**Essential Permits:**
- **Business License**: City/county registration ($50-$500)
- **Mobile Food Vendor Permit**: Health department approval ($200-$1,000+/year)
- **Health Inspection**: Verifies sinks, food storage, temperatures, sanitation
- **Fire Inspection**: Checks hood, suppression system, propane setup ($450-$1,000/inspection)
- **Commissary Agreement**: Required in many cities

**Food Safety Requirements:**
- At least one Certified Food Manager (ServSafe or equivalent)
- Food Handler cards for all employees
- Temperature logs and proper food storage
- Handwashing sink with hot/cold water

**First-year regulatory costs can average $28,000** including all fees, inspections, and time costs. Plan for annual renewals.`,
      tips: [
        'Start permit process BEFORE finalizing your truck build',
        'Consult health department on requirements early',
        'Keep all documents on the truck in a waterproof folder'
      ],
      costs: { low: '$1,000', mid: '$5,000', high: '$28,000+' }
    }
  },
  {
    id: 'commissary',
    title: 'Commissary & Storage',
    icon: Building,
    color: 'from-amber-500 to-orange-500',
    items: [
      { id: 'comm-1', text: 'Research local commissary options', priority: 'high' },
      { id: 'comm-2', text: 'Tour facilities and compare pricing', priority: 'medium' },
      { id: 'comm-3', text: 'Sign commissary agreement', priority: 'high' },
      { id: 'comm-4', text: 'Set up storage space for dry goods', priority: 'medium' },
      { id: 'comm-5', text: 'Arrange overnight parking/security', priority: 'medium' },
      { id: 'comm-6', text: 'Establish daily cleaning routine', priority: 'high' },
    ],
    details: {
      title: 'Commissary Kitchen Basics',
      content: `**What is a Commissary?**
A licensed commercial kitchen that serves as your "home base" for:
- Bulk food prep and cooking
- Ingredient storage (walk-in coolers, freezers, dry storage)
- Vehicle parking and cleaning facilities
- Water refill and wastewater disposal
- Equipment maintenance area

**Typical Monthly Costs:**
- Shared commissary: $400-$1,500/month
- Dedicated space: $1,500-$4,000+/month
- Look for all-inclusive packages (water, cleaning, parking)

**Benefits:**
- Meets health code requirements
- Professional cleaning facilities
- Networking with other food truck operators
- Delivery address for supplies`,
      tips: [
        'Many cities REQUIRE a commissary agreement for permits',
        'Visit during busy times to assess capacity',
        'Check if propane refills and tank swaps are available'
      ],
      costs: { low: '$400/mo', mid: '$800/mo', high: '$1,500+/mo' }
    }
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Operations',
    icon: Wrench,
    color: 'from-slate-500 to-zinc-500',
    items: [
      { id: 'maint-1', text: 'Create vehicle maintenance schedule', priority: 'high' },
      { id: 'maint-2', text: 'Set up generator maintenance routine', priority: 'high' },
      { id: 'maint-3', text: 'Establish daily equipment cleaning protocol', priority: 'high' },
      { id: 'maint-4', text: 'Schedule fire system inspections (every 6 months)', priority: 'high' },
      { id: 'maint-5', text: 'Create propane safety checklist', priority: 'high' },
      { id: 'maint-6', text: 'Set up maintenance log/tracking', priority: 'medium' },
      { id: 'maint-7', text: 'Identify trusted mechanic and repair contacts', priority: 'medium' },
    ],
    details: {
      title: 'Operational Upkeep',
      content: `**Vehicle Maintenance:**
- Oil changes every 3,000-5,000 miles (more frequent with idling)
- Regular brake, tire, and coolant checks
- Generator oil changes every 100 hours of run time

**Kitchen Equipment:**
- Daily: Wipe down grills, filter fryer oil, empty grease traps
- Weekly: Deep clean hood filters, fridges, underneath equipment
- Monthly: Calibrate thermostats, check burners, tighten bolts

**Safety Systems:**
- Fire suppression inspection every 6 months (~$450-$1,000/year)
- Propane leak checks (soap bubble test regularly)
- Fire extinguisher annual inspection

**Pest Control:**
- Keep truck spotless—cleanliness is best defense
- Use food-safe traps when truck is stored
- Remove all food debris daily`,
      tips: [
        'Preventive maintenance prevents costly breakdowns',
        'Keep a maintenance log—helps resale value too',
        'Carry spare belts, fuses, and bulbs'
      ],
      costs: { low: '$200/mo', mid: '$500/mo', high: '$1,000+/mo' }
    }
  },
  {
    id: 'marketing',
    title: 'Marketing & Branding',
    icon: Megaphone,
    color: 'from-pink-500 to-rose-500',
    items: [
      { id: 'mkt-1', text: 'Design logo and brand identity', priority: 'high' },
      { id: 'mkt-2', text: 'Get truck wrap/signage designed', priority: 'high' },
      { id: 'mkt-3', text: 'Set up social media accounts', priority: 'high' },
      { id: 'mkt-4', text: 'Create content calendar for posting', priority: 'medium' },
      { id: 'mkt-5', text: 'List on food truck finder apps', priority: 'medium' },
      { id: 'mkt-6', text: 'Connect with local breweries/venues', priority: 'medium' },
      { id: 'mkt-7', text: 'Plan launch event or soft opening', priority: 'medium' },
      { id: 'mkt-8', text: 'Set up loyalty/rewards program', priority: 'low' },
    ],
    details: {
      title: 'Building Your Brand',
      content: `**Your Truck is a Billboard:**
- Eye-catching wrap with clear logo
- Include social media handles on the truck
- Readable from across a parking lot
- Professional design investment: $2,000-$5,000

**Social Media Strategy:**
- Post location/hours daily
- Share mouth-watering food photos
- Engage with community (polls, behind-the-scenes)
- Use local hashtags (#YourCityFoodTrucks)

**Finding Customers:**
- Food truck rallies and festivals
- Breweries, wineries, and bars (great partnerships)
- Office parks and corporate catering
- Apps: StreetFoodFinder, Roaming Hunger

**Build Loyalty:**
- Punch cards ("Buy 9, get 10th free")
- Learn regulars' names and orders
- Collect emails for direct marketing`,
      tips: [
        'Consistency builds following—post at similar times daily',
        'User-generated content is free marketing',
        'Network with other food truck owners for tips and event leads'
      ],
      costs: { low: '$500', mid: '$3,000', high: '$10,000+' }
    }
  },
  {
    id: 'finance',
    title: 'Finances & Insurance',
    icon: DollarSign,
    color: 'from-emerald-500 to-teal-500',
    items: [
      { id: 'fin-1', text: 'Create detailed startup budget', priority: 'high' },
      { id: 'fin-2', text: 'Secure financing (savings, loan, investors)', priority: 'high' },
      { id: 'fin-3', text: 'Get commercial auto insurance', priority: 'high' },
      { id: 'fin-4', text: 'Get general liability insurance ($1M+)', priority: 'high' },
      { id: 'fin-5', text: 'Set up business bank account', priority: 'high' },
      { id: 'fin-6', text: 'Choose bookkeeping system', priority: 'medium' },
      { id: 'fin-7', text: 'Calculate break-even point', priority: 'medium' },
      { id: 'fin-8', text: 'Plan for quarterly tax payments', priority: 'medium' },
      { id: 'fin-9', text: 'Build 2-3 month emergency fund', priority: 'medium' },
    ],
    details: {
      title: 'Financial Planning',
      content: `**Startup Cost Ranges:**
- Budget (used trailer, DIY buildout): $15,000-$25,000
- Low-end (used truck, basic equipment): $35,000-$50,000
- Mid-range (used truck, fully equipped): $60,000-$100,000
- High-end (new custom build): $125,000-$200,000+

**Ongoing Monthly Costs:**
- Food/supplies: 25-35% of sales
- Fuel (truck + generator): $300-$800
- Commissary: $400-$1,500
- Insurance: $200-$400
- Permits/maintenance: $200-$500
- Labor (if applicable): varies

**Required Insurance:**
- Commercial auto insurance: covers the vehicle
- General liability: $1M minimum (often required)
- Product liability: covers food-related claims
- Workers' comp: if you have employees
- **Typical package: $2,000-$4,000/year**

**Break-Even Example:**
If monthly costs are $8,000 and you work 20 days, you need $400/day just to break even.`,
      tips: [
        "Set aside sales tax—it's not your money",
        'Track food cost percentage weekly',
        'Keep 2-3 months of expenses in emergency fund'
      ],
      costs: { low: '$15,000', mid: '$50,000', high: '$150,000+' }
    }
  },
  {
    id: 'hidden',
    title: 'Hidden Costs & Tips',
    icon: AlertTriangle,
    color: 'from-red-500 to-orange-500',
    items: [
      { id: 'hidden-1', text: 'Budget for proper generator size', priority: 'high' },
      { id: 'hidden-2', text: 'Plan propane safety protocols', priority: 'high' },
      { id: 'hidden-3', text: 'Arrange secure overnight parking', priority: 'medium' },
      { id: 'hidden-4', text: 'Plan for seasonal/weather downtime', priority: 'medium' },
      { id: 'hidden-5', text: 'Budget for event fees and permits', priority: 'medium' },
      { id: 'hidden-6', text: 'Consider physical demands on your health', priority: 'low' },
      { id: 'hidden-7', text: 'Build relationships with inspectors', priority: 'low' },
    ],
    details: {
      title: 'Often Overlooked Factors',
      content: `**Generator Power:**
Most trucks need 5,000-10,000W. Underpowered generators cause:
- Tripped breakers during service
- Spoiled food if fridges lose power
- Costly replacement when cheap ones fail

**Propane Safety:**
- Store tanks in ventilated exterior compartment
- Get professional installation
- Perform leak tests regularly
- Turn off valves when driving

**Parking & Storage:**
- Many cities ban overnight street parking
- Commissary or storage lot: $100-$500/month
- Security for theft/vandalism protection

**Winter/Off-Season:**
- Save summer profits for winter bills
- Find indoor opportunities (catering, markets)
- Winterize water lines if storing
- Insurance/loan payments continue year-round

**Event Realities:**
- Often require early arrival, can't leave until end
- May need additional insurance certificates
- Generator/power requirements vary by venue`,
      tips: [
        'Buy a generator bigger than you think you need',
        'Never store propane inside the truck',
        'Plan finances assuming some months have zero income'
      ],
      costs: { low: '$500/mo', mid: '$1,500/mo', high: '$3,000+/mo' }
    }
  }
];

const StartupGuide = () => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>('setup');
  
  // Track page views with Google Analytics
  usePageTracking();

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const getTotalProgress = () => {
    const allItems = CHECKLIST_SECTIONS.flatMap(s => s.items);
    const checked = allItems.filter(item => checkedItems[item.id]).length;
    return Math.round((checked / allItems.length) * 100);
  };

  const getSectionProgress = (sectionId: string) => {
    const section = CHECKLIST_SECTIONS.find(s => s.id === sectionId);
    if (!section) return 0;
    const checked = section.items.filter(item => checkedItems[item.id]).length;
    return Math.round((checked / section.items.length) * 100);
  };

  return (
    <>
      <SEO
        title="Food Truck Startup Guide 2026: Complete Checklist, Costs & Permits | Vendibook"
        description="Launch your food truck business with our comprehensive 2026 startup guide. Covers $15K-$175K startup costs, permits, equipment, kitchen layouts, menu engineering, and hidden risks. 60+ checklist items for food trucks, trailers, and ghost kitchens."
      />
      {/* Article Schema for Google Search */}
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Food Truck Startup Guide 2026: Complete Checklist, Costs & Permits",
          "description": "Comprehensive guide to starting a food truck, trailer, or mobile food business. Covers startup costs from $15K-$175K, required permits, equipment lists, kitchen layouts, menu engineering, and common failure points.",
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
            "@id": "https://vendibook.com/tools/startup-guide"
          }
        }}
      />
      {/* HowTo Schema for Rich Results */}
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Start a Food Truck Business in 2026",
          "description": "Complete step-by-step guide to launching a profitable food truck, trailer, or mobile food business. Budget setups start at $15,000-$25,000.",
          "image": "https://vendibook.com/images/food-truck-marketplace-analytics.jpg",
          "totalTime": "P3M",
          "estimatedCost": {
            "@type": "MonetaryAmount",
            "currency": "USD",
            "minValue": 15000,
            "maxValue": 175000
          },
          "supply": [
            { "@type": "HowToSupply", "name": "Food truck or trailer vehicle" },
            { "@type": "HowToSupply", "name": "Commercial cooking equipment (griddle, fryer, oven)" },
            { "@type": "HowToSupply", "name": "Refrigeration units" },
            { "@type": "HowToSupply", "name": "3-compartment sink and hand-wash sink" },
            { "@type": "HowToSupply", "name": "Ventilation hood and fire suppression system" },
            { "@type": "HowToSupply", "name": "Generator (5,000-10,000 watts)" },
            { "@type": "HowToSupply", "name": "POS system and payment processing" }
          ],
          "tool": [
            { "@type": "HowToTool", "name": "Business registration documents" },
            { "@type": "HowToTool", "name": "Food handler certification" },
            { "@type": "HowToTool", "name": "Health department application" },
            { "@type": "HowToTool", "name": "Commissary agreement" }
          ],
          "step": [
            { 
              "@type": "HowToStep", 
              "name": "Choose Your Setup", 
              "text": "Decide between food truck ($50K-$175K) vs food trailer ($30K-$100K). Consider mobility needs, kitchen space requirements, and budget. Heavy cooking operations need 7,000-10,000+ watts and commercial ventilation.",
              "url": "https://vendibook.com/tools/startup-guide#setup"
            },
            { 
              "@type": "HowToStep", 
              "name": "Design Your Menu", 
              "text": "Create a focused 5-8 item menu with cross-utilized ingredients. Target 28-35% food cost. Use menu engineering to identify Stars (high profit, high popularity) and optimize pricing at 3-4x food cost.",
              "url": "https://vendibook.com/tools/startup-guide#menu"
            },
            { 
              "@type": "HowToStep", 
              "name": "Source Equipment", 
              "text": "Purchase NSF-approved cooking appliances ($500-$5,000 each), refrigeration ($500-$4,000), 3-compartment sink, ventilation hood with fire suppression ($2,000-$10,000), and a reliable generator.",
              "url": "https://vendibook.com/tools/startup-guide#equipment"
            },
            { 
              "@type": "HowToStep", 
              "name": "Obtain Licenses & Permits", 
              "text": "Register LLC, get business license, apply for Mobile Food Vendor Permit, pass health department and fire inspections, obtain food handler certifications, and register vehicle with DMV. Budget $2,000-$28,000 for first-year regulatory costs.",
              "url": "https://vendibook.com/tools/startup-guide#permits"
            },
            { 
              "@type": "HowToStep", 
              "name": "Secure Commissary Agreement", 
              "text": "Find a licensed commercial kitchen for bulk prep, ingredient storage, vehicle parking, water refill, and wastewater disposal. Expect $400-$1,500/month for shared space.",
              "url": "https://vendibook.com/tools/startup-guide#commissary"
            },
            { 
              "@type": "HowToStep", 
              "name": "Set Up Operations & Maintenance", 
              "text": "Create daily/weekly maintenance schedules for generator, refrigeration, and vehicle. Budget $2,000-$5,000/year for repairs. Establish propane management and food safety protocols.",
              "url": "https://vendibook.com/tools/startup-guide#operations"
            },
            { 
              "@type": "HowToStep", 
              "name": "Launch Marketing & Branding", 
              "text": "Design truck wrap and logo, set up social media (Instagram, TikTok), join local food truck directories, and network with breweries and event organizers for prime locations.",
              "url": "https://vendibook.com/tools/startup-guide#marketing"
            },
            { 
              "@type": "HowToStep", 
              "name": "Manage Finances & Insurance", 
              "text": "Create detailed budget including monthly operating costs ($3,000-$8,000). Obtain commercial auto insurance, general liability ($1M minimum), and workers comp. Set aside emergency fund for breakdowns.",
              "url": "https://vendibook.com/tools/startup-guide#finances"
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
              "name": "How much does it cost to start a food truck?",
              "acceptedAnswer": { "@type": "Answer", "text": "Food truck startup costs range from $15,000-$25,000 for a budget DIY setup (used trailer, basic equipment) to $175,000+ for a premium custom build. Key expenses include vehicle ($5K-$100K), buildout ($5K-$60K), equipment ($5K-$45K), permits ($2K-$5K), and initial inventory ($2K-$5K). Monthly operating costs run $3,000-$8,000 including commissary, fuel, insurance, and supplies." }
            },
            {
              "@type": "Question",
              "name": "What permits do I need for a food truck?",
              "acceptedAnswer": { "@type": "Answer", "text": "Essential permits include: business license ($50-$500), mobile food vendor permit ($200-$1,000/year), health department inspection, fire department inspection ($450-$1,000), commissary agreement, food handler certifications (ServSafe), vehicle registration, and sales tax permit. First-year regulatory costs can average $28,000 including all fees, inspections, and compliance time." }
            },
            {
              "@type": "Question",
              "name": "Food truck vs food trailer: which is better?",
              "acceptedAnswer": { "@type": "Answer", "text": "Food trucks ($50K-$175K) offer high mobility, self-contained operation, and quick setup but have limited kitchen space (60-120 sq ft). Food trailers ($30K-$100K) are cheaper per square foot with expandable kitchen space (80-200 sq ft), but require a tow vehicle and are harder to maneuver. Trucks suit urban street vending; trailers suit festivals, catering, and fixed lots." }
            },
            {
              "@type": "Question",
              "name": "Why do 60% of food trucks fail?",
              "acceptedAnswer": { "@type": "Answer", "text": "Common failure causes include: undercapitalized startups (insufficient cash reserves), generator failures during service, insurance claim denials, weather volatility eliminating revenue, parking fines in aggressive cities, hidden time costs (8-hour shifts become 12-14 hours with prep and cleanup), inadequate maintenance budgets, and poor location selection." }
            },
            {
              "@type": "Question",
              "name": "What equipment do I need for a food truck?",
              "acceptedAnswer": { "@type": "Answer", "text": "Essential equipment includes: cooking appliances (griddle $1,500, fryer $500-$2,000, oven $1,000-$10,000), refrigeration (under-counter fridges $1,000-$3,000, prep tables $2,000-$5,000), sinks (hand-wash $300, 3-compartment $500-$2,000), ventilation hood with fire suppression ($2,000-$10,000), generator 5,000-10,000W ($3,000+), POS system, and NSF-approved smallwares." }
            },
            {
              "@type": "Question",
              "name": "Do I need a commissary for a food truck?",
              "acceptedAnswer": { "@type": "Answer", "text": "Most cities require a commissary agreement for food truck permits. A commissary is a licensed commercial kitchen that serves as your home base for bulk food prep, ingredient storage (walk-in coolers/freezers), vehicle parking and cleaning, water refill, wastewater disposal, and equipment maintenance. Expect to pay $400-$1,500/month for shared commissary space." }
            },
            {
              "@type": "Question",
              "name": "How much can a food truck make per year?",
              "acceptedAnswer": { "@type": "Answer", "text": "Average food truck revenue ranges from $250,000-$500,000 per year, with profit margins of 6-9% after all expenses. Top performers in high-traffic locations can exceed $1M annually. Key factors include location quality, menu pricing, operating hours, and event bookings. Most trucks need 18-24 months to reach profitability." }
            },
            {
              "@type": "Question",
              "name": "What size generator do I need for a food truck?",
              "acceptedAnswer": { "@type": "Answer", "text": "Generator size depends on your equipment: Light prep operations (coffee, cold foods) need 3,000-5,000 watts. Heavy cooking (frying, grilling) requires 7,000-10,000+ watts. Calculate total wattage of all equipment running simultaneously, add 20% buffer for startup surges. Inverter generators are quieter but cost more. Budget $3,000-$5,000 for a reliable mid-size generator." }
            }
          ]
        }}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Food Truck Startup Checklist",
          "description": "Complete 60+ item checklist for launching a food truck business",
          "numberOfItems": 8,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Choose Your Setup", "description": "Decide on food truck vs trailer, kitchen intensity, power requirements, and ventilation needs" },
            { "@type": "ListItem", "position": 2, "name": "Design Your Menu", "description": "Choose cuisine, create 5-8 item menu, plan ingredient cross-utilization, set pricing strategy" },
            { "@type": "ListItem", "position": 3, "name": "Equipment & Buildout", "description": "Source cooking appliances, refrigeration, sinks, ventilation, generator, and POS system" },
            { "@type": "ListItem", "position": 4, "name": "Licenses & Permits", "description": "Business license, mobile food vendor permit, health/fire inspections, food handler certs" },
            { "@type": "ListItem", "position": 5, "name": "Commissary & Storage", "description": "Research commissaries, sign agreement, set up storage, arrange overnight parking" },
            { "@type": "ListItem", "position": 6, "name": "Maintenance & Operations", "description": "Create maintenance schedules, plan propane management, establish food safety protocols" },
            { "@type": "ListItem", "position": 7, "name": "Marketing & Branding", "description": "Design truck wrap, set up social media, join directories, network for locations" },
            { "@type": "ListItem", "position": 8, "name": "Finances & Insurance", "description": "Create budget, track cash flow, obtain commercial auto and liability insurance" }
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
                  <BreadcrumbPage>Startup Guide</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                Complete Startup Blueprint
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Food Truck Startup Guide
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                The complete 2024 blueprint for launching a profitable food truck, trailer, or mobile food business. Covers costs, permits, equipment, and the hidden risks that cause 60% to fail.
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

              {/* Overall Progress */}
              <Card className="max-w-md mx-auto border-0 shadow-xl bg-card/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-2xl font-bold text-primary">{getTotalProgress()}%</span>
                  </div>
                  <Progress value={getTotalProgress()} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Object.values(checkedItems).filter(Boolean).length} of {CHECKLIST_SECTIONS.flatMap(s => s.items).length} tasks completed
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Industry Stats Banner */}
        <section className="py-6 px-4 bg-gradient-to-r from-primary/5 via-amber-500/5 to-orange-500/5">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <p className="text-2xl md:text-3xl font-bold text-primary mb-1">{INDUSTRY_STATS.marketSize}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Industry Size ({INDUSTRY_STATS.year})</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <p className="text-2xl md:text-3xl font-bold text-green-600 mb-1">{INDUSTRY_STATS.growthRate}</p>
                <p className="text-xs md:text-sm text-muted-foreground">Annual Growth</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <p className="text-2xl md:text-3xl font-bold text-amber-600 mb-1">$15K-$175K</p>
                <p className="text-xs md:text-sm text-muted-foreground">Avg Startup Cost</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <p className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">3 min</p>
                <p className="text-xs md:text-sm text-muted-foreground">Target Ticket Time</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
                <p className="text-2xl md:text-3xl font-bold text-purple-600 mb-1">28-35%</p>
                <p className="text-xs md:text-sm text-muted-foreground">Target Food Cost</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Action Cards */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Essential Tools for Your Journey</h2>
              <p className="text-muted-foreground">Use these free tools to plan and launch your food business</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-6">
                  <Link to="/tools/pricepilot" className="block">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Price Pilot</h3>
                    <p className="text-sm text-muted-foreground mb-3">Get AI-powered pricing recommendations based on your market and equipment.</p>
                    <span className="text-primary text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Calculate Pricing <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-6">
                  <Link to="/tools/permitpath" className="block">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Permit Path</h3>
                    <p className="text-sm text-muted-foreground mb-3">Find exactly which permits and licenses you need for your state and city.</p>
                    <span className="text-primary text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Find Permits <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-6">
                  <Link to="/tools/regulations-hub" className="block">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <Scale className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Regulations Hub</h3>
                    <p className="text-sm text-muted-foreground mb-3">State-by-state regulations, certifications, and compliance requirements.</p>
                    <span className="text-primary text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Regulations <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-6">
                  <Link to="/tools/buildkit" className="block">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <Wrench className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">BuildKit</h3>
                    <p className="text-sm text-muted-foreground mb-3">Calculate buildout costs and create equipment lists for your setup.</p>
                    <span className="text-primary text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Plan Buildout <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Truck vs Trailer Comparison */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Food Truck vs Food Trailer</h2>
              <p className="text-muted-foreground">Choose the right platform for your business model</p>
            </div>
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Feature</TableHead>
                        <TableHead className="bg-orange-50 dark:bg-orange-950/30">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" /> Food Truck
                          </div>
                        </TableHead>
                        <TableHead className="bg-blue-50 dark:bg-blue-950/30">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4" /> Food Trailer
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {VEHICLE_COMPARISON.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.feature}</TableCell>
                          <TableCell className="bg-orange-50/50 dark:bg-orange-950/20">{row.truck}</TableCell>
                          <TableCell className="bg-blue-50/50 dark:bg-blue-950/20">{row.trailer}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Menu Engineering Matrix */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Menu Engineering Matrix</h2>
              <p className="text-muted-foreground">Categorize items by profitability and popularity to maximize revenue</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {MENU_MATRIX.map((item) => (
                <Card key={item.category} className={`${item.bgColor} border-2`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                      <span>{item.category}</span>
                      <div className="ml-auto flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          Profit: {item.profit}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Popularity: {item.popularity}
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm"><strong>Action:</strong> {item.action}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="mt-6 bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold">The 3-Minute Throughput Rule</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Speed is the cap on revenue. Target ticket time under 3 minutes during peak hours. 
                      Complex dishes create bottlenecks. Use "speed-scratch" processes: 80% of prep at commissary, 
                      on-truck activity is strictly finishing (searing, frying, assembling).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Kitchen Layouts by Cuisine */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Kitchen Layouts by Cuisine</h2>
              <p className="text-muted-foreground">Equipment requirements and workflow for different food concepts</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {KITCHEN_LAYOUTS.map((layout) => (
                <Dialog key={layout.id}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:shadow-lg transition-all group">
                      <CardHeader className={`bg-gradient-to-r ${layout.color} text-white rounded-t-lg`}>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <layout.icon className="h-5 w-5" />
                          {layout.name}
                        </CardTitle>
                        <CardDescription className="text-white/80">{layout.examples}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Power:</span>
                          <Badge variant="outline">{layout.powerNeeds}</Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="w-full mt-3 gap-1 group-hover:bg-primary/10">
                          <Info className="h-4 w-4" />
                          View Full Layout
                        </Button>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <layout.icon className="h-5 w-5 text-primary" />
                        {layout.name} Kitchen Layout
                      </DialogTitle>
                      <DialogDescription>{layout.examples}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Required Equipment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {layout.equipment.map((eq, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                {eq.critical ? (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                                <span className="font-medium">{eq.name}</span>
                                <span className="text-muted-foreground">— {eq.spec}</span>
                                {eq.critical && <Badge variant="destructive" className="text-xs ml-auto">Critical</Badge>}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-blue-50 dark:bg-blue-950/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" /> Workflow
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm font-mono">{layout.workflow}</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-amber-50 dark:bg-amber-950/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" /> Warnings & Considerations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {layout.warnings.map((warning, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <span>{warning}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <Zap className="h-6 w-6 mx-auto text-amber-500 mb-2" />
                            <p className="text-sm font-medium">Power Needs</p>
                            <p className="text-lg font-bold text-primary">{layout.powerNeeds}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 text-center">
                            <Wind className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                            <p className="text-sm font-medium">Ventilation</p>
                            <p className="text-xs text-muted-foreground">{layout.ventilation}</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        </section>

        {/* Checklist Sections */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold mb-2">Complete Startup Checklist</h2>
              <p className="text-muted-foreground">Track your progress through each phase of launching your food business</p>
            </div>
            <div className="grid gap-6">
              {CHECKLIST_SECTIONS.map((section, index) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    <CardHeader className={`bg-gradient-to-r ${section.color} text-white`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <section.icon className="h-6 w-6" />
                          <div>
                            <CardTitle className="text-lg">{section.title}</CardTitle>
                            <CardDescription className="text-white/80">
                              {getSectionProgress(section.id)}% complete
                            </CardDescription>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="secondary" size="sm" className="gap-1">
                              <Info className="h-4 w-4" />
                              Learn More
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <section.icon className="h-5 w-5 text-primary" />
                                {section.details.title}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="prose prose-sm max-w-none">
                                {section.details.content.split('\n').map((paragraph, i) => (
                                  <p key={i} className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                              
                              <Card className="bg-muted/50">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-green-500" />
                                    Cost Estimates
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Budget</p>
                                      <p className="font-semibold text-green-600">{section.details.costs.low}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Average</p>
                                      <p className="font-semibold text-amber-600">{section.details.costs.mid}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Premium</p>
                                      <p className="font-semibold text-red-600">{section.details.costs.high}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card className="bg-primary/5 border-primary/20">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    Pro Tips
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <ul className="space-y-2">
                                    {section.details.tips.map((tip, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                        <span>{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Progress 
                        value={getSectionProgress(section.id)} 
                        className="h-2 bg-white/30 mt-3"
                      />
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid gap-2">
                        {section.items.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                              checkedItems[item.id] ? 'bg-green-50 dark:bg-green-950/20' : ''
                            }`}
                            onClick={() => toggleItem(item.id)}
                          >
                            <Checkbox
                              checked={checkedItems[item.id] || false}
                              onCheckedChange={() => toggleItem(item.id)}
                            />
                            <span className={`flex-1 ${checkedItems[item.id] ? 'line-through text-muted-foreground' : ''}`}>
                              {item.text}
                            </span>
                            <Badge 
                              variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {item.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Detailed Startup Costs */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Comprehensive Startup Cost Breakdown</h2>
              <p className="text-muted-foreground">Detailed budget planning for your food truck launch</p>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense Category</TableHead>
                        <TableHead className="text-right text-green-600">Low Estimate</TableHead>
                        <TableHead className="text-right text-red-600">High Estimate</TableHead>
                        <TableHead>Context</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {STARTUP_COSTS.map((cost, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{cost.category}</TableCell>
                          <TableCell className="text-right text-green-600">{cost.low}</TableCell>
                          <TableCell className="text-right text-red-600">{cost.high}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{cost.context}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>TOTAL STARTUP CAPITAL</TableCell>
                        <TableCell className="text-right text-green-600">$58,500</TableCell>
                        <TableCell className="text-right text-red-600">$242,500</TableCell>
                        <TableCell className="text-muted-foreground text-sm">Wide variance based on DIY vs Turnkey</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Operating Costs */}
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4 text-center">Monthly Operating Expenses (OpEx)</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MONTHLY_COSTS.map((cost, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{cost.category}</span>
                        <Badge variant="outline" className="text-primary">
                          {cost.percentage || cost.amount}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{cost.notes}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Hidden Risks / Silent Killers */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8">
              <Badge variant="destructive" className="mb-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Critical Knowledge
              </Badge>
              <h2 className="text-2xl font-bold mb-2">Hidden Risks & Silent Profit Killers</h2>
              <p className="text-muted-foreground">The operational pitfalls that cause 60% of food trucks to fail</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {HIDDEN_RISKS.map((risk) => (
                <Dialog key={risk.title}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-red-200 group">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <risk.icon className="h-5 w-5 text-red-500" />
                          {risk.title}
                        </CardTitle>
                        <CardDescription>{risk.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="ghost" size="sm" className="w-full gap-1 group-hover:bg-red-50 dark:group-hover:bg-red-950/20">
                          <Info className="h-4 w-4" />
                          Learn How to Avoid
                        </Button>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-red-600">
                        <risk.icon className="h-5 w-5" />
                        {risk.title}
                      </DialogTitle>
                      <DialogDescription>{risk.description}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Card className="bg-red-50 dark:bg-red-950/30 border-red-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">What Can Go Wrong</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {risk.details.map((detail, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Prevention Strategy
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{risk.prevention}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Reference Cards */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold mb-8 text-center">Quick Reference</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Startup Cost Ranges
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Budget Setup</span>
                    <Badge variant="outline" className="text-green-600">$15,000 - $25,000</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Setup</span>
                    <Badge variant="outline" className="text-amber-600">$70,000 - $130,000</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Premium Build</span>
                    <Badge variant="outline" className="text-red-600">$150,000+</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Timeline to Launch
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Planning & Permits</span>
                    <Badge variant="outline">2-4 months</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Build/Purchase</span>
                    <Badge variant="outline">1-3 months</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Inspections</span>
                    <Badge variant="outline">2-6 weeks</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Power Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Light Prep</span>
                    <Badge variant="outline">3,000 - 5,000W</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Standard Kitchen</span>
                    <Badge variant="outline">5,000 - 7,000W</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Heavy Cooking</span>
                    <Badge variant="outline">7,000 - 10,000W+</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* State-Specific Regulations */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Regulations by State</h2>
              <p className="text-muted-foreground">Find permits and compliance requirements for your location</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {['California', 'Texas', 'Florida', 'New York', 'Arizona', 'Colorado', 'Oregon', 'Washington', 'Georgia', 'North Carolina', 'Illinois', 'Nevada'].map((state) => (
                <Link 
                  key={state}
                  to={`/tools/regulations-hub?state=${state.toLowerCase().replace(' ', '-')}`}
                  className="p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group"
                >
                  <MapPin className="h-4 w-4 mx-auto mb-1 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium">{state}</span>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/tools/regulations-hub">
                  View All 50 States <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Related Resources */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Related Resources</h2>
              <p className="text-muted-foreground">Guides and articles to help you succeed</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-6">
                  <Link to="/blog/how-to-start-food-truck-business" className="block">
                    <Badge variant="secondary" className="mb-3">Guide</Badge>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">How to Start a Food Truck Business in 2024</h3>
                    <p className="text-sm text-muted-foreground mb-3">Complete step-by-step guide from concept to launch, including financing options and marketing strategies.</p>
                    <span className="text-primary text-sm font-medium inline-flex items-center gap-1">
                      Read Article <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-6">
                  <Link to="/help/permits-and-licensing" className="block">
                    <Badge variant="secondary" className="mb-3">Help Center</Badge>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">Understanding Food Truck Permits</h3>
                    <p className="text-sm text-muted-foreground mb-3">Learn about the different types of permits, inspection requirements, and how to stay compliant.</p>
                    <span className="text-primary text-sm font-medium inline-flex items-center gap-1">
                      Learn More <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-6">
                  <Link to="/blog/food-truck-financing-options" className="block">
                    <Badge variant="secondary" className="mb-3">Finance</Badge>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">Food Truck Financing Options</h3>
                    <p className="text-sm text-muted-foreground mb-3">Explore SBA loans, equipment financing, and creative funding strategies for your mobile food business.</p>
                    <span className="text-primary text-sm font-medium inline-flex items-center gap-1">
                      Read Article <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Find Your Perfect Truck or Trailer?</h2>
            <p className="text-muted-foreground mb-8">
              Browse listings from verified sellers and start your food business journey today.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-800 text-white border border-zinc-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 gap-2">
                <Link to="/search?category=food_truck">
                  <Truck className="h-5 w-5" />
                  Browse Food Trucks
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-800 text-white border border-zinc-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 gap-2">
                <Link to="/search?category=food_trailer">
                  <Car className="h-5 w-5" />
                  Browse Trailers
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 hover:from-zinc-800 hover:via-zinc-700 hover:to-zinc-800 text-white border border-zinc-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 gap-2">
                <Link to="/search?category=ghost_kitchen">
                  <Building2 className="h-5 w-5" />
                  Find Kitchens
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link to="/tools/permit-path">
                  <FileCheck className="h-5 w-5" />
                  Get Permit Checklist
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <ToolCrossLinks currentTool="startup-guide" />
      </main>
      
      <Footer />
    </>
  );
};

export default StartupGuide;
