/**
 * Buyer SEO page content — single source of truth.
 * Pure data (no imports) so it is shared by the React app (CategoryIndex
 * configs + HowToBuyAFoodTruck) and the seo-prerender edge function, which
 * renders the same copy into crawler HTML. Edit copy here only.
 */
export interface SeoLink { href: string; label: string }
export interface SeoFaq { q: string; a: string }
export interface SeoSection { heading: string; paragraphs: string[]; links?: SeoLink[] }
export interface SeoAnswerBlock {
  id: string; heading: string; lead: string;
  options: { name: string; goodFor: string; tradeoffs: string }[];
  footnote?: string; links?: SeoLink[];
}
export interface BuyerHubContent {
  path: string; h1: string; title: string; description: string; intro: string;
  clarification?: string; answerBlock?: SeoAnswerBlock; sections: SeoSection[]; faqs: SeoFaq[];
}
export interface GuideStep { id: string; title: string; body: string[]; checklist?: string[]; links?: SeoLink[] }

export const BUYER_HUB_CONTENT: Record<string, BuyerHubContent> = {
  "/food-trucks-for-sale": {
    "path": "/food-trucks-for-sale",
    "h1": "Food Trucks for Sale",
    "title": "Food Trucks for Sale | Used & New | Vendibook",
    "description": "Browse food trucks for sale from owners across the US. Compare photos, equipment, asking prices, and locations, plus a guide to where and how to buy a food truck.",
    "intro": "Compare food trucks for sale from owners across the country. Listings show the photos, equipment, and asking price each seller provides, so you can shortlist trucks, ask questions, and arrange an inspection before you buy.",
    "answerBlock": {
      "id": "where-to-buy",
      "heading": "Where to buy a food truck",
      "lead": "Most buyers get a food truck from one of three places: an online marketplace, a dealer or custom builder, or directly from the current owner. Each route trades price, choice, and protection differently — and whichever you choose, inspect the truck and confirm its title and records before you pay.",
      "options": [
        {
          "name": "Online marketplaces (like Vendibook)",
          "goodFor": "Comparing many used and new trucks from different sellers and locations in one place, messaging sellers, and making offers.",
          "tradeoffs": "Listings are written by sellers, so details vary. You still need to verify condition, records, and title yourself or with an inspector."
        },
        {
          "name": "Dealers and custom builders",
          "goodFor": "New builds to your layout, or reconditioned units, often with the builder's own warranty or support terms.",
          "tradeoffs": "Usually higher prices and build lead times. Warranty terms differ by builder — read them before you sign."
        },
        {
          "name": "Direct from an owner",
          "goodFor": "Local deals where you can see the truck in person, talk to the operator, and sometimes buy equipment or a route with it.",
          "tradeoffs": "Least structure: no standard paperwork or payment process, so you carry more of the risk of checking records and handling payment safely."
        }
      ],
      "footnote": "Used or new? Used trucks can be ready sooner and cost less upfront but carry more unknowns about mileage, equipment age, and wear. New builds cost more and take time, but you choose the layout. Nearby or nationwide? A local truck is easier to inspect in person; buying out of state widens your choice but means planning an inspection, pickup, or freight transport before you commit.",
      "links": [
        {
          "href": "/how-to-buy-a-food-truck",
          "label": "Read the step-by-step buying guide"
        },
        {
          "href": "/used-food-trucks-for-sale",
          "label": "Shop used food trucks"
        },
        {
          "href": "/food-truck-prices",
          "label": "See current asking prices"
        },
        {
          "href": "/guides/meetup-inspection",
          "label": "Inspection checklist"
        },
        {
          "href": "/vendibook-freight",
          "label": "Freight & delivery"
        },
        {
          "href": "/financing",
          "label": "Financing options"
        }
      ]
    },
    "sections": [
      {
        "heading": "Browse food trucks for sale by state",
        "paragraphs": [
          "Shopping locally? Browse food trucks for sale in the states where Vendibook has active inventory and dedicated marketplace pages."
        ],
        "links": [
          {
            "href": "/food-trucks-for-sale/texas",
            "label": "Texas"
          },
          {
            "href": "/food-trucks-for-sale/arizona",
            "label": "Arizona"
          },
          {
            "href": "/food-trucks-for-sale/georgia",
            "label": "Georgia"
          },
          {
            "href": "/food-trucks-for-sale/florida",
            "label": "Florida"
          },
          {
            "href": "/food-trucks-for-sale/michigan",
            "label": "Michigan"
          },
          {
            "href": "/food-trucks-for-sale/ohio",
            "label": "Ohio"
          },
          {
            "href": "/food-trucks-for-sale/california",
            "label": "California"
          },
          {
            "href": "/food-trucks-for-sale/north-carolina",
            "label": "North Carolina"
          },
          {
            "href": "/food-trucks-for-sale/oregon",
            "label": "Oregon"
          }
        ]
      },
      {
        "heading": "Starting a coffee business?",
        "paragraphs": [
          "Coffee is one of the lowest-cost mobile food concepts to launch. Espresso-ready trucks need a commercial espresso machine, grinder, water system, refrigeration, and enough power to run them all at once. Compare espresso setups, generator capacity, and asking prices side by side on our dedicated coffee inventory page."
        ],
        "links": [
          {
            "href": "/coffee-trucks-trailers-for-sale",
            "label": "Shop coffee trucks & trailers for sale"
          },
          {
            "href": "/financing",
            "label": "Finance a coffee trailer"
          }
        ]
      },
      {
        "heading": "Taco trucks for sale",
        "paragraphs": [
          "Taco trucks are one of the most popular mobile food concepts in the US. When you shop taco trucks for sale, look for a full-length flat-top griddle, a hood and fire suppression system sized for it, a steam table for proteins, prep refrigeration, and a service window wide enough for fast lines. Mobile taco kitchens with commissary-ready water tanks and current health inspections usually get on the road fastest.",
          "Browse the food trucks listed above and search for \"taco\" to surface taco truck inventory, or compare pricing across used food trucks before you make an offer."
        ],
        "links": [
          {
            "href": "/search?mode=sale&category=food_truck&q=taco",
            "label": "Shop taco trucks for sale"
          },
          {
            "href": "/food-truck-prices",
            "label": "Compare food truck prices"
          },
          {
            "href": "/financing",
            "label": "Finance a taco truck"
          }
        ]
      },
      {
        "heading": "Buying a food truck: new vs. used",
        "paragraphs": [
          "New trucks are built to order, so you pick the chassis, kitchen layout, and equipment — and wait for the build. Used trucks are available now and usually cost less, but their value depends heavily on mileage, maintenance history, and the age of the kitchen equipment. Ask every seller for service records, the year of major equipment, and whether the truck has recently passed a health or fire inspection anywhere.",
          "If you are unsure, compare a few used trucks against a builder quote for the same menu. The gap between them is what you are paying for choice and a clean history."
        ],
        "links": [
          {
            "href": "/used-food-trucks-for-sale",
            "label": "Used food trucks for sale"
          },
          {
            "href": "/food-truck-prices",
            "label": "Compare asking prices"
          }
        ]
      },
      {
        "heading": "Buying nearby vs. nationwide",
        "paragraphs": [
          "Buying close to home makes it easy to see the truck, test-drive it, and bring a mechanic. Widening your search to other states gives you more choice, but plan how you will inspect it — in person, with a hired inspector, or on a live video walkthrough — and how it will get to you: driving it home, or freight transport. Agree on pickup timing, who pays transport, and what condition it should arrive in before you pay."
        ],
        "links": [
          {
            "href": "/guides/meetup-inspection",
            "label": "How to inspect at a meetup"
          },
          {
            "href": "/vendibook-freight",
            "label": "Arrange freight transport"
          },
          {
            "href": "/how-it-works",
            "label": "How buying on Vendibook works"
          }
        ]
      },
      {
        "heading": "Paying for a food truck",
        "paragraphs": [
          "On Vendibook, eligible listings can be paid through online checkout powered by PayPal, and some sellers also accept payment in person. Whatever method you use, keep a written record of the agreed price, what is included, and the handoff date. Financing is available through third-party lenders for some buyers; approval, rates, and terms depend on the lender and your application."
        ],
        "links": [
          {
            "href": "/financing",
            "label": "Explore financing"
          },
          {
            "href": "/payments",
            "label": "Payment options"
          }
        ]
      }
    ],
    "faqs": [
      {
        "q": "Where can I buy a food truck?",
        "a": "You can buy a food truck from an online marketplace, a dealer or custom builder, or directly from an owner. Marketplaces like Vendibook let you compare many trucks from different sellers in one place; dealers and builders offer new or reconditioned units, often with their own warranty terms; direct sellers can be the lowest-cost route but leave more of the checking to you."
      },
      {
        "q": "Where can I buy a used food truck?",
        "a": "Used food trucks are sold by current owners on marketplaces and classifieds, by some dealers who take trade-ins, and by fleet operators downsizing. On Vendibook you can browse used food trucks for sale — listings where the seller marked the condition as like new, good, fair, or needs work."
      },
      {
        "q": "What is the best place to buy a food truck?",
        "a": "There is no single best place for everyone. If you want to compare many options quickly, a food-truck-specific marketplace helps. If you want a new build to your spec, a builder fits better. If you already know a local owner, a direct sale can work. Whichever route you choose, inspect the truck, confirm title and records, and use a documented payment method."
      },
      {
        "q": "How do I find food trucks for sale near me?",
        "a": "Start with the state pages linked on this page or search by city. If local stock is thin, widen your search — many buyers purchase out of state and arrange an in-person inspection plus pickup or freight transport."
      },
      {
        "q": "How much does it cost to buy a food truck?",
        "a": "Asking prices vary widely with age, mileage, size, and installed equipment. See our food truck prices page for current asking-price data from live Vendibook listings, and budget beyond the price for taxes and registration, inspection, transport, permits, insurance, and any repairs."
      },
      {
        "q": "Can I rent a food truck before buying one?",
        "a": "Yes. Some operators rent first to test a concept before committing to a purchase. Rental availability and terms are set by each owner."
      },
      {
        "q": "What should I check before buying a used food truck?",
        "a": "Inspect the engine and drivetrain, generator, refrigeration, propane lines, hood and fire suppression, and kitchen equipment. Ask for service records and confirm with your local health department and fire marshal what the truck needs to pass in your area."
      }
    ]
  },
  "/food-trailers-for-sale": {
    "path": "/food-trailers-for-sale",
    "h1": "Food Trailers for Sale",
    "title": "Food Trailers for Sale | Concession & Mobile Kitchen | Vendibook",
    "description": "Used and new food trailers for sale on Vendibook. Browse concession trailers, BBQ trailers, and turnkey mobile kitchens with photos, specs, and pricing.",
    "intro": "Find food trailers for sale from owners across the US. Compare concession trailers, BBQ trailers, and full mobile kitchens using the photos, equipment lists, and asking prices each seller provides.",
    "sections": [
      {
        "heading": "Browse food trailers for sale by state",
        "paragraphs": [
          "Shopping locally? Browse food trailers for sale in the states where Vendibook has active inventory and dedicated marketplace pages."
        ],
        "links": [
          {
            "href": "/food-trailers-for-sale/texas",
            "label": "Texas"
          },
          {
            "href": "/food-trailers-for-sale/georgia",
            "label": "Georgia"
          },
          {
            "href": "/food-trailers-for-sale/florida",
            "label": "Florida"
          },
          {
            "href": "/food-trailers-for-sale/michigan",
            "label": "Michigan"
          },
          {
            "href": "/food-trailers-for-sale/ohio",
            "label": "Ohio"
          },
          {
            "href": "/food-trailers-for-sale/arizona",
            "label": "Arizona"
          }
        ]
      },
      {
        "heading": "Starting a coffee business?",
        "paragraphs": [
          "Coffee is one of the lowest-cost mobile food concepts to launch. Espresso-ready trailers need a commercial espresso machine, grinder, water system, refrigeration, and enough power to run them all at once. Compare espresso setups, generator capacity, and asking prices side by side on our dedicated coffee inventory page."
        ],
        "links": [
          {
            "href": "/coffee-trucks-trailers-for-sale",
            "label": "Shop coffee trucks & trailers for sale"
          },
          {
            "href": "/financing",
            "label": "Finance a coffee trailer"
          }
        ]
      },
      {
        "heading": "Where to buy a food trailer",
        "paragraphs": [
          "Food trailers come from three main sources: builders and trailer dealers, who sell new and custom units; current owners, who sell used trailers on marketplaces and classifieds; and caterers or event companies selling surplus equipment. A marketplace lets you compare trailers from many sellers at once. A builder lets you choose the layout. A private seller may offer the lowest price, but you do more of the checking yourself."
        ],
        "links": [
          {
            "href": "/how-to-buy-a-food-truck",
            "label": "Step-by-step buying guide"
          },
          {
            "href": "/search?category=food_trailer&mode=sale",
            "label": "Search food trailers for sale"
          }
        ]
      },
      {
        "heading": "Food trailer vs. food truck",
        "paragraphs": [
          "A trailer separates the kitchen from the vehicle. That means no engine or transmission to maintain on the kitchen itself, and you can unhitch it at an event and use your vehicle for supply runs. The trade-off is that you need a capable tow vehicle, setup takes longer, and some venues or parking spots are easier with a single self-contained truck."
        ],
        "links": [
          {
            "href": "/food-trucks-for-sale",
            "label": "Compare food trucks for sale"
          }
        ]
      },
      {
        "heading": "Match the layout and equipment to your menu",
        "paragraphs": [
          "Start from what you will cook. A fry-heavy or griddle menu needs a hood and fire suppression system sized for that line; a coffee or dessert concept may need more refrigeration, water, and power than cooking space. Check the service window position, the prep counter length, sink setup, and where staff will stand at peak times. Ask the seller for the make and age of each major appliance."
        ]
      },
      {
        "heading": "Check your tow vehicle before you buy",
        "paragraphs": [
          "Get the trailer's GVWR (loaded weight rating), tongue weight, coupler size, and electrical connector from the seller, then compare them against your vehicle's towing capacity, hitch class, and brake controller. Longer and heavier trailers can also affect parking, fuel use, and whether your state requires a license endorsement."
        ]
      },
      {
        "heading": "Budget for the total cost, not just the price",
        "paragraphs": [
          "Beyond the asking price, plan for sales tax, title and registration, an inspection, transport or freight if it is out of town, hitch or tow-vehicle upgrades, local health and fire permits, commissary fees where required, insurance, and any repairs or equipment changes your menu needs."
        ],
        "links": [
          {
            "href": "/food-truck-prices",
            "label": "See current asking prices"
          },
          {
            "href": "/financing",
            "label": "Financing options"
          },
          {
            "href": "/vendibook-freight",
            "label": "Freight & delivery"
          }
        ]
      }
    ],
    "faqs": [
      {
        "q": "Where can I buy a food trailer?",
        "a": "Food trailers are sold by builders and trailer dealers (new and custom builds), by current owners on marketplaces and classifieds, and occasionally by event or catering companies selling surplus units. Vendibook lets you compare trailers from different sellers in one place."
      },
      {
        "q": "Should I buy a new or used food trailer?",
        "a": "A new build lets you choose the layout and equipment, but you pay for it and wait for it. A used trailer can be ready sooner and cost less, but you inherit its layout, equipment age, and any wear — so an inspection matters more."
      },
      {
        "q": "Is a food trailer or a food truck better for me?",
        "a": "Trailers skip the engine and drivetrain, can be unhitched and left at an event, and often cost less to buy. Trucks are self-contained, faster to set up, and do not need a separate tow vehicle. Your menu, event types, and existing vehicle usually decide it."
      },
      {
        "q": "What tow vehicle do I need for a food trailer?",
        "a": "Compare the trailer's loaded weight (GVWR) and tongue weight against your vehicle's rated towing capacity, and confirm the hitch class, coupler size, electrical connector, and brake controller match. Check your state DMV for any license endorsement required at that weight."
      },
      {
        "q": "How much does a food trailer cost to buy?",
        "a": "Asking prices depend on size, build quality, and equipment. Our food truck prices page shows current asking-price data from live Vendibook listings, including a truck vs. trailer comparison when there is enough data."
      },
      {
        "q": "Do I need a special license to tow a food trailer?",
        "a": "Requirements depend on your state and the trailer's weight. Many lighter trailers can be towed on a standard license, while heavier or commercial use may require an endorsement — check your state DMV before you buy."
      }
    ]
  },
  "/used-food-trucks-for-sale": {
    "path": "/used-food-trucks-for-sale",
    "h1": "Used Food Trucks for Sale",
    "title": "Used Food Trucks for Sale — Pre-Owned Mobile Kitchens | Vendibook",
    "description": "Shop used food trucks for sale where the seller lists the condition as like new, good, fair, or needs work. Plus what to inspect, which records to ask for, and how to compare costs.",
    "intro": "These are food trucks for sale whose sellers described the condition as like new, good, fair, or needs work. Trucks listed without a condition are not shown here — browse all food trucks for sale to see them, and confirm condition with the seller either way.",
    "clarification": "Condition is chosen by each seller, not verified by Vendibook. Treat it as a starting point and confirm it with an inspection.",
    "sections": [
      {
        "heading": "Inspect before you commit",
        "paragraphs": [
          "A used truck is two purchases: a vehicle and a commercial kitchen. Have a mechanic check the engine, transmission, brakes, tires, and frame, and look for rust or leaks under the kitchen floor. Then check the kitchen: run the generator under load, confirm refrigeration holds temperature, test burners, fryers and griddles, and look at the hood, fire suppression tags, propane lines, and water system."
        ],
        "links": [
          {
            "href": "/guides/meetup-inspection",
            "label": "Meetup & inspection checklist"
          }
        ]
      },
      {
        "heading": "Ask for service records and paperwork",
        "paragraphs": [
          "Ask for the title (in the seller's name), maintenance and repair records, generator hours, fire suppression service dates, and any past health or fire inspection reports. Gaps are not always a deal-breaker, but they should lower what you are willing to pay or raise what you budget for repairs."
        ]
      },
      {
        "heading": "Judge the equipment, not just the truck",
        "paragraphs": [
          "Kitchen equipment ages separately from the vehicle. Note the make and approximate age of each major appliance, and whether it suits your menu. Replacing a hood system, generator, or refrigeration can change the real cost of a truck that looked cheap."
        ]
      },
      {
        "heading": "Compare total cost, not asking price",
        "paragraphs": [
          "Two trucks at the same price can cost very different amounts to put on the road. Add expected repairs, equipment changes, transport, taxes and registration, permits, and insurance to each option. Compare that total against a newer truck or a builder quote before deciding."
        ],
        "links": [
          {
            "href": "/food-truck-prices",
            "label": "Current asking-price data"
          },
          {
            "href": "/financing",
            "label": "Financing options"
          }
        ]
      },
      {
        "heading": "Evaluate the seller's details",
        "paragraphs": [
          "Read the full listing, ask questions through Vendibook messaging, and request a live video walkthrough if you cannot visit. Be cautious if a seller pressures you to pay off-platform, refuses an inspection, or cannot show a title in their name."
        ],
        "links": [
          {
            "href": "/how-to-buy-a-food-truck",
            "label": "Full food truck buying guide"
          },
          {
            "href": "/food-trucks-for-sale",
            "label": "All food trucks for sale (any condition)"
          }
        ]
      }
    ],
    "faqs": [
      {
        "q": "How do you decide which food trucks are used?",
        "a": "This page only shows food trucks for sale where the seller chose a pre-owned condition — like new, good, fair, or needs work — when listing. Trucks marked new, or listed without a condition, are not included."
      },
      {
        "q": "Where can I buy a used food truck?",
        "a": "Used food trucks are sold by current owners on marketplaces and classifieds, by some dealers, and by fleet operators. This page shows used trucks listed on Vendibook; you can also browse all food trucks for sale."
      },
      {
        "q": "What should I check on a used food truck?",
        "a": "Check the vehicle (engine, transmission, brakes, tires, frame, rust) and the kitchen (generator, refrigeration, cooking equipment, hood and fire suppression, propane and water systems). Ask for the title, service records, and any recent inspection reports."
      },
      {
        "q": "How much does a used food truck cost?",
        "a": "Asking prices depend on age, mileage, size, and equipment. See the food truck prices page for current asking-price data from Vendibook listings, and budget for repairs, transport, taxes, permits, and insurance on top."
      }
    ]
  }
};

