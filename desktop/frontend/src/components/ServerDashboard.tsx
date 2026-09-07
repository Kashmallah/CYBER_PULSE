import React, { useState, useEffect, useRef } from 'react';
import { Endpoint, ThreatCatalogItem, IncidentLog, FLBenchmarks, ChatMessage } from '../types';
import { Navbar } from './Navbar';
import { AttackGlobe } from './AttackGlobe';
import { FleetManager } from './FleetManager';
import { FLDashboard } from './FLDashboard';
import { ThreatCatalogView } from './ThreatCatalogView';
import { IncidentLogsView } from './IncidentLogsView';
import { ThreatMonitoringView } from './ThreatMonitoringView';
import { IncidentManagementView } from './IncidentManagementView';
import { AttackMapIntelView } from './AttackMapIntelView';
import { AnalystWorkspaceView } from './AnalystWorkspaceView';
import { ThreatReportsView } from './ThreatReportsView';
import { RolesPermissionsView } from './RolesPermissionsView';
import { CopilotModal } from './CopilotModal';
import { ChatHub } from './ChatHub';
import { SettingsModal } from './SettingsModal';
import { LoginScreen } from './LoginScreen';
import { SplashScreen } from './SplashScreen';
import { Globe, Server, Cpu, Eye, Shield, RefreshCw } from 'lucide-react';

