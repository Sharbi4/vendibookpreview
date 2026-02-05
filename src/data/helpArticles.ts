export interface ArticleSection {
  id: string;
  title: string;
  content: string;
}

export interface HelpArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  categorySlug: string;
  featured?: boolean;
  sections: ArticleSection[];
  relatedArticles?: string[];
}

export const helpArticles: HelpArticle[] = [
  // START HERE
  {
    slug: 'rentals-end-to-end',
    title: 'How Vendibook Rentals Work (End-to-End)',
    description: 'A complete guide to renting mobile kitchens, food trucks, and trailers on Vendibook.',
    category: 'Start Here',
    categorySlug: 'start-here',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content: `Vendibook connects food entrepreneurs with mobile kitchen assets—food trucks, trailers, ghost kitchens, and Vendor Spaces. Our rental process is designed to be straightforward, secure, and transparent for both renters and hosts.

Whether you're testing a new concept, covering for equipment repairs, or scaling up for an event, Vendibook gives you access to vetted equipment without long-term commitments.`
      },
      {
        id: 'finding-listing',
        title: 'Finding the Right Listing',
        content: `**Search and Filter**
Use the search bar to find listings by location, category, or keywords. Filter results by:
- Asset type (food truck, trailer, ghost kitchen, Vendor Space)
- Price range
- Availability dates
- Amenities and equipment

**Review Listing Details**
Each listing includes:
- High-quality photos
- Complete equipment list
- Pricing (daily and weekly rates)
- Host information and verification status
- Reviews from previous renters`
      },
      {
        id: 'booking-process',
        title: 'The Booking Process',
        content: `**1. Select Your Dates**
Choose your rental period using the calendar. Some listings have minimum rental periods.

**2. Submit a Booking Request**
Click "Request to Book" and include a message to the host explaining your intended use.

**3. Host Review**
The host reviews your request and profile. They may ask questions before approving.

**4. Payment**
Once approved, you'll receive a payment link. Payment is held securely until the rental begins.

**5. Confirmation**
After payment, you'll receive confirmation with pickup/access instructions.`
      },
      {
        id: 'during-rental',
        title: 'During Your Rental',
        content: `**Pickup or Access**
Follow the host's instructions for pickup or site access. Document the condition with photos.

**Communication**
Use Vendibook messaging to communicate with your host about any questions or issues.

**Care and Responsibility**
- Treat the equipment as if it were your own
- Follow all safety guidelines
- Report any issues immediately
- Keep the asset clean and operational`
      },
      {
        id: 'return-process',
        title: 'Return Process',
        content: `**Prepare for Return**
- Clean all equipment thoroughly
- Refill propane tanks if required
- Empty waste water tanks
- Document the condition with photos

**Return Inspection**
The host will inspect the asset. Any damage beyond normal wear will be documented.

**Security Deposit**
Your deposit is released within 48 hours of a successful return, minus any damage charges.

**Leave a Review**
Help future renters by leaving an honest review of your experience.`
      }
    ],
    relatedArticles: ['buying-end-to-end', 'pre-rental-inspection']
  },
  {
    slug: 'buying-end-to-end',
    title: 'How Buying Works on Vendibook (End-to-End)',
    description: 'Everything you need to know about purchasing mobile kitchens and equipment on Vendibook.',
    category: 'Start Here',
    categorySlug: 'start-here',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content: `Buying a food truck, trailer, or commercial kitchen equipment is a significant investment. Vendibook provides a secure marketplace with verified sellers, transparent pricing, and buyer protections.

Our platform handles payment processing, provides dispute resolution, and ensures you have the information needed to make an informed purchase.`
      },
      {
        id: 'finding-assets',
        title: 'Finding Assets for Sale',
        content: `**Browse Sale Listings**
Filter search results to show only "For Sale" listings. Each listing includes:
- Detailed photos from multiple angles
- Complete equipment specifications
- Asking price
- Seller information and verification status

**Evaluate the Listing**
Look for:
- Recent photos (ask for dated photos if uncertain)
- Complete maintenance history
- Clear description of included equipment
- Transparent disclosure of any issues`
      },
      {
        id: 'making-offer',
        title: 'Making an Offer',
        content: `**Contact the Seller**
Use the inquiry form to ask questions before committing. Good questions include:
- Why are you selling?
- What maintenance has been done recently?
- Are there any known issues?
- What's included in the sale?

**Request an Inspection**
For significant purchases, arrange an in-person inspection or hire a mobile mechanic to evaluate the asset.

**Negotiate**
Many sellers are open to reasonable offers. Be respectful and professional in negotiations.`
      },
      {
        id: 'payment-transfer',
        title: 'Payment and Transfer',
        content: `**Secure Payment**
All payments are processed through Vendibook's secure payment system. Never pay outside the platform.

**Escrow Protection**
Funds are held in escrow until both parties confirm the transaction is complete.

**Documentation**
Ensure you receive:
- Bill of sale
- Title transfer documents
- Equipment manuals
- Maintenance records
- Warranty information (if applicable)

**Delivery or Pickup**
Coordinate with the seller for pickup or arrange delivery through Vendibook Freight.`
      },
      {
        id: 'after-purchase',
        title: 'After Your Purchase',
        content: `**Confirm Receipt**
Inspect the asset thoroughly upon receipt. Report any discrepancies immediately.

**Complete the Transaction**
Confirm completion in the platform to release funds to the seller.

**Register and Insure**
- Transfer registration to your name
- Obtain proper insurance coverage
- Update any permits or licenses

**Leave a Review**
Help other buyers by sharing your experience with the seller.`
      }
    ],
    relatedArticles: ['rentals-end-to-end', 'pre-rental-inspection']
  },
  {
    slug: 'pre-rental-inspection',
    title: 'What to Inspect Before You Rent a Trailer or Food Truck',
    description: 'A comprehensive inspection checklist to protect yourself when renting mobile kitchen equipment.',
    category: 'Start Here',
    categorySlug: 'start-here',
    sections: [
      {
        id: 'why-inspect',
        title: 'Why Inspection Matters',
        content: `Documenting the condition of a rental before you take possession protects both you and the host. A thorough inspection:
- Establishes baseline condition
- Identifies existing damage
- Prevents disputes about damage you didn't cause
- Ensures equipment is operational

**Always document with photos and video before accepting the asset.**`
      },
      {
        id: 'exterior-inspection',
        title: 'Exterior Inspection',
        content: `**Body and Frame**
- Check for dents, scratches, rust, or body damage
- Inspect welds and frame integrity
- Look for signs of previous accidents or repairs
- Check all doors and hatches for proper operation

**Tires and Wheels**
- Check tire tread depth and condition
- Look for cracks, bulges, or uneven wear
- Verify lug nuts are tight
- Check spare tire condition

**Lights and Signals**
- Test all running lights
- Check brake lights and turn signals
- Verify clearance lights work

**Hitching Components** (for trailers)
- Inspect coupler condition
- Check safety chains
- Verify breakaway cable/switch
- Test jack operation`
      },
      {
        id: 'kitchen-equipment',
        title: 'Kitchen Equipment',
        content: `**Cooking Equipment**
- Test all burners and heating elements
- Check oven temperature accuracy
- Verify fryer heats and maintains temperature
- Test griddle for even heating

**Refrigeration**
- Verify refrigerator reaches and holds 40°F or below
- Check freezer reaches 0°F or below
- Listen for unusual compressor sounds
- Check door seals for proper closure

**Sinks and Plumbing**
- Run water through all faucets
- Check for leaks under sinks
- Verify hot water heater works
- Test drainage`
      },
      {
        id: 'safety-systems',
        title: 'Safety Systems',
        content: `**Fire Suppression**
- Check system inspection tag is current
- Verify manual pull stations are accessible
- Confirm automatic activation sensors are in place

**Ventilation**
- Test hood exhaust fans
- Check grease filters are clean
- Verify make-up air intake works

**Fire Extinguishers**
- Verify extinguisher is properly charged
- Check inspection tag is current
- Confirm proper type (K for kitchen)

**Gas Systems**
- Check for gas smell (none should be present)
- Verify all connections are secure
- Confirm propane tanks are properly mounted`
      },
      {
        id: 'documentation',
        title: 'Documentation Checklist',
        content: `**Photos to Take**
- All four exterior sides
- Close-ups of any existing damage
- Each piece of equipment
- Odometer/hour meter readings
- Propane tank gauge levels
- Any areas of concern

**Video Documentation**
- Walk-around of entire exterior
- Demonstration of each piece of equipment operating
- Any unusual sounds or issues

**Written Notes**
- Date and time of inspection
- Names of people present
- List of any noted issues
- Host acknowledgment of existing conditions`
      }
    ],
    relatedArticles: ['rentals-end-to-end', 'preventive-maintenance']
  },

  // CARE, MAINTENANCE, AND CHECKLISTS
  {
    slug: 'refrigeration-cold-holding',
    title: 'Refrigeration and Cold Holding: Keep Food Safe and Extend Equipment Life',
    description: 'Best practices for refrigeration in mobile food operations to ensure food safety and equipment longevity.',
    category: 'Care, Maintenance, and Checklists',
    categorySlug: 'care-maintenance',
    sections: [
      {
        id: 'temperature-basics',
        title: 'Temperature Basics',
        content: `**Critical Temperatures**
- Refrigerator: 40°F (4°C) or below
- Freezer: 0°F (-18°C) or below
- Danger zone: 40°F to 140°F (4°C to 60°C)

Food left in the danger zone for more than 2 hours (1 hour if above 90°F ambient) must be discarded.

**Daily Temperature Logs**
Check and record temperatures:
- At the start of each shift
- Every 4 hours during operation
- At the end of each day

Keep logs for at least 90 days for health department inspections.`
      },
      {
        id: 'organization',
        title: 'Proper Organization',
        content: `**Storage Order (Top to Bottom)**
1. Ready-to-eat foods
2. Whole fish and seafood
3. Whole cuts of beef and pork
4. Ground meat and ground fish
5. Whole and ground poultry

**Why This Order?**
Foods with higher cooking temperatures are stored below foods with lower cooking temperatures to prevent cross-contamination from drips.

**Additional Tips**
- Never store food directly on the floor
- Keep raw and cooked foods separate
- Use airtight containers
- Label everything with date and contents`
      },
      {
        id: 'maintenance',
        title: 'Equipment Maintenance',
        content: `**Daily Tasks**
- Check door seals for proper closure
- Wipe down interior surfaces
- Remove any spills immediately
- Verify fans are running

**Weekly Tasks**
- Clean condenser coils (if accessible)
- Check and clean drain lines
- Organize and rotate stock
- Deep clean interior shelves

**Monthly Tasks**
- Check refrigerant levels (have professional inspect if low)
- Inspect electrical connections
- Verify thermostat accuracy with separate thermometer
- Clean or replace air filters`
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting Common Issues',
        content: `**Unit Not Cooling**
1. Check power connection
2. Verify thermostat setting
3. Listen for compressor running
4. Check for ice buildup on evaporator
5. Clear any debris from condenser coils

**Temperature Fluctuations**
- Don't overload the unit
- Avoid frequent door opening
- Check door seals for gaps
- Verify adequate ventilation around unit

**Frost Buildup**
- Check door gaskets
- Verify defrost system is working
- Reduce door opening frequency
- Don't store warm items directly in freezer`
      }
    ],
    relatedArticles: ['preventive-maintenance', 'food-safety-temps']
  },
  {
    slug: 'preventive-maintenance',
    title: 'Preventive Maintenance for Food Trailers, Food Trucks, and Mobile Kitchens',
    description: 'A practical preventive maintenance schedule for mobile kitchens—reduce breakdowns, improve safety, and protect rental and resale value.',
    category: 'Care, Maintenance, and Checklists',
    categorySlug: 'care-maintenance',
    featured: true,
    sections: [
      {
        id: 'why-preventive',
        title: 'Why Preventive Maintenance Matters',
        content: `Preventive maintenance is cheaper than emergency repairs. A well-maintained mobile kitchen:
- Experiences fewer breakdowns
- Maintains higher resale value
- Passes health inspections more easily
- Operates more safely
- Uses fuel and energy more efficiently

**The Cost of Neglect**
A single breakdown during a busy event can cost thousands in lost revenue, emergency repair fees, and damaged reputation. Prevention is always more affordable.`
      },
      {
        id: 'daily-tasks',
        title: 'Daily Maintenance Tasks',
        content: `**Before Opening**
- Check all equipment operates correctly
- Verify refrigeration temperatures
- Test fire suppression pull station access
- Check propane tank levels
- Inspect for any overnight damage

**During Operation**
- Monitor equipment for unusual sounds or smells
- Keep grease traps from overflowing
- Wipe down surfaces regularly
- Empty trash before it overflows

**After Closing**
- Clean all cooking surfaces
- Empty and sanitize prep areas
- Check refrigeration temperatures
- Turn off unnecessary equipment
- Secure all doors and windows`
      },
      {
        id: 'weekly-tasks',
        title: 'Weekly Maintenance Tasks',
        content: `**Equipment**
- Deep clean fryers (filter and replace oil as needed)
- Clean refrigerator condenser coils
- Inspect and clean hood filters
- Check all gas connections for leaks
- Test all pilot lights

**Plumbing**
- Clean sink drains
- Check for leaks under sinks
- Sanitize water holding tanks
- Inspect water pump operation

**Electrical**
- Check all outlets and switches
- Inspect cords for damage
- Test GFCI outlets
- Verify generator fuel levels`
      },
      {
        id: 'monthly-tasks',
        title: 'Monthly Maintenance Tasks',
        content: `**Exterior**
- Inspect roof for leaks or damage
- Check all seals around windows and doors
- Lubricate hinges and locks
- Inspect tires for wear and proper pressure

**Mechanical (Food Trucks)**
- Check engine oil and fluid levels
- Inspect belts and hoses
- Test battery charge
- Check brake operation

**Safety Equipment**
- Inspect fire extinguisher charge
- Check first aid kit supplies
- Test carbon monoxide detectors
- Verify emergency exits clear`
      },
      {
        id: 'seasonal-tasks',
        title: 'Seasonal and Annual Tasks',
        content: `**Annual Professional Inspections**
- Fire suppression system (required annually)
- Propane system inspection
- Generator service
- HVAC system service

**Winterization (If Applicable)**
- Drain all water lines
- Add antifreeze to plumbing
- Disconnect and store batteries
- Cover and protect exterior

**Pre-Season Prep**
- Complete thorough inspection
- Service all equipment
- Update permits and insurance
- Restock supplies and first aid`
      }
    ],
    relatedArticles: ['daily-checklist', 'refrigeration-cold-holding']
  },
  {
    slug: 'daily-checklist',
    title: 'Daily Open/Close Checklist for Mobile Kitchens',
    description: 'Printable checklists for daily opening and closing procedures in food trucks and trailers.',
    category: 'Care, Maintenance, and Checklists',
    categorySlug: 'care-maintenance',
    sections: [
      {
        id: 'opening-checklist',
        title: 'Opening Checklist',
        content: `**Safety First**
- [ ] Check fire extinguisher is accessible and charged
- [ ] Verify first aid kit is stocked
- [ ] Test carbon monoxide detector
- [ ] Check emergency exit is clear

**Equipment Startup**
- [ ] Turn on refrigeration units
- [ ] Verify refrigerator at 40°F or below
- [ ] Verify freezer at 0°F or below
- [ ] Light pilot lights on gas equipment
- [ ] Preheat cooking equipment

**Sanitation**
- [ ] Sanitize all food contact surfaces
- [ ] Fill sanitizer buckets to proper concentration
- [ ] Check soap and paper towel supplies
- [ ] Verify hot water is available at handwash sink

**Inventory**
- [ ] Check food inventory levels
- [ ] Verify all food is properly stored
- [ ] Check expiration dates
- [ ] FIFO rotation complete`
      },
      {
        id: 'during-service',
        title: 'During Service',
        content: `**Temperature Monitoring**
- [ ] Check hot holding temps every hour (140°F+)
- [ ] Check cold holding temps every hour (40°F or below)
- [ ] Document temperatures on log sheet
- [ ] Discard any food outside safe temps

**Sanitation**
- [ ] Change sanitizer solution every 2 hours
- [ ] Wipe down surfaces between tasks
- [ ] Wash hands after handling raw food
- [ ] Use separate cutting boards for raw/cooked

**Equipment**
- [ ] Empty grease traps before overflow
- [ ] Filter fryer oil as needed
- [ ] Clean spills immediately
- [ ] Report any equipment issues`
      },
      {
        id: 'closing-checklist',
        title: 'Closing Checklist',
        content: `**Equipment Shutdown**
- [ ] Turn off all cooking equipment
- [ ] Clean and cover cooking surfaces
- [ ] Filter and cover fryer oil
- [ ] Verify refrigeration running and at temp
- [ ] Turn off unnecessary lights

**Cleaning**
- [ ] Clean and sanitize all prep surfaces
- [ ] Sweep and mop floors
- [ ] Empty all trash
- [ ] Clean hood filters (weekly)
- [ ] Wipe down equipment exteriors

**Food Storage**
- [ ] Properly store all food items
- [ ] Label and date all prep items
- [ ] Discard any expired items
- [ ] Check refrigerator organization

**Security**
- [ ] Lock all doors and windows
- [ ] Secure propane tanks
- [ ] Set any alarms
- [ ] Turn off exterior lights as appropriate`
      },
      {
        id: 'weekly-additions',
        title: 'Weekly Additions to Daily Tasks',
        content: `**Monday**
- [ ] Deep clean refrigerator interior
- [ ] Check and restock first aid kit

**Wednesday**
- [ ] Deep clean fryers
- [ ] Inspect fire suppression access

**Friday**
- [ ] Clean condenser coils
- [ ] Deep clean hood and filters
- [ ] Inventory check for weekend

**Sunday**
- [ ] Full equipment inspection
- [ ] Check propane levels for week
- [ ] Review maintenance log`
      }
    ],
    relatedArticles: ['preventive-maintenance', 'food-safety-temps']
  },

  // GHOST KITCHENS
  {
    slug: 'ghost-kitchen-launch',
    title: 'Starting a Ghost Kitchen: The Practical Launch Checklist',
    description: 'A step-by-step ghost kitchen launch guide—facility selection, equipment setup, food safety basics, and operating systems to go live fast and safely.',
    category: 'Ghost Kitchens and Commercial Kitchens',
    categorySlug: 'ghost-kitchens',
    featured: true,
    sections: [
      {
        id: 'what-is-ghost-kitchen',
        title: 'What is a Ghost Kitchen?',
        content: `A ghost kitchen (also called a virtual kitchen, dark kitchen, or cloud kitchen) is a professional food preparation facility set up for delivery-only meals. There's no dine-in space—all orders come through delivery apps or direct online ordering.

**Advantages**
- Lower startup costs than traditional restaurants
- No front-of-house staffing
- Ability to test multiple concepts
- Location flexibility
- Lower overhead

**Considerations**
- Completely dependent on delivery platforms
- No walk-in traffic or visibility
- Marketing entirely digital
- Quality must survive delivery`
      },
      {
        id: 'facility-selection',
        title: 'Facility Selection',
        content: `**Location Factors**
- Delivery zone coverage (check app demand in the area)
- Proximity to residential density
- Commercial kitchen zoning
- Parking for delivery drivers
- Utilities availability

**Facility Types**
1. **Shared Ghost Kitchen Facility**: Turnkey, shared spaces with equipment included
2. **Commissary Kitchen Rental**: Rent time in an existing commercial kitchen
3. **Standalone Space**: Lease and build out your own facility
4. **Converting Existing Space**: Restaurant conversions or industrial kitchen retrofits

**What to Look For**
- Health department approval or pathway to approval
- Adequate ventilation and fire suppression
- Proper grease trap sizing
- Three-compartment sink and handwash sink
- Adequate refrigeration capacity`
      },
      {
        id: 'equipment-setup',
        title: 'Equipment Setup',
        content: `**Essential Equipment**
- Commercial range or cooktop
- Oven (convection preferred for consistency)
- Refrigeration (reach-in and/or walk-in)
- Freezer storage
- Prep tables (NSF certified)
- Three-compartment sink
- Handwash sink
- Hood and ventilation system

**Packaging Station**
- Heat-sealed packaging equipment
- Label printer
- Packaging storage area
- Order staging area

**Technology**
- Tablet(s) for each delivery platform
- Order management system
- Kitchen display system (optional but helpful)
- Printer for order tickets`
      },
      {
        id: 'permits-licensing',
        title: 'Permits and Licensing',
        content: `**Typical Requirements**
- Business license
- Food service license
- Health department permit
- Fire department inspection
- Building permit (if renovating)
- Seller's permit (for sales tax)

**Food Handler Requirements**
- ServSafe or equivalent certification for managers
- Food handler cards for all employees (requirements vary by state)

**Timeline**
Plan 4-8 weeks for permits and inspections. Some jurisdictions take longer. Don't sign a lease until you've confirmed the space can be permitted for food service.`
      },
      {
        id: 'delivery-platforms',
        title: 'Delivery Platform Setup',
        content: `**Major Platforms**
- DoorDash
- Uber Eats
- Grubhub
- Postmates (now part of Uber)

**Application Requirements**
- Business documentation
- Menu with photos
- Pricing
- Hours of operation
- Bank account information for payments

**Best Practices**
- Optimize menu for delivery (not everything travels well)
- Price to account for platform commissions (15-30%)
- Use high-quality photos
- Respond quickly to customer issues
- Monitor ratings and reviews daily`
      },
      {
        id: 'launch-checklist',
        title: 'Launch Checklist',
        content: `**Pre-Launch (Week Before)**
- [ ] All permits in hand
- [ ] Equipment tested and operational
- [ ] Staff trained on all recipes
- [ ] Delivery platform accounts live (in testing mode)
- [ ] Packaging and supplies stocked
- [ ] POS and kitchen systems tested

**Launch Day**
- [ ] Soft launch with limited hours/menu
- [ ] Staff all stations adequately
- [ ] Monitor every order for quality
- [ ] Respond immediately to any issues
- [ ] Document problems for process improvement

**First Week**
- [ ] Review customer feedback daily
- [ ] Adjust prep par levels based on demand
- [ ] Optimize kitchen flow
- [ ] Fine-tune packaging for food quality
- [ ] Begin marketing push once operations smooth`
      }
    ],
    relatedArticles: ['commercial-equipment-basics', 'ghost-kitchen-menu']
  },
  {
    slug: 'commercial-equipment-basics',
    title: 'Commercial Kitchen Equipment Basics: NSF, ETL/UL, and What to Look For',
    description: 'Understanding equipment certifications, what they mean, and how to choose the right equipment for your operation.',
    category: 'Ghost Kitchens and Commercial Kitchens',
    categorySlug: 'ghost-kitchens',
    sections: [
      {
        id: 'certifications',
        title: 'Understanding Certifications',
        content: `**NSF Certification**
NSF International certification means equipment meets public health and sanitation standards. Health departments typically require NSF-certified equipment for:
- Food contact surfaces
- Food preparation equipment
- Refrigeration units

Look for the NSF mark on equipment.

**ETL/UL Listing**
ETL and UL are safety certifications for electrical equipment. They indicate the equipment has been tested for:
- Electrical safety
- Fire hazard prevention
- Proper grounding

Health and fire departments often require ETL or UL listing for commercial kitchen equipment.`
      },
      {
        id: 'choosing-equipment',
        title: 'Choosing the Right Equipment',
        content: `**Size Appropriately**
- Calculate your production needs
- Consider peak demand times
- Don't overbuy—excess capacity wastes money and space
- Don't underbuy—you'll create bottlenecks

**Consider Utility Requirements**
- Electrical: Check voltage and amperage requirements
- Gas: Verify BTU capacity of your gas supply
- Ventilation: Ensure hood CFM matches equipment heat output
- Plumbing: Check water supply and drainage requirements

**Buy vs. Lease**
- Leasing preserves capital but costs more long-term
- Buying used equipment can offer significant savings
- New equipment comes with warranties
- Consider maintenance and repair availability`
      },
      {
        id: 'essential-equipment',
        title: 'Essential Equipment Guide',
        content: `**Cooking Equipment**
- **Range**: 6-burner standard; consider BTU output
- **Oven**: Convection for speed and consistency
- **Fryer**: Match size to menu needs; consider oil filtration
- **Griddle**: Chrome for delicate items, steel for durability
- **Charbroiler**: For grilled flavor; high ventilation needs

**Refrigeration**
- **Reach-in**: For daily use items
- **Walk-in**: For bulk storage; consider your volume
- **Prep Tables**: Refrigerated bases for line cooking

**Prep Equipment**
- **Food Processor**: Essential for high-volume prep
- **Mixer**: Stand mixer for dough, sauces
- **Slicer**: If doing significant deli or meat prep`
      },
      {
        id: 'buying-used',
        title: 'Buying Used Equipment',
        content: `**Where to Find Used Equipment**
- Restaurant auctions
- Equipment dealers
- Vendibook marketplace
- Restaurant closings

**What to Inspect**
- Check all functions work properly
- Look for excessive wear or rust
- Verify all safety features operate
- Check refrigeration temperatures
- Listen for unusual sounds

**What to Avoid**
- Equipment without proper certifications
- Units with significant rust or corrosion
- Refrigeration that doesn't hold temp
- Equipment from closed businesses (may be why they closed)
- Anything that "just needs a small repair"`
      }
    ],
    relatedArticles: ['ghost-kitchen-launch', 'preventive-maintenance']
  },
  {
    slug: 'ghost-kitchen-menu',
    title: 'Ghost Kitchen Menu Design: What Delivers Well',
    description: 'How to design a menu optimized for delivery—what travels well, what to avoid, and how to maintain quality.',
    category: 'Ghost Kitchens and Commercial Kitchens',
    categorySlug: 'ghost-kitchens',
    sections: [
      {
        id: 'delivery-challenges',
        title: 'Understanding Delivery Challenges',
        content: `Food quality degrades during delivery. Your menu must account for:

**Time**
- 20-45 minutes from kitchen to customer
- Food continues cooking in containers
- Temperature drops during transport

**Movement**
- Shifting during transport
- Stacking in delivery bags
- Vehicle vibration and movement

**Packaging**
- Steam trapped in containers causes sogginess
- Leaks from sauces and liquids
- Temperature loss through packaging

**Design your menu assuming the worst-case delivery scenario, and you'll consistently exceed expectations.**`
      },
      {
        id: 'foods-that-travel',
        title: 'Foods That Travel Well',
        content: `**Excellent for Delivery**
- Bowl-style dishes (grain bowls, burrito bowls)
- Sandwiches and wraps (assembled components)
- Tacos (with components separated)
- Pasta dishes (sauce on the side for long deliveries)
- Curries and stews
- Fried chicken (vented containers)

**With Modifications**
- Burgers (sauce on the side, toast buns well)
- Pizza (proper box ventilation)
- Salads (dressing separate, hardy greens)
- Fried items (vented packaging, no stacking)

**Avoid or Reconsider**
- Dishes that must be served immediately
- Items with precise plating
- Anything requiring specific temperatures
- Dishes with multiple components that shouldn't touch`
      },
      {
        id: 'menu-engineering',
        title: 'Menu Engineering for Delivery',
        content: `**Keep It Focused**
- 15-25 items maximum
- Fewer items = better execution
- Cross-utilize ingredients to reduce waste

**Price for Profitability**
- Account for 15-30% platform commissions
- Factor in packaging costs
- Consider larger portions for perceived value

**Component Thinking**
Design dishes as components that assemble well:
- Base (rice, greens, bread)
- Protein (can be switched)
- Sauce (on the side when possible)
- Toppings (can add variety without new prep)

**Test Everything**
Order your own food for delivery:
- Wait the full delivery window
- Don't eat for 10 more minutes
- Evaluate temperature and quality
- Adjust based on findings`
      },
      {
        id: 'packaging-strategy',
        title: 'Packaging Strategy',
        content: `**Container Selection**
- Use vented containers for fried items
- Sealed containers for soups and saucy items
- Separate containers for components that shouldn't touch
- Insulated bags for temperature-sensitive items

**Presentation**
- Food will shift—design for movement
- Use sauce cups for dressings and condiments
- Include napkins and utensils
- Add branded elements (stickers, thank you notes)

**Sustainability**
- Customers increasingly care about packaging waste
- Compostable options available but cost more
- Consider total cost including customer perception

**Cost Management**
- Packaging typically 2-5% of food cost
- Bulk ordering reduces costs
- Standard sizes reduce inventory complexity`
      }
    ],
    relatedArticles: ['ghost-kitchen-launch', 'hot-holding-transport']
  },

  // FOOD SAFETY
  {
    slug: 'food-safety-temps',
    title: 'Food Safety Temperatures: Hold, Cook, and Cool',
    description: 'The most important food safety temperatures explained for operators—plus holding and cooling practices to reduce risk and stay compliant.',
    category: 'Food Safety and Temperature Standards',
    categorySlug: 'food-safety',
    featured: true,
    sections: [
      {
        id: 'danger-zone',
        title: 'The Danger Zone',
        content: `**40°F to 140°F (4°C to 60°C)**

This is the temperature range where bacteria multiply rapidly. Food should spend as little time as possible in this zone.

**The 2-Hour Rule**
Discard any food that has been in the danger zone for more than 2 hours total.

**The 1-Hour Rule**
If ambient temperature is above 90°F (32°C), reduce to 1 hour maximum.

**Key Principle**
Keep hot foods hot (above 140°F) and cold foods cold (below 40°F). There is no safe middle ground.`
      },
      {
        id: 'cooking-temps',
        title: 'Minimum Cooking Temperatures',
        content: `**165°F (74°C) - Highest Priority**
- All poultry (chicken, turkey, duck)
- Stuffed meats and pastas
- Reheated leftovers
- Casseroles

**155°F (68°C)**
- Ground meats (beef, pork, lamb)
- Ground fish
- Injected meats

**145°F (63°C)**
- Whole cuts of beef, pork, lamb, veal
- Fish and shellfish
- Eggs served immediately

**135°F (57°C)**
- Fruits and vegetables being hot held
- Ready-to-eat foods being reheated for hot holding

**Always use a calibrated food thermometer. Insert into the thickest part of the food.**`
      },
      {
        id: 'holding-temps',
        title: 'Holding Temperatures',
        content: `**Hot Holding: 140°F (60°C) or Above**
- Check temperatures every 2 hours (every hour in busy operations)
- Stir foods occasionally to distribute heat
- Keep lids on when not serving
- Never mix fresh food with food being held

**Cold Holding: 40°F (4°C) or Below**
- Check refrigerator temperatures twice per shift
- Don't overload refrigerators
- Allow air circulation around containers
- Ice baths for temporary cold holding

**When Temperature Fails**
If hot food drops below 140°F:
- Reheat to 165°F within 2 hours, OR
- Discard if it's been below 140°F for more than 2 hours

If cold food rises above 40°F:
- If less than 2 hours: Rapidly rechill
- If more than 2 hours: Discard`
      },
      {
        id: 'cooling-food',
        title: 'Cooling Food Safely',
        content: `**The 2-Stage Cooling Method**
1. Cool from 140°F to 70°F within 2 hours
2. Cool from 70°F to 40°F within 4 additional hours

Total cooling time: 6 hours maximum

**Cooling Techniques**
- Use shallow pans (no more than 4 inches deep)
- Ice baths with stirring
- Ice paddles for soups and sauces
- Blast chillers if available
- Divide large items into smaller portions

**Never Do**
- Stack containers while cooling
- Put hot food directly in the refrigerator/freezer (it raises unit temperature)
- Cover tightly during initial cooling
- Leave food at room temperature to cool "before refrigerating"`
      }
    ],
    relatedArticles: ['cooling-reheating', 'hot-holding-transport']
  },
  {
    slug: 'cooling-reheating',
    title: 'Cooling and Reheating: Safe Methods That Prevent Illness',
    description: 'Proper cooling and reheating procedures to prevent foodborne illness in commercial food operations.',
    category: 'Food Safety and Temperature Standards',
    categorySlug: 'food-safety',
    sections: [
      {
        id: 'why-cooling-matters',
        title: 'Why Proper Cooling Matters',
        content: `Improper cooling is one of the leading causes of foodborne illness outbreaks. When food stays in the danger zone (40°F-140°F) too long, bacteria multiply to dangerous levels.

**Common Cooling Mistakes**
- Putting hot food directly in the refrigerator without pre-cooling
- Cooling large quantities in deep containers
- Stacking containers during cooling
- Leaving food at room temperature to cool

**The Risk**
Even reheating to proper temperatures may not destroy all toxins produced by bacteria during improper cooling. Some toxins are heat-stable.`
      },
      {
        id: 'approved-cooling-methods',
        title: 'Approved Cooling Methods',
        content: `**Ice Bath Method**
1. Place food container in a larger container of ice water
2. Fill ice water to the level of the food
3. Stir frequently to release heat
4. Replace ice as it melts
5. Monitor temperature with thermometer

**Shallow Pan Method**
1. Transfer food to shallow pans (4" maximum depth)
2. Place uncovered in refrigerator (or walk-in)
3. Allow air space above and below pans
4. Cover once food reaches 40°F

**Ice Paddle/Wand Method**
1. Fill ice paddle with water and freeze
2. Stir hot liquids with frozen paddle
3. Continue until temperature drops below 70°F
4. Complete cooling in refrigerator

**Blast Chiller** (if available)
Follow manufacturer guidelines—this is the fastest method`
      },
      {
        id: 'reheating-requirements',
        title: 'Reheating Requirements',
        content: `**The Rule: 165°F Within 2 Hours**
When reheating food for hot holding, bring to 165°F (74°C) within 2 hours.

**Important Distinctions**
- Reheating is different from hot holding
- Food that fails to reach 165°F within 2 hours must be discarded
- You cannot reheat food multiple times safely

**Proper Reheating Methods**
- Oven or stovetop heating
- Microwave (with stirring and rest time)
- Steam tables CAN be used if food reaches 165°F quickly

**Steam Tables Are NOT for Reheating**
Steam tables maintain temperature—they don't raise it quickly enough. Only use them to hold already-hot food.`
      },
      {
        id: 'documentation',
        title: 'Documentation Requirements',
        content: `**What to Document**
- Starting time when cooling begins
- Temperature at 2-hour mark (must be at or below 70°F)
- Final temperature and time (must reach 40°F within 6 hours total)
- Any corrective actions taken

**When Reheating**
- Starting temperature
- Final temperature (165°F)
- Time to reach final temperature (must be under 2 hours)

**Retention**
Keep cooling and reheating logs for at least 90 days. Health inspectors will review these records during inspections.`
      }
    ],
    relatedArticles: ['food-safety-temps', 'hot-holding-transport']
  },
  {
    slug: 'hot-holding-transport',
    title: 'Hot Holding and Transport: Catering and Events',
    description: 'How to maintain safe food temperatures during catering, events, and transport operations.',
    category: 'Food Safety and Temperature Standards',
    categorySlug: 'food-safety',
    sections: [
      {
        id: 'transport-challenges',
        title: 'Transport Challenges',
        content: `Transporting hot food introduces risks not present in a stationary kitchen:

**Temperature Loss**
- Vehicle interior temperatures vary
- Opening doors causes rapid heat loss
- Distance and time degrade food quality

**Physical Hazards**
- Spills from vehicle movement
- Tipping and container failure
- Stacking damage

**Contamination Risks**
- Exposure to dust and debris
- Cross-contamination from stacking
- Temperature abuse during loading/unloading

**Plan for Worst Case**
Assume transport will take longer than expected. Build buffers into your timing and temperature management.`
      },
      {
        id: 'equipment-needed',
        title: 'Equipment for Hot Transport',
        content: `**Essential Equipment**
- Insulated food carriers/hot boxes
- Sterno/chafing fuel (for service)
- Food thermometers
- Temperature logs
- Disposable gloves

**Hot Holding Equipment**
- Cambro-style insulated carriers
- Electric hot boxes (require power at destination)
- Sterno/chafing setups for service
- Heat lamps (for service)

**Packing Materials**
- Foil pans with lids
- Plastic wrap/pan covers
- Towels for insulation and spill absorption
- Cooling racks (to prevent bottom burning)`
      },
      {
        id: 'packing-procedures',
        title: 'Packing Procedures',
        content: `**Before Packing**
- Pre-heat insulated carriers with hot water
- Verify all food is at 165°F or higher
- Document temperatures before loading

**Packing Order**
1. Hottest items first (they go on bottom)
2. Use towels between containers to prevent shifting
3. Don't stack too high—containers can crush
4. Place thermometer probes to monitor during transport

**Vehicle Preparation**
- Run heat if transporting in cold weather
- Secure carriers to prevent tipping
- Use separate area for cold items
- Never transport chemicals with food`
      },
      {
        id: 'at-the-event',
        title: 'At the Event',
        content: `**Setup**
- Check temperatures immediately upon arrival
- Discard any food below 140°F (if more than 2 hours in transport)
- Set up hot holding equipment before transferring food
- Light Sterno/chafing fuel before placing food

**During Service**
- Monitor temperatures every hour
- Keep lids on when not actively serving
- Stir food periodically to distribute heat
- Replace Sterno cans as needed (typically 2-4 hours)

**End of Event**
- Food held over 4 hours should be discarded
- Properly cooled food can be transported back
- Never combine leftover food with fresh food
- Clean all equipment before storage`
      }
    ],
    relatedArticles: ['food-safety-temps', 'cooling-reheating']
  },

  // FIRE SAFETY
  {
    slug: 'nfpa-96-explained',
    title: 'Ventilation, Grease, and Fire Prevention: NFPA 96 Explained Simply',
    description: 'A practical guide to NFPA 96 requirements for commercial kitchen ventilation and fire safety.',
    category: 'Fire Safety, Ventilation, and Grease',
    categorySlug: 'fire-safety',
    sections: [
      {
        id: 'what-is-nfpa96',
        title: 'What is NFPA 96?',
        content: `NFPA 96 is the "Standard for Ventilation Control and Fire Protection of Commercial Cooking Operations." It establishes requirements for:

- Hood and duct systems
- Fire suppression systems
- Grease filter maintenance
- Clearances and fire safety

**Why It Matters**
Kitchen fires are a leading cause of commercial property fires. NFPA 96 compliance:
- Reduces fire risk
- Satisfies fire marshal requirements
- Is typically required for insurance
- Protects employees and customers`
      },
      {
        id: 'hood-requirements',
        title: 'Hood and Duct Requirements',
        content: `**Hood Size**
- Must extend 6" beyond cooking equipment on all sides
- Must be at least 18" above cooking surface
- Must capture and contain smoke and grease

**Duct Requirements**
- 16-gauge or heavier steel construction
- All joints welded and grease-tight
- Proper slope for grease drainage
- Access panels for cleaning
- Minimum 18" clearance from combustibles

**Airflow**
- Adequate CFM for equipment heat output
- Make-up air required to replace exhausted air
- Balanced airflow prevents backdrafting`
      },
      {
        id: 'fire-suppression',
        title: 'Fire Suppression Systems',
        content: `**Wet Chemical Systems**
Modern commercial kitchens require wet chemical fire suppression systems that:
- Automatically activate at high temperatures
- Have manual pull stations
- Cover all cooking surfaces
- Include gas shutoff activation

**Inspection Requirements**
- **Semi-annual inspection** by certified technician (required)
- **Monthly visual inspection** by operator
- **Document all inspections**

**What Inspectors Check**
- Nozzle positioning and condition
- Agent levels and expiration
- Detection links/fusible links
- Manual release station access
- Automatic gas shutoff function`
      },
      {
        id: 'grease-filter-maintenance',
        title: 'Grease Filter Maintenance',
        content: `**Cleaning Frequency**
NFPA 96 specifies minimum cleaning schedules:
- **Monthly**: Systems serving solid fuel cooking
- **Quarterly**: Systems with high-volume cooking (24-hour operations, charbroiling)
- **Semi-annually**: Moderate volume operations
- **Annually**: Low-volume operations (churches, seasonal facilities)

**Filter Requirements**
- Listed grease filters only
- Must be removable for cleaning
- Must be installed at proper angle (45° minimum)
- No gaps between filters

**Cleaning Standards**
- Clean until bare metal visible
- Use proper cleaning solutions (not flammable solvents)
- Document all cleaning with photos if possible`
      }
    ],
    relatedArticles: ['grease-trap-fog', 'hood-filter-cleaning']
  },
  {
    slug: 'grease-trap-fog',
    title: 'Grease Trap and FOG Management',
    description: 'Managing fats, oils, and grease in commercial kitchen operations to prevent plumbing problems and stay compliant.',
    category: 'Fire Safety, Ventilation, and Grease',
    categorySlug: 'fire-safety',
    sections: [
      {
        id: 'what-is-fog',
        title: 'Understanding FOG',
        content: `FOG stands for Fats, Oils, and Grease. These substances:
- Solidify as they cool
- Accumulate in pipes and sewer lines
- Cause blockages and backups
- Create costly plumbing problems

**Sources of FOG**
- Cooking oils and shortenings
- Meat fats and grease
- Butter and margarine
- Food scraps and waste
- Dairy products

**Why It Matters**
FOG violations result in:
- Fines from municipalities
- Cleanup costs
- Business interruption
- Environmental damage`
      },
      {
        id: 'grease-traps',
        title: 'Grease Traps and Interceptors',
        content: `**Grease Traps**
- Smaller units (usually under sink)
- Must be cleaned frequently (often weekly)
- Suited for lower-volume operations

**Grease Interceptors**
- Larger units (usually buried outside)
- Pumped out periodically (typically monthly to quarterly)
- Required for high-volume operations

**Sizing Requirements**
Size depends on:
- Fixture flow rates
- Local codes
- Type of cooking operation
- Volume of FOG produced

**Maintenance Records**
Keep detailed records of:
- Cleaning/pumping dates
- Vendor information
- Volumes removed
- Condition observations`
      },
      {
        id: 'best-practices',
        title: 'FOG Management Best Practices',
        content: `**In the Kitchen**
- Scrape plates before washing
- Use drain screens
- Never pour grease down drains
- Wipe pots and pans before washing

**Oil Disposal**
- Collect used cooking oil in designated containers
- Arrange regular pickup with recycler
- Never mix oil with other waste
- Store oil containers properly (away from drains)

**Employee Training**
All staff should understand:
- What can and cannot go down drains
- Proper scraping procedures
- Oil collection procedures
- Consequences of FOG violations`
      },
      {
        id: 'cleaning-schedule',
        title: 'Cleaning and Pumping Schedule',
        content: `**Grease Trap Cleaning**
Frequency depends on volume:
- High-volume: 2-4 times per week
- Moderate volume: Weekly
- Low volume: Every 2 weeks

**25% Rule**
Clean or pump when FOG accumulation reaches 25% of tank capacity. Don't wait until it's full.

**What to Document**
- Date and time of cleaning
- Who performed the cleaning
- Amount of grease removed
- Condition of trap/interceptor
- Any repairs needed

**Professional Pumping**
Large interceptors require licensed haulers:
- Verify proper licensing
- Obtain manifest documentation
- Confirm proper disposal
- Keep records for inspection`
      }
    ],
    relatedArticles: ['nfpa-96-explained', 'hood-filter-cleaning']
  },
  {
    slug: 'hood-filter-cleaning',
    title: 'Hood Filter Cleaning: Frequency and Best Practices',
    description: 'How often to clean hood filters and proper cleaning techniques for commercial kitchen ventilation.',
    category: 'Fire Safety, Ventilation, and Grease',
    categorySlug: 'fire-safety',
    sections: [
      {
        id: 'why-clean-filters',
        title: 'Why Hood Filter Cleaning Matters',
        content: `Dirty hood filters create serious problems:

**Fire Risk**
Grease-laden filters are fuel for kitchen fires. Accumulated grease can:
- Ignite from flame contact
- Spread fire into the duct system
- Cause the fire suppression system to fail

**Poor Performance**
Clogged filters reduce airflow:
- Smoke and odors escape into kitchen
- Equipment works harder (higher energy costs)
- Staff comfort decreases
- Cooking quality suffers

**Code Violations**
Health and fire inspectors check filters:
- Visible grease accumulation is a violation
- Can result in fines or closure
- Affects insurance coverage`
      },
      {
        id: 'cleaning-frequency',
        title: 'Cleaning Frequency Guidelines',
        content: `**Based on Cooking Volume**

**Daily Cleaning Recommended**
- 24-hour operations
- Heavy grease cooking (charbroiling, frying)
- High-volume production

**Weekly Cleaning**
- Moderate volume operations
- Standard restaurant operations
- Mixed cooking methods

**Bi-Weekly to Monthly**
- Light cooking operations
- Low grease production
- Intermittent use facilities

**Monitor and Adjust**
Check filters daily. If grease is visibly dripping or accumulating, increase cleaning frequency.`
      },
      {
        id: 'cleaning-methods',
        title: 'Cleaning Methods',
        content: `**Soak and Scrub Method**
1. Remove filters at end of day
2. Soak in hot water with degreaser
3. Scrub with non-abrasive brush
4. Rinse thoroughly
5. Air dry completely before reinstalling

**Dishwasher Method**
- Run through commercial dishwasher
- Use degreasing detergent
- Ensure complete drying before reinstall
- Note: Not suitable for all filter types

**Pressure Washing**
- Effective for heavy buildup
- Do outside or in drain area
- Use appropriate degreaser
- Rinse completely

**Professional Cleaning**
- Required for duct system cleaning
- Typically quarterly to annually
- Document all professional cleaning`
      },
      {
        id: 'safety-and-inspection',
        title: 'Safety and Inspection',
        content: `**Safety Precautions**
- Turn off exhaust system before removing filters
- Allow filters to cool if recently in use
- Use proper PPE (gloves, eye protection)
- Handle carefully—filters have sharp edges

**Inspection Points**
When cleaning, inspect for:
- Bent or damaged filters
- Gaps between filters
- Proper filter angle (45° minimum)
- Damage to filter tracks/frames

**Replacement Criteria**
Replace filters when:
- Holes or tears are present
- Metal is corroded or pitted
- Filter won't seat properly
- Cleaning no longer restores performance

**Documentation**
Log all filter cleaning:
- Date and time
- Who performed cleaning
- Condition observed
- Any issues or replacements needed`
      }
    ],
    relatedArticles: ['nfpa-96-explained', 'grease-trap-fog']
  },

  // POWER, PROPANE, AND UTILITIES
  {
    slug: 'propane-gas-safety',
    title: 'Propane and Gas Safety for Mobile Food Operations',
    description: 'Essential propane and gas safety practices for food trucks, trailers, and mobile kitchen operations.',
    category: 'Power, Propane, and Utilities',
    categorySlug: 'power-utilities',
    sections: [
      {
        id: 'propane-basics',
        title: 'Propane Safety Basics',
        content: `**Properties of Propane**
- Heavier than air (sinks and accumulates)
- Has distinct "rotten egg" smell (added odorant)
- Highly flammable
- Stored as liquid, used as gas

**Key Safety Rules**
1. Never ignore the smell of gas
2. Store tanks upright and secured
3. Never overfill tanks (80% maximum)
4. Keep tanks away from heat sources
5. Check connections regularly for leaks

**In Case of Leak**
1. Evacuate the area immediately
2. Don't use any electrical switches
3. Call 911 from a safe distance
4. Don't return until cleared by professionals`
      },
      {
        id: 'tank-requirements',
        title: 'Tank and Installation Requirements',
        content: `**Approved Tanks**
- DOT cylinders (portable) or ASME tanks (permanent)
- Must have current inspection dates
- OPD (overfill prevention device) required on portable tanks

**Installation**
- Tanks must be securely mounted
- Must have proper ventilation
- Require emergency shutoff accessible from outside
- Gas lines must be properly rated and secured

**Mobile Kitchen Requirements**
- Tanks typically mounted on tongue or rear
- Must be protected from impact
- Regulator must be protected from elements
- All connections must be accessible for inspection`
      },
      {
        id: 'daily-safety-checks',
        title: 'Daily Safety Checks',
        content: `**Before Each Use**
- Check tank levels
- Inspect all visible connections
- Sniff test for gas odor
- Verify emergency shutoff accessible

**When Connecting Tanks**
- Turn off all appliance valves first
- Open tank valve slowly
- Check all connections with soapy water
- Bubbles indicate leaks—do not use

**During Operation**
- Monitor for unusual odors
- Watch for yellow or irregular flames
- Listen for unusual hissing sounds
- Ensure adequate ventilation

**End of Day**
- Turn off tank valve at tank
- Let appliances burn out remaining gas in lines
- Turn off appliance valves
- Secure tanks for transport`
      },
      {
        id: 'emergency-procedures',
        title: 'Emergency Procedures',
        content: `**If You Smell Gas**
1. Do NOT turn any switches on or off
2. Do NOT use phones inside the space
3. Evacuate immediately
4. Shut off tank valve if safe to do so (from outside)
5. Move away at least 50 feet
6. Call 911

**Fire Response**
1. Turn off propane at tank (if safe)
2. Evacuate all personnel
3. Use fire extinguisher if fire is small
4. Call 911
5. Do not re-enter until cleared

**Tank Damage**
If a tank is struck or damaged:
1. Evacuate the area
2. Don't move the tank
3. Call fire department
4. Keep people away until inspected`
      }
    ],
    relatedArticles: ['generator-co-safety', 'nfpa-96-explained']
  },
  {
    slug: 'generator-co-safety',
    title: 'Generator and Carbon Monoxide Safety (Mobile Kitchens)',
    description: 'Safe generator operation and carbon monoxide prevention for food trucks and mobile kitchens.',
    category: 'Power, Propane, and Utilities',
    categorySlug: 'power-utilities',
    sections: [
      {
        id: 'co-dangers',
        title: 'The Danger of Carbon Monoxide',
        content: `**What is Carbon Monoxide?**
Carbon monoxide (CO) is a colorless, odorless gas produced by burning fuels. It's deadly because you can't detect it without instruments.

**Sources in Mobile Kitchens**
- Generators
- Propane combustion
- Gas appliances
- Idling vehicle engines

**Symptoms of CO Poisoning**
Early: Headache, dizziness, weakness, nausea
Progressing: Confusion, vomiting, chest pain
Severe: Loss of consciousness, death

**CO kills fast. By the time you feel symptoms, it may be too late to safely evacuate.**`
      },
      {
        id: 'generator-placement',
        title: 'Generator Placement and Ventilation',
        content: `**Placement Rules**
- Never operate generators inside enclosed spaces
- Keep generators at least 20 feet from the unit
- Position exhaust away from air intakes
- Consider wind direction when positioning

**Ventilation Requirements**
- Ensure adequate airflow around generator
- Never block exhaust outlets
- Keep generator area clear of debris
- Ensure exhaust isn't trapped by walls or barriers

**Weather Considerations**
- Use canopy to protect from rain (don't enclose)
- Ensure water doesn't enter fuel system
- Cold weather: Use winter-grade fuel
- Hot weather: Ensure adequate cooling`
      },
      {
        id: 'co-detection',
        title: 'CO Detection and Prevention',
        content: `**Required Equipment**
- Battery-powered CO detector in food truck/trailer
- Backup detector recommended
- Test weekly
- Replace batteries regularly
- Replace detector per manufacturer guidelines

**Detector Placement**
- Install at breathing level (5 feet from floor)
- Near sleeping areas if applicable
- Away from direct exhaust sources
- Where alarm will be heard

**Alarm Response**
If CO detector alarms:
1. Evacuate immediately
2. Move to fresh air
3. Call 911
4. Do not re-enter until cleared
5. Seek medical attention if anyone has symptoms`
      },
      {
        id: 'safe-operation',
        title: 'Safe Generator Operation',
        content: `**Pre-Operation Checks**
- Check fuel level
- Inspect for leaks or damage
- Verify exhaust system intact
- Ensure proper grounding
- Check oil level

**During Operation**
- Never refuel while running
- Monitor for unusual sounds or smells
- Maintain clear area around generator
- Check temperature periodically
- Monitor electrical loads

**Fuel Safety**
- Store fuel in approved containers only
- Keep fuel away from heat sources
- Never smoke near fuel
- Clean spills immediately
- Transport fuel properly secured

**Maintenance**
- Follow manufacturer service schedule
- Document all maintenance
- Address issues immediately
- Keep exhaust system in good repair`
      }
    ],
    relatedArticles: ['generator-sizing', 'propane-gas-safety']
  },
  {
    slug: 'generator-sizing',
    title: 'Generator Sizing Guide for Food Trucks and Trailers',
    description: 'How to calculate the right generator size for your mobile food operation.',
    category: 'Power, Propane, and Utilities',
    categorySlug: 'power-utilities',
    sections: [
      {
        id: 'understanding-power',
        title: 'Understanding Power Requirements',
        content: `**Key Terms**
- **Watts**: Unit of power (power = voltage × amps)
- **Running watts**: Power needed during normal operation
- **Starting watts**: Surge power needed to start motors
- **Voltage**: Usually 120V or 240V in US applications
- **Amperage**: Current draw of equipment

**Why Starting Watts Matter**
Equipment with motors (refrigerators, air conditioners) need 2-3× running watts to start. Your generator must handle these surges.

**Safety Margin**
Never run a generator at 100% capacity. Plan for 75-80% maximum load for longevity and safety.`
      },
      {
        id: 'calculating-needs',
        title: 'Calculating Your Power Needs',
        content: `**Step 1: List All Equipment**
Create a list of every electrical item:
- Refrigeration units
- Freezers
- HVAC/air conditioning
- Lights
- POS systems
- Exhaust fans
- Small appliances

**Step 2: Find Wattage**
Check equipment nameplates for wattage. If only amps listed:
Watts = Volts × Amps

**Step 3: Add Running Watts**
Sum the running watts of everything that runs simultaneously.

**Step 4: Add Highest Starting Watts**
Add the starting watts of your largest motor to the running total.

**Example Calculation**
- Refrigerator: 800W running, 2400W starting
- Freezer: 700W running, 2100W starting
- Lights: 500W
- Fans: 300W
- POS: 100W

Total running: 2400W
Add largest starting surge: +2400W
Peak requirement: 4800W
With 20% margin: 5760W needed

**Generator size: 6000W minimum**`
      },
      {
        id: 'generator-types',
        title: 'Generator Types for Food Trucks',
        content: `**Conventional Generators**
- Lower upfront cost
- Louder operation
- Heavier
- Less fuel efficient at partial loads
- Good for basic operations

**Inverter Generators**
- Clean power (safe for electronics)
- Quieter operation
- More fuel efficient
- Lighter weight
- Higher cost
- Best for operations with sensitive electronics

**Diesel vs. Gasoline**
Diesel:
- More fuel efficient
- Longer engine life
- Higher initial cost
- Fuel more stable in storage

Gasoline:
- Lower initial cost
- Easier to find fuel
- Less efficient
- Fuel degrades faster in storage`
      },
      {
        id: 'installation-tips',
        title: 'Installation and Setup',
        content: `**Mounting Options**
- Tongue mount (trailers)
- Underbody compartment
- Rear bumper mount
- Pull-behind trailer

**Considerations**
- Weight distribution
- Fuel line routing
- Exhaust ventilation
- Noise regulations in your area
- Access for maintenance

**Electrical Connection**
- Use proper rated wiring
- Install appropriate breakers
- Consider automatic transfer switch
- Ensure proper grounding
- Have installation inspected

**Fuel System**
- Size tank for full day operation minimum
- Install fuel gauge accessible from cooking area
- Use proper fuel lines and connections
- Consider auxiliary tank for extended operations`
      }
    ],
    relatedArticles: ['generator-co-safety', 'propane-gas-safety']
  },

  // COMPLIANCE AND PERMITS
  {
    slug: 'mobile-vending-permits',
    title: 'Mobile Vending Permits: State and Local Requirements',
    description: 'Understanding permit requirements for mobile food vending operations across different jurisdictions.',
    category: 'Compliance and Permits',
    categorySlug: 'compliance',
    sections: [
      {
        id: 'permit-overview',
        title: 'Understanding Permit Requirements',
        content: `Mobile food vending typically requires permits at multiple levels:

**Common Permit Types**
- Business license
- Mobile food vendor permit
- Health department permit
- Fire department permit
- Sales tax permit
- Parking permits (for specific locations)

**Jurisdiction Varies**
Requirements differ significantly by:
- State
- County
- City
- Special districts

**Research Before You Rent or Buy**
Always verify permit requirements for your specific operation location before committing to equipment.`
      },
      {
        id: 'health-permits',
        title: 'Health Department Permits',
        content: `**What Health Departments Inspect**
- Food handling procedures
- Temperature control
- Sanitation facilities
- Water supply and waste water
- Employee health and hygiene
- Food source documentation

**Common Requirements**
- Menu approval
- Equipment layout plan
- Commissary agreement
- Food handler certifications
- Vehicle inspection

**The Application Process**
1. Submit application with fees
2. Provide required documentation
3. Schedule pre-opening inspection
4. Pass inspection
5. Receive permit
6. Schedule routine inspections

**Timeline**
Allow 2-6 weeks for initial permit approval. Some jurisdictions have longer backlogs.`
      },
      {
        id: 'fire-permits',
        title: 'Fire Department Requirements',
        content: `**Fire Permit Inspections**
Fire departments typically inspect:
- Fire suppression system
- Fire extinguishers
- Propane systems
- Electrical systems
- Exit access
- Hood and ventilation

**Documentation Needed**
- Fire suppression system inspection certificate
- Propane system inspection
- Proof of insurance
- Vehicle registration

**Annual Renewals**
Fire permits typically require annual renewal with new inspections. Keep suppression system inspection current.`
      },
      {
        id: 'location-permits',
        title: 'Location-Based Permits',
        content: `**Public Property**
Vending on public property often requires:
- Special vending permits
- Lottery or assigned spots
- Daily/weekly/monthly fees
- Specific operating hours

**Private Property**
Operating on private property typically requires:
- Property owner permission (in writing)
- May need separate permit from city
- Must meet zoning requirements
- Verify no exclusivity agreements with other vendors

**Events and Festivals**
Special events often have:
- Separate permit requirements
- Health department temporary permits
- Event organizer requirements
- Insurance requirements

**Research Each Location**
Requirements vary by location even within the same city. Always verify before you operate.`
      }
    ],
    relatedArticles: ['commissary-requirements', 'health-inspections']
  },
  {
    slug: 'commissary-requirements',
    title: 'Commissary Requirements Explained',
    description: 'What commissary requirements are, why they exist, and how to find and work with a commissary.',
    category: 'Compliance and Permits',
    categorySlug: 'compliance',
    sections: [
      {
        id: 'what-is-commissary',
        title: 'What is a Commissary?',
        content: `A commissary is a licensed commercial kitchen facility that mobile food units must use for:
- Food preparation and storage
- Equipment cleaning and sanitization
- Waste water disposal
- Fresh water filling
- Supply storage

**Why Commissaries are Required**
Mobile units have limited space for:
- Adequate refrigeration
- Proper sanitation facilities
- Food preparation areas
- Waste management

**Commissary agreements are required in most jurisdictions for mobile food vendor permits.**`
      },
      {
        id: 'what-commissaries-provide',
        title: 'What Commissaries Provide',
        content: `**Required Services**
- Potable water supply connection
- Approved waste water disposal
- Food storage (refrigerated and dry)
- Three-compartment sink access
- Handwash sink access

**Common Additional Services**
- Prep kitchen space
- Cold storage lockers
- Equipment storage
- Propane tank filling or exchange
- Waste oil collection
- Mail and package receiving

**What You Need**
Your commissary agreement must document:
- Services provided
- Hours of access
- Frequency of use required
- Emergency contact information`
      },
      {
        id: 'finding-commissary',
        title: 'Finding a Commissary',
        content: `**Types of Commissaries**
1. **Dedicated commissary facilities**: Built specifically for mobile vendors
2. **Shared commercial kitchens**: Also serve catering, ghost kitchens
3. **Restaurant commissaries**: Restaurants renting off-hours access
4. **Church or nonprofit kitchens**: Sometimes available for rent

**What to Look For**
- Approved by local health department
- Convenient location for your routes
- Hours that match your schedule
- Services that meet your needs
- Fair pricing
- Professional management

**Questions to Ask**
- What are the access hours?
- How many vendors share the facility?
- Is parking available for my unit overnight?
- What's included in the fee vs. additional charges?`
      },
      {
        id: 'commissary-requirements',
        title: 'Working with Your Commissary',
        content: `**Frequency Requirements**
Most jurisdictions require:
- Daily return to commissary, OR
- Documentation of approved waste disposal and water fill elsewhere

**Documentation**
Keep records of:
- Dates and times of commissary visits
- Services used
- Any issues or incidents

**Your Responsibilities**
- Follow all commissary rules
- Clean up after yourself
- Properly dispose of waste
- Report any problems
- Pay fees on time

**The Commissary's Responsibilities**
- Maintain health department approval
- Provide agreed-upon services
- Keep facility clean and operational
- Provide required documentation for your permits`
      }
    ],
    relatedArticles: ['mobile-vending-permits', 'health-inspections']
  },
  {
    slug: 'health-inspections',
    title: 'Health Department Inspections: What to Expect',
    description: 'How to prepare for and pass health department inspections for mobile food operations.',
    category: 'Compliance and Permits',
    categorySlug: 'compliance',
    sections: [
      {
        id: 'inspection-overview',
        title: 'Understanding Health Inspections',
        content: `**Types of Inspections**
- **Initial/Pre-opening**: Before you can operate
- **Routine/Scheduled**: Regular compliance checks
- **Follow-up**: Verify corrections from previous violations
- **Complaint-based**: In response to customer complaints

**Who Inspects**
Health department sanitarians (Environmental Health Specialists) conduct inspections. They typically have extensive training in food safety and regulations.

**When to Expect Inspections**
- Routine inspections: Typically 1-3 times per year
- Usually unannounced (this is intentional)
- May occur during busy times
- Often during events`
      },
      {
        id: 'common-violations',
        title: 'Common Violations to Avoid',
        content: `**Critical Violations (Must Fix Immediately)**
- Food at improper temperatures
- Cross-contamination risks
- No hot water at handwash sink
- Improper cooling procedures
- Sick employees working

**Major Violations**
- Improper food storage
- Inadequate sanitizer concentration
- No thermometers in refrigeration
- Missing or expired permits
- Inadequate handwashing

**Minor Violations**
- Dirty floors or surfaces
- Missing labels on containers
- Minor equipment issues
- Cluttered storage areas

**Fix critical violations immediately—they can result in immediate closure.**`
      },
      {
        id: 'preparing-for-inspection',
        title: 'Preparing for Inspections',
        content: `**Daily Practices**
If you follow proper procedures daily, inspections shouldn't be stressful:
- Maintain proper temperatures
- Practice good handwashing
- Keep sanitizer at proper concentration
- Date and label all food
- Keep logs current

**Before Inspector Arrives**
You won't have much notice, but if you see an inspector:
- Greet them professionally
- Have permits and paperwork accessible
- Continue normal operations
- Don't hide problems

**Documentation Ready**
Have available:
- Current permits
- Temperature logs
- Cleaning schedules
- Employee health policies
- Food handler certifications
- Commissary agreement`
      },
      {
        id: 'during-and-after',
        title: 'During and After the Inspection',
        content: `**During the Inspection**
- Answer questions honestly
- Show the inspector what they ask to see
- Don't make excuses for violations
- Take notes on findings
- Ask for clarification if needed

**Responding to Violations**
- Fix critical violations immediately
- Create a plan for other corrections
- Document all corrections made
- Request re-inspection if needed

**After the Inspection**
- Review the report carefully
- Address all violations by deadline
- Train staff on any issues found
- Update procedures as needed
- File report with other records

**Disputing Findings**
If you disagree with findings:
- Document your position
- Follow the formal appeal process
- Be respectful and professional
- Provide evidence for your position`
      }
    ],
    relatedArticles: ['mobile-vending-permits', 'commissary-requirements']
  },

  // HOST ONBOARDING & WORKFLOWS
  {
    slug: 'host-onboarding',
    title: 'Host Onboarding Checklist (10 Minutes)',
    description: 'Complete step-by-step checklist to set up your Vendibook host account and start earning.',
    category: 'Host Guides',
    categorySlug: 'host-guides',
    featured: true,
    sections: [
      {
        id: 'overview',
        title: 'Before You Start',
        content: `This checklist walks you through everything you need to start hosting on Vendibook. Most hosts complete this in under 10 minutes.

**What You'll Need**
- Valid government-issued ID
- Bank account for payouts (via Stripe)
- Photos of your asset(s)
- Any relevant permits or licenses (optional but recommended)`
      },
      {
        id: 'step-1-account',
        title: 'Step 1: Create Your Account',
        content: `- [ ] Sign up at vendibook.com
- [ ] Verify your email address
- [ ] Complete your profile (name, phone, photo)
- [ ] Add your business name (optional)

**Pro tip:** A complete profile with a professional photo increases booking rates by 40%.`
      },
      {
        id: 'step-2-stripe',
        title: 'Step 2: Set Up Stripe Connect',
        content: `- [ ] Click "Set Up Payouts" in your dashboard
- [ ] Connect or create a Stripe account
- [ ] Verify your identity (government ID required)
- [ ] Add your bank account for payouts
- [ ] Complete any additional Stripe requirements

**Important:** You must complete Stripe setup before your listing can go live. Payouts are processed automatically after each completed booking.`
      },
      {
        id: 'step-3-listing',
        title: 'Step 3: Create Your First Listing',
        content: `- [ ] Click "Create Listing"
- [ ] Choose asset type (food truck, trailer, ghost kitchen, Vendor Space)
- [ ] Select mode (rent or sell)
- [ ] Upload high-quality photos (minimum 5 recommended)
- [ ] Write a compelling title and description
- [ ] Set your pricing (daily/weekly rates)
- [ ] Add amenities and equipment list
- [ ] Set availability calendar
- [ ] Configure pickup/delivery options

**Pro tip:** Listings with 8+ photos get 3x more inquiries.`
      },
      {
        id: 'step-4-documents',
        title: 'Step 4: Upload Required Documents',
        content: `- [ ] Review any document requirements for your listing
- [ ] Upload relevant permits or licenses
- [ ] Set document requirements for renters (if applicable)

**Common documents:**
- Business license
- Health department permit
- Commercial liability insurance
- Vehicle registration (for trucks/trailers)`
      },
      {
        id: 'step-5-publish',
        title: 'Step 5: Review and Publish',
        content: `- [ ] Preview your listing
- [ ] Check all photos display correctly
- [ ] Verify pricing and availability
- [ ] Enable Instant Book (recommended)
- [ ] Click "Publish"

**You're live!** Your listing is now visible to thousands of potential renters and buyers.`
      },
      {
        id: 'whats-next',
        title: "What's Next?",
        content: `**Respond quickly to inquiries**
Fast response times improve your search ranking and booking rate.

**Keep your calendar updated**
Block dates when your asset is unavailable to avoid conflicts.

**Review booking requests**
You'll receive email and in-app notifications for new requests.

**Get your first review**
Great reviews build trust and increase future bookings.`
      }
    ],
    relatedArticles: ['stripe-connect-setup', 'host-listing-checklist', 'payout-timing-fees']
  },
  {
    slug: 'host-listing-checklist',
    title: 'Create a Listing Checklist',
    description: 'Everything you need to create a high-converting listing on Vendibook.',
    category: 'Host Guides',
    categorySlug: 'host-guides',
    sections: [
      {
        id: 'before-photos',
        title: 'Before You Take Photos',
        content: `- [ ] Clean your asset thoroughly inside and out
- [ ] Stage the space (remove clutter, add professional touches)
- [ ] Ensure all equipment is visible and organized
- [ ] Check lighting—natural light is best
- [ ] Remove any personal items or branding you don't want shown`
      },
      {
        id: 'photos',
        title: 'Photo Checklist',
        content: `**Exterior (minimum 4 photos)**
- [ ] Front view (hero shot)
- [ ] Both sides
- [ ] Rear view with serving window open
- [ ] Detail shots of unique features

**Interior (minimum 4 photos)**
- [ ] Wide shot of full kitchen
- [ ] Cooking stations
- [ ] Refrigeration/storage
- [ ] Prep areas

**Equipment (2-4 photos)**
- [ ] Close-ups of key equipment
- [ ] Brand/model visible when possible

**Pro tips:**
- Use landscape orientation
- Shoot during golden hour for exterior
- Clean lens before shooting
- Take more photos than you need—you can select the best`
      },
      {
        id: 'title-description',
        title: 'Writing Your Title & Description',
        content: `**Title Formula**
[Year] [Type] [Size/Feature] - [Key Benefit]

Examples:
- "2021 Food Trailer 18ft - Full Kitchen, Event Ready"
- "NSF Ghost Kitchen Space - Commissary Included"

**Description Structure**
1. Opening hook (why this asset stands out)
2. Equipment highlights
3. Ideal use cases
4. What's included
5. Location/access details
6. Call to action`
      },
      {
        id: 'pricing',
        title: 'Setting Your Price',
        content: `- [ ] Research comparable listings in your area
- [ ] Set daily rate (for short rentals)
- [ ] Set weekly rate (typically 15-20% discount)
- [ ] Consider seasonal adjustments
- [ ] Factor in your costs (insurance, maintenance, cleaning)

**Pricing tips:**
- New hosts often price 10-15% below market to get first reviews
- Enable weekly discounts to attract longer bookings
- Review and adjust pricing quarterly`
      },
      {
        id: 'final-review',
        title: 'Final Review',
        content: `- [ ] All photos uploaded and in correct order
- [ ] Title is clear and compelling
- [ ] Description covers all key points
- [ ] Pricing is competitive
- [ ] Availability calendar is accurate
- [ ] Pickup/delivery options set correctly
- [ ] Required documents configured (if any)
- [ ] Contact information is current`
      }
    ],
    relatedArticles: ['host-onboarding', 'pricing-guidance']
  },
  {
    slug: 'stripe-connect-setup',
    title: 'Stripe Connect Setup Guide',
    description: 'How to set up Stripe Connect to receive payouts from your Vendibook listings.',
    category: 'Payments & Payouts',
    categorySlug: 'payments-payouts',
    sections: [
      {
        id: 'overview',
        title: 'Why Stripe Connect?',
        content: `Vendibook uses Stripe Connect to process payments securely. This ensures:
- Fast, reliable payouts directly to your bank
- Protection for both hosts and renters
- Compliance with financial regulations
- Support for multiple currencies

**You must complete Stripe setup before publishing your first listing.**`
      },
      {
        id: 'requirements',
        title: 'What You Will Need',
        content: `**For Individuals**
- Valid government-issued ID (drivers license or passport)
- Social Security Number (last 4 digits)
- Bank account routing and account numbers
- Home address

**For Businesses**
- EIN (Employer Identification Number)
- Business address
- Beneficial owner information
- Business bank account details`
      },
      {
        id: 'setup-steps',
        title: 'Step-by-Step Setup',
        content: `**1. Start the Process**
- Log in to your Vendibook dashboard
- Click "Set Up Payouts" or go to Account → Stripe Connect
- Click "Connect with Stripe"

**2. Choose Account Type**
- Individual or Business
- Select your country

**3. Verify Your Identity**
- Enter personal information
- Upload ID document (takes 2-5 minutes to verify)
- May require a selfie for verification

**4. Add Bank Account**
- Enter routing number
- Enter account number
- Verify with micro-deposits (if required)

**5. Complete Setup**
- Review all information
- Accept Stripe terms of service
- Submit for verification`
      },
      {
        id: 'verification',
        title: 'Verification Timeline',
        content: `**Instant Verification (most common)**
Most hosts are verified within minutes.

**Extended Review (rare)**
Some accounts require additional review:
- Allow 1-2 business days
- You may be asked for additional documents
- Check email for updates

**While waiting:**
- You can create listings
- Listings will not go live until verification completes`
      },
      {
        id: 'troubleshooting',
        title: 'Common Issues',
        content: `**Verification Failed**
- Ensure ID photo is clear and all text is readable
- Name must match exactly on ID and application
- Try a different ID document if available

**Bank Account Rejected**
- Verify routing and account numbers
- Must be a checking account (not savings)
- Account must be in your name or business name

**Need Help?**
Contact our support team via Zendesk chat. We can help troubleshoot verification issues.`
      }
    ],
    relatedArticles: ['payout-timing-fees', 'host-onboarding']
  },
  {
    slug: 'payout-timing-fees',
    title: 'Payout Timing & Fees',
    description: 'Understand when you get paid and what fees apply to your Vendibook earnings.',
    category: 'Payments & Payouts',
    categorySlug: 'payments-payouts',
    sections: [
      {
        id: 'payout-schedule',
        title: 'When You Get Paid',
        content: `**For Rentals**
- Payment is captured when the booking starts
- Payout initiated within 24 hours of rental start
- Funds arrive in 2-5 business days (depends on your bank)

**For Sales**
- Payment captured when buyer confirms purchase
- Payout initiated after buyer confirms receipt
- Or automatically after 7 days if no disputes

**Payout Methods**
Payouts are sent directly to the bank account connected via Stripe.`
      },
      {
        id: 'fee-breakdown',
        title: 'Fee Breakdown',
        content: `**Vendibook Service Fee**
- 10% of the booking/sale total
- Covers platform, support, and payment processing
- Deducted automatically from your payout

**What is Included in the Fee**
- Stripe payment processing
- Customer support for you and your renters
- Dispute resolution services
- Platform maintenance and features

**Example**
- Rental price: $500
- Vendibook fee (10%): $50
- Your payout: $450`
      },
      {
        id: 'payout-tracking',
        title: 'Tracking Your Payouts',
        content: `**In Vendibook**
- Dashboard → Earnings shows all payouts
- View pending, processing, and completed payouts
- Download reports for accounting

**In Stripe**
- Access your Stripe Express dashboard
- View detailed transaction history
- Download 1099 tax forms (US hosts)`
      },
      {
        id: 'delays',
        title: 'What Causes Delays?',
        content: `**Common Delay Causes**
- Bank holidays (payouts do not process on weekends)
- First payout (may take extra 1-2 days)
- Account verification issues
- Disputes or holds on your account

**If Your Payout is Late**
1. Check Stripe dashboard for status
2. Verify bank account details are correct
3. Contact support if over 7 business days`
      }
    ],
    relatedArticles: ['stripe-connect-setup', 'cancellations-refunds']
  },
  {
    slug: 'deposits-protection',
    title: 'Deposits & Damage Protection',
    description: 'How security deposits work and what protection you have when renting on Vendibook.',
    category: 'Rentals & Bookings',
    categorySlug: 'rentals-bookings',
    sections: [
      {
        id: 'how-deposits-work',
        title: 'How Security Deposits Work',
        content: `**Authorization Hold**
When you book a rental, a security deposit may be authorized on your card:
- The hold is temporary—not an immediate charge
- Amount varies by listing (set by host)
- Released within 48 hours after successful return

**When You Are Charged**
You are only charged if:
- Damage is documented with photos
- Host files a claim within 48 hours of return
- Claim is reviewed and approved by Vendibook

**Typical Deposit Amounts**
- Food trucks: $500-$2,000
- Trailers: $300-$1,500
- Ghost kitchens: $500-$1,000
- Vendor Spaces: Usually no deposit`
      },
      {
        id: 'pre-rental',
        title: 'Before Your Rental',
        content: `**Document Everything**
- Take photos of all areas before accepting
- Note any existing damage
- Get host acknowledgment of pre-existing issues
- Save photos with timestamps

**What to Photograph**
- All four exterior sides
- Interior from multiple angles
- Each piece of equipment
- Any existing damage (scratches, dents, wear)
- Odometer/hour meter readings`
      },
      {
        id: 'during-rental',
        title: 'During Your Rental',
        content: `**If Something Breaks**
1. Document with photos immediately
2. Contact the host through Vendibook messaging
3. Do not attempt major repairs without host approval
4. Report the issue—do not hide it

**Normal Wear vs. Damage**
- Normal wear: Minor scuffs, expected equipment wear
- Damage: Broken equipment, significant cosmetic damage, missing items`
      },
      {
        id: 'after-rental',
        title: 'After Your Rental',
        content: `**Return Process**
- Clean the asset before return
- Document condition at return (photos/video)
- Complete return inspection with host if possible
- Get written confirmation of successful return

**Deposit Release**
- If no issues: Released within 48 hours
- If claim filed: Held until resolution (usually 5-7 days)
- Disputed claims: May take longer for investigation`
      },
      {
        id: 'disputing-claims',
        title: 'Disputing a Damage Claim',
        content: `**If You Disagree**
1. Respond to the claim within 48 hours
2. Provide your documentation (photos, timestamps)
3. Explain your position clearly
4. Vendibook will review both sides

**What We Look At**
- Pre-rental and post-rental photos
- Communication history
- Nature of the damage
- Whether damage is consistent with reported use`
      }
    ],
    relatedArticles: ['pre-rental-inspection', 'dispute-evidence']
  },
  {
    slug: 'pickup-delivery-checklist',
    title: 'Pickup, Delivery & Return Checklist',
    description: 'Complete checklist for smooth pickup, delivery, and return of rental equipment.',
    category: 'Rentals & Bookings',
    categorySlug: 'rentals-bookings',
    sections: [
      {
        id: 'before-pickup',
        title: 'Before Pickup or Delivery',
        content: `**Confirm Details**
- [ ] Verify pickup/delivery date and time with host
- [ ] Confirm exact address and any access instructions
- [ ] Ensure you have proper vehicle/tow capacity (if applicable)
- [ ] Bring valid drivers license and booking confirmation
- [ ] Have Vendibook app ready for communication

**What to Bring**
- [ ] Signed rental agreement (if required)
- [ ] Payment confirmation
- [ ] Phone with camera for documentation
- [ ] Any required documents (permits, insurance proof)`
      },
      {
        id: 'at-pickup',
        title: 'At Pickup',
        content: `**Walk-Through with Host**
- [ ] Complete exterior inspection together
- [ ] Test all equipment operation
- [ ] Review controls and systems
- [ ] Note any existing damage
- [ ] Take photos/video of entire asset

**Get Orientation**
- [ ] How to operate each piece of equipment
- [ ] Location of shutoffs (gas, water, electric)
- [ ] Emergency procedures
- [ ] Host contact for questions

**Before Leaving**
- [ ] Confirm you have all keys/access codes
- [ ] Test that you can tow/drive safely
- [ ] Know the return location and time`
      },
      {
        id: 'at-delivery',
        title: 'If Delivery',
        content: `**When Asset Arrives**
- [ ] Meet the delivery driver on time
- [ ] Inspect immediately upon arrival
- [ ] Document any transit damage
- [ ] Test equipment before driver leaves
- [ ] Get delivery confirmation

**Site Preparation**
- [ ] Level ground for setup
- [ ] Access to power if needed
- [ ] Water hookup if required
- [ ] Proper clearance for operation`
      },
      {
        id: 'during-rental',
        title: 'During Your Rental',
        content: `**Daily Care**
- [ ] Clean equipment after each use
- [ ] Monitor refrigeration temperatures
- [ ] Check propane levels
- [ ] Keep exterior clean
- [ ] Report any issues promptly

**Document Issues**
- [ ] Photo any problems immediately
- [ ] Message host through Vendibook
- [ ] Keep records of all communications`
      },
      {
        id: 'return',
        title: 'Return Checklist',
        content: `**Before Return**
- [ ] Clean all cooking surfaces thoroughly
- [ ] Empty grease traps and waste tanks
- [ ] Refill propane if required
- [ ] Remove all personal items
- [ ] Take final condition photos

**At Return**
- [ ] Arrive on time
- [ ] Walk through with host
- [ ] Show your documentation
- [ ] Get return confirmation
- [ ] Return all keys/access items

**After Return**
- [ ] Leave a review for the host
- [ ] Confirm deposit release
- [ ] Save all documentation`
      }
    ],
    relatedArticles: ['pre-rental-inspection', 'deposits-protection']
  },
  {
    slug: 'shipping-freight',
    title: 'Shipping & Freight Options',
    description: 'Understanding your options for shipping purchased equipment through Vendibook.',
    category: 'Buying & Selling',
    categorySlug: 'buying-selling',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content: `When buying a food truck, trailer, or large equipment, shipping is often a significant consideration. Vendibook offers multiple options:

**Self-Arrange**
Handle your own pickup or hire your own transport.

**Vendibook Freight (Coming Soon)**
Request quotes from vetted freight carriers directly through the platform.

**Seller Delivery**
Some sellers offer delivery within a certain radius.`
      },
      {
        id: 'cost-factors',
        title: 'What Affects Shipping Cost',
        content: `**Distance**
Longer distances = higher costs. Cross-country moves can cost $2,000-$5,000+.

**Size and Weight**
- Food trucks: Require flatbed or specialized transport
- Trailers: Can be towed or shipped on flatbed
- Equipment: Standard freight or LTL shipping

**Type of Transport**
- Drive-away: Cheapest for driveable trucks
- Flatbed: Most common for trailers
- Enclosed transport: Most expensive, best protection

**Timeline**
- Standard: 5-14 days
- Expedited: 3-5 days (premium pricing)`
      },
      {
        id: 'getting-quotes',
        title: 'Getting Freight Quotes',
        content: `**Information You Will Need**
- Pickup address (seller location)
- Delivery address
- Asset dimensions (L x W x H)
- Weight
- Is it driveable?
- Preferred timeline

**Getting Multiple Quotes**
Always get 3+ quotes to compare. Prices can vary significantly between carriers.

**Questions to Ask**
- Is insurance included? What is covered?
- What is the estimated delivery window?
- Are there any additional fees (fuel surcharge, tolls)?
- What if there is damage during transport?`
      },
      {
        id: 'preparing-for-transport',
        title: 'Preparing for Transport',
        content: `**Before Pickup**
- [ ] Remove all loose items from interior
- [ ] Secure all doors, hatches, and compartments
- [ ] Disconnect propane tanks
- [ ] Drain water tanks
- [ ] Document condition with photos/video
- [ ] Provide keys to driver (if applicable)

**Bill of Lading**
- Get a signed copy from the driver
- Note any pre-existing damage
- Keep until delivery confirmed`
      },
      {
        id: 'at-delivery',
        title: 'At Delivery',
        content: `**Inspect Immediately**
- [ ] Check for any transport damage
- [ ] Document new damage with photos
- [ ] Note issues on delivery receipt BEFORE signing
- [ ] Test that asset is driveable/functional

**If Damage Occurred**
1. Document extensively with photos
2. Note on delivery receipt
3. Contact carrier immediately
4. File claim with carrier insurance
5. Notify Vendibook support`
      }
    ],
    relatedArticles: ['buying-end-to-end', 'closing-shipping']
  },
  {
    slug: 'selling-end-to-end',
    title: 'Selling Your Asset on Vendibook (End-to-End)',
    description: 'Complete guide to selling your food truck, trailer, or commercial kitchen on Vendibook.',
    category: 'Buying & Selling',
    categorySlug: 'buying-selling',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content: `Selling on Vendibook gives you access to thousands of serious buyers looking for mobile kitchens and commercial equipment. Our platform handles:

- Secure payment processing
- Escrow protection for both parties
- Dispute resolution if needed
- Support throughout the process`
      },
      {
        id: 'before-listing',
        title: 'Before You List',
        content: `**Prepare Your Asset**
- Deep clean inside and out
- Complete any minor repairs
- Gather all documentation (title, maintenance records)
- Take professional-quality photos

**Research Pricing**
- Check comparable listings on Vendibook
- Consider age, condition, and included equipment
- Factor in any unique features
- Be realistic about market value`
      },
      {
        id: 'creating-listing',
        title: 'Creating Your Listing',
        content: `**Photos (Most Important)**
- Minimum 10 high-quality images
- All angles (exterior and interior)
- Close-ups of equipment
- Any areas of wear or damage (transparency builds trust)

**Description**
- Year, make, model, and specs
- Complete equipment list
- Recent maintenance or upgrades
- Why you are selling (buyers appreciate honesty)
- What is included vs. not included

**Pricing**
- Set a fair asking price
- Consider room for negotiation
- Enable "Make an Offer" for flexibility`
      },
      {
        id: 'managing-inquiries',
        title: 'Managing Inquiries',
        content: `**Respond Quickly**
Fast responses build buyer confidence and improve your listing ranking.

**Be Transparent**
Answer questions honestly. Disclose known issues upfront.

**Schedule Inspections**
Serious buyers may want to inspect in person. Be accommodating.

**Negotiate Professionally**
- Consider reasonable offers
- Do not be offended by low offers—counter instead
- Get everything in writing`
      },
      {
        id: 'closing-sale',
        title: 'Closing the Sale',
        content: `**Accept an Offer**
When you accept an offer, the buyer is prompted to complete payment.

**Payment Processing**
- Funds held in escrow until transaction completes
- You will receive confirmation when payment clears

**Transfer of Ownership**
- Meet buyer for pickup/inspection
- Complete bill of sale
- Transfer title
- Provide all keys, manuals, and documentation

**Release of Funds**
Once buyer confirms receipt, funds are released to your account (minus platform fee).`
      }
    ],
    relatedArticles: ['pricing-guidance', 'closing-shipping', 'sell-food-truck-online']
  },
  {
    slug: 'sell-food-truck-online',
    title: 'How to Sell Your Food Truck Online',
    description: 'A step-by-step guide to listing and selling your food truck on Vendibook\'s marketplace.',
    category: 'Buying & Selling',
    categorySlug: 'buying-selling',
    featured: true,
    sections: [
      {
        id: 'overview',
        title: 'Why Sell on Vendibook?',
        content: `Vendibook is built specifically for mobile food assets. Unlike generic marketplaces, we connect you with serious buyers who are actively looking for food trucks, trailers, and commercial kitchen equipment.

**What you get:**
- Verified buyers who reduce tire-kickers
- Secure checkout with escrow-style protection
- Dashboard to manage inquiries and confirmations
- Optional freight coordination
- 24/7 support

Ready to get started? [List your food truck for sale →](/sell-my-food-truck)`
      },
      {
        id: 'pricing',
        title: 'How to Price Your Food Truck',
        content: `Pricing correctly is key to selling faster. Use our free tools to find the right price:

**Pricing Calculator**
Get a quick estimate based on category, condition, and market signals. [Open the Pricing Calculator →](/pricing-calculator)

**PricePilot (AI Suggestions)**
Let our AI scan comparable listings and suggest a competitive price range with confidence cues. [Get AI Pricing Suggestions →](/tools/pricepilot)

**Tips for Pricing:**
- Research similar trucks sold recently
- Factor in age, mileage, equipment, and condition
- Be realistic—overpricing leads to longer listing times
- You can always adjust your price after listing`
      },
      {
        id: 'listing-steps',
        title: 'Creating Your Listing',
        content: `**Step 1: Gather Photos**
Take at least 10 high-quality photos showing:
- All exterior angles
- Interior cooking area
- Each piece of equipment
- Any wear or damage (honesty builds trust)

**Step 2: Write Your Description**
Include year, make, model, dimensions, and a complete equipment list. Mention recent maintenance or upgrades.

**Step 3: Set Your Terms**
Choose pickup only, local delivery, or freight options. Set your asking price.

**Step 4: Publish**
Review your listing and go live. Your truck will appear in search results immediately.

[Start your listing now →](/list?mode=sale)`
      },
      {
        id: 'after-checkout',
        title: 'What Happens After a Buyer Checks Out?',
        content: `When a buyer completes checkout:

1. You'll see the sale in your dashboard
2. Click "Confirm Sale" to lock in next steps
3. Coordinate pickup or freight based on what was selected
4. Funds are released after you confirm the handoff

**Important:** Never release assets before confirming the sale in your dashboard. This protects both you and the buyer.`
      },
      {
        id: 'fees',
        title: 'Fees and Payouts',
        content: `**Seller Commission:** 12.9% of the sale price

Buyers don't pay a platform fee (though shipping/freight may apply if selected).

**Payouts:**
- Processed via Stripe Connect
- Funds released after transaction confirmation
- Deposited to your linked bank account

[Learn more about selling →](/sell-my-food-truck)`
      }
    ],
    relatedArticles: ['selling-end-to-end', 'pricing-guidance', 'closing-shipping']
  },
  {
    slug: 'pricing-guidance',
    title: 'Pricing Your Asset for Sale',
    description: 'How to price your food truck, trailer, or kitchen equipment competitively.',
    category: 'Buying & Selling',
    categorySlug: 'buying-selling',
    sections: [
      {
        id: 'factors',
        title: 'Pricing Factors',
        content: `**Primary Factors**
- Age of the asset
- Overall condition
- Equipment included
- Mileage/hours (for trucks)
- Brand/manufacturer reputation

**Value Adds**
- Recent major maintenance
- Updated equipment
- Compliant with current regulations
- Established business/route (if selling as package)
- Transferable permits`
      },
      {
        id: 'research',
        title: 'Research the Market',
        content: `**Check Comparable Listings**
- Search Vendibook for similar assets
- Note price ranges for your category
- Consider location differences

**External Resources**
- Used food truck dealer pricing
- Industry forums and groups
- Recent sold listings (if available)

**Professional Appraisal**
For high-value assets, consider getting a professional appraisal.`
      },
      {
        id: 'strategies',
        title: 'Pricing Strategies',
        content: `**Market Price**
Price at fair market value. Best for standard assets in good condition.

**Slightly Below Market**
Price 5-10% below comparable listings for faster sale. Good if you need to sell quickly.

**Premium Pricing**
Price above market if you have unique features, recent upgrades, or exceptional condition. Be prepared to wait longer.

**Room for Negotiation**
Most buyers expect to negotiate. Price 5-10% higher than your minimum acceptable price.`
      },
      {
        id: 'common-mistakes',
        title: 'Common Pricing Mistakes',
        content: `**Overpricing**
- Leads to stale listings
- Buyers skip overpriced listings
- Eventually requires larger price drops

**Underpricing**
- Leaves money on the table
- May signal problems to buyers

**Ignoring Condition**
- Be honest about wear and issues
- Adjust price accordingly
- Transparency builds trust

**Forgetting Fees**
- Factor in Vendibook 10% service fee
- Consider any shipping costs you will cover`
      }
    ],
    relatedArticles: ['selling-end-to-end', 'host-listing-checklist']
  },
  {
    slug: 'closing-shipping',
    title: 'Closing a Sale: Shipping & Release of Funds',
    description: 'What happens after you sell your asset—shipping coordination and getting paid.',
    category: 'Buying & Selling',
    categorySlug: 'buying-selling',
    sections: [
      {
        id: 'after-accepted',
        title: 'After Offer is Accepted',
        content: `**Payment Confirmation**
Once the buyer completes payment, funds are held in escrow.

**Coordinate Handoff**
- Agree on pickup date/time or shipping arrangements
- Provide any necessary access instructions
- Prepare all documentation for transfer`
      },
      {
        id: 'pickup-scenario',
        title: 'If Buyer Picks Up',
        content: `**Prepare the Asset**
- Final cleaning
- Gather all keys, remotes, manuals
- Complete any promised maintenance

**At Pickup**
- Walk through asset together
- Point out controls and systems
- Complete bill of sale
- Transfer title
- Get signed pickup confirmation

**After Pickup**
Once buyer confirms through Vendibook, funds are released.`
      },
      {
        id: 'shipping-scenario',
        title: 'If Shipping',
        content: `**Coordinate with Buyer**
- Confirm who arranges shipping
- Get timeline and carrier information
- Agree on preparation requirements

**Prepare for Transport**
- Remove loose items
- Secure all doors and compartments
- Disconnect propane
- Document condition before transport

**At Pickup by Carrier**
- Get signed bill of lading
- Note pre-existing damage
- Keep copy until delivery confirmed`
      },
      {
        id: 'funds-release',
        title: 'Release of Funds',
        content: `**Standard Timeline**
- Buyer confirms receipt → Funds released within 24 hours
- Auto-release if no issues reported after 7 days

**Your Payout**
- Sale price minus 10% Vendibook fee
- Funds sent to your connected bank account
- Typically arrives in 2-5 business days

**If Issues Arise**
- Buyer has 48 hours to report problems
- Disputed funds held until resolution
- Vendibook mediates if needed`
      }
    ],
    relatedArticles: ['selling-end-to-end', 'shipping-freight']
  },
  {
    slug: 'cancellations-refunds',
    title: 'Cancellations & Partial Refunds',
    description: 'How cancellation policies work and when you can get a refund on Vendibook.',
    category: 'Cancellations & Refunds',
    categorySlug: 'cancellations-refunds',
    sections: [
      {
        id: 'policies',
        title: 'Cancellation Policies',
        content: `**Host-Set Policies**
Each listing may have its own cancellation policy set by the host. Check the listing details before booking.

**Standard Policies**

**Flexible**
- Full refund up to 24 hours before start
- 50% refund within 24 hours

**Moderate**
- Full refund up to 7 days before start
- 50% refund 2-7 days before
- No refund within 48 hours

**Strict**
- Full refund up to 14 days before start
- 50% refund 7-14 days before
- No refund within 7 days`
      },
      {
        id: 'how-to-cancel',
        title: 'How to Cancel a Booking',
        content: `**As a Renter**
1. Go to Dashboard → My Bookings
2. Find the booking you want to cancel
3. Click "Cancel Booking"
4. Confirm cancellation
5. Refund processed based on policy

**As a Host**
Hosts should avoid cancelling confirmed bookings. Host cancellations:
- May affect your search ranking
- May result in penalties for repeat cancellations
- Should be communicated immediately to the renter`
      },
      {
        id: 'refund-timeline',
        title: 'Refund Timeline',
        content: `**Processing Time**
- Refund initiated within 24 hours of cancellation
- Credit card refunds: 5-10 business days to appear
- Debit card refunds: 5-10 business days

**Partial Refunds**
If only partially refundable:
- Refundable portion processed immediately
- Non-refundable portion retained

**Check Your Refund**
View refund status in Dashboard → Transactions`
      },
      {
        id: 'special-circumstances',
        title: 'Special Circumstances',
        content: `**Extenuating Circumstances**
We may make exceptions for:
- Serious illness or injury (with documentation)
- Government travel restrictions
- Natural disasters
- Death of immediate family member

**How to Request**
1. Contact support via Zendesk
2. Provide documentation
3. We will review on a case-by-case basis

**Asset Issues**
If the asset significantly differs from the listing or is unsafe:
- Document with photos/video
- Contact host immediately
- Contact Vendibook support
- Full refund may be granted`
      },
      {
        id: 'disputes',
        title: 'Disputing a Refund Decision',
        content: `**If You Disagree**
1. Contact support within 48 hours
2. Explain your situation
3. Provide any supporting documentation
4. We will review and respond

**What We Consider**
- Booking terms and cancellation policy
- Communication history
- Documentation provided
- Circumstances of the situation`
      }
    ],
    relatedArticles: ['deposits-protection', 'dispute-evidence']
  },
  {
    slug: 'equipment-issues',
    title: 'What to Do If Something Breaks During a Rental',
    description: 'Step-by-step guide for handling equipment issues or breakdowns during your rental.',
    category: 'Troubleshooting',
    categorySlug: 'troubleshooting',
    sections: [
      {
        id: 'immediate-steps',
        title: 'Immediate Steps',
        content: `**1. Ensure Safety First**
- Turn off equipment if sparking, smoking, or leaking
- Evacuate if there is a fire or gas leak
- Call 911 for emergencies

**2. Document the Issue**
- Take photos and video immediately
- Note the time and what happened
- Do not try to fix before documenting

**3. Contact the Host**
- Message through Vendibook right away
- Describe the issue clearly
- Include your photos/video`
      },
      {
        id: 'communication',
        title: 'Communicating with Your Host',
        content: `**What to Include**
- What broke or malfunctioned
- When it happened
- What you were doing when it happened
- Current impact on your operation

**Stay Calm and Professional**
- Issues happen—it is not necessarily anyones fault
- Focus on solutions, not blame
- Keep all communication in Vendibook messaging`
      },
      {
        id: 'minor-issues',
        title: 'Handling Minor Issues',
        content: `**What is Minor**
- Blown fuse (if spares available)
- Clogged drain
- Equipment needs basic reset
- Pilot light went out

**Before DIY Fixes**
- Get host permission first
- Only attempt if you are comfortable
- Document before and after
- Save any receipts for supplies

**What NOT to Do**
- Do not attempt electrical repairs
- Do not modify gas connections
- Do not force stuck equipment
- Do not exceed your skill level`
      },
      {
        id: 'major-issues',
        title: 'Handling Major Issues',
        content: `**What is Major**
- Refrigeration failure (food safety risk)
- Gas leak
- Generator failure
- Fire suppression discharge
- Significant water leak

**Steps for Major Issues**
1. Stop using the affected equipment
2. Document extensively
3. Contact host immediately
4. Wait for host direction on repairs
5. Consider contacting Vendibook support

**Emergency Contacts**
- Gas leak: Evacuate and call gas company
- Fire: Call 911
- After-hours host emergency: Use emergency contact if provided`
      },
      {
        id: 'compensation',
        title: 'Seeking Compensation',
        content: `**When You May Be Entitled**
- Equipment failure prevents operation
- Issue was not disclosed in listing
- Safety hazard existed before rental

**What to Request**
- Partial refund for unusable time
- Reimbursement for documented expenses
- Early termination of rental

**How to Request**
1. Document everything
2. Communicate with host first
3. If unresolved, contact Vendibook support
4. We will mediate and determine fair resolution

**Note:** Normal wear and user-caused issues do not qualify for compensation.`
      }
    ],
    relatedArticles: ['dispute-evidence', 'deposits-protection']
  },
  {
    slug: 'dispute-evidence',
    title: 'Disputes: What Evidence to Upload',
    description: 'Guide to documenting and submitting evidence for dispute resolution on Vendibook.',
    category: 'Trust & Safety',
    categorySlug: 'trust-safety',
    sections: [
      {
        id: 'importance',
        title: 'Why Documentation Matters',
        content: `Strong documentation is the key to successful dispute resolution. When we review disputes, we rely on evidence from both parties to make fair decisions.

**The Party with Better Documentation Usually Wins**
- Timestamped photos > verbal claims
- Written communication > verbal agreements  
- Multiple photos > single photo
- Video > still images`
      },
      {
        id: 'photo-requirements',
        title: 'Photo Requirements',
        content: `**Technical Requirements**
- Clear, in-focus images
- Good lighting
- Multiple angles of the same issue
- Include context (wider shots + close-ups)

**Timestamp Your Photos**
- Use your phone camera (automatically timestamps)
- Include a newspaper/screen with date visible if possible
- Email photos to yourself for additional timestamp proof

**What to Photograph**
- Overall condition (wide shots)
- Specific damage (close-ups)
- Equipment readings (temperatures, meters)
- Any relevant signage or documentation`
      },
      {
        id: 'video-guidance',
        title: 'Video Evidence',
        content: `**When Video Helps**
- Equipment malfunction demonstrations
- Walk-arounds showing condition
- Issues that are hard to capture in photos
- Time-sensitive situations

**Video Best Practices**
- Keep under 2 minutes
- Narrate what you are showing
- Hold camera steady
- Include wide shot and close-ups
- Ensure audio is clear`
      },
      {
        id: 'written-evidence',
        title: 'Written Documentation',
        content: `**Preserve All Communication**
- All Vendibook messages are automatically saved
- Screenshot any off-platform communication
- Email confirmations and receipts
- Signed agreements or checklists

**Create a Written Timeline**
- Date and time of each event
- Who was present
- What was said/agreed
- What actions were taken`
      },
      {
        id: 'submission',
        title: 'Submitting Your Evidence',
        content: `**How to Submit**
1. Go to the booking/transaction in question
2. Click "Report Issue" or "Open Dispute"
3. Describe the situation clearly
4. Upload all relevant photos/videos
5. Attach any documents
6. Submit for review

**What to Include in Description**
- Clear summary of what happened
- Specific dates and times
- What resolution you are seeking
- Reference to uploaded evidence

**After Submission**
- We will review within 48 hours
- May request additional information
- Both parties get opportunity to respond
- Decision typically within 5-7 business days`
      },
      {
        id: 'tips',
        title: 'Pro Tips',
        content: `**Do**
- Document immediately—do not wait
- Over-document rather than under-document
- Be factual and objective
- Organize evidence clearly

**Do Not**
- Delete original files
- Edit or alter photos
- Make exaggerated claims
- Use profanity or personal attacks

**If You Are a Host**
- Take check-in and check-out photos every time
- Use a consistent checklist
- Note condition on every rental
- Address issues during rental, not after`
      }
    ],
    relatedArticles: ['equipment-issues', 'deposits-protection', 'cancellations-refunds']
  },

  // PAYMENT OPTIONS
  {
    slug: 'affirm-financing',
    title: 'Affirm: Monthly Payment Plans',
    description: 'Learn how to use Affirm to split purchases into affordable monthly payments on Vendibook.',
    category: 'Payments & Payouts',
    categorySlug: 'payments-payouts',
    featured: true,
    sections: [
      {
        id: 'what-is-affirm',
        title: 'What is Affirm?',
        content: `Affirm is a buy-now-pay-later service that lets you split purchases into monthly payments. Unlike credit cards, Affirm shows you the exact amount you'll pay upfront—no hidden fees or compounding interest.

**Key Benefits**
- Split purchases from $35 to $30,000 into monthly payments
- Know your total cost before you commit
- No late fees or prepayment penalties
- Quick approval with soft credit check (won't affect your score)

**Available On**
Affirm is available for sale listings priced between $35 and $30,000.`
      },
      {
        id: 'how-it-works',
        title: 'How Affirm Works',
        content: `**At Checkout**
1. Select "Affirm" as your payment method
2. Enter basic information (name, email, phone, date of birth)
3. Affirm performs a soft credit check (no impact on credit score)
4. See your personalized payment options (3, 6, 12, or more months)
5. Choose your plan and confirm

**After Purchase**
- First payment due at checkout or within 30 days (varies by plan)
- Automatic monthly payments from your linked bank or card
- Manage payments in the Affirm app or website
- Pay off early anytime with no penalties`
      },
      {
        id: 'rates-terms',
        title: 'Rates and Terms',
        content: `**APR Range**
- 0% to 36% APR depending on creditworthiness
- Rates shown before you commit
- No hidden fees

**Example Payment**
For a $15,000 food truck:
- 12 months at 15% APR: ~$1,357/month
- 24 months at 15% APR: ~$726/month
- 36 months at 15% APR: ~$520/month

*Actual rates vary based on your credit profile.*

**What Affirm Checks**
- Credit history (soft pull)
- Debt-to-income ratio
- Payment history with Affirm`
      },
      {
        id: 'eligibility',
        title: 'Eligibility Requirements',
        content: `**To Use Affirm You Must**
- Be at least 18 years old
- Be a US resident
- Have a valid US phone number
- Have a Social Security Number
- Pass Affirm's credit check

**What Affirm Does NOT Support**
- Recurring subscriptions or rentals
- Purchases under $35 or over $30,000
- Non-US transactions

**If You're Declined**
- Try again in 30 days
- Build credit history
- Consider a smaller purchase first`
      },
      {
        id: 'managing-payments',
        title: 'Managing Your Affirm Loan',
        content: `**Payment Methods**
- Debit card
- Bank transfer (ACH)
- Check (mail-in)

**Making Payments**
- Log in at affirm.com or the Affirm app
- Payments due on the same day each month
- Set up autopay to avoid missing payments

**Early Payoff**
- Pay off your balance anytime
- No prepayment penalties
- Interest stops accruing when paid in full

**Need Help?**
Contact Affirm directly at affirm.com/help for payment issues.`
      }
    ],
    relatedArticles: ['afterpay-guide', 'buying-end-to-end']
  },
  {
    slug: 'afterpay-guide',
    title: 'Afterpay: Pay in 4 Installments',
    description: 'Split your purchase into 4 interest-free payments with Afterpay on Vendibook.',
    category: 'Payments & Payouts',
    categorySlug: 'payments-payouts',
    featured: true,
    sections: [
      {
        id: 'what-is-afterpay',
        title: 'What is Afterpay?',
        content: `Afterpay lets you split purchases into 4 equal payments, due every 2 weeks. It's interest-free when you pay on time.

**Key Benefits**
- 4 equal payments over 6 weeks
- 0% interest (no APR)
- No credit impact for approval
- Get your purchase immediately

**Available On**
Afterpay is available for purchases up to $4,000. The first payment is due at checkout.`
      },
      {
        id: 'how-it-works',
        title: 'How Afterpay Works',
        content: `**Payment Schedule Example**
For a $2,000 purchase:
- Today: $500 (25%)
- 2 weeks: $500 (25%)
- 4 weeks: $500 (25%)
- 6 weeks: $500 (25%)

**At Checkout**
1. Select "Afterpay" as payment method
2. Log in or create Afterpay account
3. Confirm your payment schedule
4. Complete purchase

**Payments Are Automatic**
Afterpay charges your linked card automatically every 2 weeks.`
      },
      {
        id: 'fees-limits',
        title: 'Fees and Spending Limits',
        content: `**Interest**
- 0% interest when payments are on time

**Late Fees**
- $10 fee if payment fails
- Additional $7 fee if not paid within 7 days
- Maximum late fee: 25% of purchase or $68 (whichever is less)

**Spending Limits**
- First-time users: typically $150-$500
- Limits increase with on-time payments
- Maximum: $4,000 per transaction

**How to Increase Your Limit**
- Pay on time consistently
- Link a debit card (vs credit)
- Use Afterpay regularly`
      },
      {
        id: 'eligibility',
        title: 'Eligibility',
        content: `**Requirements**
- 18+ years old
- Valid debit or credit card
- US phone number and address
- Valid email address

**Approval Factors**
- Payment history with Afterpay
- Amount of outstanding Afterpay orders
- Order amount and type

**No Credit Check**
Afterpay does not perform a hard credit check. Your credit score is not affected.`
      },
      {
        id: 'managing-payments',
        title: 'Managing Afterpay Payments',
        content: `**View Your Schedule**
- Download the Afterpay app
- Log in at afterpay.com
- See all upcoming payments

**Change Payment Method**
- Update your card in the Afterpay app
- Changes apply to future installments

**Pay Early**
- Make extra payments anytime in the app
- Reduces future installment amounts
- No benefit or penalty for early payment

**Missed Payment?**
- Your account may be paused
- Late fees apply
- Pay ASAP to restore your account`
      }
    ],
    relatedArticles: ['affirm-financing', 'buying-end-to-end']
  },
  {
    slug: 'making-offers',
    title: 'Making Offers on Listings',
    description: 'How to negotiate and make offers on sale listings on Vendibook.',
    category: 'Buying & Selling',
    categorySlug: 'buying-selling',
    featured: true,
    sections: [
      {
        id: 'offer-overview',
        title: 'How Offers Work',
        content: `Vendibook allows buyers to negotiate on sale listings through our offer system. Instead of paying the asking price, you can propose a lower price that works for your budget.

**When to Make an Offer**
- Listing has been available for a while
- You're a serious, qualified buyer
- You can articulate why your offer is fair
- You're ready to purchase if accepted

**Offer Limits**
- You can have one active offer per listing
- Offers expire after 48 hours if no response`
      },
      {
        id: 'submitting-offer',
        title: 'How to Submit an Offer',
        content: `**Step 1: Find the Listing**
Browse sale listings and find the asset you want.

**Step 2: Click "Make Offer"**
On the listing detail page, click the "Make Offer" button.

**Step 3: Enter Your Offer**
- Enter your proposed price
- Add a message explaining your offer
- Be professional and reasonable

**Step 4: Submit**
Your offer is sent to the seller immediately. You'll receive a notification when they respond.

**Tips for Better Offers**
- Research comparable listings
- Explain your situation (e.g., "Ready to buy this week")
- Be within 10-20% of asking price for best results
- Include financing pre-approval if applicable`
      },
      {
        id: 'seller-responses',
        title: 'What Happens After You Offer',
        content: `**Seller Can:**

**Accept** - You proceed to checkout at your offer price. Payment is due immediately.

**Decline** - Your offer is rejected. You can submit a new offer or purchase at asking price.

**Counter** - The seller proposes a different price. You have 48 hours to accept or decline their counter-offer.

**No Response** - If the seller doesn't respond within 48 hours, your offer expires automatically.

**After Acceptance**
When your offer is accepted, you'll receive a notification with a link to complete checkout at the agreed price.`
      },
      {
        id: 'counter-offers',
        title: 'Understanding Counter-Offers',
        content: `**What is a Counter-Offer?**
If the seller thinks your offer is too low, they may propose a middle-ground price.

**Example**
- Asking price: $25,000
- Your offer: $20,000
- Counter-offer: $23,000

**Responding to a Counter**
You can:
- **Accept**: Proceed to checkout at the counter-offer price
- **Decline**: Your negotiation ends; you can submit a new offer later

**Counter-Offer Expiration**
You have 48 hours to respond. After that, the counter-offer expires and you'll need to start over.`
      },
      {
        id: 'offer-best-practices',
        title: 'Best Practices',
        content: `**Do:**
- Be respectful and professional
- Make reasonable offers (within 20% of asking)
- Respond quickly to counters
- Be ready to complete purchase if accepted
- Ask questions before offering

**Don't:**
- Make lowball offers (likely to be ignored)
- Submit multiple offers in quick succession
- Try to negotiate outside the platform
- Offer if you're not ready to buy
- Get emotional if declined

**Remember**
The best negotiations are win-win. Sellers want to sell, and buyers want to buy. Finding middle ground helps everyone.`
      }
    ],
    relatedArticles: ['buying-end-to-end', 'affirm-financing']
  },
  {
    slug: 'pay-in-person-guide',
    title: 'Pay in Person (Cash Transactions)',
    description: 'How cash and in-person payment transactions work on Vendibook.',
    category: 'Payments & Payouts',
    categorySlug: 'payments-payouts',
    sections: [
      {
        id: 'what-is-pay-in-person',
        title: 'What is Pay in Person?',
        content: `Pay in Person allows buyers and sellers to complete transactions with cash or other offline payment methods. The transaction is still tracked through Vendibook, but payment happens face-to-face.

**When It's Available**
- Seller must enable "Pay in Person" on their listing
- Typically used for local pickups
- Common for smaller transactions or when buyer/seller prefer cash

**Key Difference from Online Payments**
- Funds are NOT held in escrow
- Vendibook cannot mediate payment disputes
- Both parties must confirm completion in-app`
      },
      {
        id: 'how-it-works',
        title: 'How the Process Works',
        content: `**Step 1: Submit Request**
Buyer submits a purchase request selecting "Pay in Person" at checkout.

**Step 2: Seller Confirms**
Seller reviews the request and confirms they're ready to proceed. This notifies the buyer.

**Step 3: Meet & Exchange**
Buyer and seller meet at the agreed location. Buyer pays cash (or agreed method) and receives the asset.

**Step 4: Buyer Confirms**
Buyer confirms in the app that they've received the asset and completed payment.

**Step 5: Transaction Complete**
Both confirmations close the transaction. Both parties can leave reviews.`
      },
      {
        id: 'safety-tips',
        title: 'Safety Tips for Cash Transactions',
        content: `**For Buyers**
- Meet in a public, well-lit location
- Bring someone with you
- Inspect the asset thoroughly before paying
- Get a receipt or bill of sale
- Document the exchange with photos/video

**For Sellers**
- Verify the buyer's identity
- Count cash carefully before handing over asset
- Meet during daylight hours
- Bring a witness
- Don't accept personal checks

**Warning Signs**
- Buyer refuses to meet in public
- Pressure to complete quickly
- Requests to change payment method last minute
- Unusually high-pressure tactics`
      },
      {
        id: 'platform-protections',
        title: 'What Vendibook Can and Cannot Do',
        content: `**What Vendibook Provides**
- Transaction record and timeline
- Messaging history between parties
- Confirmation tracking
- Review system for accountability
- Basic dispute documentation

**What Vendibook Cannot Do**
- Hold funds in escrow
- Guarantee payment was made
- Refund cash transactions
- Mediate "he said/she said" disputes
- Recover funds from bad actors

**Our Recommendation**
For high-value transactions ($5,000+), we strongly recommend using Vendibook's secure online payment system for maximum protection.`
      },
      {
        id: 'fees-for-cash',
        title: 'Fees for Pay in Person',
        content: `**Buyer Fees**
- No platform fee for buyers on cash transactions

**Seller Fees**
- Standard Vendibook commission still applies
- No payment processing fee (since no card is processed)
- Commission is invoiced to seller separately

**Why Sellers Still Pay Commission**
Vendibook provides the marketplace, listing exposure, messaging system, and transaction infrastructure. The commission covers these services regardless of payment method.

**Payment of Commission**
Sellers receive an invoice for their commission, payable via credit card or bank transfer.`
      }
    ],
    relatedArticles: ['buying-end-to-end', 'deposits-protection']
  }
];

