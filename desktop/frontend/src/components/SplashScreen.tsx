import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Float } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { Shield, ArrowRight } from 'lucide-react';
import dragonAsset from '../assets/neon_cyber_dragon.jpg';

interface SplashScreenProps {
  onComplete: () => void;
}

// 3D Procedural Neon Cyber Dragon Entity with Wings, Spine Ribs & Articulated Jaws
function CyberDragonMesh({
  dragonRef,
  jawRef,
  leftWingRef,
  rightWingRef,
  dragonLightRef,
  isDocked
}: {
  dragonRef: React.RefObject<THREE.Group>;
  jawRef: React.RefObject<THREE.Group>;
  leftWingRef: React.RefObject<THREE.Group>;
  rightWingRef: React.RefObject<THREE.Group>;
  dragonLightRef: React.RefObject<THREE.PointLight>;
  isDocked: boolean;
}) {
  // Animated Wing Flapping & Spine Energy Pulse
  useFrame(({ clock }) => {
    if (!isDocked) {
      const t = clock.getElapsedTime();
      if (leftWingRef.current) {
        leftWingRef.current.rotation.z = 0.2 + Math.sin(t * 8) * 0.45;
        leftWingRef.current.rotation.y = 0.3 + Math.cos(t * 8) * 0.2;
      }
      if (rightWingRef.current) {
        rightWingRef.current.rotation.z = -0.2 - Math.sin(t * 8) * 0.45;
        rightWingRef.current.rotation.y = -0.3 - Math.cos(t * 8) * 0.2;
      }
    } else {
      if (leftWingRef.current) {
        leftWingRef.current.rotation.z = 0.05;
        leftWingRef.current.rotation.y = 0.05;
      }
      if (rightWingRef.current) {
        rightWingRef.current.rotation.z = -0.05;
        rightWingRef.current.rotation.y = -0.05;
      }
    }
  });

  // 1. Construct True Dragon "S" Spine Spline Curve
  const { spineGeometry, finMeshes, ribBands, tailBladePos } = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const numPoints = 90;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints; // 0 = head, 1 = tail
      
      let x = 0;
      let y = 0;
      let z = 0;

      if (t < 0.35) {
        // Upper loop (neck and head curve facing right)
        const angle = (t / 0.35) * Math.PI * 1.3 - 0.2;
        x = Math.cos(angle) * 0.95 + 0.15;
        y = Math.sin(angle) * 0.95 + 0.55;
        z = Math.sin(t * Math.PI * 2) * 0.08;
      } else {
        // Lower loop (sweeping body and tail coiling in reverse S)
        const lowerT = (t - 0.35) / 0.65;
        const angle = Math.PI * 1.1 - lowerT * Math.PI * 1.55;
        x = Math.cos(angle) * 1.15;
        y = Math.sin(angle) * 1.15 - 0.55;
        z = -Math.sin(lowerT * Math.PI * 2) * 0.08;
      }

      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geom = new THREE.TubeGeometry(curve, 120, 0.085, 14, false);

    // 2. Procedural Spiky Dorsal Fins along outer curve
    const fins: { pos: THREE.Vector3; rot: THREE.Euler; scale: number }[] = [];
    const ribs: { pos: THREE.Vector3; rot: THREE.Euler; scale: number }[] = [];

    for (let i = 4; i < numPoints - 4; i += 2) {
      const u = i / numPoints;
      const point = curve.getPoint(u);
      const tangent = curve.getTangent(u);
      
      const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
      const finPos = point.clone().add(normal.clone().multiplyScalar(0.095));
      
      const angle = Math.atan2(normal.y, normal.x) - Math.PI / 2;
      const rot = new THREE.Euler(0, 0, angle);
      const finScale = (1 - u * 0.65) * (0.85 + Math.sin(i * 0.8) * 0.3);
      
      fins.push({ pos: finPos, rot, scale: finScale });

      // Vertebrae Rib Rings
      if (i % 4 === 0) {
        ribs.push({ pos: point, rot, scale: (1 - u * 0.5) * 0.11 });
      }
    }

    const tailBladePos = points[points.length - 1];

    return { spineGeometry: geom, finMeshes: fins, ribBands: ribs, tailBladePos };
  }, []);

  return (
    <group ref={dragonRef} position={[22, 12, -8]}>
      {/* Volumetric Point Light Source on Dragon Chest */}
      <pointLight
        ref={dragonLightRef}
        position={[0.3, 0.8, 0.6]}
        color="#00f0ff"
        intensity={5.5}
        distance={16}
      />

      {/* Main Glowing Serpent Body Tube */}
      <mesh geometry={spineGeometry}>
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#00f0ff"
          emissiveIntensity={3.4}
          roughness={0.15}
          metalness={0.88}
        />
      </mesh>

      {/* Holographic Wireframe Core Sheath */}
      <mesh geometry={spineGeometry}>
        <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.6} />
      </mesh>

      {/* Vertebrae Rib Bands */}
      {ribBands.map((rib, idx) => (
        <mesh key={`rib-${idx}`} position={rib.pos} rotation={rib.rot}>
          <torusGeometry args={[rib.scale, 0.015, 8, 20]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#00f0ff"
            emissiveIntensity={4.0}
            roughness={0.1}
          />
        </mesh>
      ))}

      {/* Spiky Dorsal Spine Fins */}
      {finMeshes.map((fin, idx) => (
        <mesh
          key={`fin-${idx}`}
          position={fin.pos}
          rotation={fin.rot}
          scale={[fin.scale * 0.12, fin.scale * 0.32, fin.scale * 0.08]}
        >
          <coneGeometry args={[1, 1, 4]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#00f0ff"
            emissiveIntensity={4.2}
            roughness={0.1}
          />
        </mesh>
      ))}

      {/* 3D Cyber Wings Attached to Torso */}
      <group position={[0.4, 0.7, 0]}>
        {/* Left Cyber Wing */}
        <group ref={leftWingRef} position={[0, 0, 0.15]}>
          {/* Main Wing Strut 1 */}
          <mesh position={[0.4, 0.45, 0.2]} rotation={[0.4, -0.3, 0.8]}>
            <cylinderGeometry args={[0.02, 0.035, 1.1, 6]} />
            <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={3.5} />
          </mesh>
          {/* Main Wing Strut 2 */}
          <mesh position={[0.7, 0.2, 0.25]} rotation={[0.2, -0.4, 0.3]}>
            <cylinderGeometry args={[0.015, 0.025, 0.9, 6]} />
            <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={3.5} />
          </mesh>
          {/* Wing Membrane Polygon */}
          <mesh position={[0.45, 0.3, 0.2]} rotation={[0.3, -0.3, 0.6]}>
            <coneGeometry args={[0.45, 0.9, 3]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#00f0ff"
              emissiveIntensity={2.5}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* Right Cyber Wing */}
        <group ref={rightWingRef} position={[0, 0, -0.15]}>
          {/* Main Wing Strut 1 */}
          <mesh position={[0.4, 0.45, -0.2]} rotation={[-0.4, 0.3, 0.8]}>
            <cylinderGeometry args={[0.02, 0.035, 1.1, 6]} />
            <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={3.5} />
          </mesh>
          {/* Main Wing Strut 2 */}
          <mesh position={[0.7, 0.2, -0.25]} rotation={[-0.2, 0.4, 0.3]}>
            <cylinderGeometry args={[0.015, 0.025, 0.9, 6]} />
            <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={3.5} />
          </mesh>
          {/* Wing Membrane Polygon */}
          <mesh position={[0.45, 0.3, -0.2]} rotation={[-0.3, 0.3, 0.6]}>
            <coneGeometry args={[0.45, 0.9, 3]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#00f0ff"
              emissiveIntensity={2.5}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>

      {/* Tail Blade Spear at the End of Spine */}
      <mesh position={[tailBladePos.x - 0.05, tailBladePos.y - 0.05, tailBladePos.z]} rotation={[0, 0, -1.2]}>
        <coneGeometry args={[0.16, 0.65, 4]} />
        <meshStandardMaterial color="#22d3ee" emissive="#00f0ff" emissiveIntensity={4.5} />
      </mesh>

      {/* Sculpted 3D Dragon Head Cluster */}
      <group position={[1.08, 1.28, 0.1]} rotation={[0, 0, -0.2]}>
        {/* Upper Snout, Mandible & Brow */}
        <mesh position={[0.22, 0.12, 0]} rotation={[0, 0, -0.4]}>
          <coneGeometry args={[0.26, 0.75, 6]} />
          <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={3.8} roughness={0.1} />
        </mesh>

        {/* Nostril Hornlets */}
        <mesh position={[0.48, 0.02, 0.07]} rotation={[0, 0, -0.2]}>
          <coneGeometry args={[0.03, 0.15, 4]} />
          <meshStandardMaterial color="#38bdf8" emissive="#00f0ff" emissiveIntensity={4.0} />
        </mesh>
        <mesh position={[0.48, 0.02, -0.07]} rotation={[0, 0, -0.2]}>
          <coneGeometry args={[0.03, 0.15, 4]} />
          <meshStandardMaterial color="#38bdf8" emissive="#00f0ff" emissiveIntensity={4.0} />
        </mesh>

        {/* Primary Dragon Horns (Majestic Swept Back) */}
        <mesh position={[-0.12, 0.38, 0.14]} rotation={[0.1, -0.1, 0.65]}>
          <coneGeometry args={[0.09, 0.85, 5]} />
          <meshStandardMaterial color="#06b6d4" emissive="#00f0ff" emissiveIntensity={4.8} />
        </mesh>
        <mesh position={[-0.12, 0.38, -0.14]} rotation={[-0.1, 0.1, 0.65]}>
          <coneGeometry args={[0.09, 0.85, 5]} />
          <meshStandardMaterial color="#06b6d4" emissive="#00f0ff" emissiveIntensity={4.8} />
        </mesh>

        {/* Secondary Lateral Horns */}
        <mesh position={[-0.22, 0.22, 0.18]} rotation={[0.25, -0.2, 0.85]}>
          <coneGeometry args={[0.06, 0.55, 4]} />
          <meshStandardMaterial color="#38bdf8" emissive="#00f0ff" emissiveIntensity={3.8} />
        </mesh>
        <mesh position={[-0.22, 0.22, -0.18]} rotation={[-0.25, 0.2, 0.85]}>
          <coneGeometry args={[0.06, 0.55, 4]} />
          <meshStandardMaterial color="#38bdf8" emissive="#00f0ff" emissiveIntensity={3.8} />
        </mesh>

        {/* Glowing Dragon Eyes with White Pupil Cores */}
        <mesh position={[0.12, 0.2, 0.16]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.12, 0.2, -0.16]}>
          <sphereGeometry args={[0.065, 14, 14]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Eye Glow Halos */}
        <mesh position={[0.12, 0.2, 0.16]}>
          <sphereGeometry args={[0.085, 12, 12]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0.12, 0.2, -0.16]}>
          <sphereGeometry args={[0.085, 12, 12]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.6} />
        </mesh>

        {/* Upper Fangs */}
        <mesh position={[0.32, -0.02, 0.08]} rotation={[0, 0, 2.8]}>
          <coneGeometry args={[0.025, 0.14, 4]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.0} />
        </mesh>
        <mesh position={[0.32, -0.02, -0.08]} rotation={[0, 0, 2.8]}>
          <coneGeometry args={[0.025, 0.14, 4]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.0} />
        </mesh>

        {/* Articulated Lower Jaw (Opens Dynamically for Roar) */}
        <group ref={jawRef} position={[0.05, -0.06, 0]}>
          <mesh position={[0.16, -0.09, 0]} rotation={[0, 0, 0.25]}>
            <coneGeometry args={[0.19, 0.55, 5]} />
            <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={3.6} />
          </mesh>
          {/* Lower Fangs */}
          <mesh position={[0.26, 0.02, 0.06]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.025, 0.14, 4]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.0} />
          </mesh>
          <mesh position={[0.26, 0.02, -0.06]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.025, 0.14, 4]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.0} />
          </mesh>
        </group>
      </group>

      {/* Trailing Volumetric Energy Sparks */}
      <Sparkles count={80} scale={4.0} size={3.5} speed={1.8} color="#00f0ff" />
    </group>
  );
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragon3DRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);
  const dragonLightRef = useRef<THREE.PointLight>(null);
  const textLaserRef = useRef<HTMLDivElement>(null);

  const [isDocked, setIsDocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('AERIAL ENTRY SEQUENCE...');

  useEffect(() => {
    const tl = gsap.timeline();

    // ─────────────────────────────────────────────────────────────────
    // Phase 1: Aerial Entry (0s to 2.0s)
    // Swoops from extreme off-screen right in a wide sweeping 3D arc
    // ─────────────────────────────────────────────────────────────────
    tl.to(
      dragon3DRef.current?.position || {},
      {
        x: 0,
        y: 0.15,
        z: 0.2,
        duration: 2.0,
        ease: 'power2.inOut',
        onUpdate: () => setStatusMessage('AERIAL SWEEP CONVERGENCE...')
      },
      0
    );

    tl.to(
      dragon3DRef.current?.rotation || {},
      {
        x: 0.15,
        y: 0.2,
        z: -0.1,
        duration: 2.0,
        ease: 'power2.inOut'
      },
      0
    );

    // ─────────────────────────────────────────────────────────────────
    // Phase 2: The Roar Climax (2.0s to 3.0s)
    // Mouth opens, emissive intensity flashes while camera stays rock-solid
    // ─────────────────────────────────────────────────────────────────
    tl.to(
      jawRef.current?.rotation || {},
      {
        z: -0.55,
        duration: 0.35,
        ease: 'back.out(2.5)',
        onStart: () => setStatusMessage('ENERGY ROAR CLIMAX...')
      },
      2.0
    );

    tl.to(
      dragonLightRef.current || {},
      {
        intensity: 14.0,
        duration: 0.25,
        yoyo: true,
        repeat: 3,
        ease: 'sine.inOut'
      },
      2.0
    );

    tl.to(
      jawRef.current?.rotation || {},
      {
        z: 0,
        duration: 0.4,
        ease: 'power2.inOut'
      },
      2.7
    );

    // ─────────────────────────────────────────────────────────────────
    // Phase 3: Corkscrew Swirl & Docking into Stylized "S" (3.0s to 4.5s)
    // 720-degree full-body corkscrew spin slowing down to flat 2D plane
    // ─────────────────────────────────────────────────────────────────
    tl.to(
      dragon3DRef.current?.rotation || {},
      {
        x: 0,
        y: 0,
        z: Math.PI * 4,
        duration: 1.5,
        ease: 'power3.out',
        onStart: () => setStatusMessage('CORKSCREW ROTATION ENGAGED...')
      },
      3.0
    );

    tl.to(
      dragon3DRef.current?.position || {},
      {
        x: 0,
        y: 0.1,
        z: 0,
        duration: 1.5,
        ease: 'power3.out',
        onComplete: () => {
          setIsDocked(true);
          setStatusMessage('ZERO-TRUST MATRIX ARMED');
        }
      },
      3.0
    );

    // ─────────────────────────────────────────────────────────────────
    // Phase 4: Cybernetic Laser Wipe Reveal for "CYBER PULSE" (4.5s to 5.4s)
    // Razor-sharp CSS clip-path mask expands from left to right
    // ─────────────────────────────────────────────────────────────────
    if (textLaserRef.current) {
      tl.fromTo(
        textLaserRef.current,
        { clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)', opacity: 0 },
        {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          opacity: 1,
          duration: 0.9,
          ease: 'power2.inOut'
        },
        4.4
      );
    }

    // 30s overall progress timer
    const totalMs = 30000;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(onComplete, 300);
      }
    }, 40);

    return () => {
      tl.kill();
      clearInterval(timer);
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#020408] flex flex-col items-center justify-between font-sans select-none overflow-hidden p-6 text-slate-100"
    >
      {/* Background Volumetric Cyan Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,240,255,0.18),rgba(2,4,8,0.95)_70%)] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 font-mono">
        <div className="flex items-center space-x-2 text-xs text-cyan-400 font-bold tracking-widest uppercase">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 shadow-lg shadow-cyan-500/30">
            <Shield className="w-4 h-4 text-cyan-300" />
          </div>
          <span>CYBER PULSE DEFENSE ENCLAVE</span>
        </div>
      </header>

      {/* Central 3D Canvas & Snapped Emblem Stage */}
      <div className="relative z-10 w-full max-w-xl h-[360px] sm:h-[400px] flex items-center justify-center my-auto">
        {/* Real-time 3D WebGL Canvas for 3D Dragon Flight & Corkscrew */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Canvas camera={{ position: [0, 0, 5.0], fov: 45 }}>
            <ambientLight intensity={1.4} />
            <pointLight position={[6, 6, 6]} color="#00f0ff" intensity={4.5} />
            <pointLight position={[-6, -6, -4]} color="#06b6d4" intensity={3.5} />
            <CyberDragonMesh
              dragonRef={dragon3DRef}
              jawRef={jawRef}
              leftWingRef={leftWingRef}
              rightWingRef={rightWingRef}
              dragonLightRef={dragonLightRef}
              isDocked={isDocked}
            />
          </Canvas>
        </div>

        {/* When docked, reveal exact high-def neon glowing dragon texture layer */}
        {isDocked && (
          <div className="relative z-20 flex items-center justify-center pointer-events-none animate-[zoomIn_0.5s_ease-out]">
            <div className="absolute inset-0 bg-cyan-500/25 blur-3xl rounded-full scale-125 animate-pulse" />
            <img
              src={dragonAsset}
              alt="Cyber Pulse Neon Dragon"
              className="w-56 h-auto sm:w-64 object-contain filter drop-shadow-[0_0_30px_rgba(0,240,255,0.95)]"
            />
          </div>
        )}
      </div>

      {/* Bottom Laser Wipe "CYBER PULSE", Loading Bar & Skip Button */}
      <footer className="relative z-10 w-full max-w-lg flex flex-col items-center space-y-4 pb-2">
        {/* GSAP Laser Wipe Revealed Brand Typography */}
        <div ref={textLaserRef} className="relative py-1 px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-[0.25em] text-white uppercase drop-shadow-[0_0_30px_rgba(0,240,255,0.85)] font-sans">
            CYBER<span className="text-cyan-400">PULSE</span>{' '}
            <span className="text-xs font-normal text-slate-400 tracking-normal font-mono">v2.0</span>
          </h1>
        </div>

        {/* Minimalist Glowing Loading Bar */}
        <div className="w-full max-w-md space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="tracking-widest uppercase text-cyan-400 font-semibold flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{statusMessage}</span>
            </span>
            <span className="text-cyan-300 font-bold text-sm tracking-wider">{Math.min(100, Math.round(progress))}%</span>
          </div>

          <div className="w-full h-2 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800 shadow-inner relative p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 transition-all duration-100 shadow-[0_0_15px_rgba(0,240,255,0.8)]"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        {/* Direct Console Entry Action */}
        <button
          onClick={onComplete}
          className="flex items-center space-x-2 text-xs font-bold text-slate-200 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-800/90 px-6 py-2.5 rounded-xl border border-slate-700/80 hover:border-cyan-500/50 shadow-xl transition-all duration-200 tracking-wider font-mono"
        >
          <span>ENTER CONSOLE DIRECTLY</span>
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      </footer>
    </div>
  );
};
