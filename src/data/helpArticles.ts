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
        content: `Vendibook connects food entrepreneurs with mobile kitchen assets—food trucks, trailers, ghost kitchens, and vendor lots. Our rental process is designed to be straightforward, secure, and transparent for both renters and hosts.

Whether you're testing a new concept, covering for equipment repairs, or scaling up for an event, Vendibook gives you access to vetted equipment without long-term commitments.`
      },
      {
        id: 'finding-listing',
        title: 'Finding the Right Listing',
        content: `**Search and Filter**
Use the search bar to find listings by location, category, or keywords. Filter results by:
- Asset type (food truck, trailer, ghost kitchen, vendor lot)
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
