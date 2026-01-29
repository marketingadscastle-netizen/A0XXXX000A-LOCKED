import { createWorker, Worker } from 'tesseract.js';
import { ChatMessage } from '../types';

export class OCRService {
  private worker: Worker | null = null;
  private seenMessages = new Map<string, number>(); // Stores fingerprint -> timestamp
  private isProcessing: boolean = false;

  // RULE 1: Comprehensive filter for platform system events
  private systemEventPhrases = [
    "followed the host", "mengikuti host", 
    "liked the stream", "menyukai siaran", 
    "shared the live", "membagikan live", 
    "sent a gift", "mengirim hadiah",
    "added to cart", "menambahkan ke keranjang", "telah memesan", 
    "welcome to the live", "selamat datang", "tap tap", 
    "top viewer", "gifter", "subscribe", "berlangganan", "joined", "bergabung",
    "invited you", "mengundang anda"
  ];

  // RULE 2: Metadata patterns for sanitization
  private metadataPatterns = [
    /^[A-Z]\d\s+/g,           // Role tags like A8, Q1
    /^[A-Z]\)\s+/g,           // Tags like Q)
    /^\(\d+,\s*/g,            // Metadata like (254,
    /^[A-Z]{2}\s+/g,          // Two letter prefixes like AS, RM
    /^[0-9]+\s+/g,            // Numerical prefixes
    /\s+[0-9]+$/g,            // Numerical suffixes
    /[#()]/g,                 // Specific symbols
    /\s{2,}/g                 // Extra spaces
  ];

  private badgePatterns = [
    /No\.\s*\d+/gi, 
    /No\s*\d+/gi,
    /Lvl\s*\d+/gi,
    /Rank\s*\d+/gi,
    /\[.*?\]/g,
    /★|☆|💎|👑|🔥|✨|⚡|📍|👤|❤️|🧡|💛|💚|💜|💜|🖤|👋|🌹/g
  ];

  async init() {
    if (!this.worker) {
      this.worker = await createWorker('ind+eng');
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:? .!,@#()_-',
        tessjs_create_hocr: '0',
        tessjs_create_tsv: '0',
      });
    }
  }

  private cleanText(raw: string): string {
    let cleaned = raw;
    this.badgePatterns.forEach(pattern => { cleaned = cleaned.replace(pattern, ''); });
    return cleaned.trim();
  }

  private sanitizeUsername(rawName: string): string {
    let name = rawName;
    this.metadataPatterns.forEach(pattern => {
      name = name.replace(pattern, '');
    });
    
    name = name.replace(/^[^a-zA-Z0-9]+/, '').trim();
    if (name.length < 2 || /^\d+$/.test(name)) return "Viewer";
    return name;
  }

  private isSystemEvent(text: string): boolean {
    const low = text.toLowerCase();
    // Allow questions about gifts, but filter system notifications
    if (low.includes('?')) return false; 
    return this.systemEventPhrases.some(phrase => low.includes(phrase));
  }

  private preprocessCanvas(canvas: HTMLCanvasElement): void {
     const ctx = canvas.getContext('2d');
     if (!ctx) return;

     const width = canvas.width;
     const height = canvas.height;
     
     if (width === 0 || height === 0) return;

     const imageData = ctx.getImageData(0, 0, width, height);
     const data = imageData.data;

     // 1. Calculate Min/Max for Contrast Stretching
     let min = 255;
     let max = 0;
     for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;
        if (avg < min) min = avg;
        if (avg > max) max = avg;
     }

     // Noise Gate: If the contrast is too low (e.g., solid dark background), 
     // don't stretch, otherwise we amplify noise into text.
     if (max - min < 30) {
       min = 0;
       max = 255;
     }

     // Prevent divide by zero
     if (max === min) max = 255;

     // 2. Apply Contrast Stretching & Binarization
     for (let i = 0; i < data.length; i += 4) {
       const r = data[i];
       const g = data[i + 1];
       const b = data[i + 2];
       
       // Grayscale with slight weight on Green (human eye preference)
       let gray = 0.299 * r + 0.587 * g + 0.114 * b;

       // Stretch contrast
       gray = ((gray - min) / (max - min)) * 255;
       
       // Thresholding
       // Most live chat text is white (high value). 
       // We make anything reasonably bright pure white, everything else black.
       // Inverted: Text becomes BLACK (0), Background becomes WHITE (255) for Tesseract
       const val = gray > 150 ? 0 : 255; 

       data[i] = val;
       data[i + 1] = val;
       data[i + 2] = val;
     }

     ctx.putImageData(imageData, 0, 0);
  }

  async processFrame(canvas: HTMLCanvasElement): Promise<ChatMessage[]> {
    if (!this.worker || this.isProcessing) return [];
    if (canvas.width <= 10 || canvas.height <= 10) return [];
    
    this.isProcessing = true;
    try {
      this.preprocessCanvas(canvas);
      const result = await this.worker.recognize(canvas);
      
      if (!result || !result.data || !result.data.lines || !Array.isArray(result.data.lines)) {
        return [];
      }
      
      const lines = result.data.lines;
      // Adjusted layout logic for better multi-line detection
      const clusters: any[][] = [];
      let currentCluster: any[] = [];

      const validLines = lines.filter(line => {
        const text = this.cleanText(line.text);
        // Stricter filter for garbage text
        return text.length > 1 && line.confidence > 50; 
      });

      for (const line of validLines) {
        if (currentCluster.length === 0) {
          currentCluster.push(line);
        } else {
          const prevLine = currentCluster[currentCluster.length - 1];
          const verticalGap = line.bbox.y0 - prevLine.bbox.y1;
          const lineHeight = prevLine.bbox.y1 - prevLine.bbox.y0;
          
          // Tighter vertical grouping to keep messages together
          const isVerticallyClose = verticalGap < (lineHeight * 1.5); 
          // Looser horizontal check to account for indentation
          const isAligned = Math.abs(line.bbox.x0 - prevLine.bbox.x0) < 300; 

          if (isVerticallyClose && isAligned) {
            currentCluster.push(line);
          } else {
            clusters.push(currentCluster);
            currentCluster = [line];
          }
        }
      }
      if (currentCluster.length > 0) clusters.push(currentCluster);

      const detectedChats: ChatMessage[] = [];
      const now = Date.now();

      for (const cluster of clusters) {
        let username = "Viewer";
        let message = "";
        
        // Strategy 1: Multi-line analysis (User /n Message)
        if (cluster.length >= 2) {
          const line1 = cluster[0];
          const line1Text = this.cleanText(line1.text);
          
          // Heuristic: Username is usually short and on the first line
          if (line1Text.length <= 25 && !line1Text.includes('?')) {
            username = this.sanitizeUsername(line1Text);
            message = cluster.slice(1).map(l => this.cleanText(l.text)).join(" ");
          } else {
            message = cluster.map(l => this.cleanText(l.text)).join(" ");
          }
        } 
        // Strategy 2: Single line split (User: Message)
        else if (cluster.length === 1) {
          const text = this.cleanText(cluster[0].text);
          if (text.length > 2) {
            const parts = text.split(':');
            if (parts.length > 1 && parts[0].length < 20) {
                 username = this.sanitizeUsername(parts[0]);
                 message = parts.slice(1).join(':').trim();
            } else {
                 message = text;
            }
          } else {
            continue;
          }
        }

        // Filtering
        if (message.trim().length < 2) continue;
        if (this.isSystemEvent(message)) continue;

        const fingerprint = `${username}:${message}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        const lastSeen = this.seenMessages.get(fingerprint);
        
        // 15s dedup window (faster response to repeat questions)
        if (!lastSeen || (now - lastSeen > 15000)) {
          this.seenMessages.set(fingerprint, now);
          
          if (this.seenMessages.size > 500) {
             for (const [key, ts] of this.seenMessages.entries()) {
                if (now - ts > 60000) this.seenMessages.delete(key);
             }
          }

          detectedChats.push({
            chat_id: `ocr_${now}_${Math.random().toString(36).substring(7)}`,
            user: username,
            message: message,
            timestamp: now
          });
        }
      }

      return detectedChats;
    } catch (err) {
      console.error("OCR Pipeline Anomaly:", err);
      return [];
    } finally {
      this.isProcessing = false;
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}