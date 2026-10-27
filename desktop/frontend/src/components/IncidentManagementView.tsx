import React, { useState } from 'react';
import { IncidentLog } from '../types';
import { AlertOctagon, CheckCircle2, Clock, User, Play, Archive, Filter, Search, ChevronRight, Eye, ShieldAlert, Tag } from 'lucide-react';

interface IncidentManagementViewProps {
  incidents: IncidentLog[];
  onExecutePlaybook: (incidentId: number) => void;
  onClearAllLogs?: () => void;
}

export const IncidentManagementView: React.FC<IncidentManagementViewProps> = ({
  incidents,
  onExecutePlaybook,
  onClearAllLogs
}) => {
  const [selectedIncident, setSelectedIncident] = useState<IncidentLog | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [statuses, setStatuses] = useState<Record<number, string>>({});

  const handleAssign = (id: number, assignee: string) => {
    setAssignments(prev => ({ ...prev, [id]: assignee }));
  };

  const handleUpdateStatus = (id: number, status: string) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  const filtered = incidents.filter(item => {
    const isResolved = item.resolved || statuses[item.id] === 'CLOSED' || statuses[item.id] === 'ARCHIVED';
    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && !isResolved) ||
      (filterStatus === 'RESOLVED' && isResolved);

    const matchSeverity = filterSeverity === 'ALL' || item.severity.toUpperCase() === filterSeverity.toUpperCase();
    const matchSearch =
      !searchQuery ||
      item.attack_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.hostname && item.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.details.toLowerCase().includes(searchQuery.toLowerCase());

    return matchStatus && matchSeverity && matchSearch;
  });

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Incident Workflow Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Total Case Incidents</div>
            <div className="text-2xl font-black text-white mt-0.5">{incidents.length}</div>
            <div className="text-[10px] text-slate-400">All forensic records</div>
          </div>
          <AlertOctagon className="w-7 h-7 text-cyan-400 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Awaiting Triage</div>
            <div className="text-2xl font-black text-rose-400 mt-0.5">
              {incidents.filter(i => !i.resolved && !statuses[i.id]).length}
            </div>
            <div className="text-[10px] text-rose-400 font-bold">Requires Analyst Review</div>
          </div>
          <ShieldAlert className="w-7 h-7 text-rose-500 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Under Investigation</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">
              {incidents.filter(i => statuses[i.id] === 'INVESTIGATING').length}
            </div>
            <div className="text-[10px] text-amber-400">Assigned to SecOps</div>
          </div>
          <Clock className="w-7 h-7 text-amber-400 opacity-80" />
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Mitigated & Contained</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              {incidents.filter(i => i.resolved || statuses[i.id] === 'CLOSED').length}
            </div>
            <div className="text-[10px] text-emerald-400">Playbook Contained</div>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-400 opacity-80" />
        </div>
      </div>

      {/* 2. Filter & Action Toolbar */}
      <div className="glass-panel p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter incidents by title, host, or IoC..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="ACTIVE">Active Incidents</option>
            <option value="RESOLVED">Mitigated & Closed</option>
            <option value="ALL">All Statuses</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>
        </div>

        {onClearAllLogs && (
          <button
            onClick={onClearAllLogs}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-rose-500 text-slate-400 hover:text-rose-400 transition"
          >
            Archive Resolved
          </button>
        )}
      </div>

      {/* 3. Incidents Alert Cards & Detail Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Incident Cards Stream */}
        <div className="lg:col-span-2 space-y-2.5 overflow-y-auto max-h-[560px] pr-1">
          {filtered.length === 0 ? (
            <div className="glass-panel p-12 text-center text-slate-500 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
              <div className="font-bold text-slate-300">No matching incident tickets found</div>
              <div className="text-[10px] text-slate-500">Perimeter clear or check active filter settings</div>
            </div>
          ) : (
            filtered.map((item) => {
              const currentStatus = statuses[item.id] || (item.resolved ? 'CLOSED' : 'NEW');
              const currentAssignee = assignments[item.id] || 'Unassigned';
              const isCrit = item.severity.toUpperCase() === 'CRITICAL';
              const isHigh = item.severity.toUpperCase() === 'HIGH';

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedIncident(item)}
                  className={`glass-panel p-4 rounded-xl border cursor-pointer transition hover:border-cyan-500/50 space-y-3 ${
                    selectedIncident?.id === item.id
                      ? 'border-cyan-500 bg-slate-900 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-800 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          isCrit
                            ? 'bg-rose-950 text-rose-400 border-rose-500'
                            : isHigh
                            ? 'bg-amber-950 text-amber-400 border-amber-500'
                            : 'bg-cyan-950 text-cyan-400 border-cyan-500'
                        }`}>
                          {item.severity}
                        </span>
                        <h4 className="font-bold text-white text-xs">{item.attack_name}</h4>
                        <span className="text-[10px] text-slate-400">#{item.id}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{item.details}</p>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${
                      currentStatus === 'CLOSED'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50'
                        : currentStatus === 'INVESTIGATING'
                        ? 'bg-amber-950 text-amber-400 border-amber-500/50'
                        : 'bg-rose-950 text-rose-400 border-rose-500/50 animate-pulse'
                    }`}>
                      {currentStatus}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80 gap-2">
                    <div className="flex items-center space-x-3">
                      <span>Host: <strong className="text-slate-200">{item.hostname || item.endpoint_id}</strong></span>
                      <span>Assignee: <strong className="text-cyan-300">{currentAssignee}</strong></span>
                      <span>{item.timestamp}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!item.resolved && currentStatus !== 'CLOSED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExecutePlaybook(item.id);
                          }}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Run Playbook</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 1 Col: Selected Incident Investigation & Action Inspector */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
          {selectedIncident ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">CASE FILE</span>
                  <h3 className="font-bold text-white text-sm">#{selectedIncident.id} {selectedIncident.attack_name}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                  selectedIncident.severity.toUpperCase() === 'CRITICAL' ? 'bg-rose-950 text-rose-400 border-rose-500' : 'bg-cyan-950 text-cyan-400 border-cyan-500'
                }`}>
                  {selectedIncident.severity}
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Incident Summary & IoC Forensics</label>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                    {selectedIncident.details}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-[9px] text-slate-500">Target Host</div>
                    <div className="font-bold text-cyan-300 text-[11px] truncate">{selectedIncident.hostname || selectedIncident.endpoint_id}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-[9px] text-slate-500">Vector Key</div>
                    <div className="font-bold text-purple-300 text-[11px] truncate">{selectedIncident.vector_key}</div>
                  </div>
                </div>

                {/* Workflow Actions: Status & Assignment */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Assign SecOps Analyst</label>
                    <select
                      value={assignments[selectedIncident.id] || 'Unassigned'}
                      onChange={(e) => handleAssign(selectedIncident.id, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Unassigned">Unassigned</option>
                      <option value="Lead SecOps Responder">Lead SecOps Responder</option>
                      <option value="SOC Commander">SOC Commander</option>
                      <option value="Tier-1 Triage Analyst">Tier-1 Triage Analyst</option>
                      <option value="Forensic Investigator">Forensic Investigator</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Update Case Status</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['NEW', 'INVESTIGATING', 'CLOSED'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(selectedIncident.id, st)}
                          className={`py-1 rounded text-[10px] font-bold border transition ${
                            (statuses[selectedIncident.id] || (selectedIncident.resolved ? 'CLOSED' : 'NEW')) === st
                              ? 'bg-cyan-500 text-black border-cyan-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => onExecutePlaybook(selectedIncident.id)}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center space-x-1.5 transition shadow-lg shadow-rose-950/40"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Containment Playbook</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 space-y-2">
              <Eye className="w-8 h-8 mx-auto text-slate-600" />
              <div className="font-bold text-slate-400 text-xs">Select an incident from the stream</div>
              <div className="text-[10px] text-slate-500">Inspect IoC context, assign responder, or trigger containment.</div>
            </div>
          )}

          <div className="text-[10px] text-slate-500 pt-3 border-t border-slate-800 flex justify-between">
            <span>SOAR Engine: <strong className="text-emerald-400">FedProx Playbooks</strong></span>
            <span>Escalation SLA: <strong className="text-cyan-400">15m</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
