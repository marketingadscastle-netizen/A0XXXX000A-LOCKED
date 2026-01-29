
import { ChatMessage } from "../types";

export class ChatService {
  private interval: number | null = null;
  private subscribers: ((chat: ChatMessage) => void)[] = [];

  // Mock data for realistic simulation
  private mockUserPool = ["Ani", "Budi", "Chandra", "Dewi", "Eko", "Fani", "Gita", "Hadi"];
  private mockMessagePool = [
    "Bahannya apa ya kak?",
    "Harganya berapa kak?",
    "Stoknya masih ada?",
    "Ukuran L ada ga kak?",
    "Bisa COD ke Jakarta?",
    "Bahan katun ya kak?",
    "Mau satu dong kak",
    "Ini harganya berapaan kak?",
    "Kak, bahannya panas gak?",
    "Ada warna lain ga?"
  ];

  subscribe(callback: (chat: ChatMessage) => void) {
    this.subscribers.push(callback);
  }

  start(url: string) {
    console.log(`Connecting to stream: ${url}`);
    
    // Logic for "Real" connection would go here (e.g. YT API)
    // For this demo context, we create a high-fidelity simulator that sends data via the same interface
    this.interval = window.setInterval(() => {
      if (Math.random() > 0.6) {
        const chat: ChatMessage = {
          chat_id: Math.random().toString(36).substr(2, 9),
          user: this.mockUserPool[Math.floor(Math.random() * this.mockUserPool.length)],
          message: this.mockMessagePool[Math.floor(Math.random() * this.mockMessagePool.length)],
          timestamp: Date.now()
        };
        this.subscribers.forEach(cb => cb(chat));
      }
    }, 2500);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