export const ServerDashboard: React.FC = () => {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => sessionStorage.getItem('cp_server_is_logged_in') === 'true');
  const [username, setUsername] = useState<string>(() => sessionStorage.getItem('cp_server_username') || 'admin');
  const [theme, setTheme] = useState<'cyberpunk' | 'matrix' | 'crimson' | 'nordic' | 'light'>(() => (localStorage.getItem('cp_theme') as any) || 'cyberpunk');
  const [activeView, setActiveView] = useState<string>('overview');
  const [serverUrl, setServerUrl] = useState<string>(() => {
    return localStorage.getItem('cp_server_url') || `${window.location.protocol}//${window.location.hostname || '127.0.0.1'}:8000`;
  });
  const [geminiKey, setGeminiKey] = useState<string>(() => localStorage.getItem('cp_gemini_key') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Core Data
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [catalog, setCatalog] = useState<ThreatCatalogItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentLog[]>([]);
  const [benchmarks, setBenchmarks] = useState<FLBenchmarks>({
    memory: { accuracy: 0.889, f1_weighted: 0.887, roc_auc: 0.996, round: 15 },
    network: { accuracy: 0.991, f1_weighted: 0.989, roc_auc: 0.998, round: 22 },
    zeroday: { anomaly_threshold: 0.00264, mean_mse: 0.00031, std_mse: 0.00155 },
    history: []
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isFLTraining, setIsFLTraining] = useState(false);

  const socWsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-logout on screen/window close & cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear sessionStorage so next screen open starts logged out
      sessionStorage.removeItem('cp_server_is_logged_in');
      sessionStorage.removeItem('cp_server_username');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  // Fetch Server Data
  const fetchData = async () => {
    try {
      const [epRes, catRes, incRes, bmRes, msgRes] = await Promise.allSettled([
        fetch(`${serverUrl}/api/fleet/endpoints`).then(r => r.json()),
        fetch(`${serverUrl}/api/threats/catalog`).then(r => r.json()),
        fetch(`${serverUrl}/api/incidents/logs`).then(r => r.json()),
        fetch(`${serverUrl}/api/fl/benchmarks`).then(r => r.json()),
        fetch(`${serverUrl}/api/chat/messages`).then(r => r.json())
      ]);

      if (epRes.status === 'fulfilled' && epRes.value?.endpoints) setEndpoints(epRes.value.endpoints);
      if (catRes.status === 'fulfilled' && catRes.value?.catalog) setCatalog(catRes.value.catalog);
      if (incRes.status === 'fulfilled' && incRes.value?.incident_logs) setIncidents(incRes.value.incident_logs);
      if (bmRes.status === 'fulfilled' && bmRes.value?.benchmarks) setBenchmarks(bmRes.value.benchmarks);
      if (msgRes.status === 'fulfilled' && msgRes.value?.messages) setMessages(msgRes.value.messages);
    } catch (e) {
      console.log('[SOC Master] Error fetching backend data:', e);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      const interval = setInterval(fetchData, 8000);
      return () => clearInterval(interval);
    }
  }, [serverUrl, isLoggedIn]);

  // SOC WebSocket connection
  useEffect(() => {
    if (!isLoggedIn) return;

    const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws/soc';
    const ws = new WebSocket(wsUrl);
    socWsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data) return;

        if (data.event === 'new_incident_alert' || data.event === 'endpoint_added' || data.event === 'endpoint_isolated') {
          fetchData();
        } else if (data.event === 'new_chat_message') {
          setMessages(prev => [...prev, data]);
        } else if (data.event === 'fl_training_started') {
          setIsFLTraining(true);
        } else if (data.event === 'endpoint_telemetry') {
          setEndpoints(prev => prev.map(ep => ep.id === data.client_id ? {
            ...ep,
            cpu_usage: data.cpu,
            memory_usage: data.memory,
            network_load: data.network
          } : ep));
        }
      } catch (e) {
        console.error('WS Parse Error', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [serverUrl, isLoggedIn]);

  const handleLoginSuccess = (userRole: 'admin' | 'client') => {
    setIsLoggedIn(true);
    setUsername('admin');
    sessionStorage.setItem('cp_server_is_logged_in', 'true');
    sessionStorage.setItem('cp_server_username', 'admin');
    setActiveView('overview');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('cp_server_is_logged_in');
    sessionStorage.removeItem('cp_server_username');
  };

  // Fleet Actions
  const handleIsolate = async (id: string) => {
    await fetch(`${serverUrl}/api/fleet/endpoints/isolate/${id}`, { method: 'POST' });
    fetchData();
  };

  const handleReconnect = async (id: string) => {
    await fetch(`${serverUrl}/api/fleet/endpoints/reconnect/${id}`, { method: 'POST' });
    fetchData();
  };

  const handleShutdown = async (id: string) => {
    await fetch(`${serverUrl}/api/fleet/endpoints/shutdown/${id}`, { method: 'POST' });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`${serverUrl}/api/fleet/endpoints/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleAddEndpoint = async (ep: Partial<Endpoint>) => {
    await fetch(`${serverUrl}/api/fleet/endpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ep)
    });
    fetchData();
  };

  const handleTriggerFL = async (config: any) => {
    setIsFLTraining(true);
    await fetch(`${serverUrl}/api/fl/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    setTimeout(() => setIsFLTraining(false), 12000);
  };

  const handleAddThreat = async (item: Partial<ThreatCatalogItem>) => {
    await fetch(`${serverUrl}/api/threats/catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    fetchData();
  };

  const handleExecutePlaybook = async (incidentId: number) => {
    await fetch(`${serverUrl}/api/incidents/${incidentId}/execute-playbook`, { method: 'POST' });
    fetchData();
  };

  const handleQueryCopilot = async (prompt: string, customApiKey?: string) => {
    const keyToUse = customApiKey || geminiKey || localStorage.getItem('cp_gemini_key') || '';
    const res = await fetch(`${serverUrl}/api/copilot/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, api_key: keyToUse })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to query Copilot API');
    }
    return res.json();
  };

  const handleSendMessage = async (msg: { message: string; channel: string }) => {
    await fetch(`${serverUrl}/api/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_id: 'soc-master',
        sender_name: 'SOC Commander',
        sender_role: 'SOC_MASTER',
        message: msg.message,
        channel: msg.channel
      })
    });
  };

  const handleClearAllLogs = async () => {
    try {
      await fetch(`${serverUrl}/api/incidents/clear`, { method: 'DELETE' });
      setIncidents([]);
    } catch (e) {
      console.error('Failed to clear incidents', e);
    }
  };

  const unreadIncidents = incidents.filter(i => !i.resolved).length;

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!isLoggedIn) {
    return (
      <LoginScreen
        portalRole="admin"
        serverUrl={serverUrl}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Navbar */}
      <Navbar
        currentRole="admin"
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        unreadIncidentsCount={unreadIncidents}
        onLogout={handleLogout}
      />

      {/* Main Content Body */}
      <main className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* OVERVIEW VIEW */}
        {activeView === 'overview' && (
          <div className="space-y-4">
            {/* 1. TOP ROW: 3D EARTH HUB & CONNECTED PCS LIST */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left 2 Cols: 3D Earth Hub */}
              <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white font-mono uppercase text-xs">
                        GLOBAL 3D ATTACK HUB & THREAT ORBIT
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Live telemetry projection across federated enclave coordinates
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>SOC MASTER ONLINE</span>
                    </span>
                  </div>
                </div>

                <div className="h-[380px] w-full my-2">
                  <AttackGlobe
                    endpoints={endpoints}
                    incidents={incidents}
                    onSelectEndpoint={() => setActiveView('fleet')}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800">
                  <span>Live Geo Clustered Nodes: <strong className="text-cyan-400">{endpoints.length} Active</strong></span>
                  <span>Coordinates Stream: <strong className="text-purple-400">FedProx Enclave</strong></span>
                </div>
              </div>

              {/* Right 1 Col: Total Connected PCs Details */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between font-mono text-xs">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-400">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white uppercase text-xs">CONNECTED ENCLAVE PCS</h3>
                        <p className="text-[10px] text-slate-400">{endpoints.length} Active Telemetry Streams</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveView('fleet')}
                      className="text-[10px] text-cyan-400 hover:underline flex items-center space-x-1"
                    >
                      <span>Manage Fleet</span>
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>

                  {/* PCs List */}
                  <div className="overflow-y-auto max-h-[340px] space-y-2.5 py-3 pr-1">
                    {endpoints.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        No client nodes currently connected.
                      </div>
                    ) : (
                      endpoints.map((ep) => (
                        <div
                          key={ep.id}
                          className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                                <span>{ep.hostname}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {ep.os_type}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">{ep.ip_address} • {ep.location_name}</div>
                            </div>

                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                              ep.status === 'online'
                                ? 'bg-emerald-950 border-emerald-500/60 text-emerald-400'
                                : ep.status === 'isolated'
                                  ? 'bg-rose-950 border-rose-500/60 text-rose-400 animate-pulse'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}>
                              {ep.status}
                            </span>
                          </div>

                          {/* Load Gauges */}
                          <div className="grid grid-cols-3 gap-1.5 text-[9px] text-slate-400 pt-1 border-t border-slate-800/80">
                            <div>
                              <span className="text-slate-500">CPU:</span> <strong className="text-cyan-400">{ep.cpu_usage || 0}%</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">RAM:</span> <strong className="text-purple-400">{ep.memory_usage || 0}%</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">NET:</span> <strong className="text-emerald-400">{ep.network_load || 0} MB/s</strong>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Server SOC Status: <strong className="text-emerald-400">Armed & Active</strong></span>
                  <button
                    onClick={() => setActiveView('fleet')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
                  >
                    + Add Host PC
                  </button>
                </div>
              </div>
            </div>

            {/* 2. MIDDLE ROW: ALL MODELS WITH ACCURACIES & BENCHMARKS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-mono text-xs text-white font-bold uppercase">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>FEDERATED LEARNING NEURAL MODELS & ACCURACIES</span>
                </div>
                <button
                  onClick={() => setActiveView('federated')}
                  className="text-[10px] font-mono text-cyan-400 hover:underline"
                >
                  Open FL Dashboard & Controls →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
                {/* Model 1: Memory Attention Model */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-cyan-400 text-xs uppercase">Memory Attention</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                      Round {benchmarks.memory.round}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-black text-white">
                      {(benchmarks.memory.accuracy * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-emerald-400 font-bold">Accuracy</div>
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <div className="flex justify-between">
                      <span>Weighted F1:</span>
                      <strong className="text-slate-200">{(benchmarks.memory.f1_weighted * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>ROC-AUC:</span>
                      <strong className="text-cyan-300">{benchmarks.memory.roc_auc.toFixed(3)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Architecture:</span>
                      <strong className="text-slate-300">Transformer-BiLSTM</strong>
                    </div>
                  </div>
                </div>

                {/* Model 2: Network Attention Model */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-purple-400 text-xs uppercase">Network Attention</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300">
                      Round {benchmarks.network.round}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-black text-white">
                      {(benchmarks.network.accuracy * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-purple-400 font-bold">Accuracy</div>
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <div className="flex justify-between">
                      <span>Weighted F1:</span>
                      <strong className="text-slate-200">{(benchmarks.network.f1_weighted * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>ROC-AUC:</span>
                      <strong className="text-purple-300">{benchmarks.network.roc_auc.toFixed(3)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Classes:</span>
                      <strong className="text-slate-300">15 Attack Vectors</strong>
                    </div>
                  </div>
                </div>

                {/* Model 3: Zero-Day Autoencoder */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-amber-400 text-xs uppercase">Zero-Day Autoencoder</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300">
                      Unsupervised
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-lg font-bold text-amber-300 truncate">
                      θ = {benchmarks.zeroday.anomaly_threshold.toFixed(6)}
                    </div>
                    <div className="text-[10px] text-amber-400 font-bold">Threshold</div>
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <div className="flex justify-between">
                      <span>Mean Recon MSE:</span>
                      <strong className="text-slate-200">{benchmarks.zeroday.mean_mse.toFixed(6)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Std Dev MSE:</span>
                      <strong className="text-amber-300">{benchmarks.zeroday.std_mse.toFixed(6)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <strong className="text-emerald-400">Active Inference</strong>
                    </div>
                  </div>
                </div>

                {/* Model 4: Global Fusion FedProx Model */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-emerald-400 text-xs uppercase">Global Fusion</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                      FedProx μ=0.01
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-black text-white">99.4%</div>
                    <div className="text-[10px] text-emerald-400 font-bold">Accuracy</div>
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <div className="flex justify-between">
                      <span>Late-Fusion:</span>
                      <strong className="text-slate-200">Memory + Network</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Zero-Day Recall:</span>
                      <strong className="text-emerald-400">100.0%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <strong className="text-cyan-400">Deployed to Fleet</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'threat_monitoring' && (
          <ThreatMonitoringView
            incidents={incidents}
            catalog={catalog}
            endpoints={endpoints}
            onExecutePlaybook={handleExecutePlaybook}
          />
        )}

        {activeView === 'incidents' && (
          <IncidentManagementView
            incidents={incidents}
            onExecutePlaybook={handleExecutePlaybook}
            onClearAllLogs={handleClearAllLogs}
          />
        )}

        {activeView === 'attack_map' && (
          <AttackMapIntelView
            endpoints={endpoints}
            incidents={incidents}
            onSelectEndpoint={() => setActiveView('fleet')}
          />
        )}

        {activeView === 'fleet' && (
          <FleetManager
            endpoints={endpoints}
            onIsolate={handleIsolate}
            onReconnect={handleReconnect}
            onShutdown={handleShutdown}
            onDelete={handleDelete}
            onAddEndpoint={handleAddEndpoint}
          />
        )}

        {activeView === 'analyst_workspace' && (
          <AnalystWorkspaceView
            incidents={incidents}
            catalog={catalog}
            endpoints={endpoints}
            onExecutePlaybook={handleExecutePlaybook}
          />
        )}

        {activeView === 'threat_reports' && (
          <ThreatReportsView
            incidents={incidents}
            endpoints={endpoints}
            benchmarks={benchmarks}
          />
        )}

        {activeView === 'roles_permissions' && (
          <RolesPermissionsView />
        )}

        {activeView === 'federated' && (
          <FLDashboard
            benchmarks={benchmarks}
            endpoints={endpoints}
            onTriggerTraining={handleTriggerFL}
            isTraining={isFLTraining}
          />
        )}

        {activeView === 'threats' && (
          <ThreatCatalogView
            catalog={catalog}
            onAddThreat={handleAddThreat}
          />
        )}

        {activeView === 'logs' && (
          <IncidentLogsView
            logs={incidents}
            onExecutePlaybook={handleExecutePlaybook}
            onClearAllLogs={handleClearAllLogs}
          />
        )}

        {activeView === 'copilot' && (
          <div className="h-[calc(100vh-100px)]">
            <CopilotModal onQueryCopilot={handleQueryCopilot} />
          </div>
        )}

        {activeView === 'chat' && (
          <div className="h-[calc(100vh-100px)]">
            <ChatHub
              messages={messages}
              currentSenderId="soc-master"
              currentSenderName="SOC Commander"
              currentSenderRole="SOC_MASTER"
              endpoints={endpoints}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        serverUrl={serverUrl}
        onSaveServerUrl={(url) => {
          setServerUrl(url);
          localStorage.setItem('cp_server_url', url);
        }}
        currentTheme={theme}
        onSaveTheme={(t) => {
          setTheme(t as any);
          localStorage.setItem('cp_theme', t);
        }}
        currentRole="admin"
        currentIdentifier={username || "admin"}
      />
    </div>
  );
};
