import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Grid, Html, Lightformer, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { TRAILER, specOf, type BuildConfig, type Placement, placementIssues, exteriorHex } from '@/lib/buildStudio/catalog';

export type ViewMode = 'exterior' | 'interior' | 'plan';
interface Props {
  config: BuildConfig;
  view: ViewMode;
  roof: boolean;
  selected: string | null;
  onSelect: (uid: string | null) => void;
  labels?: boolean;
  dims?: boolean;
  grid?: boolean;
  fallback?: ReactNode;
  /** Camera command; `n` increments so repeated clicks re-trigger. */
  cmd?: { kind: 'in' | 'out' | 'reset'; n: number };
}
const tag = 'pointer-events-none whitespace-nowrap rounded-md bg-card/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm';

// Refreshed from the active catalog on every render of TrailerScene.
let L = TRAILER.length, W = TRAILER.width, H = TRAILER.height;
const T = 0.05;
const FLOOR_Y = 0.55; // floor height above ground

function useDiamondPlate() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#8f969c'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#b4bbc1'; g.lineWidth = 4;
    for (const [x, y] of [[16, 16], [48, 48]]) { g.beginPath(); g.moveTo(x - 7, y + 7); g.lineTo(x + 7, y - 7); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 6);
    t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Wall({ size, position, color, opacity = 1 }: { size: [number, number, number]; position: [number, number, number]; color: string; opacity?: number }) {
  return <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} transparent={opacity < 1} opacity={opacity} />
  </mesh>;
}

function Shell({ color, roof, view }: { color: string; roof: boolean; view: ViewMode }) {
  const plate = useDiamondPlate();
  const winW = TRAILER.window.to - TRAILER.window.from, winX = (TRAILER.window.to + TRAILER.window.from) / 2;
  const doorW = TRAILER.door.to - TRAILER.door.from, doorX = (TRAILER.door.to + TRAILER.door.from) / 2;
  const fade = view === 'interior' ? 0.10 : view === 'plan' ? 0.06 : 1;
  const zS = W / 2 + T / 2, zB = -W / 2 - T / 2; // service (+Z) and back (-Z)
  const winBottom = 1.05, winTop = 2.0;
  return <group position={[0, FLOOR_Y, 0]}>
    <mesh position={[0, -0.02, 0]} receiveShadow><boxGeometry args={[L, 0.04, W]} /><meshStandardMaterial map={plate} metalness={0.6} roughness={0.4} /></mesh>
    {/* service wall with window opening */}
    <Wall size={[L, winBottom, T]} position={[0, winBottom / 2, zS]} color={color} opacity={fade} />
    <Wall size={[L, H - winTop, T]} position={[0, (H + winTop) / 2, zS]} color={color} opacity={fade} />
    <Wall size={[winX - winW / 2 + L / 2, winTop - winBottom, T]} position={[(-L / 2 + winX - winW / 2) / 2, (winTop + winBottom) / 2, zS]} color={color} opacity={fade} />
    <Wall size={[L / 2 - winX - winW / 2, winTop - winBottom, T]} position={[(L / 2 + winX + winW / 2) / 2, (winTop + winBottom) / 2, zS]} color={color} opacity={fade} />
    {/* awning */}
    {view === 'exterior' && <mesh position={[winX, winTop + 0.05, zS + 0.35]} rotation={[0.35, 0, 0]} castShadow><boxGeometry args={[winW + 0.3, 0.03, 0.75]} /><meshStandardMaterial color="#e8e6e1" /></mesh>}
    {/* back wall with door */}
    <Wall size={[doorX - doorW / 2 + L / 2, H, T]} position={[(-L / 2 + doorX - doorW / 2) / 2, H / 2, zB]} color={color} opacity={fade} />
    <Wall size={[L / 2 - doorX - doorW / 2, H, T]} position={[(L / 2 + doorX + doorW / 2) / 2, H / 2, zB]} color={color} opacity={fade} />
    <Wall size={[doorW, H - 2.0, T]} position={[doorX, (H + 2.0) / 2, zB]} color={color} opacity={fade} />
    <mesh position={[doorX, 1.0, zB - 0.01]}><boxGeometry args={[doorW - 0.06, 1.96, 0.03]} /><meshStandardMaterial color="#cfd3d6" metalness={0.7} roughness={0.3} transparent opacity={0.85 * fade} /></mesh>
    {/* end walls */}
    <Wall size={[T, H, W + 2 * T]} position={[-L / 2 - T / 2, H / 2, 0]} color={color} opacity={fade} />
    <Wall size={[T, H, W + 2 * T]} position={[L / 2 + T / 2, H / 2, 0]} color={color} opacity={fade} />
    {roof && view === 'exterior' && <Wall size={[L + 2 * T, T, W + 2 * T]} position={[0, H + T / 2, 0]} color="#e9e9e6" />}
    {/* Trim, service counter and running lights are conceptual exterior details. */}
    {view === 'exterior' && <>
      {[-1, 1].map(side => <group key={side}>
        <Wall size={[L + .1, .10, .07]} position={[0, .06, side * (W / 2 + .055)]} color="#adb3b6" />
        <Wall size={[L + .1, .05, .07]} position={[0, H - .04, side * (W / 2 + .055)]} color="#c7cbca" />
        {[-1, 1].map(end => <group key={end}>
          <Wall size={[.06, H, .07]} position={[end * L / 2, H / 2, side * (W / 2 + .055)]} color="#bfc4c4" />
          <mesh position={[end * (L / 2 - .10), H - .18, side * (W / 2 + .10)]}><boxGeometry args={[.10, .04, .02]} /><meshStandardMaterial color={end === 1 ? '#9f3427' : '#d5a151'} /></mesh>
        </group>)}
      </group>)}
      <Wall size={[winW + .10, .045, .42]} position={[winX, winBottom, zS + .18]} color="#bfc5c7" />
    </>}
  </group>;
}

