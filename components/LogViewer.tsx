import React from 'react';
import { LogEntry } from '../types';
import { Volume2, User, MessageCircle, ArrowRight, Quote } from 'lucide-react';

interface Props {
  logs: LogEntry[];
}

const LogViewer: React.FC<Props> = ({ logs }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
      {logs.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3">
           <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-white/5">
             <MessageCircle className="w-6 h-6 text-slate-700" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest">No Activity Logged</p>
        </div>
      )}
      {logs.map((log) => (
        <div key={log.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3 hover:bg-white/[0.05] transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                 <User className="w-3 h-3 text-indigo-400" />
              </div>
              <span className="text-xs font-bold text-white tracking-tight">{log.user}</span>
            </div>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest">
              {log.intent.replace('_', ' ')}
            </span>
          </div>
          
          <div className="flex items-start gap-2 bg-black/20 p-2.5 rounded-xl">
            <Quote className="w-3 h-3 text-slate-600 rotate-180 shrink-0 mt-1" />
            <p className="text-xs text-slate-400 italic font-medium leading-relaxed">
              {log.question}
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-emerald-400/30">
             <div className="flex-1 h-px bg-current"></div>
             <ArrowRight className="w-3 h-3" />
             <div className="flex-1 h-px bg-current"></div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex gap-3">
            <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-slate-200 font-medium leading-relaxed">
              {log.answer}
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-1">
             <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <span key={i} className="w-1.5 h-0.5 rounded-full bg-emerald-500/40"></span>
                ))}
             </div>
             <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
                Transmitted {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LogViewer;