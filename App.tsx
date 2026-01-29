import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Square, Package, MessageSquare, Play, Pause, Settings, LayoutDashboard, 
  Mic, User, Terminal, Boxes, MonitorPlay, Focus, Lock, Unlock, XCircle, Zap,
  AlertCircle
} from 'lucide-react';
import { GeminiService, decodeAudioBuffer } from './services/geminiService';
import { OCRService } from './services/ocrService';
import EtalaseEditor from './components/EtalaseEditor';
import ChatFeed from './components/ChatFeed';
import LogViewer from './components/LogViewer';
import StatusDashboard from './components/StatusDashboard';
import VoiceSelector from './components/VoiceSelector';
import PersonalitySelector from './components/PersonalitySelector';
import HostRoleEditor from './components/HostRoleEditor';
import ConfigModal from './components/ConfigModal'; 
import ResizableBox from './components/ResizableBox';
import { 
  ProductData, ChatMessage, LogEntry, SystemStatus, 
  HostGender, HostPersonality, Region
} from './types';
import { DEFAULT_PRODUCTS } from './constants';

// Interface for the Audio Queue
interface AudioQueueItem {
  buffer: AudioBuffer;
  logEntry: LogEntry;
}

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [products, setProducts] = useState<ProductData[]>(DEFAULT_PRODUCTS);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [queue, setQueue] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  
  // Host Configuration
  const [isEtalaseMode, setIsEtalaseMode] = useState(true);
  const [hostRoleDescription, setHostRoleDescription] = useState("");
  const [hostUsername, setHostUsername] = useState("");
  const [isGiftDetectionEnabled, setIsGiftDetectionEnabled] = useState(false);
  const [hostVisionEnabled, setHostVisionEnabled] = useState(true);
  const [personality, setPersonality] = useState<HostPersonality>('enthusiast');
  const [gender, setGender] = useState<HostGender>('female');

  // System Status
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.IDLE);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  
  // Separated States for Control Bar
  const [isLocked, setIsLocked] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'host' | 'logs'>('inventory');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Metrics
  const [quotaStatus, setQuotaStatus] = useState<string>('normal');
  const [latency, setLatency] = useState<number>(0);

  // --- CAPTURE REGIONS (Refs for logic, State for UI) ---
  const chatBoxRef = useRef<Region>({ x: 400, y: 300, width: 250, height: 300 });
  const visionBoxRef = useRef<Region>({ x: 50, y: 50, width: 300, height: 300 });

  const [visionBox, setVisionBox] = useState<Region>(visionBoxRef.current);
  const [chatBox, setChatBox] = useState<Region>(chatBoxRef.current);

  const updateChatBox = useCallback((newRegion: Region) => {
    setChatBox(newRegion);
    chatBoxRef.current = newRegion;
  }, []);

  const updateVisionBox = useCallback((newRegion: Region) => {
    setVisionBox(newRegion);
    visionBoxRef.current = newRegion;
  }, []);

  // --- REFS ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const visionCanvasRef = useRef<HTMLCanvasElement>(null); 
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null); 
  const geminiService = useRef(new GeminiService());
  const ocrService = useRef(new OCRService());
  const audioContext = useRef<AudioContext | null>(null);
  
  // PROCESSING REFS (MULTI-THINKING ARCHITECTURE)
  const processingRef = useRef(false); // Prevents overlapping API calls
  const queueRef = useRef<ChatMessage[]>([]); // Chat Queue
  
  // PLAYBACK REFS (VOICE STABILITY)
  const audioQueueRef = useRef<AudioQueueItem[]>([]); // Holds prepared audio buffers
  const isPlayingRef = useRef(false); // Prevents overlapping audio playback

  // --- INITIALIZATION ---
  useEffect(() => {
    ocrService.current.init();
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => { 
      ocrService.current.terminate(); 
      if (audioContext.current) audioContext.current.close();
    };
  }, []);

  // Sync state queue with ref
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Clear Audio Queue when Voice Profile Changes to ensure immediate switch
  useEffect(() => {
    audioQueueRef.current = [];
  }, [gender, personality]);

  // --- CAPTURE LOGIC ---
  const startCapture = async () => {
    setCaptureError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: 15,
          cursor: "always" 
        } as any, 
        audio: false 
      });
      
      streamRef.current = stream;
      setIsCapturing(true);
      setStatus(SystemStatus.IDLE);
      
      stream.getVideoTracks()[0].onended = () => stopCapture();
    } catch (err: any) {
      const isNotAllowed = err.name === 'NotAllowedError' || 
                           err.message?.toLowerCase().includes('denied') ||
                           err.message?.toLowerCase().includes('permission');

      if (isNotAllowed) {
        console.warn("Screen capture permission denied or cancelled by user.");
        setCaptureError("Capture Cancelled. Please select a screen/window to share.");
      } else {
        console.error("Capture Failed:", err);
        setCaptureError("Capture failed. Please try again.");
      }
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    if (isCapturing && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("Video play failed:", e));
    }
  }, [isCapturing]);

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setIsRunning(false); 
    setIsLocked(false);
    setStatus(SystemStatus.IDLE);
    audioQueueRef.current = []; // Clear audio queue on stop
  };

  // --- CROP LOGIC ---
  const cropFrame = (
    targetCanvas: HTMLCanvasElement, 
    sourceVideo: HTMLVideoElement, 
    region: Region, 
    container: HTMLDivElement
  ) => {
     const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
     if (!ctx || sourceVideo.videoWidth === 0) return false;

     const containerRect = container.getBoundingClientRect();
     if (containerRect.width === 0 || containerRect.height === 0) return false;

     const videoRatio = sourceVideo.videoWidth / sourceVideo.videoHeight;
     const containerRatio = containerRect.width / containerRect.height;
     
     let displayedWidth, displayedHeight, offsetX, offsetY;

     if (containerRatio > videoRatio) {
        displayedHeight = containerRect.height;
        displayedWidth = displayedHeight * videoRatio;
        offsetX = (containerRect.width - displayedWidth) / 2;
        offsetY = 0;
     } else {
        displayedWidth = containerRect.width;
        displayedHeight = displayedWidth / videoRatio;
        offsetX = 0;
        offsetY = (containerRect.height - displayedHeight) / 2;
     }

     const scaleX = sourceVideo.videoWidth / displayedWidth;
     const scaleY = sourceVideo.videoHeight / displayedHeight;

     const relativeX = region.x - offsetX;
     const relativeY = region.y - offsetY;

     const sx = Math.max(0, relativeX * scaleX);
     const sy = Math.max(0, relativeY * scaleY);
     const sw = Math.min(region.width * scaleX, sourceVideo.videoWidth - sx);
     const sh = Math.min(region.height * scaleY, sourceVideo.videoHeight - sy);

     if (sw <= 10 || sh <= 10) return false;

     targetCanvas.width = sw;
     targetCanvas.height = sh;

     ctx.drawImage(sourceVideo, sx, sy, sw, sh, 0, 0, sw, sh);
     return true;
  };

  // --- OCR LOOP ---
  useEffect(() => {
    if (!isCapturing) return;

    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !containerRef.current) return;
      if (videoRef.current.videoWidth === 0) return;

      const success = cropFrame(canvasRef.current, videoRef.current, chatBoxRef.current, containerRef.current);
      if (!success) return;

      const newChats = await ocrService.current.processFrame(canvasRef.current);
      if (newChats.length > 0) {
        setChats(prev => [...newChats, ...prev].slice(0, 50));
        setQueue(prev => [...prev, ...newChats]);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [isCapturing]); 

  // --- AUDIO PLAYBACK CONTROLLER (THE VOICE BOX) ---
  // This runs independently of the AI processing to ensure continuous flow
  const playNextInQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContext.current) {
      if (audioQueueRef.current.length === 0 && !processingRef.current) {
         setStatus(SystemStatus.ACTIVE); // Reset to Active/Listening if nothing is happening
      }
      return;
    }

    isPlayingRef.current = true;
    setStatus(SystemStatus.SPEAKING);

    const item = audioQueueRef.current.shift(); // Get next item
    if (!item) {
        isPlayingRef.current = false;
        return;
    }

    // Add Log entry visually when we start speaking it
    setLogs(prev => [item.logEntry, ...prev]);

    try {
      const source = audioContext.current.createBufferSource();
      source.buffer = item.buffer;
      source.connect(audioContext.current.destination);
      source.start(0);

      source.onended = () => {
        isPlayingRef.current = false;
        // Immediate Multi-Thinking: Trigger next playback instantly
        playNextInQueue(); 
      };
    } catch (e) {
      console.error("Audio Playback Error:", e);
      isPlayingRef.current = false;
      playNextInQueue();
    }
  }, []);

  // Watch audio queue length to trigger playback if stopped
  useEffect(() => {
    if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
        playNextInQueue();
    }
  }, [queue, playNextInQueue]); 


  // --- AI PROCESSING LOOP (THE BRAIN) ---
  useEffect(() => {
    if (!isCapturing || !isRunning) return;

    const processQueue = async () => {
      // FLOW CONTROL:
      // If the audio queue is getting too long (talking too much), pause processing new chats.
      // This prevents the "Laggy Bot" feel where the answer comes 30 seconds late.
      // We wait until the queue drains to 1 or 0 items.
      if (audioQueueRef.current.length > 2) {
         return; 
      }

      if (processingRef.current || queueRef.current.length === 0) return;
      
      processingRef.current = true;
      if (!isPlayingRef.current) setStatus(SystemStatus.THINKING);

      const batch = queueRef.current.slice(0, 8); 
      const remaining = queueRef.current.slice(8);
      setQueue(remaining);

      // --- VISION SNAPSHOT ---
      let imageBase64 = "";
      const shouldProcessVision = isEtalaseMode || hostVisionEnabled;
      if (shouldProcessVision && visionCanvasRef.current && videoRef.current && containerRef.current) {
         const success = cropFrame(visionCanvasRef.current, videoRef.current, visionBoxRef.current, containerRef.current);
         if (success) {
            imageBase64 = visionCanvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
         }
      }

      const start = Date.now();
      const mode = batch.length > 0 ? 'reactive' : 'proactive';

      // Avoid proactive chatter if we have stuff in the audio queue
      if (mode === 'proactive' && (audioQueueRef.current.length > 0 || isPlayingRef.current)) {
         processingRef.current = false;
         return;
      }

      const lastAnswer = logs.length > 0 ? logs[0].answer : "";

      const response = await geminiService.current.processWithVision(
        imageBase64,
        batch,
        products,
        mode,
        personality,
        isEtalaseMode,
        hostRoleDescription,
        isGiftDetectionEnabled,
        hostUsername,
        lastAnswer
      );

      setLatency(Date.now() - start);

      if (response.intent !== 'ignore' && response.text_answer) {
        // Double check for duplicate answers in frontend too to save TTS resources
        if (response.text_answer === lastAnswer) {
             processingRef.current = false;
             return;
        }

        const newLog: LogEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          user: batch.length > 1 ? `${batch.length} Users` : (batch[0]?.user || 'System'),
          question: batch.length > 0 ? batch.map(c => c.message).join(' | ').substring(0, 100) + '...' : 'Visual/Gift',
          answer: response.text_answer,
          intent: response.intent
        };

        if (response.detected_product_id) {
          setActiveProductId(response.detected_product_id);
          setTimeout(() => setActiveProductId(null), 10000); 
        }

        // --- 2. GENERATE AUDIO (ASYNC) ---
        const audioData = await geminiService.current.generateTTS(response.text_answer, gender, personality);
        
        if (audioData && audioContext.current) {
          const buffer = await decodeAudioBuffer(audioData, audioContext.current);
          
          // --- 3. PUSH TO AUDIO QUEUE ---
          audioQueueRef.current.push({
            buffer: buffer,
            logEntry: newLog
          });

          // --- 4. TRIGGER PLAYBACK IF IDLE ---
          if (!isPlayingRef.current) {
            playNextInQueue();
          }
        }
      }

      processingRef.current = false;
      
      // If messages piled up, recurse immediately
      if (queueRef.current.length > 0) {
        setTimeout(processQueue, 100);
      }
    };

    const loop = setInterval(processQueue, 1000);
    return () => clearInterval(loop);
  }, [isCapturing, isRunning, isEtalaseMode, personality, gender, hostRoleDescription, isGiftDetectionEnabled, products, hostUsername, hostVisionEnabled, logs, playNextInQueue]);

  // --- UI RENDER ---
  const isVisionAreaVisible = isEtalaseMode || hostVisionEnabled;

  return (
    <div className="h-screen w-full flex bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        geminiService={geminiService.current}
      />

      {/* --- LEFT SIDEBAR --- */}
      <div className="w-[420px] flex flex-col border-r border-white/5 bg-slate-900/50 h-full shadow-2xl z-20 shrink-0">
        <div className="p-4 border-b border-white/5 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Mic className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                 <h1 className="text-sm font-black tracking-tight text-white">LIVEIN AI <span className="text-emerald-500">v2.5</span></h1>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Real-time Selling Host</p>
              </div>
            </div>
            
            <button onClick={() => setIsConfigOpen(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <StatusDashboard 
          status={status} isEtalaseMode={isEtalaseMode} quotaLevel={quotaStatus}
          waitlist={queue.length} totalChats={chats.length} totalAnswered={logs.length} latency={latency}
        />

        <div className="flex p-2 gap-1 border-b border-white/5 bg-slate-900/50">
           <button 
             onClick={() => { setIsEtalaseMode(true); setActiveTab('inventory'); }}
             disabled={isLocked && !isEtalaseMode}
             className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all 
              ${isEtalaseMode 
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                  : 'text-slate-500 hover:bg-white/5'
              }
              ${isLocked && !isEtalaseMode ? 'opacity-20 cursor-not-allowed hover:bg-transparent' : ''}
             `}
           >
             <Package className="w-3.5 h-3.5" /> Seller
           </button>
           <button 
             onClick={() => { setIsEtalaseMode(false); setActiveTab('host'); }}
             disabled={isLocked && isEtalaseMode}
             className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all 
              ${!isEtalaseMode 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'text-slate-500 hover:bg-white/5'
              }
              ${isLocked && isEtalaseMode ? 'opacity-20 cursor-not-allowed hover:bg-transparent' : ''}
             `}
           >
             <User className="w-3.5 h-3.5" /> Host Persona
           </button>
           <button 
             onClick={() => setActiveTab('logs')}
             className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-white/5'}`}
           >
             <Terminal className="w-3.5 h-3.5" /> Logs
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/20">
           {activeTab === 'inventory' && (
             <div className="space-y-6 pb-20">
                <div className="px-4 pt-4">
                  <VoiceSelector currentGender={gender} onSelect={setGender} onPreview={() => {}} isProcessing={status === SystemStatus.SPEAKING} />
                  <div className="mt-4">
                    <PersonalitySelector currentPersonality={personality} onSelect={setPersonality} />
                  </div>
                </div>
                <EtalaseEditor products={products} onChange={setProducts} activeProductId={activeProductId} />
             </div>
           )}

           {activeTab === 'host' && (
             <div className="space-y-6 pb-20">
                <div className="px-4 pt-4">
                  <VoiceSelector currentGender={gender} onSelect={setGender} onPreview={() => {}} isProcessing={status === SystemStatus.SPEAKING} />
                  <div className="mt-4">
                    <PersonalitySelector currentPersonality={personality} onSelect={setPersonality} />
                  </div>
                </div>
                <HostRoleEditor 
                  roleDescription={hostRoleDescription} onChange={setHostRoleDescription}
                  isGiftDetectionEnabled={isGiftDetectionEnabled} onToggleGiftDetection={setIsGiftDetectionEnabled}
                  hostUsername={hostUsername} onHostUsernameChange={setHostUsername}
                  hostVisionEnabled={hostVisionEnabled} onToggleHostVision={setHostVisionEnabled}
                />
             </div>
           )}

           {activeTab === 'logs' && <LogViewer logs={logs} />}
        </div>
      </div>

      {/* --- RIGHT PANEL (Changed to Flex Layout to avoid overlaps) --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-black">
        
        {/* 1. TOP CONTROL BAR (Static height, no overlap) */}
        <div className="h-16 px-6 border-b border-white/5 bg-slate-900/50 flex items-center justify-between shrink-0 z-40 backdrop-blur-sm">
           <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isCapturing ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                {isCapturing ? 'LIVE CAPTURE ACTIVE' : 'SYSTEM OFFLINE'}
              </span>
           </div>

           <div className="flex gap-2">
              {!isCapturing ? (
                <button 
                  onClick={startCapture}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                >
                  <MonitorPlay className="w-4 h-4" /> Start Capture
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setIsLocked(!isLocked)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                      isLocked 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10' 
                      : 'bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    {isLocked ? 'LOCKED' : 'UNLOCK'}
                  </button>

                  <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                      isRunning 
                      ? 'bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600' 
                      : (isEtalaseMode ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 hover:bg-emerald-400' : 'bg-indigo-500 text-white shadow-indigo-500/20 hover:bg-indigo-400') + ' animate-pulse'
                    }`}
                  >
                    {isRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                    {isRunning ? 'STOP' : (isEtalaseMode ? 'START SELLER' : 'START PERSONA')}
                  </button>
                  
                  <button 
                    onClick={stopCapture}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              )}
           </div>
        </div>

        {/* 2. MAIN CONTENT ROW (Flex row: Video + Chat) */}
        <div className="flex-1 flex min-h-0 relative">
          
          {/* VIDEO STAGE (Takes remaining space) */}
          <div className="flex-1 relative bg-slate-900/50 flex items-center justify-center overflow-hidden">
             {isCapturing ? (
               <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <video ref={videoRef} className="max-w-full max-h-full object-contain" muted autoPlay playsInline />
                  
                  {/* Hidden Canvases for Logic */}
                  <canvas ref={canvasRef} className="hidden" />
                  <canvas ref={visionCanvasRef} className="hidden" />
                  
                  {/* Resizable Region Boxes - Render using State, Logic uses Ref */}
                  <ResizableBox 
                    label="CHAT SCAN AREA" 
                    color="emerald" 
                    region={chatBox} 
                    containerRef={containerRef}
                    onUpdate={updateChatBox}
                    isLocked={isLocked}
                  />
                  
                  {isVisionAreaVisible && (
                    <ResizableBox 
                      label="AI VISION / GIFT AREA" 
                      color="indigo" 
                      region={visionBox} 
                      containerRef={containerRef}
                      onUpdate={updateVisionBox}
                      isLocked={isLocked}
                    />
                  )}

                  {!isLocked && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm border border-white/20 p-4 rounded-xl text-center space-y-1 pointer-events-none z-40 animate-in slide-in-from-bottom-5">
                        <p className="text-xs font-bold text-white">Setup Mode Active</p>
                        <p className="text-[10px] text-slate-400">Drag & Resize boxes to match your layout. Click <span className="text-amber-500 font-bold">LOCKED</span> when done.</p>
                    </div>
                  )}
               </div>
             ) : (
               <div className="text-center space-y-4 opacity-30 max-w-md mx-auto p-8">
                  {captureError ? (
                    <div className="flex flex-col items-center gap-4 text-rose-400">
                      <AlertCircle className="w-24 h-24 animate-bounce" />
                      <p className="text-sm font-black uppercase tracking-[0.3em]">{captureError}</p>
                      <button 
                        onClick={startCapture} 
                        className="px-6 py-2 bg-rose-500/20 border border-rose-500/50 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-rose-500/30 transition-colors text-white"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <>
                      <Boxes className="w-24 h-24 mx-auto text-indigo-500" />
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">No Signal Input</p>
                    </>
                  )}
               </div>
             )}
          </div>

          {/* CHAT SIDEBAR (Fixed Width on the Right) */}
          <div className="w-80 border-l border-white/5 bg-slate-900/30 backdrop-blur-sm flex flex-col shrink-0 z-30">
             <div className="bg-slate-900/50 border-b border-white/5 p-3 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Chat Stream</span>
                 </div>
                 <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                   {queue.length > 0 ? `${queue.length} queued` : 'Sync'}
                 </span>
             </div>
             <div className="flex-1 overflow-hidden flex flex-col relative">
                <ChatFeed messages={chats} queue={queue} hostUsername={hostUsername} />
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;