function Chassis() {
  const steel = <meshStandardMaterial color="#2a2c2f" metalness={0.6} roughness={0.5} />;
  return <group>
    <mesh position={[0, FLOOR_Y - 0.1, 0]} castShadow><boxGeometry args={[L, 0.12, W * 0.9]} />{steel}</mesh>
    <mesh position={[-L / 2 - 0.75, FLOOR_Y - 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.05, 0.05, 1.5]} />{steel}</mesh>
    {[-0.35, 0.35].map((x) => [-1, 1].map((s) => <group key={`${x}${s}`} position={[x, 0.33, s * (W / 2 + 0.06)]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.33, 0.33, 0.2, 28]} /><meshStandardMaterial color="#151515" roughness={0.9} /></mesh>
      <mesh><cylinderGeometry args={[0.18, 0.18, 0.21, 20]} /><meshStandardMaterial color="#c9cdd0" metalness={0.8} roughness={0.25} /></mesh>
    </group>))}
    {[-1, 1].map(s => <group key={s}>
      <mesh position={[0, .73, s * (W / 2 + .08)]} castShadow><boxGeometry args={[1.55, .12, .36]} /><meshStandardMaterial color="#a8afb4" metalness={.8} roughness={.25} /></mesh>
      {[-.72, .72].map(x => <mesh key={x} position={[x, .56, s * (W / 2 + .08)]} rotation={[0, 0, x < 0 ? -.3 : .3]}><boxGeometry args={[.12, .35, .36]} /><meshStandardMaterial color="#a8afb4" metalness={.8} roughness={.25} /></mesh>)}
    </group>)}
  </group>;
}

