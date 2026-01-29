import React from 'react';
import { UserCog, Quote, Gift, Info, AtSign, Eye, EyeOff } from 'lucide-react';

interface Props {
  roleDescription: string;
  onChange: (desc: string) => void;
  isGiftDetectionEnabled: boolean;
  onToggleGiftDetection: (enabled: boolean) => void;
  hostUsername: string;
  onHostUsernameChange: (name: string) => void;
  hostVisionEnabled?: boolean;
  onToggleHostVision?: (enabled: boolean) => void;
}

const HostRoleEditor: React.FC<Props> = ({ 
  roleDescription, 
  onChange, 
  isGiftDetectionEnabled, 
  onToggleGiftDetection,
  hostUsername,
  onHostUsernameChange,
  hostVisionEnabled = true,
  onToggleHostVision
}) => {
  return (
    <div className="flex flex-col h-full p-4 space-y-6">
      <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <UserCog className="w-5 h-5 text-indigo-400" />
          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300">Host Mode Active</h3>
        </div>
        <p className="text-[10px] text-indigo-200/70 leading-relaxed">
          In this mode, the AI stops selling specific products. It interacts based on your custom role.
        </p>
      </div>

      <div className="space-y-4">
        {/* Username Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <AtSign className="w-3 h-3 text-emerald-400" /> Platform Username
          </label>
          <input 
            type="text"
            value={hostUsername}
            onChange={(e) => onHostUsernameChange(e.target.value)}
            placeholder="e.g. your_tiktok_handle"
            className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-700 focus:border-emerald-500/50 outline-none transition-all"
          />
          <p className="text-[9px] text-slate-600 italic">
            Messages starting with @{hostUsername || 'username'} will be treated as direct tags/mentions.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
             {/* Visual Eye Toggle */}
             <div className={`p-3 rounded-xl border transition-all ${hostVisionEnabled ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-900 border-white/5'}`}>
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-400">
                      {hostVisionEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      Visual Eyes
                   </div>
                   {onToggleHostVision && (
                     <button 
                       onClick={() => onToggleHostVision(!hostVisionEnabled)}
                       className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${hostVisionEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}
                     >
                       <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 ${hostVisionEnabled ? 'left-4.5' : 'left-0.5'}`} style={{ left: hostVisionEnabled ? '18px' : '2px' }}></div>
                     </button>
                   )}
                </div>
                <p className="text-[8px] text-slate-500 leading-tight">
                   {hostVisionEnabled ? 'AI sees screen content & makes proactive comments.' : 'AI is blind. Reacts ONLY to chat messages.'}
                </p>
             </div>

             {/* Gift Toggle */}
             <div className={`p-3 rounded-xl border transition-all ${isGiftDetectionEnabled ? 'bg-pink-500/10 border-pink-500/30' : 'bg-slate-900 border-white/5'} ${!hostVisionEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-pink-400">
                      <Gift className="w-3.5 h-3.5" />
                      Gift Detect
                   </div>
                   <button 
                     onClick={() => onToggleGiftDetection(!isGiftDetectionEnabled)}
                     className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${isGiftDetectionEnabled ? 'bg-pink-500' : 'bg-slate-700'}`}
                   >
                     <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300`} style={{ left: isGiftDetectionEnabled ? '18px' : '2px' }}></div>
                   </button>
                </div>
                <p className="text-[8px] text-slate-500 leading-tight">
                   Detects gifts in visual area & thanks users.
                </p>
             </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-3 pt-2 border-t border-white/5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Quote className="w-3 h-3" /> Custom Host Role Description
        </label>
        <textarea
          value={roleDescription}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Example: You are a Horror Storyteller Host. You read scary comments and react with suspense."
          className="flex-1 w-full bg-slate-900/50 border border-white/5 rounded-2xl p-4 text-sm text-slate-300 placeholder:text-slate-700 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none leading-relaxed font-medium transition-all"
        />
        <p className="text-[9px] text-slate-600 text-center italic">
          The AI will combine this role with the "Real Human" voice style.
        </p>
      </div>
    </div>
  );
};

export default HostRoleEditor;