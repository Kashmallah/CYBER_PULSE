import React, { useState } from 'react';
import { IncidentLog } from '../types';
import { ShieldAlert, CheckCircle, Clock, Filter, Play, Check, Trash2, FileText, Download } from 'lucide-react';

interface IncidentLogsViewProps {
  logs: IncidentLog[];
  onExecutePlaybook: (incidentId: number) => Promise<void>;
  onClearAllLogs?: () => Promise<void>;
}

export const IncidentLogsView: React.FC<IncidentLogsViewProps> = ({
  logs,
  onExecutePlaybook,
  onClearAllLogs
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const filteredLogs = logs.filter((log) => {
    if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false;
    return true;
  });

  const handleRunPlaybook = async (id: number) => {
    setExecutingId(id);
    try {
      await onExecutePlaybook(id);
    } finally {
      setExecutingId(null);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to purge all 15-day forensic incident logs from the database?')) {
      return;
    }
    if (onClearAllLogs) {
      setIsClearing(true);
      try {
        await onClearAllLogs();
      } finally {
        setIsClearing(false);
      }
    }
  };

  const handleGeneratePdfReport = () => {
    const criticalCount = logs.filter((l) => l.severity === 'Critical').length;
    const highCount = logs.filter((l) => l.severity === 'High').length;
    const medCount = logs.filter((l) => l.severity === 'Medium').length;
    const lowCount = logs.filter((l) => l.severity === 'Low').length;
    const resolvedCount = logs.filter((l) => l.resolved).length;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CYBER PULSE - Forensic Incident Audit Report</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Courier New', monospace, sans-serif; background: #fff; color: #111; margin: 0; padding: 20px; font-size: 11px; }
          .header { border-bottom: 3px double #111; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #0a2540; }
          .subtitle { font-size: 10px; color: #555; text-transform: uppercase; margin-top: 4px; }
          .meta-grid { display: flex; justify-content: space-between; background: #f4f6f8; padding: 10px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #ddd; }
          .meta-item strong { display: block; font-size: 12px; color: #000; }
          .summary-table, .log-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .summary-table th, .summary-table td, .log-table th, .log-table td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          .log-table th { background: #0a2540; color: #fff; text-transform: uppercase; font-size: 10px; }
          .severity-Critical { color: #d32f2f; font-weight: bold; }
          .severity-High { color: #e65100; font-weight: bold; }
          .severity-Medium { color: #f57f17; }
          .severity-Low { color: #388e3c; }
          .footer { margin-top: 30px; font-size: 9px; color: #777; border-top: 1px solid #ccc; padding-top: 10px; text-align: center; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">CYBER PULSE DEFENSE ENCLAVE</div>
          <div class="subtitle">15-Day Rolling Forensic Threat & Incident Audit Report</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span>Report Generation:</span>
            <strong>${new Date().toLocaleString()}</strong>
          </div>
          <div class="meta-item">
            <span>Total Logged Incidents:</span>
            <strong>${logs.length} Records</strong>
          </div>
          <div class="meta-item">
            <span>Resolved Incidents:</span>
            <strong>${resolvedCount} / ${logs.length}</strong>
          </div>
          <div class="meta-item">
            <span>Enclave Status:</span>
            <strong>FEDPROX AUDITED</strong>
          </div>
        </div>

        <h3>1. Incident Severity Breakdown</h3>
        <table class="summary-table">
          <thead>
            <tr style="background:#eee;">
              <th>Severity Level</th>
              <th>Incident Count</th>
              <th>Percentage</th>
              <th>Default Mitigation Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="severity-Critical">Critical</td>
              <td>${criticalCount}</td>
              <td>${logs.length ? ((criticalCount / logs.length) * 100).toFixed(1) : 0}%</td>
              <td>Instant Network Quarantine & Micro-Segmentation</td>
            </tr>
            <tr>
              <td class="severity-High">High</td>
              <td>${highCount}</td>
              <td>${logs.length ? ((highCount / logs.length) * 100).toFixed(1) : 0}%</td>
              <td>C2 Sinkholing & Socket Termination</td>
            </tr>
            <tr>
              <td class="severity-Medium">Medium</td>
              <td>${medCount}</td>
              <td>${logs.length ? ((medCount / logs.length) * 100).toFixed(1) : 0}%</td>
              <td>Process Termination & Cache Flush</td>
            </tr>
            <tr>
              <td class="severity-Low">Low</td>
              <td>${lowCount}</td>
              <td>${logs.length ? ((lowCount / logs.length) * 100).toFixed(1) : 0}%</td>
              <td>EDR Telemetry Whitelist Validation</td>
            </tr>
          </tbody>
        </table>

        <h3>2. Forensic Incident Ledger</h3>
        <table class="log-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>Target Host</th>
              <th>Threat Vector Signature</th>
              <th>Severity</th>
              <th>Anomaly Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${logs
              .map(
                (l) => `
              <tr>
                <td>#${l.id}</td>
                <td>${l.timestamp}</td>
                <td><strong>${l.hostname}</strong> (${l.endpoint_id})</td>
                <td>${l.attack_name}</td>
                <td class="severity-${l.severity}">${l.severity}</td>
                <td>${Number(l.anomaly_score).toFixed(4)}</td>
                <td>${l.resolved ? 'RESOLVED' : 'ACTIVE THREAT'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          CYBER PULSE v2.0 • Autonomous Multi-Host Defense Enclave • Confidential Forensic Documentation
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
    }
  };

  return (
    <div className="w-full glass-panel rounded-xl p-5 border border-slate-800 flex flex-col space-y-4 font-mono text-xs">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-slate-100 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="uppercase">15-DAY ROLLING FORENSIC INCIDENT LOGS</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Automated database retention policy storing telemetry alerts for 15 calendar days.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Severity Filter */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Severities ({logs.length})</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Generate PDF Report Button */}
          <button
            onClick={handleGeneratePdfReport}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition font-bold"
            title="Generate and print/save formatted PDF forensic incident report"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Generate Report (PDF)</span>
          </button>

          {/* Remove All Logs Button */}
          <button
            onClick={handleClearLogs}
            disabled={isClearing || logs.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-500/40 disabled:opacity-40 transition font-bold"
            title="Purge all 15-day logs from database"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>{isClearing ? 'Clearing...' : 'Remove All Logs'}</span>
          </button>
        </div>
      </div>

      {/* Incident Table */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Target Host</th>
              <th className="py-3 px-4">Threat Signature</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Anomaly Score</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No forensic incident logs match the selected filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isResolving = executingId === log.id;
                return (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 px-4 font-bold text-white">
                      <div>{log.hostname}</div>
                      <div className="text-[10px] text-slate-500">{log.endpoint_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-cyan-300 font-bold">{log.attack_name}</div>
                      <div className="text-[10px] text-slate-400 max-w-xs truncate">{log.details}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                          log.severity === 'Critical'
                            ? 'bg-rose-950 border-rose-500 text-rose-300'
                            : log.severity === 'High'
                              ? 'bg-amber-950 border-amber-500 text-amber-300'
                              : log.severity === 'Medium'
                                ? 'bg-yellow-950 border-yellow-500 text-yellow-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-purple-300">
                      {Number(log.anomaly_score).toFixed(4)}
                    </td>
                    <td className="py-3 px-4">
                      {log.resolved ? (
                        <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>RESOLVED</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-rose-400 text-[10px] animate-pulse">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>ACTIVE THREAT</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.resolved ? (
                        <span className="text-[10px] text-slate-500">Playbook Executed</span>
                      ) : (
                        <button
                          onClick={() => handleRunPlaybook(log.id)}
                          disabled={isResolving}
                          className="bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded text-[10px] font-bold transition flex items-center space-x-1 ml-auto"
                        >
                          {isResolving ? (
                            <span>Executing...</span>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
                              <span>Run Playbook</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