export const HOW_TO_BUY_PATH = "/how-to-buy-a-food-truck";
export const HOW_TO_BUY_TITLE = "How to Buy a Food Truck: Step-by-Step Buyer Guide | Vendibook";
export const HOW_TO_BUY_DESCRIPTION = "A practical, step-by-step guide to buying a food truck or trailer: set a budget, compare listings, check title and records, inspect, confirm local rules, pay with a record, and plan pickup or freight.";
export const HOW_TO_BUY_H1 = "How to Buy a Food Truck";
export const HOW_TO_BUY_QUICK_ANSWER = { question: 'How do you buy a food truck?', answer: 'Budget for the total cost around your menu, compare listings, confirm title and records, get an independent vehicle and kitchen inspection, check local health and fire requirements, pay with a documented method, and plan pickup or freight before handoff.' };
export const HOW_TO_BUY_STEPS: GuideStep[] = [
  {
    "id": "budget-and-menu",
    "title": "Set your budget around your menu",
    "body": [
      "Your menu decides the equipment, and the equipment decides the truck. Write down what you will cook, the appliances it needs, and roughly how many people will work inside at peak times. Then set a total budget — not just a purchase price."
    ],
    "checklist": [
      "Purchase price you can afford (cash or with financing)",
      "Sales tax, title, and registration",
      "Mechanical and kitchen inspection",
      "Pickup travel or freight transport",
      "Local permits, commissary, and insurance",
      "A repair and equipment reserve"
    ],
    "links": [
      {
        "href": "/food-truck-prices",
        "label": "Current asking-price data"
      },
      {
        "href": "/financing",
        "label": "Financing options"
      }
    ]
  },
  {
    "id": "compare-listings",
    "title": "Compare listings side by side",
    "body": [
      "Shortlist three to five trucks or trailers that fit your menu. Compare size, year, mileage or tow weight, the make and age of major equipment, generator capacity, water tank sizes, and location. Note what is missing from each listing so you can ask about it."
    ],
    "links": [
      {
        "href": "/food-trucks-for-sale",
        "label": "Food trucks for sale"
      },
      {
        "href": "/food-trailers-for-sale",
        "label": "Food trailers for sale"
      },
      {
        "href": "/used-food-trucks-for-sale",
        "label": "Used food trucks for sale"
      }
    ]
  },
  {
    "id": "ownership-and-records",
    "title": "Check ownership, title, and records",
    "body": [
      "Ask the seller for the title (or trailer registration) and confirm the name matches the person selling. Ask whether there is a loan or lien on the unit. Request maintenance records, generator hours, fire suppression service tags, and any past health or fire inspection reports."
    ],
    "checklist": [
      "Title in the seller's name, VIN matches the unit",
      "Any lien disclosed and a plan to clear it at sale",
      "Service and repair history",
      "Fire suppression and equipment service dates"
    ]
  },
  {
    "id": "inspection",
    "title": "Get an independent vehicle and kitchen inspection",
    "body": [
      "Inspect in person when you can, or hire a local mechanic or inspector. For a truck, check the engine, transmission, brakes, tires, frame, and rust. For the kitchen, run the generator under load, confirm refrigeration holds temperature, and test every burner, fryer, and griddle. If you cannot travel, ask for a live video walkthrough and have the seller show each item working."
    ],
    "links": [
      {
        "href": "/guides/meetup-inspection",
        "label": "Meetup & inspection checklist"
      }
    ]
  },
  {
    "id": "local-requirements",
    "title": "Confirm requirements with your local agencies",
    "body": [
      "Rules for mobile food units are set locally. Before you buy, contact your city or county health department, fire marshal, and licensing office to ask what the unit must have to be approved — for example sink setup, water tank sizes, hood and fire suppression, and commissary requirements. A truck that passed somewhere else may still need changes in your area."
    ],
    "links": [
      {
        "href": "/tools/permitpath",
        "label": "PermitPath permit checklist"
      },
      {
        "href": "/tools/regulations-hub",
        "label": "Regulations hub"
      }
    ]
  },
  {
    "id": "offer-and-payment",
    "title": "Make a documented offer and pay with a record",
    "body": [
      "Put the agreed price, what is included (equipment, spare parts, branding), the handoff date, and any conditions in writing. Avoid untraceable payment methods and be cautious of anyone who pushes you to pay off-platform. On Vendibook you can make an offer on eligible listings and pay through online checkout powered by PayPal, where offered by the listing; some sellers also accept payment in person."
    ],
    "links": [
      {
        "href": "/how-it-works",
        "label": "How buying on Vendibook works"
      },
      {
        "href": "/payments",
        "label": "Payment options"
      }
    ]
  },
  {
    "id": "pickup-and-handoff",
    "title": "Plan pickup, freight, and the handoff",
    "body": [
      "Decide who moves the unit and when. You can drive or tow it home, or arrange freight transport for long distances. At handoff, walk through the unit again, confirm everything agreed is there, take photos, sign over the title, and keep a copy of every document."
    ],
    "links": [
      {
        "href": "/vendibook-freight",
        "label": "Freight & delivery"
      }
    ]
  }
];
export const HOW_TO_BUY_FAQS: { question: string; answer: string }[] = [
  {
    "question": "How do I buy a food truck?",
    "answer": "Set a total budget around your menu, compare several listings, check the title and service records, get an independent vehicle and kitchen inspection, confirm what your local health and fire departments require, make a written offer and pay with a traceable method, then plan pickup or freight and complete the title transfer at handoff."
  },
  {
    "question": "Where can I buy a food truck?",
    "answer": "From an online marketplace, a dealer or custom builder, or directly from an owner. Marketplaces help you compare many options; builders offer new units to your spec; direct sales can be cheaper but leave more of the checking to you."
  },
  {
    "question": "Should I buy a food truck or a food trailer?",
    "answer": "Trailers skip the engine and drivetrain and can be unhitched at events, but need a capable tow vehicle. Trucks are self-contained and quicker to set up. Your menu, venues, and existing vehicle usually decide it."
  },
  {
    "question": "Can I buy a food truck from another state?",
    "answer": "Yes. Plan an in-person or hired inspection (or a live video walkthrough), agree on pickup or freight transport before paying, and check your own state's title, registration, and local health requirements."
  },
  {
    "question": "Can I finance a food truck purchase?",
    "answer": "Some buyers finance through third-party lenders. Approval, rates, and terms depend on the lender and your application; Vendibook does not guarantee approval or terms."
  }
];

