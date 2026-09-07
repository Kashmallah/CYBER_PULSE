import React, { useState, useEffect, useRef } from 'react';
import { Endpoint, ChatMessage, ShapFeature } from '../types';
import { Navbar } from './Navbar';
import { HologramShield } from './HologramShield';
import { ShapAttribution } from './ShapAttribution';
import { CopilotModal } from './CopilotModal';
import { ChatHub } from './ChatHub';
import { SettingsModal } from './SettingsModal';
import { LoginScreen } from './LoginScreen';
import { SplashScreen } from './SplashScreen';
import { Flame, Play, Shield, Activity, RefreshCw, Cpu, Wifi, CheckCircle, AlertTriangle } from 'lucide-react';

export const ClientDashboard: React.FC = () => {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => sessionStorage.getItem('cp_client_is_logged_in') === 'true');
  const [clientNodeId, setClientNodeId] = useState<string>(() => sessionStorage.getItem('cp_client_node_id') || 'win-prod-01');
  const [theme, setTheme] = useState<'cyberpunk' | 'matrix' | 'crimson' | 'nordic' | 'light'>(() => (localStorage.getItem('cp_theme') as any) || 'cyberpunk');
  const [activeView, setActiveView] = useState<string>('client_hud');
  const [serverUrl, setServerUrl] = useState<string>(() => {
    return localStorage.getItem('cp_server_url') || `${window.location.protocol}//${window.location.hostname || '127.0.0.1'}:8000`;
  });
  const [geminiKey, setGeminiKey] = useState<string>(() => localStorage.getItem('cp_gemini_key') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Client Security & Sniffer Telemetry State
  const [clientShieldStatus, setClientShieldStatus] = useState<'SECURE' | 'THREAT_DETECTED' | 'ISOLATED'>('SECURE');
  const [clientAnomalyScore, setClientAnomalyScore] = useState(0.00031);
  const [clientActiveThreat, setClientActiveThreat] = useState<string | null>(null);
  const [snifferStatus, setSnifferStatus] = useState<'active' | 'standby' | 'disconnected'>('disconnected');
  const [cpuUsage, setCpuUsage] = useState<number>(14.2);
  const [memoryUsage, setMemoryUsage] = useState<number>(42.0);
  const [networkLoad, setNetworkLoad] = useState<number>(1.8);

  const [clientShapFeatures, setClientShapFeatures] = useState<ShapFeature[]>([
    { name: 'pslist.nproc', value: 0.12, impact: 'positive' },
    { name: 'handles.nhandles', value: 0.28, impact: 'negative' },
    { name: 'malfind.ninjections', value: 0.05, impact: 'positive' },
    { name: 'Flow Packets/s', value: 0.08, impact: 'negative' },
    { name: 'SYN Flag Count', value: 0.02, impact: 'positive' },
  ]);

  // Messages & Endpoints for Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);

  const clientWsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto logout on screen/window close & immediate sniffer deactivation
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Notify sniffer to stop immediately
      if (clientWsRef.current && clientWsRef.current.readyState === WebSocket.OPEN) {
        clientWsRef.current.send(JSON.stringify({
          action: 'client_logout',
          client_id: clientNodeId
        }));
        clientWsRef.current.close();
      }
      // Clear sessionStorage so next screen open starts logged out
      sessionStorage.removeItem('cp_client_is_logged_in');
      sessionStorage.removeItem('cp_client_node_id');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [clientNodeId]);

  // Fetch Chat & Endpoint Context from Server
  const fetchServerData = async () => {
    try {
      const [msgRes, epRes] = await Promise.allSettled([
        fetch(`${serverUrl}/api/chat/messages`).then(r => r.json()),
        fetch(`${serverUrl}/api/fleet/endpoints`).then(r => r.json())
      ]);
      if (msgRes.status === 'fulfilled' && msgRes.value?.messages) setMessages(msgRes.value.messages);
      if (epRes.status === 'fulfilled' && epRes.value?.endpoints) setEndpoints(epRes.value.endpoints);
    } catch (e) {
      // Backend may be initializing
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchServerData();
      const interval = setInterval(fetchServerData, 8000);
      return () => clearInterval(interval);
    }
  }, [serverUrl, isLoggedIn]);

  // Sniffer Daemon WebSocket Connection (ws://127.0.0.1:9099)
  useEffect(() => {
    if (!isLoggedIn) {
      if (clientWsRef.current) {
        clientWsRef.current.close();
        clientWsRef.current = null;
      }
      setSnifferStatus('disconnected');
      return;
    }

    let reconnectTimer: any;
    const connectSniffer = () => {
      try {
        const ws = new WebSocket('ws://127.0.0.1:9099');
        clientWsRef.current = ws;

        ws.onopen = () => {
          setSnifferStatus('active');
          // Send Client Authentication / Session Start to Sniffer Daemon
          ws.send(JSON.stringify({
            action: 'client_login',
            client_id: clientNodeId
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data) return;

            if (data.event === 'sniffer_status') {
              setSnifferStatus(data.is_active ? 'active' : 'standby');
            } else if (data.event === 'client_telemetry') {
              setClientShieldStatus(data.shield_status || 'SECURE');
              setClientAnomalyScore(data.anomaly_score ?? 0.00031);
              setClientActiveThreat(data.active_threat || null);
              if (data.cpu !== undefined) setCpuUsage(data.cpu);
              if (data.memory !== undefined) setMemoryUsage(data.memory);
              if (data.network !== undefined) setNetworkLoad(data.network);
              if (data.shap_features && data.shap_features.length > 0) {
                setClientShapFeatures(data.shap_features);
              }
              setSnifferStatus('active');
            }
          } catch (e) {
            console.error('Sniffer telemetry parse error', e);
          }
        };

        ws.onclose = () => {
          setSnifferStatus('disconnected');
          reconnectTimer = setTimeout(connectSniffer, 3500);
        };

        ws.onerror = () => {
          setSnifferStatus('disconnected');
        };
      } catch (e) {
        setSnifferStatus('disconnected');
      }
    };

    connectSniffer();

    return () => {
      clearTimeout(reconnectTimer);
      if (clientWsRef.current) {
        if (clientWsRef.current.readyState === WebSocket.OPEN) {
          clientWsRef.current.send(JSON.stringify({ action: 'client_logout', client_id: clientNodeId }));
        }
        clientWsRef.current.close();
      }
    };
  }, [isLoggedIn, clientNodeId]);

  const handleLoginSuccess = (userRole: 'admin' | 'client', node_id?: string) => {
    const id = node_id || 'win-prod-01';
    setIsLoggedIn(true);
    setClientNodeId(id);
    sessionStorage.setItem('cp_client_is_logged_in', 'true');
    sessionStorage.setItem('cp_client_node_id', id);
    setActiveView('client_hud');
  };

  const handleLogout = () => {
    if (clientWsRef.current && clientWsRef.current.readyState === WebSocket.OPEN) {
      clientWsRef.current.send(JSON.stringify({
        action: 'client_logout',
        client_id: clientNodeId
      }));
      clientWsRef.current.close();
    }
    setIsLoggedIn(false);
    sessionStorage.removeItem('cp_client_is_logged_in');
    sessionStorage.removeItem('cp_client_node_id');
    setSnifferStatus('disconnected');
  };

  // Client Simulation Triggers
  const handleSimulateAttack = (attackType: string) => {
    if (clientWsRef.current && clientWsRef.current.readyState === WebSocket.OPEN) {
      clientWsRef.current.send(JSON.stringify({
        action: 'simulate_attack',
        attack_type: attackType
      }));
    }
    setClientActiveThreat(attackType);
    setClientShieldStatus('THREAT_DETECTED');
  };

  const handleClearAttack = () => {
    if (clientWsRef.current && clientWsRef.current.readyState === WebSocket.OPEN) {
      clientWsRef.current.send(JSON.stringify({ action: 'clear_attack' }));
    }
    setClientActiveThreat(null);
    setClientShieldStatus('SECURE');
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
        sender_id: clientNodeId,
        sender_name: `Host Node (${clientNodeId})`,
        sender_role: 'ENDPOINT',
        message: msg.message,
        channel: msg.channel
      })
    });
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!isLoggedIn) {
    return (
      <LoginScreen
        portalRole="client"
        serverUrl={serverUrl}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Navbar */}
      <Navbar
        currentRole="client"
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        unreadIncidentsCount={0}
        onLogout={handleLogout}
      />

      {/* Main Content Body */}
      <main className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {activeView === 'client_hud' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full font-mono">
            {/* Left Column: 3D Hologram Shield & Live Telemetry */}
            <div className="space-y-4 flex flex-col justify-between">
              {/* 3D Hologram Status Shield */}
              <HologramShield
                status={clientShieldStatus}
                anomalyScore={clientAnomalyScore}
                activeThreat={clientActiveThreat}
              />

              {/* Real-time Hardware Telemetry Bar */}
              <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">Endpoint ID:</span>
                    <span className="text-white font-bold">{clientNodeId}</span>
                  </div>
                  
                  {/* Sniffer State Indicator */}
                  <span className={`flex items-center space-x-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    snifferStatus === 'active'
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                      : snifferStatus === 'standby'
                        ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                        : 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      snifferStatus === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`} />
                    <span>
                      {snifferStatus === 'active' ? 'SNIFFER ACTIVE' : snifferStatus === 'standby' ? 'SNIFFER STANDBY' : 'SNIFFER OFFLINE'}
                    </span>
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                      <span>Memory Load & Handles</span>
                      <span className="text-cyan-400">{memoryUsage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full transition-all duration-500"
                        style={{ width: `${Math.min(100, memoryUsage)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                      <span>Network Socket Flow</span>
                      <span className="text-purple-400">{networkLoad.toFixed(2)} MB/s</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-400 h-full transition-all duration-500"
                        style={{ width: `${Math.min(100, networkLoad * 20)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                      <span>CPU Core Utilization</span>
                      <span className="text-emerald-400">{cpuUsage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full transition-all duration-500"
                        style={{ width: `${Math.min(100, cpuUsage)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Daemon: <strong className="text-emerald-400">live_sniffer.py</strong></span>
                  <span>Port: <strong>9099</strong></span>
                </div>
              </div>
            </div>

            {/* Center Column: Real-time PyTorch Gradient SHAP Attribution */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="h-[340px]">
                <ShapAttribution
                  features={clientShapFeatures}
                  isSimulating={!!clientActiveThreat}
                />
              </div>

              <div className="glass-panel p-4 rounded-xl border border-slate-800 text-xs">
                <h4 className="font-bold text-slate-200 uppercase mb-2">Defense Layer Diagnostics</h4>
                <div className="space-y-1 text-slate-400 text-[11px]">
                  <div>• Transformer-BiLSTM Self-Attention Stem: <span className="text-emerald-400">ACTIVE</span></div>
                  <div>• Zero-Day Autoencoder Latent Loss: <span className="text-cyan-400">{clientAnomalyScore.toFixed(6)}</span></div>
                  <div>• Calibrated Threshold $\theta$: <span className="text-amber-400">0.002640</span></div>
                  <div>• Active Host Session: <span className="text-purple-400">Client Authenticated</span></div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Attack Simulation Test Panel */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs">
              <div>
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Flame className="w-5 h-5 text-rose-500" />
                  <div>
                    <h3 className="font-bold text-white uppercase tracking-wider">
                      LIVE ATTACK SIMULATOR
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Inject malicious telemetry patterns into local forward passes.
                    </p>
                  </div>
                </div>

                {/* Simulation Buttons */}
                <div className="space-y-2.5 mt-4">
                  {[
                    { id: 'socgholish', label: '1. SocGholish Infiltration', desc: 'Memory thread injection & wscript spike' },
                    { id: 'ransomware_blackcat', label: '2. BlackCat Ransomware', desc: 'Handle file locking & privilege escalation' },
                    { id: 'ddos_synflood', label: '3. Volumetric SYN Flood', desc: 'High-frequency TCP packet burst' },
                    { id: 'coinminer', label: '4. XMRig CryptoMiner', desc: 'High CPU utilization & stratum ports' },
                    { id: 'zeroday_anomaly', label: '5. Zero-Day Unknown Flow', desc: 'Autoencoder reconstruction divergence' },
                  ].map((atk) => (
                    <button
                      key={atk.id}
                      onClick={() => handleSimulateAttack(atk.id)}
                      className={`w-full p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                        clientActiveThreat === atk.id
                          ? 'bg-rose-950/70 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-rose-500/40'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{atk.label}</div>
                        <div className="text-[10px] text-slate-400">{atk.desc}</div>
                      </div>
                      <Play className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={handleClearAttack}
                className="w-full py-2.5 mt-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg transition"
              >
                Clear Attack / Restore Normal Telemetry
              </button>
            </div>
          </div>
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
              currentSenderId={clientNodeId}
              currentSenderName={`Host Node (${clientNodeId})`}
              currentSenderRole="ENDPOINT"
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
        currentRole="client"
        currentIdentifier={clientNodeId}
      />
    </div>
  );
};
