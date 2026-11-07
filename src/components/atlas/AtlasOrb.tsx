import { cn } from '@/lib/utils';
import './atlas.css';

/** Shared animated Atlas orb for the launcher, call card, and homepage. */
export default function AtlasOrb({ size, active = false }: { size: number; active?: boolean }) {
  return <span className={cn('atlas-orb', active && 'is-active')} style={{ width: size, height: size }} aria-hidden="true" />;
}
