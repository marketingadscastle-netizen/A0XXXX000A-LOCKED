import { IGeminiClient, ChatMessage, ProductData, EnhancedAIAnswer, HostGender, HostPersonality } from "../types";

export class GeminiServiceAccountClient implements IGeminiClient {
  // This client assumes the backend has the API key in process.env
  // It sends requests without the x-gemini-api-key header, 
  // instructing the backend to use its default key.

  async validateConnection(keyToTest?: string): Promise<{ success: boolean; latency: number; model: string; message: string; quotaExhausted?: boolean }> {
    const start = Date.now();
    try {
      const response = await fetch("/api/gemini/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
        // No custom header, backend uses default env key
      });

      if (!response.ok) throw new Error(response.statusText);
      
      return { success: true, latency: Date.now() - start, model: "Gemini 3 Flash", message: "Connected" };
    } catch (e: any) {
      return { success: false, latency: 0, model: "-", message: e.message };
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
      const response = await fetch("/api/gemini/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      if (!response.ok) return { intent: 'ignore', text_answer: "", confidence: 'low' };

      return await response.json();
    } catch (e) {
      console.error("[GeminiService] Vision Error:", e);
      throw e;
    }
  }

  async generateTTS(text: string, gender: HostGender, personality: HostPersonality): Promise<Uint8Array | null> {
    try {
      const response = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, gender, personality })
      });

      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (e) {
      console.error("TTS Generation Failed:", e);
      return null;
    }
  }
}