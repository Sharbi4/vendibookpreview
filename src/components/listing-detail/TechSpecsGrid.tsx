import { Ruler, Scale, Zap, Droplets, PlugZap, Gauge, Fuel, Thermometer } from 'lucide-react';
import type { ListingCategory } from '@/types/listing';

interface TechSpecsGridProps {
  category: ListingCategory;
  lengthInches?: number | null;
  widthInches?: number | null;
  heightInches?: number | null;
  weightLbs?: number | null;
  amenities?: string[] | null;
}

interface SpecItem {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

const formatDimensions = (
  lengthInches?: number | null,
  widthInches?: number | null,
  heightInches?: number | null
): string | null => {
  const parts: string[] = [];
  
  if (lengthInches) {
    const feet = Math.floor(lengthInches / 12);
    const inches = lengthInches % 12;
    parts.push(inches > 0 ? `${feet}'${inches}"L` : `${feet}'L`);
  }
  
  if (widthInches) {
    const feet = Math.floor(widthInches / 12);
    const inches = widthInches % 12;
    parts.push(inches > 0 ? `${feet}'${inches}"W` : `${feet}'W`);
  }
  
  if (heightInches) {
    const feet = Math.floor(heightInches / 12);
    const inches = heightInches % 12;
    parts.push(inches > 0 ? `${feet}'${inches}"H` : `${feet}'H`);
  }
  
  return parts.length > 0 ? parts.join(' × ') : null;
};

const getPowerSpec = (amenities: string[] | null | undefined): string | null => {
  if (!amenities) return null;
  
  const powerFeatures: string[] = [];
  
  if (amenities.includes('generator') || amenities.includes('onboard_generator')) {
    powerFeatures.push('Generator');
  }
  if (amenities.includes('shore_power') || amenities.includes('electrical_hookup')) {
    powerFeatures.push('Shore Power');
  }
  if (amenities.includes('50_amp') || amenities.includes('50a_service')) {
    powerFeatures.push('50A');
  }
  if (amenities.includes('30_amp') || amenities.includes('30a_service')) {
    powerFeatures.push('30A');
  }
  if (amenities.includes('solar_panels')) {
    powerFeatures.push('Solar');
  }
  
  return powerFeatures.length > 0 ? powerFeatures.join(' + ') : null;
};

const getWaterSpec = (amenities: string[] | null | undefined): string | null => {
  if (!amenities) return null;
  
  const hasHotWater = amenities.includes('hot_water_heater') || amenities.includes('hot_water');
  const hasFreshWater = amenities.includes('fresh_water_tank') || amenities.includes('water_tank');
  const hasWasteWater = amenities.includes('waste_water_tank') || amenities.includes('gray_water');
  const hasHandwash = amenities.includes('hand_wash_sink') || amenities.includes('sink');
  
  if (hasHotWater) return 'Hot/Cold Water';
  if (hasFreshWater && hasWasteWater) return 'Fresh + Waste Tanks';
  if (hasFreshWater || hasHandwash) return 'Fresh Water System';
  
  return null;
};

const getFuelSpec = (amenities: string[] | null | undefined): string | null => {
  if (!amenities) return null;
  
  if (amenities.includes('propane') || amenities.includes('propane_tanks')) {
    return 'Propane System';
  }
  if (amenities.includes('natural_gas')) {
    return 'Natural Gas';
  }
  
  return null;
};

const getHVACSpec = (amenities: string[] | null | undefined): string | null => {
  if (!amenities) return null;
  
  const hasAC = amenities.includes('ac') || amenities.includes('air_conditioning');
  const hasHeat = amenities.includes('heating') || amenities.includes('heater');
  
  if (hasAC && hasHeat) return 'A/C + Heat';
  if (hasAC) return 'Air Conditioning';
  if (hasHeat) return 'Heating';
  
  return null;
};

export const TechSpecsGrid = ({ 
  category, 
  lengthInches, 
  widthInches, 
  heightInches, 
  weightLbs, 
  amenities 
}: TechSpecsGridProps) => {
  // Only show for relevant categories
  const relevantCategories: ListingCategory[] = [
    'food_truck',
    'food_trailer',
    'ghost_kitchen',
  ];
  
  if (!relevantCategories.includes(category)) {
    return null;
  }

  const specs: SpecItem[] = [];

  // Dimensions
  const dimensions = formatDimensions(lengthInches, widthInches, heightInches);
  if (dimensions) {
    specs.push({
      label: 'Dimensions',
      value: dimensions,
      icon: Ruler,
    });
  }

  // Weight
  if (weightLbs) {
    specs.push({
      label: 'Weight',
      value: `${weightLbs.toLocaleString()} lbs`,
      icon: Scale,
    });
  }

  // Power
  const power = getPowerSpec(amenities);
  if (power) {
    specs.push({
      label: 'Power',
      value: power,
      icon: Zap,
    });
  }

  // Water
  const water = getWaterSpec(amenities);
  if (water) {
    specs.push({
      label: 'Water',
      value: water,
      icon: Droplets,
    });
  }

  // Fuel
  const fuel = getFuelSpec(amenities);
  if (fuel) {
    specs.push({
      label: 'Fuel',
      value: fuel,
      icon: Fuel,
    });
  }

  // HVAC
  const hvac = getHVACSpec(amenities);
  if (hvac) {
    specs.push({
      label: 'Climate',
      value: hvac,
      icon: Thermometer,
    });
  }

  // Don't render if no specs available
  if (specs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Technical Specifications</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {specs.map((spec) => {
          const Icon = spec.icon;
          return (
            <div 
              key={spec.label}
              className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-border text-center"
            >
              <Icon className="h-5 w-5 text-primary mb-2" />
              <span className="text-sm font-semibold text-foreground">{spec.value}</span>
              <span className="text-xs text-muted-foreground">{spec.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TechSpecsGrid;
