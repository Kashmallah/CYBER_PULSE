import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import dragonAsset from '../assets/neon_cyber_dragon.jpg';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    // Snappy 1.5 second loading initialization
    const totalMs = 1500;
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
      clearInterval(timer);
    };
  }, [onComplete]);

  // Stage-based telemetry status indicators across 15 seconds
  const getStatusMessage = (pct: number) => {
    if (pct < 20) return 'INITIALIZING DEFENSE MATRIX...';
    if (pct < 40) return 'CALIBRATING ZERO-TRUST PROTOCOLS...';
    if (pct < 60) return 'SYNCHRONIZING FEDERATED CLIENT NODES...';
    if (pct < 80) return 'LOADING NEURAL INFERENCE ENGINES...';
    if (pct < 98) return 'ENGAGING REAL-TIME THREAT MONITORS...';
    return 'ZERO-TRUST MATRIX ARMED & READY';
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#020408] flex flex-col items-center justify-between font-sans select-none overflow-hidden p-6 text-slate-100"
    >
      {/* Background Volumetric Cyan Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,240,255,0.18),rgba(2,4,8,0.95)_70%)] pointer-events-none" />

      {/* Top Header with Logo instead of Shield */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between pt-1 font-mono">
        <div className="flex items-center space-x-2.5 text-xs text-cyan-400 font-bold tracking-widest uppercase">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur-[2px] opacity-75"></div>
            <img
              src={dragonAsset}
              alt="Cyber Pulse Logo"
              className="relative w-6 h-6 rounded-md object-contain bg-black border border-cyan-500/50 p-0.5 shadow-md shadow-cyan-500/30"
            />
          </div>
          <span>CYBER PULSE DEFENSE ENCLAVE</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono hidden sm:block tracking-widest">
          ENCLAVE CORE v2.0 // READY
        </div>
      </header>

      {/* Main Logo Display - Appears Immediately Without Animations */}
      <div className="relative z-10 w-full max-w-xl flex flex-col items-center justify-center my-auto">
        <div className="relative flex items-center justify-center">
          {/* Ambient Cyber Glow Aura */}
          <div className="absolute inset-0 bg-cyan-500/25 blur-3xl rounded-full scale-125 pointer-events-none" />
          <img
            src={dragonAsset}
            alt="Cyber Pulse Main Logo"
            className="relative w-56 h-auto sm:w-64 object-contain filter drop-shadow-[0_0_35px_rgba(0,240,255,0.9)] rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/20"
          />
        </div>
      </div>

      {/* Bottom Brand Typography, Loading Bar & Enter Console Button */}
      <footer className="relative z-10 w-full max-w-lg flex flex-col items-center space-y-4 pb-2">
        {/* Brand Typography */}
        <div className="relative py-1 px-4 text-center">
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
              <span>{getStatusMessage(progress)}</span>
            </span>
            <span className="text-cyan-300 font-bold text-sm tracking-wider">
              {Math.min(100, Math.round(progress))}%
            </span>
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
          className="flex items-center space-x-2 text-xs font-bold text-slate-200 hover:text-cyan-300 bg-slate-900/80 hover:bg-slate-800/90 px-6 py-2.5 rounded-xl border border-slate-700/80 hover:border-cyan-500/50 shadow-xl transition-all duration-200 tracking-wider font-mono cursor-pointer"
        >
          <span>ENTER CONSOLE DIRECTLY</span>
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      </footer>
    </div>
  );
};
