import React, { useState } from 'react';
import { Endpoint } from '../types';
import { Server, ShieldAlert, ShieldCheck, Power, Trash2, Plus, Terminal, RefreshCw, Activity, Cpu, HardDrive, Wifi } from 'lucide-react';

interface FleetManagerProps {
  endpoints: Endpoint[];
  onIsolate: (id: string) => Promise<void>;
  onReconnect: (id: string) => Promise<void>;
  onShutdown: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddEndpoint: (ep: Partial<Endpoint>) => Promise<void>;
  onPushUpdate?: () => Promise<void>;
}

export const FleetManager: React.FC<FleetManagerProps> = ({
  endpoints,
  onIsolate,
  onReconnect,
  onShutdown,
  onDelete,
  onAddEndpoint,
  onPushUpdate
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNodeId, setNewNodeId] = useState('');
  const [newHostname, setNewHostname] = useState('');
  const [newPasscode, setNewPasscode] = useState('client123');
  const [newIp, setNewIp] = useState('');
  const [newOs, setNewOs] = useState('Windows 10');
  const [newLocation, setNewLocation] = useState('Finance & Billing Enclave');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisioningId, setProvisioningId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostname || !newIp) return;
    setIsSubmitting(true);
    try {
      const id = (newNodeId.trim() || newHostname.toLowerCase().replace(/[^a-z0-9]/g, '-')).toLowerCase();
      await onAddEndpoint({
        id,
        hostname: newHostname,
        ip_address: newIp,
        os_type: newOs,
        passcode: newPasscode.trim() || 'client123',
        location_name: newLocation,
        geo_lat: 50.1109,
        geo_lng: 8.6821
      });
      setShowAddModal(false);
      setNewNodeId('');
      setNewHostname('');
      setNewPasscode('client123');
      setNewIp('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProvision = async (ep: Endpoint) => {
    setProvisioningId(ep.id);
    // Simulate remote SSH / Paramiko deployment
    await new Promise(r => setTimeout(r, 2000));
    setProvisioningId(null);
  };

  return (
    <div className="w-full glass-panel rounded-xl p-5 border border-slate-800">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold font-mono tracking-wider text-slate-100 flex items-center space-x-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <span>SERVER FLEET MANAGEMENT & PROVISIONING</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Orchestrating {endpoints.filter(e => e.status === 'online').length} active ({endpoints.length} total registered) host endpoints across sub-server enclaves.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onPushUpdate && (
            <button
              onClick={() => onPushUpdate()}
              className="flex items-center space-x-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-300 font-semibold text-xs px-3 py-2 rounded-lg transition shadow-md shadow-indigo-950/50"
              title="Push automated package updates to all connected client nodes"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Broadcast Fleet Update</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs px-3.5 py-2 rounded-lg transition shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Provision New Host</span>
          </button>
        </div>
      </div>

      {/* Grid of Endpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {endpoints.map((ep) => {
          const isIsolated = ep.status === 'isolated';
          const isOffline = ep.status === 'offline';

          return (
            <div
              key={ep.id}
              className={`rounded-xl p-4 transition border ${
                isIsolated
                  ? 'glass-panel-danger'
                  : 'bg-slate-900/60 border-slate-800/90 hover:border-cyan-500/40'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-white">{ep.hostname}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {ep.os_type}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-1 flex items-center space-x-2">
                    <span>IP: {ep.ip_address}</span>
                    <span>•</span>
                    <span>{ep.location_name}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div
                  className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${
                    isIsolated
                      ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                      : isOffline
                        ? 'bg-slate-900 border-slate-700 text-slate-400'
                        : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  }`}
                >
                  {ep.status}
                </div>
              </div>

              {/* Resource Gauges */}
              <div className="grid grid-cols-3 gap-2 my-3 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs font-mono">
                <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-1 text-slate-400 text-[10px] mb-1">
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    <span>CPU</span>
                  </div>
                  <span className="font-bold text-white">{ep.cpu_usage || 0}%</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-1 text-slate-400 text-[10px] mb-1">
                    <HardDrive className="w-3 h-3 text-purple-400" />
                    <span>RAM</span>
                  </div>
                  <span className="font-bold text-white">{ep.memory_usage || 0}%</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-1 text-slate-400 text-[10px] mb-1">
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>NET</span>
                  </div>
                  <span className="font-bold text-white">{ep.network_load || 0} MB/s</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                {/* Quarantine / Isolate Toggle */}
                {isIsolated ? (
                  <button
                    onClick={() => onReconnect(ep.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900 transition font-mono"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Restore LAN</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onIsolate(ep.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-500/60 text-red-300 hover:bg-red-900 transition font-mono"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Isolate Node</span>
                  </button>
                )}

                {/* Remote Provision Script Button */}
                <button
                  onClick={() => handleProvision(ep)}
                  disabled={provisioningId === ep.id}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition font-mono text-[11px]"
                  title="SSH / Paramiko Remote Sniffer Daemon Push"
                >
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  <span>{provisioningId === ep.id ? 'Pushing...' : 'Provision SSH'}</span>
                </button>

                {/* Shutdown & Delete */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onShutdown(ep.id)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-950 text-slate-400 hover:text-amber-400 transition"
                    title="Remote Host Shutdown"
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(ep.id)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-950 text-slate-400 hover:text-red-400 transition"
                    title="Deregister Endpoint"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Endpoint Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold font-mono text-white mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              <span>PROVISION NEW HOST NODE</span>
            </h3>

            <form onSubmit={handleAdd} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Hostname</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WIN10-FINANCE-02"
                  value={newHostname}
                  onChange={(e) => {
                    setNewHostname(e.target.value);
                    if (!newNodeId) {
                      setNewNodeId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Client Node ID (Username)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. win-prod-02"
                    value={newNodeId}
                    onChange={(e) => setNewNodeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Initial Passcode (Password)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. client123"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">IP Address / Subnet</label>
                <input
                  type="text"
                  required
                  placeholder="192.168.1.xxx"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Operating System</label>
                <select
                  value={newOs}
                  onChange={(e) => setNewOs(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Windows 10">Windows 10 / 11</option>
                  <option value="Kali Linux">Kali Linux</option>
                  <option value="Ubuntu 22.04">Ubuntu 22.04 LTS</option>
                  <option value="RHEL Server">Red Hat Enterprise Linux</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Enterprise Department / Enclave Zone</label>
                <input
                  type="text"
                  list="department-suggestions"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Finance & Billing Enclave"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
                <datalist id="department-suggestions">
                  <option value="Finance & Billing Enclave" />
                  <option value="SecOps & Threat Intel Core" />
                  <option value="DevOps & Cloud Cluster" />
                  <option value="R&D Neural Computing Lab" />
                  <option value="Executive Command (HQ)" />
                  <option value="Core Datacenter & Infrastructure" />
                  <option value="Customer Operations & CRM" />
                  <option value="HR & Legal Compliance" />
                </datalist>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center space-x-1"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Deploy Host</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
