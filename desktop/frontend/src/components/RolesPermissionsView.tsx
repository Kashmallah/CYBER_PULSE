import React, { useState } from 'react';
import { Users, Shield, Key, Lock, CheckCircle2, XCircle, Plus, Trash2, Edit3, ShieldAlert, UserCheck } from 'lucide-react';

interface AnalystUser {
  id: string;
  name: string;
  email: string;
  role: 'SOC_COMMANDER' | 'INCIDENT_RESPONDER' | 'TIER1_ANALYST' | 'COMPLIANCE_AUDITOR';
  status: 'ACTIVE' | 'REVOKED';
  mfaEnabled: boolean;
  lastLogin: string;
}

export const RolesPermissionsView: React.FC = () => {
  const [users, setUsers] = useState<AnalystUser[]>([
    {
      id: 'usr-001',
      name: 'SOC Commander (Root Admin)',
      email: 'admin@cyberpulse.sec',
      role: 'SOC_COMMANDER',
      status: 'ACTIVE',
      mfaEnabled: true,
      lastLogin: 'Just now (Active)'
    },
    {
      id: 'usr-002',
      name: 'Elena Rostova',
      email: 'elena.rostova@cyberpulse.sec',
      role: 'INCIDENT_RESPONDER',
      status: 'ACTIVE',
      mfaEnabled: true,
      lastLogin: '14 mins ago'
    },
    {
      id: 'usr-003',
      name: 'Marcus Vance',
      email: 'marcus.v@cyberpulse.sec',
      role: 'TIER1_ANALYST',
      status: 'ACTIVE',
      mfaEnabled: true,
      lastLogin: '2 hours ago'
    },
    {
      id: 'usr-004',
      name: 'Sarah Chen (External Audit)',
      email: 'sarah.audit@compliance.org',
      role: 'COMPLIANCE_AUDITOR',
      status: 'ACTIVE',
      mfaEnabled: false,
      lastLogin: 'Yesterday'
    }
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<AnalystUser['role']>('TIER1_ANALYST');

  const roleDefinitions = [
    {
      id: 'SOC_COMMANDER',
      name: 'SOC Commander (Super Admin)',
      badge: 'bg-cyan-950 text-cyan-400 border-cyan-500/50',
      desc: 'Full read/write permissions across fleet orchestration, neural training, playbook execution, and user management.',
      permissions: ['Read Telemetry', 'Isolate Hosts', 'Trigger FL Training', 'Modify Catalog', 'Execute Playbooks', 'Manage Users']
    },
    {
      id: 'INCIDENT_RESPONDER',
      name: 'Lead Incident Responder',
      badge: 'bg-rose-950 text-rose-400 border-rose-500/50',
      desc: 'Authorized to investigate alerts, trigger SOAR containment playbooks, and isolate infected enclave host nodes.',
      permissions: ['Read Telemetry', 'Isolate Hosts', 'Modify Catalog', 'Execute Playbooks']
    },
    {
      id: 'TIER1_ANALYST',
      name: 'Tier-1 Triage Analyst',
      badge: 'bg-purple-950 text-purple-400 border-purple-500/50',
      desc: 'Monitors real-time threat feed, runs IoC sandbox checks, and escalates cases to Incident Responders.',
      permissions: ['Read Telemetry', 'IoC Sandbox Queries', 'Assign Case Notes']
    },
    {
      id: 'COMPLIANCE_AUDITOR',
      name: 'Compliance & Audit Inspector',
      badge: 'bg-emerald-950 text-emerald-400 border-emerald-500/50',
      desc: 'Read-only access to historical 15-day forensic logs, executive threat reports, and cryptographic hashes.',
      permissions: ['Read Telemetry', 'Export Audit Reports', 'View Cryptographic Chains']
    }
  ];

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const newUser: AnalystUser = {
      id: `usr-00${users.length + 1}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: 'ACTIVE',
      mfaEnabled: true,
      lastLogin: 'Never (Invited)'
    };

    setUsers(prev => [...prev, newUser]);
    setNewUserName('');
    setNewUserEmail('');
    setIsAddModalOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE' } : u));
  };

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Header with Add User action */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-white uppercase text-xs">ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS</h3>
            <p className="text-[10px] text-slate-400">Manage SecOps analyst accounts, cryptographic session tokens, and role matrices</p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center space-x-1.5 transition shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Provision SecOps Analyst</span>
        </button>
      </div>

      {/* 2. Analysts Accounts Table */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
        <h4 className="font-bold text-white uppercase text-xs">PROVISIONED SECOPS ANALYSTS & SESSIONS ({users.length})</h4>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">User ID</th>
                <th className="p-3">Analyst Name & Email</th>
                <th className="p-3">Assigned RBAC Role</th>
                <th className="p-3">2FA MFA</th>
                <th className="p-3">Session Last Active</th>
                <th className="p-3">Account Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/60">
                  <td className="p-3 text-slate-400 font-bold">{u.id}</td>
                  <td className="p-3">
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      u.role === 'SOC_COMMANDER'
                        ? 'bg-cyan-950 text-cyan-400 border-cyan-500/50'
                        : u.role === 'INCIDENT_RESPONDER'
                        ? 'bg-rose-950 text-rose-400 border-rose-500/50'
                        : u.role === 'TIER1_ANALYST'
                        ? 'bg-purple-950 text-purple-400 border-purple-500/50'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-500/50'
                    }`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.mfaEnabled ? (
                      <span className="flex items-center space-x-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Enabled</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-slate-500">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Disabled</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-slate-300">{u.lastLogin}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      u.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {u.id !== 'usr-001' && (
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-400 text-[10px] font-bold transition"
                      >
                        {u.status === 'ACTIVE' ? 'Revoke Access' : 'Restore'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Granular Role Definitions Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {roleDefinitions.map((role) => (
          <div key={role.id} className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="pb-2 border-b border-slate-800">
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${role.badge}`}>
                {role.name}
              </span>
              <p className="text-[10px] text-slate-400 mt-2">{role.desc}</p>
            </div>

            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Authorized Actions</div>
              <div className="space-y-1">
                {role.permissions.map((perm, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5 text-[10px] text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase">PROVISION NEW SECOPS ANALYST</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Analyst Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. David Zhao"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Corporate SecOps Email</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="david.zhao@cyberpulse.sec"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Assigned Security Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono"
                >
                  <option value="TIER1_ANALYST">Tier-1 Triage Analyst</option>
                  <option value="INCIDENT_RESPONDER">Lead Incident Responder</option>
                  <option value="COMPLIANCE_AUDITOR">Compliance & Audit Inspector</option>
                  <option value="SOC_COMMANDER">SOC Commander (Super Admin)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
                >
                  Confirm & Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
