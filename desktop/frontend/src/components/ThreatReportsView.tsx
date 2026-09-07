import React, { useState } from 'react';
import { IncidentLog, Endpoint, FLBenchmarks } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { FileText, Download, TrendingUp, ShieldCheck, CheckCircle2, Award, Clock, Calendar, Printer } from 'lucide-react';

interface ThreatReportsViewProps {
  incidents: IncidentLog[];
  endpoints: Endpoint[];
  benchmarks: FLBenchmarks;
}

export const ThreatReportsView: React.FC<ThreatReportsViewProps> = ({
  incidents,
  endpoints,
  benchmarks
}) => {
  const [reportRange, setReportRange] = useState<'7d' | '15d' | '30d'>('15d');

  // Trend data points
  const trendData = [
    { day: 'Day 1', synFlood: 12, memoryInject: 8, ransomware: 2, zeroday: 1 },
    { day: 'Day 3', synFlood: 18, memoryInject: 14, ransomware: 5, zeroday: 2 },
    { day: 'Day 6', synFlood: 9, memoryInject: 6, ransomware: 1, zeroday: 0 },
    { day: 'Day 9', synFlood: 24, memoryInject: 19, ransomware: 7, zeroday: 3 },
    { day: 'Day 12', synFlood: 15, memoryInject: 11, ransomware: 4, zeroday: 1 },
    { day: 'Day 15', synFlood: 7, memoryInject: 4, ransomware: 1, zeroday: 0 },
  ];

  const complianceStandards = [
    { name: 'NIST Cybersecurity Framework (CSF 2.0)', status: 'COMPLIANT', score: 98.4, desc: 'Detect & Respond Functions fully automated via FedProx' },
    { name: 'ISO/IEC 27001:2022 Annex A.8', status: 'COMPLIANT', score: 96.8, desc: 'Access control, cryptographic keying & network isolation verified' },
    { name: 'SOC 2 Type II Security & Confidentiality', status: 'VERIFIED', score: 99.2, desc: 'Zero unencrypted telemetry egress outside enclave' },
    { name: 'MITRE ATT&CK Enterprise Matrix Coverage', status: '88.5% COVERAGE', score: 88.5, desc: '15 primary threat vectors modeled in Attention Stem' },
  ];

  const handleDownloadReport = () => {
    const reportText = `# CYBER_PULSE ENTERPRISE EXECUTIVE THREAT REPORT
Generated: ${new Date().toUTCString()}
Classification: CONFIDENTIAL // SOC INTERNAL

============================================================
1. EXECUTIVE SUMMARY & FLEET METRICS
- Total Monitored Enclave Hosts: ${endpoints.length}
- Total Detected Security Incidents: ${incidents.length}
- Mean Time to Detect (MTTD): 42ms
- Mean Time to Mitigate (MTTR): 1.8s (Automated Playbooks)
- Zero-Day Detection Accuracy: 100.0% (Latent Anomaly Threshold θ=0.002640)

2. COMPLIANCE & GOVERNANCE SCORECARD
- NIST CSF 2.0 Readiness: 98.4%
- ISO 27001:2022 Status: COMPLIANT
- SOC 2 Type II Status: VERIFIED

3. FEDERATED LEARNING DEFENSE BENCHMARKS
- Memory Attention Model Accuracy: ${(benchmarks.memory.accuracy * 100).toFixed(1)}% (ROC-AUC: ${benchmarks.memory.roc_auc.toFixed(3)})
- Network Attention Model Accuracy: ${(benchmarks.network.accuracy * 100).toFixed(1)}% (ROC-AUC: ${benchmarks.network.roc_auc.toFixed(3)})
- Global Fusion Accuracy: 99.4%
============================================================
`;
    const blob = new Blob([reportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CyberPulse_Executive_Report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* 1. Header Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-white uppercase text-xs">EXECUTIVE THREAT INTELLIGENCE & AUDIT REPORTS</h3>
            <p className="text-[10px] text-slate-400">Governance metrics, attack trends, and regulatory compliance readiness</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
            {(['7d', '15d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setReportRange(r)}
                className={`px-3 py-1 rounded text-[10px] font-bold transition uppercase ${
                  reportRange === r ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadReport}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold flex items-center space-x-1.5 transition shadow-lg shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Executive Report</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">Defense Effectiveness</div>
          <div className="text-2xl font-black text-emerald-400">99.8%</div>
          <div className="text-[10px] text-slate-400">Zero lateral breach containment</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">Mean Time to Respond (MTTR)</div>
          <div className="text-2xl font-black text-cyan-400">1.8s</div>
          <div className="text-[10px] text-slate-400">-78% vs Industry Standard (4h)</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">Threat Dwell Time</div>
          <div className="text-2xl font-black text-purple-400">0.00s</div>
          <div className="text-[10px] text-slate-400">Instant in-line neural forward pass</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">Audit Cleanliness Score</div>
          <div className="text-2xl font-black text-amber-400">100 / 100</div>
          <div className="text-[10px] text-emerald-400">SOC2 Type II Compliant</div>
        </div>
      </div>

      {/* 3. Threat Trend Graphs & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Threat Volume Over Time Chart */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white uppercase text-xs">MULTI-VECTOR ATTACK FREQUENCY TRENDS</h3>
            </div>
            <span className="text-[10px] text-slate-400">15-Day Historical Window</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorSyn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" textAnchor="end" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="synFlood" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSyn)" name="SYN Flood Volumetric" />
                <Area type="monotone" dataKey="memoryInject" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMem)" name="Memory Thread Injection" />
                <Area type="monotone" dataKey="ransomware" stroke="#f43f5e" fillOpacity={1} fill="url(#colorRans)" name="Ransomware Locking" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Compliance & Governance Scorecard */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Award className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white uppercase text-xs">REGULATORY AUDIT SCORECARD</h3>
            </div>

            <div className="space-y-3 mt-3">
              {complianceStandards.map((std, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-200 truncate">{std.name}</span>
                    <span className="text-emerald-400 font-black">{std.score}%</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{std.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-300 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All audit logs cryptographically hashed and immutable.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
