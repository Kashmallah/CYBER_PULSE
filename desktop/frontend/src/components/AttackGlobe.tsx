import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Endpoint, IncidentLog } from '../types';

interface AttackGlobeProps {
  endpoints: Endpoint[];
  incidents: IncidentLog[];
  onSelectEndpoint?: (ep: Endpoint) => void;
}

// Convert Lat/Lng to 3D Cartesian on Sphere of radius R
function latLngToVector3(lat: number, lng: number, radius = 2.0): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// 3D Arc Line between two points using Three.Line primitive
function AttackArc({ start, end, severity = 'Critical' }: { start: THREE.Vector3; end: THREE.Vector3; severity?: string }) {
  const lineObject = useMemo(() => {
    const mid = start.clone().lerp(end, 0.5);
    mid.normalize().multiplyScalar(start.length() * 1.35); // elevate arch
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(30);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const color = severity === 'Critical' ? 0xff0055 : severity === 'High' ? 0xffaa00 : 0x00f0ff;
    const material = new THREE.LineBasicMaterial({ color, linewidth: 2, transparent: true, opacity: 0.8 });
    return new THREE.Line(lineGeometry, material);
  }, [start, end, severity]);

  return <primitive object={lineObject} />;
}

// Node Marker on Globe
function NodeMarker({ endpoint, isAttacked, onClick }: { endpoint: Endpoint; isAttacked: boolean; onClick?: () => void }) {
  const pos = useMemo(() => latLngToVector3(endpoint.geo_lat || 0, endpoint.geo_lng || 0, 2.02), [endpoint]);
  const markerRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (markerRef.current && isAttacked) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 6) * 0.4;
      markerRef.current.scale.set(scale, scale, scale);
    }
  });

  const color = endpoint.status === 'isolated' 
    ? '#ff2244' 
    : isAttacked 
      ? '#ff0055' 
      : '#00f0ff';

  return (
    <group position={pos}>
      <mesh ref={markerRef} onClick={onClick}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html distanceFactor={8} position={[0, 0.15, 0]} center>
        <div 
          onClick={onClick}
          className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer border whitespace-nowrap backdrop-blur-md transition-all ${
            endpoint.status === 'isolated'
              ? 'bg-red-950/80 border-red-500 text-red-300'
              : isAttacked
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse'
                : 'bg-slate-900/80 border-cyan-500/50 text-cyan-300 hover:border-cyan-400'
          }`}
        >
          {endpoint.hostname} ({endpoint.os_type})
        </div>
      </Html>
    </group>
  );
}

// Inner Globe Sphere with wireframe and atmosphere
function GlobeMesh() {
  const globeRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0008;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Dark core */}
      <Sphere args={[2.0, 48, 48]}>
        <meshStandardMaterial color="#0c121e" roughness={0.7} metalness={0.2} />
      </Sphere>
      
      {/* Cyber Grid Wireframe */}
      <Sphere args={[2.005, 24, 24]}>
        <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.12} />
      </Sphere>

      {/* Atmosphere Halo */}
      <Sphere args={[2.15, 32, 32]}>
        <meshBasicMaterial color="#7000ff" transparent opacity={0.04} side={THREE.BackSide} />
      </Sphere>
    </group>
  );
}

export const AttackGlobe: React.FC<AttackGlobeProps> = ({ endpoints, incidents, onSelectEndpoint }) => {
  // Recent unresolved attacks for arcs
  const activeAttacks = useMemo(() => {
    return incidents.filter(i => !i.resolved).slice(0, 4);
  }, [incidents]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden glass-panel border border-slate-800/80">
      {/* Top Overlay Badges */}
      <div className="absolute top-3 left-4 z-10 pointer-events-none flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="text-xs font-mono font-semibold text-cyan-300 uppercase tracking-wider">3D GLOBAL SOC MONITOR</span>
        </div>
        <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-400">
          Active Nodes: <span className="text-white font-bold">{endpoints.length}</span>
        </div>
      </div>

      {/* Canvas */}
      <Canvas camera={{ position: [0, 0, 4.8], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <GlobeMesh />

        {/* Endpoints Markers */}
        {endpoints.map((ep) => {
          const isAttacked = incidents.some(i => i.endpoint_id === ep.id && !i.resolved);
          return (
            <NodeMarker
              key={ep.id}
              endpoint={ep}
              isAttacked={isAttacked}
              onClick={() => onSelectEndpoint && onSelectEndpoint(ep)}
            />
          );
        })}

        {/* Attack Arcs */}
        {activeAttacks.map((inc, idx) => {
          const target = endpoints.find(e => e.id === inc.endpoint_id);
          if (!target) return null;
          const targetVec = latLngToVector3(target.geo_lat || 0, target.geo_lng || 0, 2.02);
          
          // Synthetic Malicious Origin IP on globe
          const originLat = ((idx * 47) % 120) - 60;
          const originLng = ((idx * 83) % 300) - 150;
          const originVec = latLngToVector3(originLat, originLng, 2.02);

          return (
            <AttackArc
              key={inc.id}
              start={originVec}
              end={targetVec}
              severity={inc.severity}
            />
          );
        })}

        <OrbitControls enablePan={false} minDistance={3.0} maxDistance={7.0} autoRotate autoRotateSpeed={0.5} />
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-3 right-4 z-10 flex items-center space-x-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span className="text-slate-300">Secured</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span className="text-slate-300">Under Attack</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600"></span>
          <span className="text-slate-300">Quarantined</span>
        </div>
      </div>
    </div>
  );
};
