import { normalizeAtlasState } from './atlasEquipment';

/** Curated government guidance, not a permit decision or a live agency feed. */
export const PERMIT_REVIEWED_ON = '2026-10-22';
export interface PermitSource {
  authority: string;
  url: string;
  scope: string;
  guidance: string[];
}
const source = (authority: string, url: string, scope: string, ...guidance: string[]): PermitSource => ({ authority, url, scope, guidance });

const florida = source('Florida DBPR', 'https://www2.myfloridalicense.com/hotels-restaurants/licensing/mfdv-guide/', 'Florida mobile food dispensing vehicles; not every packaged-food business or hot-dog cart has the same regulator or requirements.',
  'Determine the license category from the menu and operation. New or remodeled vehicles generally need plan review, a license application and an opening inspection. Buying a licensed vehicle does not transfer the operator license automatically.',
  'Self-sufficient vehicles must accommodate their food preparation, storage and washing. Other operations need an approved commissary. All need an approved commercial, nonresidential water and wastewater servicing arrangement; home food preparation is not the MFDV pathway.',
  'Prepare a sample menu, labeled equipment layout, vehicle photo and water/commissary details. DBPR guide and checklist pages differ on the closure period that triggers review; confirm with DBPR rather than quoting a cutoff.');
const texas = source('Texas DSHS', 'https://www.dshs.texas.gov/retail-food-establishments/permits-retail-food-establishments/mobile-food-vendors', 'Texas statewide health licensing from July 1, 2026.',
  'Use the statewide mobile food vendor license and inspection process. Do not send Houston operators to an obsolete separate local health-license process.',
  'License type depends on preparation and food handling. A new unlicensed operation cannot start before required approval and inspection. Transition rules for existing local license holders have specific application conditions; do not assume an old permit alone is sufficient. Other applicable laws still matter.');
const texasGuide = source('Texas DSHS', 'https://www.dshs.texas.gov/sites/default/files/foodestablishments/pdf/mobile-food-vendor-guide.pdf', 'May 2026 mobile food vendor guide; classification and servicing depend on menu.',
  'Each vehicle needs its own license and must remain mobile. Type I concerns prepackaged foods; Type II covers limited preparation/reheating; Type III covers full preparation including raw-animal-food cooking.',
  'Confirm the menu-specific handwashing, warewashing, potable water, wastewater and refrigeration arrangements. A central preparation facility exemption requires the applicable checklist and agency acceptance; it is not automatic. Use approved commercial servicing, not a home kitchen.');
const pima = source('Pima County Consumer Health and Food Safety', 'https://content.civicplus.com/api/assets/az-pimacounty/d79fca41-888f-42b6-8511-4cc1876b4707', 'Pima County, including Tucson; Mobile Food Unit guide linked by pima.gov/business-resources-guidelines.',
  'Plan review applies to new/unbuilt units, units not actively permitted in Arizona and remodeling; ownership, menu or concept changes can also affect review.',
  'County Type II is limited preparation and generally excludes raw-animal-food cooking. Type III is fully enclosed and can support broader cooking subject to approval. Do not infer that a grill makes an open cart approvable for raw meat.',
  'Confirm the menu, unit classification, approved commissary/servicing arrangements and inspection with the county before purchasing or modifying a unit.');

