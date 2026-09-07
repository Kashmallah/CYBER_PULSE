import React, { useState } from 'react';
import { Endpoint, IncidentLog } from '../types';
import { AttackGlobe } from './AttackGlobe';
import { Globe, Shield, MapPin, Radio, AlertTriangle, Layers, Crosshair, Server, Activity } from 'lucide-react';

interface AttackMapIntelViewProps {
  endpoints: Endpoint[];
  incidents: IncidentLog[];
  onSelectEndpoint?: (ep: Endpoint) => void;
}

export const AttackMapIntelView: React.FC<AttackMapIntelViewProps> = ({
  endpoints,
  incidents,
  onSelectEndpoint
}) => {
  const [activeVector, setActiveVector] = useState<string>('ALL');

  const topTargetedHosts = endpoints.map(ep => ({
    ...ep,
    incidentCount: incidents.filter(i => i.hostname === ep.hostname).length
  })).sort((a, b) => b.incidentCount - a.incidentCount);

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Global Intelligence Projection Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Global Monitored Nodes</div>
            <div className="text-2xl font-black text-cyan-400 mt-0.5">{endpoints.length} Coordinated</div>
            <div className="text-[10px] text-slate-400">FedProx Geo Cluster</div>
          </div>
          <Globe className="w-7 h-7 text-cyan-400 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Live Attack Vector Arcs</div>
            <div className="text-2xl font-black text-rose-400 mt-0.5">{incidents.length} In-Flight</div>
            <div className="text-[10px] text-rose-400">Multi-Stream Traces</div>
          </div>
          <Crosshair className="w-7 h-7 text-rose-500 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Target Enclave Zones</div>
            <div className="text-2xl font-black text-purple-400 mt-0.5">Enterprise Enclaves</div>
            <div className="text-[10px] text-slate-400">Finance, SecOps, DevOps, R&D</div>
          </div>
          <MapPin className="w-7 h-7 text-purple-400 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Defense Shield Status</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">ARMED</div>
            <div className="text-[10px] text-emerald-400">Late-Fusion Active</div>
          </div>
          <Shield className="w-7 h-7 text-emerald-400 opacity-80" />
        </div>
      </div>

      {/* 2. 3D Attack Globe Canvas with Real-Time Vector Overlays */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main 3D Globe Visualizer (3 Cols) */}
        <div className="lg:col-span-3 glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 z-10">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white uppercase text-xs">REAL-TIME GLOBAL 3D ATTACK PROJECTION</h3>
                <p className="text-[10px] text-slate-400">Interactive rotational telemetry globe with live vector trajectory rays</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1.5 text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>GEO-STREAM ONLINE</span>
              </span>
            </div>
          </div>

          <div className="h-[520px] w-full my-2 relative">
            <AttackGlobe
              endpoints={endpoints}
              incidents={incidents}
              onSelectEndpoint={onSelectEndpoint}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-800 gap-2 z-10">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Enclave Nodes</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Active Attack Vectors</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>FedProx Consensus Arcs</span>
              </span>
            </div>
            <span>Coordinates Mapping: <strong className="text-cyan-400">WGS84 Normalized</strong></span>
          </div>
        </div>

        {/* Right 1 Col: Top Targeted Enclave Hosts & Origin Feeds */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Server className="w-4 h-4 text-rose-400" />
              <div>
                <h3 className="font-bold text-white uppercase text-xs">TOP TARGETED NODES</h3>
                <p className="text-[10px] text-slate-400">Ranked by incoming threat incidents</p>
              </div>
            </div>

            <div className="space-y-2.5 mt-3 overflow-y-auto max-h-[440px] pr-1">
              {topTargetedHosts.map((ep, idx) => (
                <div
                  key={ep.id}
                  onClick={() => onSelectEndpoint && onSelectEndpoint(ep)}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                      <span className="text-[10px] text-slate-500">#{idx + 1}</span>
                      <span>{ep.hostname}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      ep.incidentCount > 0 ? 'bg-rose-950 text-rose-400 border border-rose-500/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                    }`}>
                      {ep.incidentCount} Alerts
                    </span>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>IP: <strong className="text-slate-200">{ep.ip_address}</strong></span>
                    <span>Zone: <strong className="text-cyan-300">{ep.location_name}</strong></span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <div>CPU: <strong className="text-cyan-400">{ep.cpu_usage || 0}%</strong></div>
                    <div>RAM: <strong className="text-purple-400">{ep.memory_usage || 0}%</strong></div>
                    <div>STATUS: <strong className="text-emerald-400">{ep.status}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400 space-y-1">
            <div className="font-bold text-white uppercase flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Attribution Confidence</span>
            </div>
            <div>Multi-Source BGP/ASN Telemetry: <strong className="text-emerald-400">99.4% Verified</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
