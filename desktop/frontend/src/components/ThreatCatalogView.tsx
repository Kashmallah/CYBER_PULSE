import React, { useState } from 'react';
import { ThreatCatalogItem } from '../types';
import { BookOpen, ShieldAlert, Plus, Check, ChevronRight } from 'lucide-react';

interface ThreatCatalogViewProps {
  catalog: ThreatCatalogItem[];
  onAddThreat: (item: Partial<ThreatCatalogItem>) => Promise<void>;
}

export const ThreatCatalogView: React.FC<ThreatCatalogViewProps> = ({ catalog, onAddThreat }) => {
  const [selectedThreat, setSelectedThreat] = useState<ThreatCatalogItem | null>(catalog[0] || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Memory');
  const [newSeverity, setNewSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newDesc, setNewDesc] = useState('');
  const [newPlaybook, setNewPlaybook] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !newName) return;
    await onAddThreat({
      vector_key: newKey,
      name: newName,
      category: newCategory,
      severity: newSeverity,
      description: newDesc,
      indicators: '["Custom IOC Pattern"]',
      playbook: newPlaybook,
      recommended_action: 'isolate'
    });
    setShowAddModal(false);
    setNewKey('');
    setNewName('');
    setNewDesc('');
    setNewPlaybook('');
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-950/80 border-rose-500 text-rose-300';
      case 'High':
        return 'bg-amber-950/80 border-amber-500 text-amber-300';
      case 'Medium':
        return 'bg-yellow-950/80 border-yellow-500 text-yellow-300';
      default:
        return 'bg-blue-950/80 border-blue-500 text-blue-300';
    }
  };

  return (
    <div className="w-full glass-panel rounded-xl p-5 border border-slate-800 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold font-mono tracking-wider text-slate-100 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>DYNAMIC THREAT CATALOG & MITIGATION PLAYBOOKS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Database-backed attack vectors, anomalous indicators, and automated forensic runbooks.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs px-3 py-2 rounded-lg transition border border-slate-700"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>Add Custom Signature</span>
        </button>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Column: Catalog List */}
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {catalog.map((item) => {
            const isSelected = selectedThreat?.vector_key === item.vector_key;
            return (
              <div
                key={item.vector_key}
                onClick={() => setSelectedThreat(item)}
                className={`p-3 rounded-xl border cursor-pointer transition font-mono text-xs ${
                  isSelected
                    ? 'bg-cyan-950/50 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="font-bold text-white text-sm">{item.name}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getSeverityBadge(item.severity)}`}>
                    {item.severity}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.description}</div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                  <span>Modality: {item.category}</span>
                  <div className="flex items-center text-cyan-400">
                    <span>View Playbook</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Playbook & Forensics */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between font-mono">
          {selectedThreat ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedThreat.name}</h3>
                  <div className="text-xs text-cyan-400 mt-0.5">Vector Key: {selectedThreat.vector_key}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded border uppercase ${getSeverityBadge(selectedThreat.severity)}`}>
                    {selectedThreat.severity} Severity
                  </span>
                  <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded">
                    Action: {selectedThreat.recommended_action}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs text-slate-400 uppercase font-bold mb-1">Mechanism Description</h4>
                <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {selectedThreat.description}
                </p>
              </div>

              {/* Indicators */}
              <div>
                <h4 className="text-xs text-slate-400 uppercase font-bold mb-1">Anomalous Telemetry Indicators</h4>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-emerald-400">
                  <code>{selectedThreat.indicators}</code>
                </div>
              </div>

              {/* Remediation Playbook */}
              <div>
                <h4 className="text-xs text-cyan-400 uppercase font-bold mb-1">Forensic Remediation Playbook</h4>
                <div className="bg-slate-950 p-3.5 rounded-lg border border-cyan-500/30 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {selectedThreat.playbook}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select an attack vector to view remediation runbook.
            </div>
          )}
        </div>
      </div>

      {/* Add Threat Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl font-mono text-xs">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>CATALOG CUSTOM ATTACK SIGNATURE</span>
            </h3>

            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Vector Unique Key</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cobalt_strike_beacon"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Threat Name</label>
                <input
                  type="text"
                  required
                  placeholder="Cobalt Strike Malleable C2 Beacon"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Memory">Memory</option>
                    <option value="Network">Network</option>
                    <option value="Zero-Day">Zero-Day</option>
                    <option value="Signature">Signature</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Step-by-Step Remediation Playbook</label>
                <textarea
                  rows={3}
                  value={newPlaybook}
                  onChange={(e) => setNewPlaybook(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold"
                >
                  Save Signature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
