import { IGeminiClient, ChatMessage, ProductData, EnhancedAIAnswer, HostGender, HostPersonality } from "../types";

let roundRobinIndex = 0;

function getUserKeys(): string[] {
  const raw = localStorage.getItem("GEMINI_USER_KEYS") || "";
  return raw.split(",").map(k => k.trim()).filter(Boolean);
}

function getNextKey(): string {
  const keys = getUserKeys();
  if (keys.length === 0) {
    throw new Error("No API Keys configured. Please add keys in Config.");
  }
  const key = keys[roundRobinIndex % keys.length];
  roundRobinIndex++;
  return key;
}

export class GeminiUserKeyClient implements IGeminiClient {
  
  async validateConnection(keyToTest?: string): Promise<{ success: boolean; latency: number; model: string; message: string; quotaExhausted?: boolean }> {
    const start = Date.now();
    try {
      const apiKey = keyToTest || getNextKey();
      
      const response = await fetch("/api/gemini/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || response.statusText);
      }

      const data = await response.json();
      return { 
        success: true, 
        latency: Date.now() - start, 
        model: "Gemini 3 Flash", 
        message: "Connected" 
      };
    } catch (e: any) {
      console.error("[GeminiUserKeyClient] Validation failed:", e);
      const msg = (e.message || "").toLowerCase();
      const isQuota = msg.includes("quota") || msg.includes("exhausted") || msg.includes("429");

      if (isQuota) {
        return { success: false, latency: 0, model: "-", message: "Quota Exhausted", quotaExhausted: true };
      }
      return { success: false, latency: 0, model: "-", message: "Connection Failed: " + msg };
    }
  }

  async processWithVision(
    imageBuffer: string,
    chats: ChatMessage[],
    products: ProductData[],
    mode: 'proactive' | 'reactive',
    personality: HostPersonality,
    isEtalaseMode: boolean,
    hostRoleDescription: string,
    isGiftDetectionEnabled: boolean,
    hostUsername: string,
    lastAIAnswer?: string
  ): Promise<EnhancedAIAnswer> {
    try {
      const apiKey = getNextKey();
      
      const response = await fetch("/api/gemini/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey
        },
        body: JSON.stringify({
          imageBuffer,
          chats,
          products,
          mode,
          personality,
          isEtalaseMode,
          hostRoleDescription,
          isGiftDetectionEnabled,
          hostUsername,
          lastAIAnswer
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (e) {
      console.error("[GeminiUserClient] Vision Error:", e);
      return { intent: 'ignore', text_answer: "", confidence: 'low' };
    }
  }

  async generateTTS(text: string, gender: HostGender, personality: HostPersonality): Promise<Uint8Array | null> {
    try {
      const apiKey = getNextKey();

      const response = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey
        },
        body: JSON.stringify({ text, gender, personality })
      });

      if (!response.ok) {
        console.error("TTS Server Error:", response.statusText);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (e) {
      console.error("TTS Generation Failed:", e);
      return null;
    }
  }
}