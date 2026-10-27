import React, { useState, useEffect } from 'react';
import { Settings, Power, Lock, Key, Server, Check, X, Shield, Palette, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl: string;
  onSaveServerUrl: (url: string) => void;
  currentTheme: string;
  onSaveTheme: (theme: string) => void;
  currentRole?: 'admin' | 'client';
  currentIdentifier?: string;
  geminiKey?: string;
  onSaveGeminiKey?: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  serverUrl,
  onSaveServerUrl,
  currentTheme,
  onSaveTheme,
  currentRole = 'admin',
  currentIdentifier
}) => {
  const [autostart, setAutostart] = useState(false);
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [themeInput, setThemeInput] = useState(currentTheme);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Password Management State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeIdentifier = currentIdentifier || (currentRole === 'admin' ? 'admin' : 'win-prod-01');

  useEffect(() => {
    if (isOpen) {
      setThemeInput(currentTheme);
      setUrlInput(serverUrl);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback(null);
    }
    // Check if running in Electron and query autostart status
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.invoke('get-autostart-status').then((status: boolean) => {
          setAutostart(status);
        });
      } catch (e) {
        console.log('Not in Electron environment');
      }
    }
  }, [isOpen, currentTheme, serverUrl]);

  if (!isOpen) return null;

  const handleToggleAutostart = async () => {
    const nextState = !autostart;
    setAutostart(nextState);
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        await ipcRenderer.invoke('set-autostart-status', nextState);
      } catch (e) {
        console.error('Failed to set autostart via IPC', e);
      }
    }
  };

  const handleSaveGeneral = () => {
    onSaveServerUrl(urlInput);
    onSaveTheme(themeInput);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please fill in all password fields.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    if (newPassword.length < 3) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 3 characters long.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (currentRole === 'admin') {
        const res = await fetch(`${urlInput}/api/auth/change-password/server`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: activeIdentifier,
            old_password: oldPassword,
            new_password: newPassword
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to update admin password.');
        }
        setPasswordFeedback({ type: 'success', message: 'Admin password successfully updated!' });
      } else {
        const res = await fetch(`${urlInput}/api/auth/change-password/client`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: activeIdentifier,
            old_passcode: oldPassword,
            new_passcode: newPassword
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Failed to update node passcode.');
        }
        setPasswordFeedback({ type: 'success', message: `Passcode for ${activeIdentifier} successfully updated!` });
      }

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordFeedback({ type: 'error', message: err.message || 'Error updating password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const isAdmin = currentRole === 'admin';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl font-mono text-xs space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isAdmin ? 'SOC MASTER SERVER SETTINGS' : 'ENDPOINT CLIENT ENCLAVE SETTINGS'}
              </h3>
              <div className="text-[10px] text-slate-400">
                Active Session: <strong className={isAdmin ? 'text-cyan-400' : 'text-purple-400'}>{activeIdentifier}</strong>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Password / Credential Change Card */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800/80">
            <Lock className={`w-4 h-4 ${isAdmin ? 'text-cyan-400' : 'text-purple-400'}`} />
            <div>
              <div className="font-bold text-slate-200">
                {isAdmin ? 'Change SOC Admin Password' : `Update Enclave Passcode (${activeIdentifier})`}
              </div>
              <div className="text-[10px] text-slate-400">
                {isAdmin
                  ? 'Update credentials for Central SOC Commander'
                  : 'Update credentials for your assigned host node only'}
              </div>
            </div>
          </div>

          {passwordFeedback && (
            <div
              className={`p-2.5 rounded-lg border text-[11px] flex items-center space-x-2 ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
              }`}
            >
              {passwordFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{passwordFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-2.5">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                {isAdmin ? 'Current Admin Password' : 'Current Node Passcode'}
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  {isAdmin ? 'New Password' : 'New Passcode'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                isAdmin
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                  : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isUpdatingPassword ? 'Updating Credentials...' : 'Save New Password'}</span>
            </button>
          </form>
        </div>

        {/* 2. OS Startup Toggle */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Power className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-slate-200">Launch on System Boot</div>
                <div className="text-[10px] text-slate-400">Prompt for login & register background daemon</div>
              </div>
            </div>

            <button
              onClick={handleToggleAutostart}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                autostart ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="bg-black w-4 h-4 rounded-full shadow-md transform transition" />
            </button>
          </div>

          <div className="text-[10px] text-slate-500 bg-slate-900/60 p-2 rounded border border-slate-800">
            Registry Target: <code>HKCU\Software\Microsoft\Windows\CurrentVersion\Run</code> (Win) or <code>~/.config/autostart/cyberpulse.desktop</code> (Linux)
          </div>
        </div>

        {/* 3. Central SOC Server URL */}
        <div className="space-y-1.5">
          <label className="block text-slate-300 font-bold flex items-center space-x-1.5">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>Central SOC Master Server Address</span>
          </label>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="http://127.0.0.1:8000"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
          />
        </div>

        {/* 4. Select UI Theme */}
        <div className="space-y-1.5">
          <label className="block text-slate-300 font-bold flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>System UI Theme Directive</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              OS Detect: <strong className="text-cyan-400">{typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}</strong>
            </span>
          </label>
          <select
            value={themeInput}
            onChange={(e) => setThemeInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
          >
            <option value="system">SYSTEM DEFAULT (AUTO: MATCH OS SETTINGS)</option>
            <option value="light">CLARITY LIGHT (ENTERPRISE WHITE)</option>
            <option value="cyberpunk">CYBERPUNK NEON (DARK DEFAULT)</option>
            <option value="matrix">MATRIX TERMINAL (GHOST GREEN)</option>
            <option value="crimson">RETRO CRIMSON (RUBY ALERTS)</option>
            <option value="nordic">NORDIC FROST (ICE BLUE)</option>
          </select>
          <div className="text-[10px] text-slate-400 mt-1">
            {themeInput === 'system'
              ? 'Automatically matches host OS preferences (Light theme when OS is light, Dark when OS is dark).'
              : themeInput === 'light'
                ? 'High-contrast enterprise clarity light theme with crisp typography.'
                : 'Dark SOC interface with custom accent coloring.'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSaveGeneral}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center space-x-1.5 transition"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-black" /> : null}
            <span>{savedSuccess ? 'Applied!' : 'Apply General Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
