
import React from 'react';
import { Zap, BookOpen, Heart, Info, Sparkles } from 'lucide-react';
import { HostPersonality } from '../types';
import { PERSONALITY_PROFILES } from '../constants';

interface Props {
  currentPersonality: HostPersonality;
  onSelect: (personality: HostPersonality) => void;
  isProcessing?: boolean;
}

const PersonalitySelector: React.FC<Props> = ({ currentPersonality, onSelect, isProcessing }) => {
  const options: { id: HostPersonality, icon: any, color: string }[] = [
    { id: 'enthusiast', icon: Zap, color: 'text-amber-400' },
    { id: 'expert', icon: BookOpen, color: 'text-sky-400' },
    { id: 'companion', icon: Heart, color: 'text-pink-400' },
    { id: 'expressive', icon: Sparkles, color: 'text-purple-400' }
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 px-1">
        <Info className={`w-3 h-3 transition-colors ${isProcessing ? 'text-indigo-400 animate-pulse' : 'text-slate-600'}`} />
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Character Profile</span>
      </div>

      <div className="flex p-1 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 ring-1 ring-white/5 shadow-2xl">
        {options.map((opt) => {
          const profile = PERSONALITY_PROFILES[opt.id];
          const isActive = currentPersonality === opt.id;
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl transition-all duration-300 relative ${
                isActive 
                  ? `bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 ${isProcessing ? 'animate-pulse' : ''}` 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive && isProcessing ? 'animate-spin' : ''}`} />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-tighter leading-none">
                  {profile.name.split(' ')[0]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PersonalitySelector;
