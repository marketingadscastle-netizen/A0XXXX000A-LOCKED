
export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductData {
  id: string;
  etalaseNo: string;
  name: string;
  category: 'Fashion' | 'Digital' | 'Electronics' | 'Beauty' | 'Home' | 'Food' | 'General';
  price: string;
  stock: number;
  description: string;
  image?: string;
  specifications: ProductSpec[];
}

export interface AnswerTemplates {
  material: string;
  size: string;
  stock: string;
  price: string;
  fallback: string;
}

export interface ChatMessage {
  chat_id: string;
  user: string;
  message: string;
  timestamp: number;
}

export interface AIAnswer {
  intent: string;
  text_answer: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface EnhancedAIAnswer extends AIAnswer {
  detected_product_id?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  user: string;
  question: string;
  answer: string;
  intent: string;
}

export enum SystemStatus {
  IDLE = 'IDLE',
  CAPTURING = 'CAPTURING',
  ACTIVE = 'ACTIVE',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  COOLDOWN = 'COOLDOWN'
}

export type HostGender = 'female' | 'male';
export type HostPersonality = 'enthusiast' | 'expert' | 'companion';

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TargetArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DualScannerConfig {
  chat: TargetArea;
  vision: TargetArea;
}

export interface IGeminiClient {
  validateConnection(keyToTest?: string): Promise<{ success: boolean; latency: number; model: string; message: string; quotaExhausted?: boolean }>;
  processWithVision(
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
  ): Promise<EnhancedAIAnswer>;
  generateTTS(text: string, gender: HostGender, personality: HostPersonality): Promise<Uint8Array | null>;
}