export const PERMIT_MARKETS: Record<string, { state: string; sources: PermitSource[]; gaps: string[] }> = {
  houston: { state: 'TX', sources: [texas, texasGuide,
    source('Houston Fire Department', 'https://houstontx.gov/fire/HFMO/FoodTrucks.html', 'Houston fire safety, especially LP-gas equipment.',
      'Review the current Houston food-truck fire inspection and LP-gas guidance with HFD. Confirm the applicable local fire path under the 2026 statewide framework; the state health license does not establish that a particular site or fuel installation is approved.')],
    gaps: ['Exact vending site, landowner permission, zoning, parking and event conditions require current local confirmation.'] },
  tucson: { state: 'AZ', sources: [pima,
    source('Tucson Fire Department', 'https://www.tucsonaz.gov/files/sharedassets/public/v/1/fire/handouts-and-information/mobile-food-trucks-trailers-and-carts-2024.pdf', 'Tucson mobile trucks, trailers and carts; equipment-specific fire requirements.',
      'Grease-vapor appliances require a Type I hood and suppression, with the applicable Tucson operational permit and periodic servicing. Heat/steam-only equipment may follow a different hood path; the fire authority determines applicability.',
      'Provide the required extinguishers; grease/deep-frying operations need the applicable Class K protection. Secure LP gas, provide required detectors and keep health inspection records available. Do not cook with flames or grease-producing appliances under tents.'),
    source('City of Tucson', 'https://www.tucsonaz.gov/files/sharedassets/public/v/1/pdsd/documents/planning-amp-zoning/peddler_packet_fortdc_224.pdf', 'Temporary fixed-location peddler operations within Tucson city limits, not every mobile operation.',
      'Check whether the peddler pathway applies. The city packet calls for business licensing, site-specific peddler approval and commercial/industrial zoning. A new location requires its own review; do not treat a Tucson mailing address as proof of city jurisdiction.')],
    gaps: ['Confirm the exact site and operating model with city licensing/zoning; surrounding Pima communities can have different local rules.'] },
  'los angeles': { state: 'CA', sources: [
    source('Los Angeles County Department of Public Health', 'https://publichealth.lacounty.gov/eh/inspection/mobile-food-facility-plan-check.htm', 'LA County mobile food facilities; excludes Long Beach, Pasadena and Vernon health jurisdictions.',
      'New and remodeled facilities require the applicable plan-check process covering construction, equipment and ventilation. Final inspection and the required public health permit are separate from buying the vehicle.',
      'Confirm menu classification, approved commissary/storage and servicing with Environmental Health. Limited-preparation carts and full-cooking enclosed trucks are different review paths.'),
    source('City of Los Angeles', 'https://business.lacity.gov/plan-business/starter-kits/starter-kit-mobile-food-vending', 'City mobile-food-vending starter checklist; some linked material is older.',
      'Use the city checklist to identify business registration, applicable seller-tax registration, county health approval, commissary, parking and site questions. Verify current details with the agencies before relying on older linked food-code material.',
      'Motorized trucks and sidewalk/park carts are different operations. Do not apply the sidewalk-cart permit or a neighboring city rule to every LA truck.')],
    gaps: ['Exact municipality, county-health service area, parking/site permission and appliance-specific fire requirements must be confirmed.'] },
  miami: { state: 'FL', sources: [florida,
    source('City of Miami', 'https://www.miami.gov/Business/New-Business-Guide', 'City of Miami, not Miami Beach or all Miami-Dade.',
      'Confirm the operating address with city zoning before committing to a site. The city business guide expressly treats food trucks/peddlers differently from the ordinary fixed-premises Certificate of Use checklist. Use the food-truck ordinance and business-tax pathway for the actual operation.'),
    source('Miami-Dade Regulatory and Economic Resources', 'https://www.miamidade.gov/global/permit.page?Mduid_permit=per176054592604019', 'Unincorporated Miami-Dade mobile sales/food-service operations only.',
      'The county pathway calls for an annual operator Certificate of Use, operation/hours narrative and applicable state food-service license, plus property-owner/site approvals. Check permitted zoning and written site permission; right-of-way or drive-aisle use is not general authorization.',
      'A food-truck roundup has a separate site/event process. Do not apply unincorporated-county or PortMiami-only requirements to all City of Miami vendors.')],
    gaps: ['Ask whether the site is City of Miami, another municipality or unincorporated county before choosing a local checklist.'] },
  atlanta: { state: 'GA', sources: [
    source('Georgia Department of Public Health', 'https://dph.georgia.gov/environmental-health/food-service', 'Georgia food-service rules and current mobile-unit application forms.',
      'Use the current rules and mobile base/unit forms. Menu, facility design and servicing determine the required review; separate county-of-origin approval from authorization to operate in another county.'),
    source('Georgia Department of Public Health', 'https://dph.georgia.gov/document/document/mobile-food-frequency-asked-questions/download', 'Mobile food unit FAQ linked by the current DPH food-service hub; document revised January 2023.',
      'The base/commissary determines the county of origin. Base and unit permits originate there; operating elsewhere requires the additional-county authorization process and good standing. Confirm current daily servicing/base requirements with the county health authority.'),
    source('City of Atlanta', 'https://www.atlantaga.gov/government/departments/city-planning/economic-development/vending-program/street-eats-atlanta-food-truck-program', 'Street Eats designated public vending program only.',
      'Street Eats requires the program application, applicable health approval, business license, sales/use tax documentation, vehicle information and required background steps. Approved vendors reserve designated locations.',
      'This program is not permission to vend on arbitrary streets or private property. Private-property and event vending have different city processes; identify Fulton versus DeKalb health jurisdiction.')],
    gaps: ['Ask public designated space, private property or event, and the base county. Do not invent a single metro-wide permit.'] },
  jacksonville: { state: 'FL', sources: [florida,
    source('City of Jacksonville', 'https://www.jacksonville.gov/departments/neighborhoods/office-of-consumer-affairs/mobile-food-dispensing-vendors-(food-trucks)', 'Jacksonville mobile food dispensing vendors.',
      'The city says a Street Vendor permit is no longer required for these units following state preemption. Required state permits and a local business tax receipt must be displayed; a Jacksonville fire prevention inspection remains required. Other applicable Chapter 250 rules still apply.')], gaps: ['Confirm downtown/location restrictions, property permission and any event conditions for the actual site.'] },
  tallahassee: { state: 'FL', sources: [florida,
    source('City of Tallahassee Growth Management', 'https://citizenportal.talgov.com/growth/gm_faqs/54', 'Traveling versus permanently located food trucks.',
      'Obtain landowner permission and do not operate in the right-of-way. The city distinguishes traveling trucks without utility connections from permanently located operations. Permanent sites must meet zoning/development standards; supporting structures and utilities can require further review.')], gaps: ['Confirm permanent versus traveling setup and the exact parcel with Growth Management.'] },
  pensacola: { state: 'FL', sources: [florida,
    source('City of Pensacola', 'https://www.cityofpensacola.com/658/Business-Tax-Receipts', 'City business-tax and state-regulator starting point, not a complete mobile-vending ordinance.',
      'Check the applicable business-tax receipt and local zoning, fire and health requirements. The city identifies DBPR for food trucks and FDACS for certain prepackaged/nonhazardous-food mobile units; menu determines the regulator.')], gaps: ['Current food-truck site/fire rules require city confirmation. Do not use the old six-month pilot FAQ or proposed ordinance as current law.'] },
  'st augustine': { state: 'FL', sources: [florida,
    source('City of St. Augustine', 'https://www.citystaug.com/1202/Business-Licenses', 'St. Augustine city limits, not St. Augustine Beach or all St. Johns County.',
      'Use city zoning/business-license review and the Public Works food-truck application package for the actual site.'),
    source('St. Augustine Fire Department', 'https://citystaug.com/1340/Food-Truck-Fire-Safety-Inspections', 'City food-truck fire inspections.',
      'Schedule the required fire inspection before operating and correct deficiencies before approval. Keep the required current decal. Extinguisher, suppression, exhaust and fuel requirements depend on the cooking setup. Fire approval does not replace other authorizations.')], gaps: ['Confirm site approval and event scheduling directly; neighboring jurisdictions differ.'] },
  'lake city': { state: 'FL', sources: [florida,
    source('City of Lake City', 'https://www.lcfla.com/sites/default/files/fileattachments/growth_management/page/7092/mobile_food_truck_packet.pdf', 'Lake City mobile food truck site/application packet.',
      'Prepare a separate site plan for each location and confirm setbacks, waste/wastewater handling, seating/restrooms and cooking/fire review with Growth Management. Approval for one site is not permission for every location.')], gaps: ['Confirm the current packet and mobile-unit classification with the city before applying.'] },
  'panama city': { state: 'FL', sources: [florida,
    source('City of Panama City', 'https://www.panamacity.gov/m/FAQ', 'Panama City, not Panama City Beach.',
      'The city distinguishes permanent/stationary trucks requiring a Development Order from mobile/nonstationary trucks. Its FAQ still calls for Public Works and Fire approvals for the mobile pathway. Confirm the exact setup and business-tax process with the city.')], gaps: ['Check site-specific utilities, grease/wastewater and event requirements.'] },
  gainesville: { state: 'FL', sources: [florida,
    source('City of Gainesville', 'https://www.gainesvillefl.gov/Government-Pages/Government/Departments/Parks-Recreation-Cultural-Affairs/Host-An-Event-In-Gainesville', 'Special events affecting city services/public safety, not routine truck licensing.',
      'Special events can require an event permit and food-vendor documentation. Determine whether the planned operation is an event before applying this pathway.')], gaps: ['Current ordinary mobile-vending site/zoning/fire requirements need city confirmation. Do not apply Cornerstone-only program terms or old fee schedules citywide.'] },
  ocala: { state: 'FL', sources: [florida,
    source('City of Ocala', 'https://www.ocalafl.gov/government/city-departments-i-z/recreation-parks/events/staging-an-event-on-city-property', 'City special-event food vending only; source search-indexed, direct page retrieval blocked during review.',
      'City events require applicable state food-vendor approvals and site/event review. This event pathway is not a complete ordinary mobile-vending checklist.')], gaps: ['Confirm ordinary site/zoning/fire requirements directly with Ocala. Do not use an old temporary-event guide as a general truck license.'] },
};