/** Must equal USED_CONDITION_VALUES in src/lib/listings/condition.ts (parity-tested). */
export const USED_CONDITIONS = ['like_new', 'good', 'fair', 'needs_work'];

export const PRICES_PATH = '/food-truck-prices';
export const pricesTitle = (year: number) => `Food Truck Prices & Cost Calculator (${year}) | Vendibook`;
export const pricesDescription = (year: number) =>
  `See what food trucks and trailers cost in ${year} using real Vendibook marketplace data. Compare prices, explore cost factors, and estimate your truck with PricePilot.`;
export const pricesH1 = (year: number) => `Food Truck Prices: How Much Does a Food Truck Cost in ${year}?`;
export const PRICES_INTRO =
  'Explore real food truck and trailer listing prices from the Vendibook marketplace, compare equipment types, and estimate the cost of your next mobile food business.';
export const PRICES_COST_HEADING = 'How much does it cost to buy a food truck?';
export const PRICES_FALLBACK_ANSWER =
  'Asking prices vary widely with age, mileage, size, and installed equipment. Live marketplace figures appear on this page when enough listings are available.';
export const PRICES_SCOPE_NOTE =
  'These figures are asking prices from current Vendibook listings, not completed sale prices. Vendibook does not publish sold-price data here, and final negotiated prices may differ.';
export const PRICES_COST_COMPONENTS = [
  'Purchase price (negotiated from the asking price)',
  'Sales tax, title, and registration in your state',
  'Mechanical and kitchen inspection',
  'Travel to pick up, or freight transport',
  'Health, fire, and business permits in your area',
  'Commissary fees, where required',
  'Commercial auto and liability insurance',
  'Repairs, equipment changes, and wrap or branding',
  'Financing costs, if you borrow',
];

/** The 5 buyer SEO paths served by seo-prerender for crawlers. */
export const BUYER_SEO_PRERENDER_PATHS = [
  '/food-trucks-for-sale',
  '/food-trailers-for-sale',
  '/used-food-trucks-for-sale',
  HOW_TO_BUY_PATH,
  PRICES_PATH,
];

/** Inventory filter for each hub (mirrors CategoryIndex config). */
export const BUYER_HUB_INVENTORY: Record<string, { category: string; conditions?: string[] }> = {
  '/food-trucks-for-sale': { category: 'food_truck' },
  '/food-trailers-for-sale': { category: 'food_trailer' },
  '/used-food-trucks-for-sale': { category: 'food_truck', conditions: USED_CONDITIONS },
};
