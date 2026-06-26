import {
  Building2, GraduationCap, HeartPulse, ChefHat, Flame,
  Landmark, ShieldCheck, Truck, FileBadge, type LucideIcon,
} from 'lucide-react';
import type { IconAccent } from '@/components/tools/permit-path/PremiumIcon';

export interface CategoryVisual { icon: LucideIcon; accent: IconAccent; }

const MAP: Array<{ test: RegExp; v: CategoryVisual }> = [
  { test: /business registration|registration|tax|entity/i, v: { icon: Landmark,    accent: 'blue' } },
  { test: /food safety|certification|handler/i,             v: { icon: GraduationCap, accent: 'violet' } },
  { test: /health/i,                                        v: { icon: HeartPulse,  accent: 'teal' } },
  { test: /mobile vendor|vendor license|street vendor/i,    v: { icon: FileBadge,   accent: 'orange' } },
  { test: /commissary|kitchen|base of operations/i,         v: { icon: ChefHat,     accent: 'amber' } },
  { test: /fire|equipment|suppression/i,                    v: { icon: Flame,       accent: 'red' } },
  { test: /local|city|county|zoning/i,                      v: { icon: Building2,   accent: 'sky' } },
  { test: /insurance/i,                                     v: { icon: ShieldCheck, accent: 'emerald' } },
  { test: /vehicle|auto|truck/i,                            v: { icon: Truck,       accent: 'orange' } },
];

export function categoryVisual(name: string): CategoryVisual {
  for (const m of MAP) if (m.test.test(name)) return m.v;
  return { icon: FileBadge, accent: 'orange' };
}