// Helper to get article by slug
export const getArticleBySlug = (slug: string): HelpArticle | undefined => {
  return helpArticles.find(article => article.slug === slug);
};

// Helper to get related articles
export const getRelatedArticles = (article: HelpArticle): HelpArticle[] => {
  if (!article.relatedArticles) return [];
  return article.relatedArticles
    .map(slug => helpArticles.find(a => a.slug === slug))
    .filter((a): a is HelpArticle => a !== undefined);
};

// Helper to get next/previous articles in same category
export const getAdjacentArticles = (slug: string): { prev: HelpArticle | null; next: HelpArticle | null } => {
  const article = getArticleBySlug(slug);
  if (!article) return { prev: null, next: null };
  
  const categoryArticles = helpArticles.filter(a => a.categorySlug === article.categorySlug);
  const currentIndex = categoryArticles.findIndex(a => a.slug === slug);
  
  return {
    prev: currentIndex > 0 ? categoryArticles[currentIndex - 1] : null,
    next: currentIndex < categoryArticles.length - 1 ? categoryArticles[currentIndex + 1] : null
  };
};

// Get all articles by category
export const getArticlesByCategory = (categorySlug: string): HelpArticle[] => {
  return helpArticles.filter(article => article.categorySlug === categorySlug);
};

// Get all unique categories
export const getCategories = (): { slug: string; name: string }[] => {
  const categories = new Map<string, string>();
  helpArticles.forEach(article => {
    if (!categories.has(article.categorySlug)) {
      categories.set(article.categorySlug, article.category);
    }
  });
  return Array.from(categories, ([slug, name]) => ({ slug, name }));
};
