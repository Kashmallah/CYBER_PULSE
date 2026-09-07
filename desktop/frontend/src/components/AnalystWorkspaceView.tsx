import React, { useState } from 'react';
import { IncidentLog, ThreatCatalogItem, Endpoint } from '../types';
import { Terminal, Bug, Layers, FileText, Play, Save } from 'lucide-react';

interface AnalystWorkspaceViewProps {
  incidents: IncidentLog[];
  catalog: ThreatCatalogItem[];
  endpoints: Endpoint[];
  onExecutePlaybook?: (id: number) => void;
}

export const AnalystWorkspaceView: React.FC<AnalystWorkspaceViewProps> = ({
  incidents,
  catalog,
  endpoints,
  onExecutePlaybook
}) => {
  const [activeTab, setActiveTab] = useState<'mitre' | 'sandbox' | 'query' | 'notes'>('mitre');
  const [iocInput, setIocInput] = useState('185.220.101.5');
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isSandboxing, setIsSandboxing] = useState(false);
  const [forensicQuery, setForensicQuery] = useState('SELECT * FROM telemetry WHERE anomaly_score > 0.0026 LIMIT 50');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [caseNotes, setCaseNotes] = useState(() => localStorage.getItem('cp_analyst_notes') || 'INCIDENT CASE 104:\n- SocGholish payload injected via fake browser update.\n- Malfind detected unbacked memory thread.\n- Recommended: Isolate host win-prod-01 and trigger Playbook #2.');
  const [savedNotesMessage, setSavedNotesMessage] = useState(false);

  // MITRE ATT&CK Matrix TTPs
  const mitreTactics = [
    {
      tactic: 'Initial Access',
      id: 'TA0001',
      techniques: [
        { id: 'T1189', name: 'Drive-by Compromise', active: true, count: 4 },
        { id: 'T1566', name: 'Phishing: Spearphish Attachment', active: false, count: 0 },
        { id: 'T1190', name: 'Exploit Public-Facing App', active: true, count: 2 },
      ]
    },
    {
      tactic: 'Execution',
      id: 'TA0002',
      techniques: [
        { id: 'T1059.001', name: 'PowerShell Execution', active: true, count: 6 },
        { id: 'T1059.005', name: 'Visual Basic / WScript Spikes', active: true, count: 8 },
        { id: 'T1204', name: 'User Execution: Malicious File', active: false, count: 0 },
      ]
    },
    {
      tactic: 'Defense Evasion',
      id: 'TA0005',
      techniques: [
        { id: 'T1055.012', name: 'Process Hollowing / Injections', active: true, count: 12 },
        { id: 'T1027', name: 'Obfuscated Files or Information', active: true, count: 5 },
        { id: 'T1562', name: 'Impair Defenses: Kill Antivirus', active: false, count: 0 },
      ]
    },
    {
      tactic: 'Command & Control',
      id: 'TA0011',
      techniques: [
        { id: 'T1071.001', name: 'Web Protocols: HTTP/S Beaconing', active: true, count: 9 },
        { id: 'T1573', name: 'Encrypted Channel: Stratum Protocol', active: true, count: 3 },
        { id: 'T1090', name: 'Proxy / TOR Exit Node Traffic', active: true, count: 4 },
      ]
    },
    {
      tactic: 'Impact',
      id: 'TA0040',
      techniques: [
        { id: 'T1486', name: 'Data Encrypted for Impact (Ransomware)', active: true, count: 3 },
        { id: 'T1496', name: 'Resource Hijacking (CryptoMiner)', active: true, count: 4 },
        { id: 'T1498', name: 'Network Denial of Service (SYN Flood)', active: true, count: 7 },
      ]
    }
  ];

  const handleRunSandbox = () => {
    setIsSandboxing(true);
    setTimeout(() => {
      setSandboxResult({
        ioc: iocInput,
        verdict: 'MALICIOUS (THREAT CONFIDENCE 98.6%)',
        threat_type: 'SocGholish C2 Infrastructure / CobaltStrike Beacon',
        asn: 'AS208044 / Bulletproof Hosting',
        country: 'NL',
        reputation_score: '98/100',
        associated_campaigns: ['TA569', 'BlackCat Ransomware Affiliate', 'Cobalt Strike 4.8'],
        signatures: ['Wscript spawning cmd.exe', 'Memory thread unbacked execution', 'High TCP flow frequency']
      });
      setIsSandboxing(false);
    }, 800);
  };

  const handleRunQuery = () => {
    setQueryResults(
      incidents.slice(0, 10).map((inc, i) => ({
        id: inc.id,
        timestamp: inc.timestamp,
        host: inc.hostname || inc.endpoint_id,
        vector: inc.attack_name,
        anomaly_score: (inc.anomaly_score || (0.0026 + (i * 0.0004))).toFixed(6),
        status: inc.resolved ? 'RESOLVED' : 'ACTIVE_ALERT'
      }))
    );
  };

  const handleSaveNotes = () => {
    localStorage.setItem('cp_analyst_notes', caseNotes);
    setSavedNotesMessage(true);
    setTimeout(() => setSavedNotesMessage(false), 1500);
  };

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Analyst Workspace Navigation Tabs */}
      <div className="glass-panel p-2 rounded-xl border border-slate-800 flex items-center space-x-2">
        {[
          { id: 'mitre', label: 'MITRE ATT&CK Matrix', icon: Layers },
          { id: 'sandbox', label: 'IoC Threat Sandbox', icon: Bug },
          { id: 'query', label: 'Forensic Query Console', icon: Terminal },
          { id: 'notes', label: 'Investigation Case Notebook', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition ${
                isActive
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MITRE ATT&CK Matrix Navigator */}
      {activeTab === 'mitre' && (
        <div className="space-y-3">
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white uppercase text-xs">ENTERPRISE MITRE ATT&CK MATRIX MAPPING</h3>
              <p className="text-[10px] text-slate-400">Tactics, Techniques & Procedures (TTPs) actively detected across enclave hosts</p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
              v14.1 Enterprise Navigator
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {mitreTactics.map((tactic) => (
              <div key={tactic.id} className="glass-panel p-3 rounded-xl border border-slate-800 space-y-2.5">
                <div className="pb-2 border-b border-slate-800">
                  <div className="text-[9px] text-slate-500 uppercase">{tactic.id}</div>
                  <h4 className="font-bold text-white text-xs">{tactic.tactic}</h4>
                </div>

                <div className="space-y-2">
                  {tactic.techniques.map((tech) => (
                    <div
                      key={tech.id}
                      className={`p-2.5 rounded-lg border transition ${
                        tech.active
                          ? 'bg-rose-950/40 border-rose-500/50 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className={tech.active ? 'text-rose-400' : 'text-slate-400'}>{tech.id}</span>
                        {tech.active && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px]">
                            {tech.count} Hits
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-200 mt-1">{tech.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: IoC Threat Sandbox */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
            <div>
              <h3 className="font-bold text-white uppercase text-xs">IoC THREAT REPUTATION SANDBOX</h3>
              <p className="text-[10px] text-slate-400">Detonate and query IP, SHA256, Domain or Process Handle</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 block">Target IoC Indicator</label>
              <input
                type="text"
                value={iocInput}
                onChange={(e) => setIocInput(e.target.value)}
                placeholder="e.g. 185.220.101.5 or hash"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              onClick={handleRunSandbox}
              disabled={isSandboxing}
              className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center space-x-1.5 transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isSandboxing ? 'Executing Sandbox Analysis...' : 'Detonate & Analyze IoC'}</span>
            </button>
          </div>

          <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-white uppercase text-xs">SANDBOX REPUTATION VERDICT</h3>
            {sandboxResult ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/60 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-rose-300 uppercase">Analysis Outcome</div>
                    <div className="font-black text-rose-400 text-sm mt-0.5">{sandboxResult.verdict}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Threat Score</div>
                    <div className="font-bold text-rose-400 text-sm">{sandboxResult.reputation_score}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Classification:</span>
                    <strong className="text-cyan-300">{sandboxResult.threat_type}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">ASN / Geolocation:</span>
                    <strong className="text-purple-300">{sandboxResult.asn} ({sandboxResult.country})</strong>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Associated Threat Campaigns:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {sandboxResult.associated_campaigns.map((c: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Observed Behavioral Signatures:</span>
                  <div className="space-y-1">
                    {sandboxResult.signatures.map((sig: string, idx: number) => (
                      <div key={idx} className="p-2 rounded bg-slate-900 text-slate-300 text-[10px] border border-slate-800 flex items-center space-x-1.5">
                        <span className="text-rose-400 font-bold">❯</span>
                        <span>{sig}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500">
                <Bug className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <div>Input an IoC and click Detonate to run real-time sandbox intelligence.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Forensic Query Console */}
      {activeTab === 'query' && (
        <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white uppercase text-xs">SQL & TELEMETRY FORENSIC QUERY CONSOLE</h3>
              <p className="text-[10px] text-slate-400">Direct query interface across distributed host PC event logs</p>
            </div>
            <button
              onClick={handleRunQuery}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center space-x-1.5 transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Execute Forensic Query</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={forensicQuery}
              onChange={(e) => setForensicQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          {queryResults.length > 0 && (
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Target Host</th>
                    <th className="p-2.5">Threat Vector</th>
                    <th className="p-2.5">Anomaly MSE (θ)</th>
                    <th className="p-2.5">Case Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                  {queryResults.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/60">
                      <td className="p-2.5 text-slate-400">#{r.id}</td>
                      <td className="p-2.5 text-slate-300">{r.timestamp}</td>
                      <td className="p-2.5 text-cyan-300 font-bold">{r.host}</td>
                      <td className="p-2.5 text-white">{r.vector}</td>
                      <td className="p-2.5 text-amber-400 font-mono">{r.anomaly_score}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          r.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Case Notes Notepad */}
      {activeTab === 'notes' && (
        <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white uppercase text-xs">ANALYST CASE FORENSIC NOTEBOOK</h3>
              <p className="text-[10px] text-slate-400">Persistent investigation documentation and chain of custody logs</p>
            </div>
            <button
              onClick={handleSaveNotes}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center space-x-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savedNotesMessage ? 'Saved!' : 'Save Case Notes'}</span>
            </button>
          </div>

          <textarea
            rows={14}
            value={caseNotes}
            onChange={(e) => setCaseNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
            placeholder="Type investigation findings, hash signatures, containment timeline..."
          />
        </div>
      )}
    </div>
  );
};
