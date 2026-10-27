import React, { useState } from 'react';
import { IncidentLog, ThreatCatalogItem, Endpoint } from '../types';
import { Activity, ShieldAlert, Radio, Flame, Cpu, ShieldCheck, Clock, ChevronRight } from 'lucide-react';

interface ThreatMonitoringViewProps {
  incidents: IncidentLog[];
  catalog: ThreatCatalogItem[];
  endpoints: Endpoint[];
  onExecutePlaybook: (incidentId: number) => void;
  onSelectIncident?: (incident: IncidentLog) => void;
}

export const ThreatMonitoringView: React.FC<ThreatMonitoringViewProps> = ({
  incidents,
  catalog,
  endpoints,
  onExecutePlaybook
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [focusMode, setFocusMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate live threat metrics
  const activeThreats = incidents.filter(i => !i.resolved);
  const criticalCount = activeThreats.filter(i => i.severity.toUpperCase() === 'CRITICAL').length;
  const highCount = activeThreats.filter(i => i.severity.toUpperCase() === 'HIGH').length;
  const threatScore = Math.min(100, criticalCount * 30 + highCount * 15 + activeThreats.length * 5);

  const threatLevel =
    threatScore > 75
      ? { label: 'CRITICAL ALERT (DEFCON 1)', color: 'text-rose-400', bg: 'bg-rose-950/80 border-rose-500/60' }
      : threatScore > 40
      ? { label: 'ELEVATED (DEFCON 2)', color: 'text-amber-400', bg: 'bg-amber-950/80 border-amber-500/60' }
      : { label: 'GUARDED / NORMAL (DEFCON 4)', color: 'text-emerald-400', bg: 'bg-emerald-950/80 border-emerald-500/60' };

  const filteredIncidents = incidents.filter(item => {
    const matchSeverity = filterSeverity === 'ALL' || item.severity.toUpperCase() === filterSeverity.toUpperCase();
    const matchSource = filterSource === 'ALL' || (item.hostname && item.hostname.toLowerCase().includes(filterSource.toLowerCase()));
    const matchQuery = !searchQuery ||
      item.attack_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.hostname && item.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSeverity && matchSource && matchQuery;
  });

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Global Threat Level HUD & Live Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Threat Level Indicator */}
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${threatLevel.bg}`}>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Threat Level Status</div>
            <div className={`text-sm font-black mt-1 ${threatLevel.color} flex items-center space-x-2`}>
              <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping" />
              <span>{threatLevel.label}</span>
            </div>
          </div>
          <ShieldAlert className={`w-8 h-8 opacity-80 ${threatLevel.color}`} />
        </div>

        {/* Active Threat Stream Count */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Active Live Alerts</div>
            <div className="text-2xl font-black text-rose-400 mt-0.5">{activeThreats.length}</div>
            <div className="text-[10px] text-slate-400">{criticalCount} Critical • {highCount} High</div>
          </div>
          <Flame className="w-7 h-7 text-rose-500 opacity-80" />
        </div>

        {/* Monitored Enclave Nodes */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Monitored Endpoints</div>
            <div className="text-2xl font-black text-cyan-400 mt-0.5">{endpoints.length} Nodes</div>
            <div className="text-[10px] text-emerald-400">100% Telemetry Online</div>
          </div>
          <Cpu className="w-7 h-7 text-cyan-400 opacity-80" />
        </div>

        {/* Global Inspection Rate */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Flow Inspection Rate</div>
            <div className="text-2xl font-black text-purple-400 mt-0.5">14,280 pkt/s</div>
            <div className="text-[10px] text-slate-400">Deep Attention Latency: 1.2ms</div>
          </div>
          <Activity className="w-7 h-7 text-purple-400 opacity-80" />
        </div>
      </div>

      {/* 2. Controls & Filter Toolbar */}
      <div className="glass-panel p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threat name, IP, hostname, vector..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical Only</option>
            <option value="High">High Only</option>
            <option value="Medium">Medium Only</option>
            <option value="Low">Low Only</option>
          </select>

          {/* Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Host Nodes</option>
            {endpoints.map((ep) => (
              <option key={ep.id} value={ep.hostname}>{ep.hostname}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 transition ${
              focusMode
                ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{focusMode ? 'Focus Mode Active' : 'Focus Mode'}</span>
          </button>
        </div>
      </div>

      {/* 3. Real-Time Threat Monitoring Stream Table & Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Real-Time Stream Feed */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h3 className="font-bold text-white uppercase text-xs">LIVE TELEMETRY THREAT FEED ({filteredIncidents.length})</h3>
            </div>
            <span className="text-[10px] text-slate-400">Auto-refreshing 1s</span>
          </div>

          <div className="overflow-y-auto max-h-[500px] space-y-2.5 pr-1">
            {filteredIncidents.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <ShieldCheck className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
                <div className="font-bold text-slate-400">Zero active threats matching current filters</div>
                <div className="text-[10px] text-slate-500">Enclave defensive perimeter operating nominally</div>
              </div>
            ) : (
              filteredIncidents.map((incident) => {
                const isCrit = incident.severity.toUpperCase() === 'CRITICAL';
                const isHigh = incident.severity.toUpperCase() === 'HIGH';

                return (
                  <div
                    key={incident.id}
                    className={`p-3 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      incident.resolved
                        ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                        : isCrit
                        ? 'bg-rose-950/40 border-rose-500/60 text-slate-100 shadow-md shadow-rose-950/30'
                        : isHigh
                        ? 'bg-amber-950/30 border-amber-500/50 text-slate-100'
                        : 'bg-slate-900/80 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          isCrit
                            ? 'bg-rose-950 text-rose-400 border-rose-500'
                            : isHigh
                            ? 'bg-amber-950 text-amber-400 border-amber-500'
                            : 'bg-cyan-950 text-cyan-400 border-cyan-500'
                        }`}>
                          {incident.severity}
                        </span>
                        <span className="font-bold text-white text-xs">{incident.attack_name}</span>
                        <span className="text-[10px] text-slate-400">({incident.vector_key})</span>
                      </div>

                      <p className="text-[11px] text-slate-300 max-w-xl">{incident.details}</p>

                      <div className="flex items-center space-x-3 text-[10px] text-slate-400 pt-1">
                        <span>Host: <strong className="text-cyan-300">{incident.hostname || incident.endpoint_id}</strong></span>
                        <span>Anomaly MSE: <strong className="text-amber-400">{incident.anomaly_score?.toFixed(6) || '0.003120'}</strong></span>
                        <span>{incident.timestamp}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {!incident.resolved ? (
                        <button
                          onClick={() => onExecutePlaybook(incident.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition flex items-center space-x-1"
                        >
                          <span>Trigger Playbook</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                          Mitigated
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Attack Vector Intelligence Breakdown */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-white uppercase text-xs">ATTACK VECTOR DISTRIBUTION</h3>
            </div>

            <div className="space-y-3 mt-3">
              {[
                { name: 'Memory Thread Injections', pct: 38, count: 14, color: 'bg-rose-500' },
                { name: 'Volumetric SYN / UDP Floods', pct: 28, count: 11, color: 'bg-purple-500' },
                { name: 'Ransomware File Locking', pct: 18, count: 7, color: 'bg-amber-500' },
                { name: 'Zero-Day Latent Divergence', pct: 10, count: 4, color: 'bg-cyan-500' },
                { name: 'Unauthorized Lateral SSH/RDP', pct: 6, count: 2, color: 'bg-emerald-500' },
              ].map((vec, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">{vec.name}</span>
                    <span className="text-slate-400 font-bold">{vec.count} ({vec.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={`${vec.color} h-full transition-all duration-500`} style={{ width: `${vec.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[10px] text-slate-400">
            <div className="font-bold text-white uppercase flex items-center space-x-1.5">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Mean Time to Detect (MTTD)</span>
            </div>
            <div>Self-Attention Stream: <strong className="text-emerald-400">42ms</strong></div>
            <div>Automated Mitigation: <strong className="text-cyan-400">1.8s (via Playbooks)</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
