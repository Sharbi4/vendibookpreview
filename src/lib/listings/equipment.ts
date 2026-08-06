/**
 * Installed-equipment inventory model.
 *
 * Equipment is stored as a confirmed, structured list (not free text) so the
 * public summary and future filters can rely on it. Nothing here is public
 * until the seller saves/confirms the section.
 */

export type EquipmentGroup =
  | 'cooking'
  | 'refrigeration'
  | 'ventilation_safety'
  | 'plumbing'
  | 'power'
  | 'service'
  | 'interior'
  | 'exterior';

export const EQUIPMENT_GROUPS: { key: EquipmentGroup; label: string; presets: string[] }[] = [
  {
    key: 'cooking',
    label: 'Cooking',
    presets: [
      'Flat top griddle', 'Charbroiler', 'Deep fryer', 'Range with burners', 'Convection oven',
      'Pizza oven', 'Steam table', 'Panini press', 'Rice cooker', 'Warming cabinet', 'Other',
    ],
  },
  {
    key: 'refrigeration',
    label: 'Refrigeration',
    presets: [
      'Reach-in cooler', 'Under-counter cooler', 'Refrigerated prep table', 'Chest freezer',
      'Upright freezer', 'Ice machine', 'Cold well', 'Other',
    ],
  },
  {
    key: 'ventilation_safety',
    label: 'Ventilation & Safety',
    presets: [
      'Type I hood', 'Type II hood', 'Exhaust fan', 'Make-up air', 'Fire suppression system',
      'Fire extinguisher', 'First aid kit', 'Other',
    ],
  },
  {
    key: 'plumbing',
    label: 'Plumbing',
    presets: [
      '3-compartment sink', 'Hand sink', 'Mop sink', 'Water pump', 'Water heater',
      'Fresh water tank', 'Grey water tank', 'Grease trap', 'Other',
    ],
  },
  {
    key: 'power',
    label: 'Power',
    presets: [
      'Generator', 'Shore power inlet', 'Breaker panel', 'Inverter', 'Battery bank',
      'Solar panels', 'Transfer switch', 'Other',
    ],
  },
  {
    key: 'service',
    label: 'Service',
    presets: [
      'Serving window', 'POS system', 'Menu boards', 'Cash drawer', 'Card reader',
      'Beverage dispenser', 'Coffee equipment', 'Other',
    ],
  },
  {
    key: 'interior',
    label: 'Interior',
    presets: [
      'Stainless prep tables', 'Shelving', 'Storage cabinets', 'Flooring', 'Interior lighting',
      'Air conditioning', 'Heater', 'Other',
    ],
  },
  {
    key: 'exterior',
    label: 'Exterior',
    presets: [
      'Vehicle wrap', 'Awning', 'Exterior lighting', 'Concession windows', 'Roof hatch',
      'Propane cage', 'Other',
    ],
  },
];

export type EquipmentFuel = 'gas' | 'electric' | 'both' | 'not_sure';
export type EquipmentCondition = 'working' | 'working_with_issues' | 'not_working' | 'not_sure';

export interface EquipmentItem {
  id: string;
  group: EquipmentGroup;
  name: string;
  quantity?: number | null;
  brand?: string | null;
  model?: string | null;
  size?: string | null;
  fuel?: EquipmentFuel | null;
  included?: boolean | null;
  condition?: EquipmentCondition | null;
  known_issue?: string | null;
  year?: string | null;
}

export const EQUIPMENT_FUEL_LABELS: Record<EquipmentFuel, string> = {
  gas: 'Gas',
  electric: 'Electric',
  both: 'Gas and electric',
  not_sure: 'Not sure',
};

export const EQUIPMENT_CONDITION_LABELS: Record<EquipmentCondition, string> = {
  working: 'Working',
  working_with_issues: 'Working with known issues',
  not_working: 'Not working',
  not_sure: 'Not sure',
};

export const groupLabel = (key: string): string =>
  EQUIPMENT_GROUPS.find((g) => g.key === key)?.label ?? key;

/** Reads the stored inventory bucket into a typed, ordered list. */
export const readInventory = (bucket: unknown): EquipmentItem[] => {
  const items = (bucket as { items?: unknown })?.items;
  return Array.isArray(items) ? (items as EquipmentItem[]) : [];
};

export const newEquipmentItem = (group: EquipmentGroup): EquipmentItem => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `eq_${Math.random().toString(36).slice(2)}`,
  group,
  name: '',
  quantity: 1,
  included: true,
  condition: 'working',
  fuel: 'not_sure',
});
