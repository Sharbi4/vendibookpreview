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
  Home,
  Package,
  Archive,
  CircleDot,
  Monitor,
  Truck,
  Building,
  DoorOpen,
  Warehouse,
  Coffee,
  Settings,
  Fan,
  CheckCircle2,
} from 'lucide-react';
import { ListingCategory, AMENITIES_BY_CATEGORY } from '@/types/listing';

interface AmenitiesSectionProps {
  category: ListingCategory;
  amenities: string[];
}

// Icon mapping for amenities
const amenityIcons: Record<string, React.ElementType> = {
  // Food Truck / Trailer - Kitchen Equipment
  three_compartment_sink: Droplet,
  hand_wash_sink: Droplet,
  refrigerator: Refrigerator,
  freezer: Thermometer,
  fryer: Flame,
  flat_top_grill: UtensilsCrossed,
  oven: Flame,
  warmers: Thermometer,
  steam_table: Gauge,
  hood_system: Wind,
  
  // Food Truck / Trailer - Power & Utilities
  generator: Zap,
  propane_tanks: Fuel,
  water_tank: Droplet,
  waste_water_tank: Droplet,
  electrical_hookup: Plug,
  
  // Food Truck / Trailer - Additional Features
  pos_system: Monitor,
  serving_window: DoorOpen,
  awning: Umbrella,
  ac_unit: Fan,
  fire_suppression: ShieldCheck,
  
  // Ghost Kitchen - Kitchen Equipment
  commercial_refrigerator: Refrigerator,
  walk_in_cooler: Thermometer,
  walk_in_freezer: Thermometer,
  range: Flame,
  convection_oven: Flame,
  prep_tables: UtensilsCrossed,
  
  // Ghost Kitchen - Utilities & Infrastructure
  grease_trap: Archive,
  hvac: Wind,
  high_voltage: Zap,
  gas_hookup: Fuel,
  
  // Ghost Kitchen - Additional Features
  storage_area: Warehouse,
  office_space: Building,
  restroom: DoorOpen,
  loading_dock: Truck,
  wifi: Wifi,
  
  // Vendor Lot - Utility Hookups
  electric_hookup: Plug,
  water_hookup: Droplet,
  trash_service: Trash2,
  oil_dumping: Fuel,
  grease_disposal: Archive,
  sewage_hookup: CircleDot,
  
  // Vendor Lot - Location Features
  major_street: MapPin,
  high_traffic: Users,
  corner_lot: MapPin,
  visibility: Lightbulb,
  parking_available: Car,
  
  // Vendor Lot - Amenities
  covered_parking: Umbrella,
  customer_seating: Users,
  restroom_access: DoorOpen,
  security: ShieldCheck,
  lighting: Lightbulb,
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