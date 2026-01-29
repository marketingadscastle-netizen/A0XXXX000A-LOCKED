import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Key, Activity } from 'lucide-react';
import { GeminiService } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  geminiService: GeminiService;
}

const ConfigModal: React.FC<Props> = ({ isOpen, onClose, geminiService }) => {
  const [keys, setKeys] = useState("");
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState("");
  const [quotaStatus, setQuotaStatus] = useState("normal");
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const savedKeys = localStorage.getItem("GEMINI_USER_KEYS") || "";
      setKeys(savedKeys);
      setStatus('idle');
      setStatusMessage("");
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("GEMINI_USER_KEYS", keys);
    onClose();
  };

  const checkConnection = async () => {
    setStatus('checking');
    // Save temporarily to test
    localStorage.setItem("GEMINI_USER_KEYS", keys);
    
    const result = await geminiService.validateConnection();
    
    if (result.success) {
      setStatus('success');
      setStatusMessage("Connected");
      setLatency(result.latency);
      setQuotaStatus("normal");
    } else {
      setStatus('error');
      setStatusMessage(result.message);
      if (result.quotaExhausted) setQuotaStatus("exhausted");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
               <SettingsIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">System Configuration</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Setup Gemini AI Connection</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Key className="w-3.5 h-3.5" /> Google Gemini API Keys
            </label>
            <textarea
              value={keys}
              onChange={(e) => setKeys(e.target.value)}
              placeholder="Paste keys separated by commas (e.g. AIzaSy..., AIzaSy...)"
              className="w-full h-28 bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs text-emerald-400 font-mono placeholder:text-slate-700 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none resize-none leading-relaxed"
            />
            <p className="text-[9px] text-slate-500 leading-relaxed">
              Keys are stored locally in your browser (localStorage). We support round-robin key rotation for higher quotas.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-300">Connection Status</h3>
              <button 
                onClick={checkConnection}
                disabled={status === 'checking'}
                className="bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {status === 'checking' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Check Now'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest block mb-1">Mode</span>
                  <span className="text-xs font-mono text-white flex items-center gap-2">
                    <Key className="w-3 h-3 text-slate-500" /> user_key
                  </span>
               </div>
               <div>
                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest block mb-1">Quota</span>
                  <span className={`text-xs font-mono flex items-center gap-2 ${quotaStatus === 'exhausted' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    <Activity className="w-3 h-3" /> {quotaStatus}
                  </span>
               </div>
               <div className="col-span-2 pt-2 border-t border-white/5">
                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest block mb-1">Last Message</span>
                  <div className="flex items-center gap-2">
                    {status === 'checking' && <span className="text-xs text-amber-400 animate-pulse">Ping...</span>}
                    {status === 'success' && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {statusMessage} ({latency}ms)</span>}
                    {status === 'error' && <span className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {statusMessage.substring(0, 40)}...</span>}
                    {status === 'idle' && <span className="text-xs text-slate-600">-</span>}
                  </div>
               </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 bg-slate-900/50">
          <button 
            onClick={handleSave}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            Save & Close
          </button>
        </div>

      </div>
    </div>
  );
};

// Simple Icon component for the header
const SettingsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export default ConfigModal;