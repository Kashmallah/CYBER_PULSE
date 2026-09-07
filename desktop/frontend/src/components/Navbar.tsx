import React, { useState } from 'react';
import dragonLogo from '../assets/neon_cyber_dragon.jpg';
import {
  Shield,
  Activity,
  Globe,
  Server,
  Cpu,
  BookOpen,
  Clock,
  Terminal,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Radio,
  AlertOctagon,
  Layers,
  FileText,
  Users,
  Search,
  Bell,
  User,
  LucideIcon
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  desc?: string;
}

interface NavbarProps {
  currentRole: 'admin' | 'client';
  activeView: string;
  onSelectView: (view: string) => void;
  onOpenSettings: () => void;
  unreadIncidentsCount: number;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  activeView,
  onSelectView,
  onOpenSettings,
  unreadIncidentsCount,
  onLogout
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // 10 Full Enterprise SOC Pages for Server Admin
  const adminNavItems: NavItem[] = [
    { id: 'overview', label: 'SOC Overview Dashboard', icon: Globe, desc: 'Central Ops & Model Benchmarks' },
    { id: 'threat_monitoring', label: 'Threat Monitoring', icon: Radio, desc: 'Live Stream & Vector Radar' },
    { id: 'incidents', label: 'Incident Management', icon: AlertOctagon, badge: unreadIncidentsCount, desc: 'Triage, Alerts & Playbooks' },
    { id: 'attack_map', label: 'Attack Intelligence Map', icon: Activity, desc: 'Global 3D Attack Projections' },
    { id: 'logs', label: 'Security Event Logs', icon: Clock, desc: '15-Day Forensic Telemetry' },
    { id: 'fleet', label: 'Endpoint Monitoring', icon: Server, desc: 'Host Orchestration & Gauges' },
    { id: 'analyst_workspace', label: 'Analyst Workspace', icon: Layers, desc: 'MITRE ATT&CK & Sandbox' },
    { id: 'threat_reports', label: 'Threat Reports & Trends', icon: FileText, desc: 'Executive Audit & Compliance' },
    { id: 'roles_permissions', label: 'Roles & Permissions', icon: Users, desc: 'RBAC & Analyst Management' },
    { id: 'federated', label: 'Federated Learning Core', icon: Cpu, desc: 'FedProx Training & Metrics' },
    { id: 'threats', label: 'Threat Catalog & Playbooks', icon: BookOpen, desc: 'Vectors, Signatures & IoCs' },
    { id: 'copilot', label: 'AI SecOps Copilot', icon: Terminal, desc: 'Gemini Automated Triage' },
    { id: 'chat', label: 'Inter-Host Chat Hub', icon: MessageSquare, desc: 'Encrypted Node Comms' },
  ];

  const clientNavItems: NavItem[] = [
    { id: 'client_hud', label: 'Client HUD & Shield', icon: Shield, desc: '3D Hologram & SHAP Telemetry' },
    { id: 'copilot', label: 'AI SecOps Advisor', icon: Terminal, desc: 'Real-Time Guidance' },
    { id: 'chat', label: 'Inter-Host Chat Hub', icon: MessageSquare, desc: 'SOC Communication' },
  ];

  const navItems: NavItem[] = currentRole === 'admin' ? adminNavItems : clientNavItems;
  const currentItem = navItems.find((i) => i.id === activeView) || navItems[0];

