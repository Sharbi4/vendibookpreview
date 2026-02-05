import React from 'react';
import {
  Plug,
  Droplet,
  Trash2,
  Fuel,
  MapPin,
  Car,
  Umbrella,
  Users,
  ShieldCheck,
  Lightbulb,
  Wifi,
  Wind,
  Flame,
  Refrigerator,
  Thermometer,
  UtensilsCrossed,
  Gauge,
  Zap,
  Package,
  Archive,
  Monitor,
  Truck,
  Building,
  DoorOpen,
  Warehouse,
  Fan,
  CheckCircle2,
  Sun,
  Heater,
  Snowflake,
  PanelTop,
  CookingPot,
  Microwave,
  Lamp,
  Bath,
  BriefcaseMedical,
  FireExtinguisher,
  AirVent,
  Armchair,
  SquareStack,
  Camera,
  Lock,
  Clock,
  UserCheck,
  Star,
  Rotate3D,
  Beer,
  Heart,
} from 'lucide-react';
import { ListingCategory, AMENITIES_BY_CATEGORY } from '@/types/listing';

interface AmenitiesSectionProps {
  category: ListingCategory;
  amenities: string[];
}

// Icon mapping for amenities
const amenityIcons: Record<string, React.ElementType> = {
  // Food Truck - Core Utilities
  generator: Zap,
  shore_power: Plug,
  propane_system: Fuel,
  solar_battery: Sun,
  fresh_water_tank: Droplet,
  grey_water_tank: Droplet,
  hot_water_heater: Heater,
  
  // Food Truck - Kitchen & Cooking
  hood_system: Wind,
  fire_suppression: ShieldCheck,
  flat_top_grill: UtensilsCrossed,
  fryer: Flame,
  range_burners: Flame,
  oven: CookingPot,
  microwave: Microwave,
  steam_table: Gauge,
  prep_tables: UtensilsCrossed,
  food_warmer: Lamp,
  
  // Food Truck - Cold Storage
  refrigerator: Refrigerator,
  freezer: Snowflake,
  reach_in_fridge: Refrigerator,
  undercounter_fridge: Refrigerator,
  
  // Food Truck - Service & Build
  serving_window: DoorOpen,
  dual_windows: DoorOpen,
  pos_shelf: Monitor,
  menu_board_mount: PanelTop,
  exterior_lighting: Lightbulb,
  awning: Umbrella,
  pass_through: DoorOpen,
  
  // Food Truck - Cleaning & Safety
  three_compartment_sink: Bath,
  handwashing_sink: Droplet,
  nsf_surfaces: CheckCircle2,
  first_aid_kit: BriefcaseMedical,
  fire_extinguisher: FireExtinguisher,
  
  // Food Truck - Comfort & Ops
  ac: AirVent,
  heat: Heater,
  storage_cabinets: SquareStack,
  staff_seating: Armchair,
  
  // Ghost Kitchen - Infrastructure
  type_i_hood: Wind,
  type_ii_hood: Wind,
  grease_trap: Archive,
  floor_drains: Droplet,
  sprinkler_system: Droplet,
  
  // Ghost Kitchen - Prep & Storage
  shelving_storage: SquareStack,
  walk_in_cooler: Thermometer,
  walk_in_freezer: Snowflake,
  
  // Ghost Kitchen - Warewashing
  dish_pit: Bath,
  commercial_dishwasher: Bath,
  
  // Ghost Kitchen - Equipment Access
  shared_equipment: Package,
  dedicated_equipment: Package,
  cold_storage_included: Snowflake,
  
  // Ghost Kitchen - Operations
  dedicated_station: Building,
  private_suite: Building,
  packaging_station: Package,
  loading_dock: Truck,
  onsite_parking: Car,
  security_cameras: Camera,
  
  // Ghost Kitchen - Compliance
  health_inspected: CheckCircle2,
  commissary_rules: CheckCircle2,
  permit_guidance: CheckCircle2,
  
  // Vendor Space - Hookups
  power_110v: Plug,
  power_220v: Zap,
  water_hookup: Droplet,
  sewer_hookup: Archive,
  dump_station: Trash2,
  
  // Vendor Space - Site Features
  high_foot_traffic: Users,
  near_nightlife: Star,
  near_office: Building,
  event_space: Star,
  covered_shade: Umbrella,
  seating_area: Armchair,
  stage_entertainment: Star,
  lighting: Lightbulb,
  
  // Vendor Space - Guest Amenities
  restrooms_onsite: DoorOpen,
  handwash_stations: Droplet,
  trash_service: Trash2,
  wifi: Wifi,
  
  // Vendor Space - Safety & Access
  security_onsite: ShieldCheck,
  gated_lot: Lock,
  cameras: Camera,
  overnight_parking: Car,
  access_24_7: Clock,
  staff_onsite: UserCheck,
  
  // Vendor Space - Rules & Positioning
  exclusive_spot: Star,
  rotating_spots: Rotate3D,
  alcohol_allowed: Beer,
  family_friendly: Heart,
};

// Get the label for an amenity ID
const getAmenityLabel = (category: ListingCategory, amenityId: string): string | null => {
  const groups = AMENITIES_BY_CATEGORY[category];
  for (const group of groups) {
    const item = group.items.find(i => i.id === amenityId);
    if (item) return item.label;
  }
  return null;
};

export const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({
  category,
  amenities,
}) => {
  if (!amenities || amenities.length === 0) return null;

  // Group amenities by their category groups
  const categoryGroups = AMENITIES_BY_CATEGORY[category];
  
  const groupedAmenities: { label: string; items: { id: string; label: string }[] }[] = [];
  
  categoryGroups.forEach(group => {
    const matchingItems = group.items.filter(item => amenities.includes(item.id));
    if (matchingItems.length > 0) {
      groupedAmenities.push({
        label: group.label,
        items: matchingItems,
      });
    }
  });

  if (groupedAmenities.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        What's Included
      </h2>
      
      <div className="space-y-6">
        {groupedAmenities.map((group) => (
          <div key={group.label}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {group.label}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {group.items.map((item) => {
                const IconComponent = amenityIcons[item.id] || CheckCircle2;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <IconComponent className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};