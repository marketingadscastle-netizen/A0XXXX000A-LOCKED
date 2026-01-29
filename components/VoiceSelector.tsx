
import React from 'react';
import { UserRound, UserRoundSearch, Volume2, Sparkles } from 'lucide-react';
import { HostGender } from '../types';

interface Props {
  currentGender: HostGender;
  onSelect: (gender: HostGender) => void;
  onPreview: (gender: HostGender) => void;
  isProcessing?: boolean;
}

const VoiceSelector: React.FC<Props> = ({ currentGender, onSelect, onPreview, isProcessing }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className={`w-3 h-3 transition-colors ${isProcessing ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Host Voice Profile</span>
      </div>
      
      <div className="flex p-1 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 relative overflow-hidden ring-1 ring-white/5 shadow-2xl">
        <button 
          onClick={() => onSelect('female')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${
            currentGender === 'female' 
              ? `bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 ${isProcessing ? 'ring-2 ring-white/30' : ''}` 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <UserRound className={`w-3.5 h-3.5 ${currentGender === 'female' && isProcessing ? 'animate-bounce' : ''}`} />
          <span>Female</span>
          {currentGender === 'female' && !isProcessing && (
            <div 
              onClick={(e) => { e.stopPropagation(); onPreview('female'); }}
              className="ml-1 p-1 hover:bg-slate-950/20 rounded-md transition-colors"
            >
              <Volume2 className="w-3 h-3" />
            </div>
          )}
        </button>

        <button 
          onClick={() => onSelect('male')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${
            currentGender === 'male' 
              ? `bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 ${isProcessing ? 'ring-2 ring-white/30' : ''}` 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <UserRoundSearch className={`w-3.5 h-3.5 ${currentGender === 'male' && isProcessing ? 'animate-bounce' : ''}`} />
          <span>Male</span>
          {currentGender === 'male' && !isProcessing && (
            <div 
              onClick={(e) => { e.stopPropagation(); onPreview('male'); }}
              className="ml-1 p-1 hover:bg-slate-950/20 rounded-md transition-colors"
            >
              <Volume2 className="w-3 h-3" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default VoiceSelector;
