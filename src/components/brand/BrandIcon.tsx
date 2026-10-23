import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import './brand-icon.css';

/** Decorative product icon. Accessible meaning stays in the adjacent label. */
export function BrandIcon({icon:Icon,size=44,tone='orange',className='',children}:{icon?:LucideIcon;size?:number;tone?:'orange'|'steel'|'green';className?:string;children?:ReactNode}){
 return <span aria-hidden="true" className={`vb-brand-icon vb-brand-icon--${tone} ${className}`} style={{'--brand-icon-size':`${size}px`} as CSSProperties}><span className="vb-brand-icon-core">{children|| (Icon&&<Icon strokeWidth={2.1}/>)}</span></span>;
}
