import React, { useState } from 'react';
import dragonLogo from '../assets/neon_cyber_dragon.jpg';
import { Shield, Server, Cpu, Lock, User, Key, AlertTriangle, RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../utils/theme';

interface LoginScreenProps {
  portalRole: 'admin' | 'client';
  serverUrl: string;
  onLoginSuccess: (role: 'admin' | 'client', clientNodeId?: string) => void;
  onBackToGateway?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  portalRole,
  serverUrl,
  onLoginSuccess
}) => {
  const { themeMode, isLight, toggleLightDark } = useTheme();
  // SOC Master Form State (Pre-filled with default credentials for convenience)
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  // Client Node Form State
  const [clientId, setClientId] = useState(() => sessionStorage.getItem('cp_client_node_id') || localStorage.getItem('cp_client_node_id') || 'win-prod-01');
  const [passcode, setPasscode] = useState('client123');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const activeServerUrl = (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) && (window.location.port === '5174' || window.location.hostname !== '192.168.10.3')
        ? 'http://192.168.10.3:8000'
        : serverUrl;

      if (portalRole === 'admin') {
        const response = await fetch(`${activeServerUrl}/api/auth/login/server`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'SOC Master authentication failed.');
        }

        await response.json();
        onLoginSuccess('admin');
      } else {
        const response = await fetch(`${activeServerUrl}/api/auth/login/client`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, passcode })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Endpoint Node authentication failed.');
        }

        const data = await response.json();
        onLoginSuccess('client', data.client_id);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to connect to Central SOC Master server.');
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = portalRole === 'admin';

  return (
    <div className="relative min-h-screen w-screen bg-slate-950 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 font-mono text-xs select-none">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleLightDark}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 transition flex items-center space-x-1.5 shadow-md"
          title={`Active Theme: ${themeMode === 'system' ? 'System Default (' + (isLight ? 'Light' : 'Dark') + ')' : isLight ? 'Clarity Light' : 'Cyberpunk Dark'}. Click to toggle.`}
        >
          {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          <span className="text-[10px] font-bold uppercase">{themeMode === 'system' ? 'AUTO' : isLight ? 'LIGHT' : 'DARK'}</span>
        </button>
      </div>

      <div className="max-w-md w-full glass-panel border border-slate-800/90 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Top Glow Stripe */}
        <div
          className={`absolute top-0 left-0 w-full h-[2px] ${
            isAdmin
              ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600'
              : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500'
          }`}
        />

        {/* Branding Header */}
        <div className="flex flex-col items-center space-y-3 mb-6">
          <div className="relative group cursor-pointer">
            <div className={`absolute -inset-1 rounded-2xl blur-md opacity-80 group-hover:opacity-100 transition duration-300 ${
              isAdmin
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600'
                : 'bg-gradient-to-r from-purple-500 to-cyan-500'
            }`}></div>
            <img
              src={dragonLogo}
              alt="Cyber Pulse Dragon"
              className="relative w-16 h-16 rounded-2xl object-contain bg-black border border-cyan-500/50 p-1 shadow-xl"
            />
          </div>
          <div className="text-center space-y-1">
            <h1 className="font-extrabold text-base tracking-widest text-white uppercase">
              {isAdmin ? (
                <>
                  SOC MASTER <span className="text-cyan-400">SERVER</span>
                </>
              ) : (
                <>
                  ENDPOINT CLIENT <span className="text-purple-400">ENCLAVE</span>
                </>
              )}
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
              {isAdmin
                ? 'Central Defense Orchestrator & FedProx Controller'
                : 'Local Shield, PyTorch Engine & SHAP Telemetry'}
            </p>
          </div>
        </div>

        {/* Error Notification Alert */}
        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-500/50 p-3.5 rounded-xl mb-6 flex items-start space-x-2.5 text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-normal">
              <div className="font-bold text-[10px] uppercase">ACCESS DENIED</div>
              <div className="text-[10px]">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Dedicated Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdmin ? (
            <>
              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold flex items-center space-x-1.5 uppercase text-[10px]">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Admin Identity Username</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username (e.g. admin)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold flex items-center space-x-1.5 uppercase text-[10px]">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Security Access Key</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter security key (e.g. admin123)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold flex items-center space-x-1.5 uppercase text-[10px]">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>Client Enclave Node ID</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter node ID (e.g. win-prod-01)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold flex items-center space-x-1.5 uppercase text-[10px]">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  <span>Enclave Access Passcode</span>
                </label>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter node passcode (e.g. client123)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1">
                <span>Central SOC Host:</span>
                <span className="text-purple-400 font-mono">192.168.10.3:8000</span>
              </div>
            </>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition ${
              isAdmin
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20'
            }`}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span>
              {isLoading
                ? 'Authenticating...'
                : isAdmin
                  ? 'Access SOC Master'
                  : 'Connect Client Enclave'}
            </span>
          </button>
        </form>

        {/* Security Badge */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <div className="text-[10px] text-slate-500 flex items-center justify-center space-x-1">
            <Lock className="w-3 h-3 text-slate-600" />
            <span>End-to-End Encrypted Session Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};