export function getPermitRequirements(input: { city?: unknown; state?: unknown; operation?: unknown; county?: unknown }, now = new Date()) {
  const text = (v: unknown) => typeof v === 'string' ? v.trim().slice(0, 180) : '';
  const city = text(input.city).toLowerCase().replace(/[.]/g, '').replace(/\s+/g, ' ');
  const state = normalizeAtlasState(text(input.state));
  const market = PERMIT_MARKETS[city];
  const region = /^(north|northern) florida$/.test(city);
  const matched = !!market && market.state === state;
  const stale = now.getTime() - new Date(`${PERMIT_REVIEWED_ON}T00:00:00Z`).getTime() > 90 * 86400000;
  return {
    status: matched ? 'curated_guidance' : 'jurisdiction_needed',
    reviewed_on: PERMIT_REVIEWED_ON, refresh_required: stale,
    sources_page: '/atlas#permit-sources',
    requested: { city: text(input.city), state, county: text(input.county), operation: text(input.operation) },
    sources: matched ? market.sources : state === 'FL' ? [florida] : state === 'TX' ? [texas, texasGuide] : [],
    unresolved: matched ? market.gaps : [region ? 'North Florida is a region. Ask for the actual operating city, county and site.' : 'No verified local checklist for this city/state combination. Ask for the exact jurisdiction; do not substitute a nearby city.'],
    next_question: !matched ? 'What city and county will you operate in?' : !text(input.operation) ? 'Will you cook raw food on board, reheat prepared food, or sell only packaged items?' : 'Will this be a recurring private site, public vending space, or a special event?',
    guardrails: [
      'Explain only the returned source scope; identify the authority and review date, and offer the source links. This is curated guidance, not a live permit lookup or legal approval.',
      'Ask about raw cooking, reheating or packaged food, fuel, fryer/grease exhaust, water/wastewater, commissary, enclosed truck versus cart, base county and exact site before tailoring a checklist.',
      'Unknown or unlisted requirements are not exemptions. Never guarantee a listing passes inspection, a permit transfers, approval time, fees, or that this checklist is exhaustive.',
      ...(stale ? ['These notes require a fresh agency check before being described as current requirements.'] : []),
    ],
  };
}
