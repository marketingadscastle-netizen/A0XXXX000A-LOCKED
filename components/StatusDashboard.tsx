import React from 'react';
import { Activity, Mic, Zap, History, HelpCircle, RefreshCw } from 'lucide-react';
import { SystemStatus } from '../types';

interface Props {
  status: SystemStatus;
  isEtalaseMode: boolean;
  quotaLevel: string;
  waitlist: number;
  totalChats: number;
  totalAnswered: number;
  latency: number;
}

const StatusDashboard: React.FC<Props> = ({
  status, isEtalaseMode, quotaLevel, waitlist, totalChats, totalAnswered, latency
}) => {
  // Helper to format latency
  const formatLatency = (ms: number) => ms > 1000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`;

  // Helper for status color and text
  const getStatusInfo = (s: SystemStatus) => {
    switch(s) {
        case SystemStatus.THINKING: return { text: 'THINKING', color: 'text-amber-400' };
        case SystemStatus.SPEAKING: return { text: 'SPEAKING', color: 'text-emerald-400' };
        case SystemStatus.ACTIVE: return { text: 'LISTENING', color: 'text-emerald-400' }; // Active implies listening/watching
        case SystemStatus.CAPTURING: return { text: 'WATCHING', color: 'text-blue-400' };
        case SystemStatus.IDLE: return { text: 'IDLE', color: 'text-slate-500' };
        default: return { text: 'STANDBY', color: 'text-slate-500' };
    }
  };

  const statusInfo = getStatusInfo(status);

  const items = [
    {
       label: 'AI HOST',
       value: statusInfo.text,
       icon: Activity,
       color: statusInfo.color,
    },
    {
       label: 'MODE',
       value: isEtalaseMode ? 'SELLER' : 'HOST',
       icon: Mic,
       color: isEtalaseMode ? 'text-emerald-400' : 'text-indigo-400',
    },
    {
       label: 'QUOTA LEVEL',
       value: (quotaLevel || 'NORMAL').toUpperCase(),
       icon: Zap,
       color: quotaLevel === 'exhausted' ? 'text-rose-500' : quotaLevel === 'warning' ? 'text-amber-400' : 'text-emerald-400',
    },
    {
       label: 'WAITLIST',
       value: `${waitlist} USERS`,
       icon: History,
       color: waitlist > 3 ? 'text-amber-400' : 'text-blue-400',
    },
    {
       label: 'Q&A SYNC',
       value: `${totalAnswered}/${totalChats}`,
       icon: HelpCircle,
       color: 'text-emerald-400',
    },
    {
       label: 'LATENCY',
       value: formatLatency(latency),
       icon: RefreshCw,
       color: latency > 5000 ? 'text-rose-400' : 'text-indigo-400',
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900/40 border-b border-white/5">
       {items.map((item, idx) => (
         <div key={idx} className="bg-slate-950/50 rounded-xl p-2 border border-white/5 flex items-center gap-2.5 shadow-sm">
            <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 ${item.color} shrink-0`}>
               <item.icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
               <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider truncate leading-tight mb-0.5">{item.label}</span>
               <span className={`text-[10px] font-bold ${item.color} truncate leading-tight font-mono`}>{item.value}</span>
            </div>
         </div>
       ))}
    </div>
  );
};
export default StatusDashboard;
