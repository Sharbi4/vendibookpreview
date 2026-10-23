import type {LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';
import {BrandIcon} from '@/components/brand/BrandIcon';
export type IconAccent='orange'|'emerald'|'sky'|'amber'|'violet'|'rose'|'teal'|'blue'|'green'|'red'|'silver';
interface Props{icon:LucideIcon;accent?:IconAccent;size?:'sm'|'md'|'lg'|'xl';className?:string;pulse?:boolean;hover?:'spin'|'tick'|'bounce'|'nudge'|'draw'|'pop'|'lift'|'none';delay?:number;filled?:boolean;children?:ReactNode;}
/** PermitPath uses the shared orange enamel and brushed-metal brand system. */
export default function PremiumIcon({icon,size='md',accent='orange',className,children}:Props){return <BrandIcon icon={icon} size={{sm:36,md:48,lg:56,xl:64}[size]} tone={accent==='silver'?'steel':['green','emerald','teal'].includes(accent)?'green':'orange'} className={className}>{children}</BrandIcon>;}
