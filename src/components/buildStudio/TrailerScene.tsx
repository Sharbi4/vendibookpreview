import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TRAILER, specOf, type BuildConfig, type Placement, placementIssues, EXTERIOR_COLORS } from '@/lib/buildStudio/catalog';

export type ViewMode = 'exterior' | 'interior' | 'plan';
interface Props {
  config: BuildConfig;
  view: ViewMode;
  roof: boolean;
  selected: string | null;
  onSelect: (uid: string | null) => void;
}

const L = TRAILER.length, W = TRAILER.width, H = TRAILER.height, T = 0.05;
const FLOOR_Y = 0.55; // floor height above ground

function useDiamondPlate() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#8f969c'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#b4bbc1'; g.lineWidth = 4;
    for (const [x, y] of [[16, 16], [48, 48]]) { g.beginPath(); g.moveTo(x - 7, y + 7); g.lineTo(x + 7, y - 7); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 6);
    t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
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
  const fade = view === 'interior' ? 0.18 : 1;
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
    <mesh position={[winX, winTop + 0.05, zS + 0.35]} rotation={[0.35, 0, 0]} castShadow><boxGeometry args={[winW + 0.3, 0.03, 0.75]} /><meshStandardMaterial color="#e8e6e1" /></mesh>
    {/* back wall with door */}
    <Wall size={[doorX - doorW / 2 + L / 2, H, T]} position={[(-L / 2 + doorX - doorW / 2) / 2, H / 2, zB]} color={color} opacity={fade} />
    <Wall size={[L / 2 - doorX - doorW / 2, H, T]} position={[(L / 2 + doorX + doorW / 2) / 2, H / 2, zB]} color={color} opacity={fade} />
    <Wall size={[doorW, H - 2.0, T]} position={[doorX, (H + 2.0) / 2, zB]} color={color} opacity={fade} />
    <mesh position={[doorX, 1.0, zB - 0.01]}><boxGeometry args={[doorW - 0.06, 1.96, 0.03]} /><meshStandardMaterial color="#cfd3d6" metalness={0.7} roughness={0.3} transparent opacity={0.85 * fade} /></mesh>
    {/* end walls */}
    <Wall size={[T, H, W + 2 * T]} position={[-L / 2 - T / 2, H / 2, 0]} color={color} opacity={fade} />
    <Wall size={[T, H, W + 2 * T]} position={[L / 2 + T / 2, H / 2, 0]} color={color} opacity={fade} />
    {roof && view !== 'plan' && <Wall size={[L + 2 * T, T, W + 2 * T]} position={[0, H + T / 2, 0]} color="#e9e9e6" opacity={view === 'interior' ? 0.15 : 1} />}
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
  </group>;
}

function Equipment({ p, config, selected, onSelect }: { p: Placement; config: BuildConfig; selected: boolean; onSelect: (uid: string) => void }) {
  const s = specOf(p.id);
  const bad = placementIssues(config, p.uid).length > 0;
  const z = p.wall === 'service' ? W / 2 - s.d / 2 : -W / 2 + s.d / 2;
  const tone = bad ? '#d9443a' : selected ? '#f26a1b' : s.color;
  return <group position={[p.x, FLOOR_Y, z]} onClick={(e) => { e.stopPropagation(); onSelect(p.uid); }}>
    <mesh position={[0, s.h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[s.w, s.h, s.d]} />
      <meshStandardMaterial color={tone} metalness={0.75} roughness={0.28} emissive={selected || bad ? tone : '#000'} emissiveIntensity={selected || bad ? 0.25 : 0} />
    </mesh>
    {s.category === 'Cooking' && <mesh position={[0, s.h + 0.01, 0]}><boxGeometry args={[s.w * 0.92, 0.02, s.d * 0.85]} /><meshStandardMaterial color="#222" metalness={0.4} roughness={0.6} /></mesh>}
    {s.category === 'Sanitation' && <mesh position={[0, s.h - 0.05, 0]}><boxGeometry args={[s.w * 0.85, 0.1, s.d * 0.7]} /><meshStandardMaterial color="#5d666e" metalness={0.8} roughness={0.2} /></mesh>}
    {s.category === 'Refrigeration' && <mesh position={[0, s.h / 2, p.wall === 'service' ? -s.d / 2 - 0.005 : s.d / 2 + 0.005]}><boxGeometry args={[s.w * 0.85, s.h * 0.85, 0.01]} /><meshStandardMaterial color="#e6eaed" metalness={0.5} roughness={0.2} /></mesh>}
  </group>;
}

function CameraRig({ view }: { view: ViewMode }) {
  const { camera } = useThree();
  useEffect(() => {
    if (view === 'exterior') camera.position.set(5.5, 3.2, 6.5);
    if (view === 'interior') camera.position.set(0.6, 4.2, 3.6);
    camera.lookAt(0, 1.2, 0);
  }, [view, camera]);
  return null;
}

export default function TrailerScene({ config, view, roof, selected, onSelect }: Props) {
  const color = (EXTERIOR_COLORS.find((c) => c.id === config.color) ?? EXTERIOR_COLORS[0]).hex;
  return <Canvas shadows dpr={[1, 2]} onPointerMissed={() => onSelect(null)} aria-label="3D trailer preview">
    <color attach="background" args={['#eeebe5']} />
    {view === 'plan'
      ? <OrthographicCamera makeDefault position={[0, 20, 0]} zoom={95} up={[0, 0, -1]} onUpdate={(c) => c.lookAt(0, 0, 0)} />
      : <PerspectiveCamera key={view} makeDefault fov={45} position={view === 'interior' ? [0.4, 6, 3.4] : [6.2, 3.4, 7.2]} />}
    <ambientLight intensity={0.45} />
    <directionalLight position={[6, 10, 6]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
    <Environment resolution={64}>
      <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
      <Lightformer intensity={1} color="#ffe2cc" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
    </Environment>
    <Chassis />
    <Shell color={color} roof={roof} view={view} />
    {config.items.map((p) => <Equipment key={p.uid} p={p} config={config} selected={selected === p.uid} onSelect={onSelect} />)}
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#dcd7ce" roughness={1} /></mesh>
    <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={14} blur={2.2} far={3} />
    <OrbitControls key={view} enabled={view !== 'plan'} target={[0, 1.2, 0]} minDistance={3} maxDistance={14} maxPolarAngle={Math.PI / 2.05} enablePan={false} />
  </Canvas>;
}