function Equipment({ p, config, selected, onSelect, label }: { p: Placement; config: BuildConfig; selected: boolean; onSelect: (uid: string) => void; label: boolean }) {
  const s = specOf(p.id);
  const bad = placementIssues(config, p.uid).length > 0;
  const z = p.wall === 'service' ? W / 2 - s.d / 2 : -W / 2 + s.d / 2;
  const tone = bad ? '#d9443a' : selected ? '#f26a1b' : s.color;
  return <group position={[p.x, FLOOR_Y, z]} onClick={(e) => { e.stopPropagation(); onSelect(p.uid); }}>
    <mesh position={[0, s.h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[s.w, s.h, s.d]} />
      <meshStandardMaterial color={tone} metalness={0.75} roughness={0.28} emissive={selected || bad ? tone : '#000'} emissiveIntensity={selected || bad ? 0.25 : 0} />
    </mesh>
    {(label || selected) && <Html position={[0, s.h + 0.18, 0]} center zIndexRange={[10, 0]}><span className={tag}>{s.name}</span></Html>}
    {s.category === 'Cooking' && <mesh position={[0, s.h + 0.01, 0]}><boxGeometry args={[s.w * 0.92, 0.02, s.d * 0.85]} /><meshStandardMaterial color="#222" metalness={0.4} roughness={0.6} /></mesh>}
    {s.category === 'Sanitation' && <mesh position={[0, s.h - 0.05, 0]}><boxGeometry args={[s.w * 0.85, 0.1, s.d * 0.7]} /><meshStandardMaterial color="#5d666e" metalness={0.8} roughness={0.2} /></mesh>}
    {s.category === 'Refrigeration' && <mesh position={[0, s.h / 2, p.wall === 'service' ? -s.d / 2 - 0.005 : s.d / 2 + 0.005]}><boxGeometry args={[s.w * 0.85, s.h * 0.85, 0.01]} /><meshStandardMaterial color="#e6eaed" metalness={0.5} roughness={0.2} /></mesh>}
  </group>;
}

function CameraRig({ view, cmd }: { view: ViewMode; cmd?: Props['cmd'] }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera | THREE.OrthographicCamera; controls: { target: THREE.Vector3; update: () => void } | null };
  const home = () => {
    if (view === 'plan') { (camera as THREE.OrthographicCamera).zoom = Math.min(95, window.innerWidth / (L + 2)); camera.updateProjectionMatrix(); return; }
    if (view === 'interior') camera.position.set(0.2, 9, 4.2); else camera.position.set(6.2, 3.4, 7.2);
    controls?.target.set(0, 1.2, 0); controls?.update();
  };
  useEffect(home, [view, camera, controls]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cmd?.n) return;
    if (cmd.kind === 'reset') return home();
    const f = cmd.kind === 'in' ? 0.8 : 1.25;
    if (view === 'plan') { const o = camera as THREE.OrthographicCamera; o.zoom = Math.min(260, Math.max(40, o.zoom / f)); o.updateProjectionMatrix(); return; }
    const t = controls?.target ?? new THREE.Vector3(0, 1.2, 0);
    const d = camera.position.clone().sub(t); const len = Math.min(14, Math.max(3, d.length() * f));
    camera.position.copy(t.clone().add(d.setLength(len))); controls?.update();
  }, [cmd?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Dimensions() {
  const ft = (m: number) => { const i = Math.round(m / 0.0254); return `${Math.floor(i / 12)}′ ${i % 12}″`; };
  return <group position={[0, FLOOR_Y, 0]}>
    <Html position={[0, 0.05, W / 2 + 0.55]} center zIndexRange={[10, 0]}><span className={tag}>Length {ft(L)}</span></Html>
    <Html position={[L / 2 + 0.55, 0.05, 0]} center zIndexRange={[10, 0]}><span className={tag}>Width {ft(W)}</span></Html>
    <Html position={[-L / 2 - 0.2, H / 2, W / 2 + 0.2]} center zIndexRange={[10, 0]}><span className={tag}>Height {ft(H)}</span></Html>
  </group>;
}

export default function TrailerScene({ config, view, roof, selected, onSelect, labels = false, dims = false, grid = false, cmd, fallback }: Props) {
  L = TRAILER.length; W = TRAILER.width; H = TRAILER.height;
  const color = exteriorHex(config);
  return <Canvas shadows frameloop="demand" dpr={[1, 1.5]} fallback={fallback} onPointerMissed={() => onSelect(null)} aria-label="3D trailer preview">
    <color attach="background" args={['#faf9f6']} />
    {view === 'plan'
      ? <OrthographicCamera makeDefault position={[0, 20, 0]} zoom={95} up={[0, 0, -1]} onUpdate={(c) => c.lookAt(0, 0, 0)} />
      : <PerspectiveCamera makeDefault fov={45} position={[6.2, 3.4, 7.2]} />}
    <CameraRig key={view} view={view} cmd={cmd} />
    <ambientLight intensity={0.45} />
    <directionalLight position={[6, 10, 6]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
    <Environment resolution={64}>
      <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
      <Lightformer intensity={1} color="#ffe2cc" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
    </Environment>
    <Chassis />
    <Shell color={color} roof={roof} view={view} />
    {config.items.map((p) => <Equipment key={p.uid} p={p} config={config} selected={selected === p.uid} onSelect={onSelect} label={labels || view === 'plan'} />)}
    {dims && <Dimensions />}
    {grid && <Grid position={[0, FLOOR_Y + 0.005, 0]} args={[L, W]} cellSize={0.3048} sectionSize={1.2192} cellColor="#b9b2a6" sectionColor="#f26a1b" fadeDistance={30} />}
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#faf9f6" roughness={1} /></mesh>
    <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={14} blur={2.2} far={3} />
    <OrbitControls makeDefault enableDamping={!window.matchMedia('(prefers-reduced-motion: reduce)').matches} enabled={view !== 'plan'} target={[0, 1.2, 0]} minDistance={3} maxDistance={14} maxPolarAngle={Math.PI / 2.05} enablePan={false} />
  </Canvas>;
}
