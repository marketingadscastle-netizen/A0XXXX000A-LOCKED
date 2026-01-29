import React from 'react';
import { ChatMessage } from '../types';
import { Clock, MessageCircle, UserRound, HelpCircle, BadgeCheck, AtSign } from 'lucide-react';

interface Props {
  messages: ChatMessage[];
  queue: ChatMessage[];
  hostUsername?: string;
}

const ChatFeed: React.FC<Props> = ({ messages, queue, hostUsername }) => {
  const targetId = queue.length > 0 ? queue[0].chat_id : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/20">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
             <MessageCircle className="w-8 h-8 text-slate-700" />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Scanning Stream</p>
            <p className="text-[10px] text-slate-700 mt-1 uppercase tracking-widest font-medium">Capture Area is empty...</p>
          </div>
        </div>
      )}
      {messages.map((msg) => {
        const isUnknown = msg.user === 'Viewer' || !msg.user;
        const isTarget = msg.chat_id === targetId;
        const isMention = hostUsername && msg.message.toLowerCase().includes(`@${hostUsername.toLowerCase()}`);

        return (
          <div 
            key={msg.chat_id} 
            className={`group flex items-start gap-3 p-3 rounded-2xl border transition-all duration-500 ${
              isTarget 
                ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40 z-10' 
                : isMention
                  ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/40'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
            }`}
          >
            {/* 1. Profile Icon (Circular) */}
            <div className="shrink-0 pt-0.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-xl transition-all duration-300 ${
                isTarget 
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 scale-110' 
                  : isMention 
                    ? 'bg-indigo-500 text-white border-indigo-400 scale-105'
                    : 'bg-slate-800 text-slate-600 border-white/5'
              }`}>
                {isMention ? <AtSign className="w-5 h-5" /> : (isUnknown ? <HelpCircle className="w-5 h-5 opacity-40" /> : <UserRound className="w-5 h-5" />)}
              </div>
            </div>

            {/* 2. Chat Details Area */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Header Row: Name near the icon */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className={`text-[12px] font-black tracking-tight truncate ${isTarget ? 'text-emerald-400' : isMention ? 'text-indigo-400' : 'text-slate-200'}`}>
                    {isUnknown ? 'Guest Viewer' : msg.user}
                  </span>
                  {!isUnknown && <BadgeCheck className={`w-3 h-3 ${isTarget ? 'text-emerald-400' : isMention ? 'text-indigo-400' : 'text-slate-600'}`} />}
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-40">
                   <Clock className="w-2.5 h-2.5" />
                   <span className="text-[9px] font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Message content bubble (Below the name) */}
              <div className={`text-[13px] leading-relaxed p-3 rounded-xl border-l-2 ${
                isTarget 
                  ? 'bg-emerald-500/5 border-l-emerald-500 border-white/5 text-white font-bold shadow-inner' 
                  : isMention
                    ? 'bg-indigo-500/5 border-l-indigo-500 border-white/5 text-indigo-100 font-bold shadow-inner'
                    : 'bg-black/20 border-l-slate-700 border-white/5 text-slate-400 font-medium'
              }`}>
                {msg.message}
              </div>

              {/* Answering Pulse Indicator */}
              {isTarget && (
                <div className="flex items-center gap-2 pt-1">
                   <div className="flex gap-0.5">
                     <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                     <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '200ms' }}></span>
                     <span className="w-1 h-1 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '400ms' }}></span>
                   </div>
                   <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                     AI is answering this question...
                   </span>
                </div>
              )}
              {isMention && !isTarget && (
                <div className="flex items-center gap-2 pt-1">
                   <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                     Direct Mention Detected
                   </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatFeed;