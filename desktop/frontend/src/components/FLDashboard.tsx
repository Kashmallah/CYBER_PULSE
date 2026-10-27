import React, { useState } from 'react';
import { FLBenchmarks, Endpoint } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Cpu, Play, Sliders, CheckCircle2, TrendingUp, Shield, RefreshCw } from 'lucide-react';

interface FLDashboardProps {
  benchmarks: FLBenchmarks;
  endpoints: Endpoint[];
  onTriggerTraining: (config: {
    model_type: string;
    target_nodes: string[];
    rounds: number;
    epochs: number;
    mu: number;
  }) => Promise<void>;
  isTraining: boolean;
}

export const FLDashboard: React.FC<FLDashboardProps> = ({
  benchmarks,
  endpoints,
  onTriggerTraining,
  isTraining
}) => {
  const [selectedModel, setSelectedModel] = useState<'memory' | 'network' | 'autoencoder' | 'fusion'>('network');
  const [selectedNodes, setSelectedNodes] = useState<string[]>(endpoints.map(e => e.id));
  const [rounds, setRounds] = useState<number>(15);
  const [epochs, setEpochs] = useState<number>(5);
  const [mu, setMu] = useState<number>(0.01);
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'controls' | 'history'>('benchmarks');

  const toggleNode = (id: string) => {
    if (selectedNodes.includes(id)) {
      setSelectedNodes(selectedNodes.filter(n => n !== id));
    } else {
      setSelectedNodes([...selectedNodes, id]);
    }
  };

  const handleStartTraining = async () => {
    await onTriggerTraining({
      model_type: selectedModel,
      target_nodes: selectedNodes,
      rounds,
      epochs,
      mu
    });
  };

  // Prepare chart history
  const historyData = benchmarks.history.filter(h => h.model_type === (selectedModel === 'memory' ? 'memory' : 'network')).map(h => ({
    round: `R${h.round}`,
    Accuracy: +(h.accuracy * 100).toFixed(2),
    F1_Score: +(h.f1_weighted * 100).toFixed(2),
    Loss: +h.loss.toFixed(4)
  }));

  return (
    <div className="w-full glass-panel rounded-xl p-5 border border-slate-800 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold font-mono tracking-wider text-slate-100 flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>DYNAMIC FEDERATED LEARNING ORCHESTRATION</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Non-IID FedProx aggregation with dynamic database benchmarks and hyperparameter regularizers.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-3 py-1.5 rounded-md transition ${activeTab === 'benchmarks' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Live Benchmarks
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`px-3 py-1.5 rounded-md transition ${activeTab === 'controls' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'}`}
          >
            Train Hyperparameters
          </button>
        </div>
      </div>

      {/* Dynamic Benchmarks Tab */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-4">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Memory Model Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">Memory Attention Model</span>
                <span className="text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                  Round {benchmarks.memory.round}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-mono font-bold text-white">
                    {(benchmarks.memory.accuracy * 100).toFixed(2)}%
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">Global Accuracy</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-emerald-400">
                    {(benchmarks.memory.f1_weighted * 100).toFixed(2)}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">Weighted F1</div>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800 flex justify-between">
                <span>ROC-AUC: <strong className="text-white">{(benchmarks.memory.roc_auc).toFixed(4)}</strong></span>
                <span>Modality: MalMem 55D</span>
              </div>
            </div>

            {/* Network Model Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-purple-400 uppercase">Network Attention Model</span>
                <span className="text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                  Round {benchmarks.network.round}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-mono font-bold text-white">
                    {(benchmarks.network.accuracy * 100).toFixed(2)}%
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">Global Accuracy</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-purple-300">
                    {(benchmarks.network.f1_weighted * 100).toFixed(2)}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">Weighted F1</div>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800 flex justify-between">
                <span>ROC-AUC: <strong className="text-white">{(benchmarks.network.roc_auc).toFixed(4)}</strong></span>
                <span>Modality: CICIDS 70D</span>
              </div>
            </div>

            {/* Zero-Day Autoencoder Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">Zero-Day Anomaly Autoencoder</span>
                <span className="text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                  Unsupervised
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-mono font-bold text-white">
                    $\theta = {benchmarks.zeroday.anomaly_threshold.toFixed(6)}$
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">Calibrated Decision $\theta$</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-slate-300">
                    $\mu$: {benchmarks.zeroday.mean_mse.toFixed(5)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">$\sigma$: {benchmarks.zeroday.std_mse.toFixed(5)}</div>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800 flex justify-between">
                <span>Rule: $MSE &gt; \theta \rightarrow$ Alert</span>
                <span>Source: zeroday_config.json</span>
              </div>
            </div>
          </div>

          {/* FL Metrics History Chart */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Federated Round Convergence Trajectory (fl_metrics.db)</span>
              </h4>
              <div className="flex space-x-2 text-xs font-mono">
                <button
                  onClick={() => setSelectedModel('memory')}
                  className={`px-2 py-0.5 rounded ${selectedModel === 'memory' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}
                >
                  Memory Model
                </button>
                <button
                  onClick={() => setSelectedModel('network')}
                  className={`px-2 py-0.5 rounded ${selectedModel === 'network' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400'}`}
                >
                  Network Model
                </button>
              </div>
            </div>

            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="round" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Line type="monotone" dataKey="Accuracy" stroke="#00f0ff" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="F1_Score" stroke="#00ff88" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Hyperparameters & Training Controls Tab */}
      {activeTab === 'controls' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          {/* Left Column: Select Model & Target Endpoints */}
          <div className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-2 uppercase flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>1. Select Target Neural Architecture</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'memory', label: 'Memory Attention', desc: 'Transformer + BiLSTM (MalMem)' },
                  { id: 'network', label: 'Network Attention', desc: 'LayerNorm Stem + Attention (CICIDS)' },
                  { id: 'autoencoder', label: 'Zero-Day Autoencoder', desc: 'Reconstruction Loss Anomaly' },
                  { id: 'fusion', label: 'Hybrid Cross-Fusion', desc: 'Multi-Modal Joint Embeddings' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id as any)}
                    className={`p-3 rounded-lg border text-left transition ${
                      selectedModel === m.id
                        ? 'bg-cyan-950/70 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-slate-200">{m.label}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-300 font-bold uppercase flex items-center space-x-1.5 text-xs">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>2. Select Target Endpoint Nodes / Cluster</span>
                </label>
                <div className="flex items-center space-x-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedNodes(endpoints.map((e) => e.id))}
                    className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedNodes([])}
                    className="text-slate-400 hover:text-slate-200 hover:underline"
                  >
                    Unselect All
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {endpoints.map((ep) => {
                  const isSelected = selectedNodes.includes(ep.id);
                  return (
                    <div
                      key={ep.id}
                      onClick={() => toggleNode(ep.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500/60 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" checked={isSelected} readOnly className="rounded accent-purple-500" />
                        <span className="font-bold">{ep.hostname}</span>
                        <span className="text-[10px] text-slate-500">({ep.os_type})</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{ep.ip_address}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Hyperparameters & Launch */}
          <div className="space-y-4 font-mono text-xs flex flex-col justify-between">
            <div className="space-y-3.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="font-bold text-slate-300 uppercase text-xs mb-1">3. FedProx & Local Optimizer Config</h4>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>FL Communication Rounds</span>
                  <span className="text-white font-bold">{rounds} Rounds</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={rounds}
                  onChange={(e) => setRounds(+e.target.value)}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Client Local Epochs (E)</span>
                  <span className="text-white font-bold">{epochs} Epochs</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={epochs}
                  onChange={(e) => setEpochs(+e.target.value)}
                  className="w-full accent-purple-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>FedProx Proximal Regularizer ($\mu$)</span>
                  <span className="text-white font-bold">$\mu = {mu}$</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={0.1}
                  step={0.005}
                  value={mu}
                  onChange={(e) => setMu(+e.target.value)}
                  className="w-full accent-emerald-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  $\mu$ prevents Non-IID client drift by penalizing local weights far from global consensus.
                </p>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleStartTraining}
              disabled={isTraining || selectedNodes.length === 0}
              className={`w-full py-3 rounded-xl font-bold font-mono tracking-wider flex items-center justify-center space-x-2 transition shadow-lg ${
                isTraining
                  ? 'bg-amber-900 border border-amber-600 text-amber-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black shadow-cyan-500/25'
              }`}
            >
              {isTraining ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>TRAINING IN PROGRESS...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>DISPATCH FEDERATED TRAINING ROUND</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
