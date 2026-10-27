import React, { useState } from 'react';
import { FormattedMarkdown } from './FormattedMarkdown';
import { ChatMessage, Endpoint } from '../types';
import { MessageSquare, Send, Radio, Hash, Users, UserCheck } from 'lucide-react';

interface ChatHubProps {
  messages: ChatMessage[];
  currentSenderId: string;
  currentSenderName: string;
  currentSenderRole: 'SOC_MASTER' | 'SUB_SERVER' | 'ENDPOINT';
  endpoints?: Endpoint[];
  onSendMessage: (msg: { message: string; channel: string; recipient?: string }) => Promise<void>;
}

export const ChatHub: React.FC<ChatHubProps> = ({
  messages,
  currentSenderId,
  currentSenderName,
  currentSenderRole,
  endpoints = [],
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('all');

  const handleSend = async () => {
    if (!inputText.trim()) return;
    await onSendMessage({
      message: inputText,
      channel: activeChannel,
      recipient: selectedRecipient
    });
    setInputText('');
  };

  const channelMessages = messages.filter((m) => m.channel === activeChannel);

  return (
    <div className="w-full h-full glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between font-mono text-xs shadow-2xl">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider uppercase">
                INTER-HOST SECURE CHAT HUB
              </h2>
              <div className="text-[10px] text-slate-400">Encrypted P2P & Broadcast Tactical Comms</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>ENCRYPTED RELAY: ACTIVE</span>
          </div>
        </div>

        {/* Channel and Recipient Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-slate-800/80">
          {/* Channels */}
          <div className="flex space-x-1.5">
            {['general', 'alerts-triage', 'fl-federation'].map((ch) => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs transition ${
                  activeChannel === ch
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Hash className="w-3 h-3" />
                <span>{ch}</span>
              </button>
            ))}
          </div>

          {/* Recipient Target Selector */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400 text-[10px] uppercase flex items-center space-x-1">
              <Users className="w-3 h-3 text-cyan-400" />
              <span>Send To:</span>
            </span>
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="all">[ALL] Broadcast (Fleet)</option>
              <option value="soc_master">[SOC] Central Master Server</option>
              {endpoints.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  [NODE] {ep.hostname} ({ep.os_type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 max-h-[380px]">
        {channelMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No transmissions recorded in #{activeChannel}.
          </div>
        ) : (
          channelMessages.map((msg) => {
            const isMe = msg.sender_id === currentSenderId;
            const roleBadge =
              {
                SOC_MASTER: 'bg-cyan-950 text-cyan-300 border-cyan-500/50',
                SUB_SERVER: 'bg-purple-950 text-purple-300 border-purple-500/50',
                ENDPOINT: 'bg-slate-800 text-slate-300 border-slate-700'
              }[msg.sender_role] || 'bg-slate-800 text-slate-300';

            return (
              <div
                key={msg.id}
                className={`p-3 rounded-xl border ${
                  isMe
                    ? 'bg-cyan-950/30 border-cyan-500/40 ml-12 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 mr-12'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 border-b border-slate-800/80 pb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{msg.sender_name}</span>
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] ${roleBadge}`}>
                      {msg.sender_role}
                    </span>
                  </div>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="text-slate-200 text-xs leading-relaxed">
                  <FormattedMarkdown content={msg.message} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <div className="pt-3 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          placeholder={`Transmission to #${activeChannel} [Target: ${
            selectedRecipient === 'all' ? 'All Fleet' : selectedRecipient
          }]...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs font-mono"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black px-4 py-2 rounded-lg font-bold flex items-center space-x-1.5 transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Transmit</span>
        </button>
      </div>
    </div>
  );
};
