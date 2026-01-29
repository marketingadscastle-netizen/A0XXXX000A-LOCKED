import { IGeminiClient, EnhancedAIAnswer, ProductData, ChatMessage, HostGender, HostPersonality } from "../types";
import { GeminiUserKeyClient } from "./GeminiUserKeyClient";

export type GeminiMode = 'user_key' | 'default_service_account';
export type QuotaStatus = 'normal' | 'warning' | 'exhausted';

export interface GeminiStatus {
  sessionId: string;
  mode: GeminiMode;
  quotaStatus: QuotaStatus;
  usingFallback: boolean;
  lastError: string | null;
  keyCount: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class GeminiService {
  public readonly sessionId: string;
  
  private activeMode: GeminiMode = 'user_key';
  private quotaStatus: QuotaStatus = 'normal';
  private lastError: string | null = null;
  
  constructor() {
    const randomHex = Math.random().toString(16).substring(2, 10);
    this.sessionId = `sess_${randomHex}`;
  }

  setApiKey(keyInput: string) {
    // Keys are managed by localStorage in GeminiUserKeyClient, 
    // but this method signature is kept for compatibility if needed.
    // Ideally, the client reads directly.
  }

  getStatus(): GeminiStatus {
    return {
      sessionId: this.sessionId,
      mode: this.activeMode,
      quotaStatus: this.quotaStatus,
      usingFallback: false,
      lastError: this.lastError,
      keyCount: 1
    };
  }

  private createClient(): IGeminiClient {
    // Instantiates client which reads keys from localStorage on demand
    return new GeminiUserKeyClient();
  }

  private async execute<T>(
    operation: (client: IGeminiClient) => Promise<T>, 
    context: string,
    retryCount: number = 0
  ): Promise<T> {
    const MAX_RETRIES = 3;
    const BACKOFF_TIMES = [2000, 5000, 10000];

    try {
      const client = this.createClient();
      return await operation(client);
    } catch (error: any) {
      const status = error.status || error.response?.status;
      const msg = (error.message || '').toLowerCase();
      const isQuotaError = status === 429 || msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('limit');

      this.lastError = `${context}: ${msg} (${status})`;

      if (isQuotaError && retryCount < MAX_RETRIES) {
        console.warn(`[GeminiService] Rate limit hit (${context}). Retrying ${retryCount + 1}/${MAX_RETRIES}...`);
        this.quotaStatus = 'warning';
        await delay(BACKOFF_TIMES[retryCount]);
        return this.execute(operation, context, retryCount + 1);
      }

      if (isQuotaError) {
        this.quotaStatus = 'exhausted';
      }

      throw error;
    }
  }

  async validateConnection(): Promise<{ success: boolean; latency: number; model: string; message: string; quotaExhausted?: boolean }> {
    const result = await this.execute(
      client => client.validateConnection(), 
      "validateConnection"
    );
    if (!result.success && result.quotaExhausted) {
      this.quotaStatus = 'exhausted';
    }
    return result;
  }

  async processWithVision(
    imageBuffer: string, 
    chats: ChatMessage[],
    products: ProductData[],
    mode: 'proactive' | 'reactive',
    personality: HostPersonality,
    isEtalaseMode: boolean = true,
    hostRoleDescription: string = "",
    isGiftDetectionEnabled: boolean = false,
    hostUsername: string = "",
    lastAIAnswer: string = ""
  ): Promise<EnhancedAIAnswer> {
    try {
      const response = await this.execute(
        client => client.processWithVision(imageBuffer, chats, products, mode, personality, isEtalaseMode, hostRoleDescription, isGiftDetectionEnabled, hostUsername, lastAIAnswer), 
        "processWithVision"
      );
      if (this.quotaStatus === 'warning') this.quotaStatus = 'normal';
      return response;
    } catch (e) {
      console.error("[GeminiService] Vision Failed:", e);
      return { intent: 'ignore', text_answer: "", confidence: 'low' };
    }
  }

  async generateTTS(text: string, gender: HostGender, personality: HostPersonality): Promise<Uint8Array | null> {
    try {
        return await this.execute(
            client => client.generateTTS(text, gender, personality),
            "generateTTS"
        );
    } catch (e) {
        console.error("TTS Failed:", e);
        return null;
    }
  }
}

export async function decodeAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length; 
  const audioBuffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return audioBuffer;
}