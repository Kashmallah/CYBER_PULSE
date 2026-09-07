import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface HologramShieldProps {
  status: 'SECURE' | 'THREAT_DETECTED' | 'ISOLATED';
  anomalyScore?: number;
  activeThreat?: string | null;
}

function ShieldMesh({ status }: { status: 'SECURE' | 'THREAT_DETECTED' | 'ISOLATED' }) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const colors = {
    SECURE: { primary: '#00f0ff', secondary: '#00ff88', core: '#0a2540' },
    THREAT_DETECTED: { primary: '#ff0055', secondary: '#ffaa00', core: '#400a18' },
    ISOLATED: { primary: '#ff2244', secondary: '#aa0022', core: '#200508' }
  }[status];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 0.4;
      outerRingRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -t * 0.6;
      innerRingRef.current.rotation.y = Math.cos(t * 0.4) * 0.25;
    }
    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * (status === 'THREAT_DETECTED' ? 8 : 2)) * 0.08;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.6}>
      <group>
        {/* Core Shield Hexagon Prism / Octahedron */}
        <mesh ref={coreRef}>
          <octahedronGeometry args={[1.3, 1]} />
          <meshStandardMaterial
            color={colors.core}
            emissive={colors.primary}
            emissiveIntensity={status === 'THREAT_DETECTED' ? 0.6 : 0.25}
            roughness={0.2}
            metalness={0.8}
            wireframe={false}
          />
        </mesh>

        {/* Wireframe Shield Shell */}
        <mesh>
          <octahedronGeometry args={[1.38, 2]} />
          <meshBasicMaterial color={colors.primary} wireframe transparent opacity={0.6} />
        </mesh>

        {/* Rotating Outer Hexagonal Ring */}
        <mesh ref={outerRingRef}>
          <torusGeometry args={[1.8, 0.03, 16, 6]} />
          <meshBasicMaterial color={colors.secondary} wireframe />
        </mesh>

        {/* Counter-Rotating Inner Ring */}
        <mesh ref={innerRingRef}>
          <torusGeometry args={[1.5, 0.02, 16, 32]} />
          <meshBasicMaterial color={colors.primary} transparent opacity={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

export const HologramShield: React.FC<HologramShieldProps> = ({
  status,
  anomalyScore = 0.0,
  activeThreat = null,
}) => {
  const badgeConfig = {
    SECURE: {
      text: 'SYSTEM ENCLAVE SECURED',
      bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400',
      glow: 'drop-shadow-[0_0_15px_rgba(0,255,136,0.3)]'
    },
    THREAT_DETECTED: {
      text: activeThreat ? `THREAT IDENTIFIED: ${activeThreat.toUpperCase()}` : 'ANOMALY DETECTED',
      bg: 'bg-rose-950/90 border-rose-500 text-rose-300 animate-pulse',
      glow: 'drop-shadow-[0_0_20px_rgba(255,0,85,0.5)]'
    },
    ISOLATED: {
      text: 'NETWORK QUARANTINED (ISOLATED)',
      bg: 'bg-red-950/90 border-red-600 text-red-400',
      glow: 'drop-shadow-[0_0_20px_rgba(255,34,68,0.5)]'
    }
  }[status];

  return (
    <div className={`relative w-full h-[320px] rounded-xl overflow-hidden glass-panel border border-slate-800/80 ${badgeConfig.glow}`}>
      {/* HUD Header Overlay */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">3D HOLOGRAPHIC INTEGRITY HUD</span>
        </div>
        <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider border ${badgeConfig.bg}`}>
          {badgeConfig.text}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 0, 4.2], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[5, 5, 5]} intensity={1.5} />
        <pointLight position={[-5, -5, -5]} color="#00f0ff" intensity={1.0} />
        <ShieldMesh status={status} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.0} />
      </Canvas>

      {/* Real-time Subtext Indicators */}
      <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-xs font-mono bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80">
        <div className="text-slate-400">
          Reconstruction Loss: <span className="text-white font-bold">{anomalyScore.toFixed(6)}</span>
        </div>
        <div className="text-slate-400">
          Defense Layer: <span className="text-cyan-400 font-semibold">PyTorch BiLSTM-Attention</span>
        </div>
      </div>
    </div>
  );
};