  const handleSelect = (id: string) => {
    onSelectView(id);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Top Header Bar with Enterprise Global Components */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-4 flex items-center justify-between z-30 shrink-0 select-none">
        {/* Left: Menu Toggle & Brand */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-cyan-400 hover:text-white transition shadow-sm hover:shadow-cyan-500/20 flex items-center space-x-2"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] font-mono font-bold hidden sm:inline">MENU</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur-[3px] opacity-75 group-hover:opacity-100 transition duration-300"></div>
              <img
                src={dragonLogo}
                alt="Cyber Pulse Dragon Logo"
                className="relative w-8 h-8 rounded-lg object-contain bg-black border border-cyan-500/50 p-0.5 shadow-md shadow-cyan-500/30"
              />
            </div>
            <div>
              <div className="font-mono font-extrabold text-sm tracking-wider text-white flex items-center space-x-1">
                <span>CYBER</span>
                <span className="text-cyan-400">PULSE</span>
                <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {currentRole === 'admin' ? 'SOC' : 'CLIENT'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Component 1: Quick Navigation / Active View Badge */}
        <div className="hidden lg:flex items-center space-x-2 font-mono text-xs bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
          <currentItem.icon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 uppercase tracking-widest">{currentRole === 'admin' ? 'SOC MASTER' : 'CLIENT ENCLAVE'} //</span>
          <span className="text-white font-bold">{currentItem.label}</span>
          {currentItem.badge && currentItem.badge > 0 ? (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-600 text-white font-bold animate-pulse">
              {currentItem.badge}
            </span>
          ) : null}
        </div>

        {/* Global Component 2: System Health & Threat Status HUD */}
        {currentRole === 'admin' && (
          <div className="hidden xl:flex items-center space-x-3 font-mono text-[10px]">
            {/* System Health */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>HEALTH: 99.8% ONLINE</span>
            </div>

            {/* Threat Level */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>DEFCON 3: GUARDED</span>
            </div>
          </div>
        )}

        {/* Right Actions: Notifications, Settings, Profile & Logout */}
        <div className="flex items-center space-x-2 font-mono">
          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-white transition relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadIncidentsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadIncidentsCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-bold text-white">
                  <span>LIVE ALERT NOTIFICATIONS</span>
                  <span className="text-[10px] text-cyan-400">{unreadIncidentsCount} New</span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {unreadIncidentsCount === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-[11px]">No active unread alerts</div>
                  ) : (
                    <div
                      onClick={() => {
                        onSelectView('incidents');
                        setIsNotificationsOpen(false);
                      }}
                      className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-slate-200 cursor-pointer hover:bg-rose-950/70 space-y-1"
                    >
                      <div className="font-bold text-rose-400 text-[11px]">Active Security Incident Detected</div>
                      <div className="text-[10px] text-slate-400">Click to open Incident Management triage</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Chip */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-white font-bold">{currentRole === 'admin' ? 'admin' : 'node-client'}</span>
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-white transition"
            title="System Settings & Themes"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition"
            title="Sign Out Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Backdrop Overlay when drawer is open */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 animate-fade-in"
        />
      )}

      {/* Sliding Left Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-950/95 backdrop-blur-2xl border-r border-slate-800/90 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out select-none ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur-[3px] opacity-75 group-hover:opacity-100 transition duration-300"></div>
              <img
                src={dragonLogo}
                alt="Cyber Pulse Dragon Logo"
                className="relative w-9 h-9 rounded-lg object-contain bg-black border border-cyan-500/50 p-0.5 shadow-lg shadow-cyan-500/30"
              />
            </div>
            <div>
              <div className="font-mono font-extrabold text-sm tracking-wider text-white">
                CYBER<span className="text-cyan-400">PULSE</span>
              </div>
              <div className="text-[10px] font-mono text-cyan-300">
                {currentRole === 'admin' ? 'SOC Master Terminal' : 'Endpoint Client HUD'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-1 font-mono text-xs">
          <div className="px-3 py-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            {currentRole === 'admin' ? 'Enterprise SOC Modules' : 'Local Defense Modules'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition text-left group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isActive
                        ? 'bg-cyan-500 text-black shadow-sm'
                        : 'bg-slate-900 text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">{item.label}</div>
                    {item.desc && <div className="text-[10px] text-slate-500">{item.desc}</div>}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge && item.badge > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-600 text-white font-bold animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                  <ChevronRight
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </nav>

        {/* Drawer Bottom Controls */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2 font-mono text-xs">
          <button
            onClick={() => {
              setIsDrawerOpen(false);
              onOpenSettings();
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>Theme & System Config</span>
          </button>

          <button
            onClick={() => {
              setIsDrawerOpen(false);
              onLogout();
            }}
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 border border-rose-500/30 transition"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
};
