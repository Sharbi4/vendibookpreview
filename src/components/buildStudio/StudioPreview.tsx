import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { TRAILER, specOf, placementIssues, type BuildConfig } from '@/lib/buildStudio/catalog';
import type { ViewMode } from './TrailerScene';

const Scene = lazy(() => import('./TrailerScene'));
type Props = { config: BuildConfig; view: ViewMode; roof: boolean; selected: string | null;
  onSelect: (uid: string | null) => void; labels?: boolean; dims?: boolean; grid?: boolean;
  cmd?: { kind: 'in' | 'out' | 'reset'; n: number } };

export function FloorPlan({ config, selected, onSelect }: Pick<Props, 'config' | 'selected' | 'onSelect'>) {
  return <div className="bs-floorplan">
    <p className="bs-eyebrow">Simplified floor plan</p>
    <p className="bs-floor-dimension">{(TRAILER.length / .3048).toFixed(1)} ft interior length</p>
    <div className="bs-floor-shell" style={{ aspectRatio: `${TRAILER.length} / ${TRAILER.width}` }}>
      <span className="bs-floor-aisle">Working aisle</span>
      {config.items.map(p => { const s = specOf(p.id); return <button key={p.uid} type="button" onClick={() => onSelect(p.uid)}
        aria-label={`Inspect ${s.name}`} aria-pressed={selected === p.uid}
        className={`bs-floor-item ${placementIssues(config, p.uid).length ? 'has-issue' : ''}`}
        style={{ left: `${(p.x - s.w / 2 + TRAILER.length / 2) / TRAILER.length * 100}%`, width: `${s.w / TRAILER.length * 100}%`,
          height: `${s.d / TRAILER.width * 100}%`, top: p.wall === 'back' ? 0 : undefined, bottom: p.wall === 'service' ? 0 : undefined }}>
        {s.name}</button>; })}
    </div>
    <p className="bs-floor-dimension">{(TRAILER.width / .3048).toFixed(1)} ft wide · service window side</p>
    {!config.items.length && <p>Add equipment to see your kitchen take shape.</p>}
  </div>;
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** A graphics failure must never prevent configuring or saving a build. */
export default function StudioPreview(props: Props) {
  const fallback = <div className="bs-fallback"><p role="status">3D preview unavailable. You can keep designing with the floor plan.</p><FloorPlan {...props} /></div>;
  return <SceneBoundary fallback={fallback}><Suspense fallback={<div className="bs-scene-loading"><Loader2 className="h-6 w-6 animate-spin" /><span>Preparing your design studio…</span></div>}>
    <Scene {...props} fallback={fallback} />
  </Suspense></SceneBoundary>;
}
