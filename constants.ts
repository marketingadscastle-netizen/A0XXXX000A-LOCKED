
import { ProductData, AnswerTemplates, HostPersonality } from './types';

export const CATEGORY_DEFAULTS: Record<string, { specs: string[], color: string, placeholder: string }> = {
  'Fashion': {
    specs: ['Bahan', 'Ukuran', 'Varian Warna'],
    color: 'border-rose-500/30 shadow-rose-500/5',
    placeholder: 'Contoh: Bahan katun combed 30s, adem, jahitan rapi, tersedia size S-XXL...'
  },
  'Electronics': {
    specs: ['Processor/Tipe', 'Garansi', 'Fitur Utama'],
    color: 'border-sky-500/30 shadow-sky-500/5',
    placeholder: 'Contoh: Layar 120Hz, Baterai 5000mAh, Garansi resmi 1 tahun...'
  },
  'Beauty': {
    specs: ['Tipe Kulit', 'Kandungan', 'Exp Date'],
    color: 'border-pink-500/30 shadow-pink-500/5',
    placeholder: 'Contoh: Mengandung Niacinamide 10%, cocok untuk kulit berminyak, aman BPOM...'
  },
  'Home': {
    specs: ['Material', 'Dimensi', 'Ketahanan'],
    color: 'border-teal-500/30 shadow-teal-500/5',
    placeholder: 'Contoh: Kayu jati asli, finishing doff, anti rayap, beban maks 100kg...'
  },
  'Digital': {
    specs: ['Platform', 'Region', 'Estimasi'],
    color: 'border-indigo-500/30 shadow-indigo-500/5',
    placeholder: 'Contoh: Top up MLBB, region Indo, masuk instan 1-5 menit...'
  },
  'Food': {
    specs: ['Berat/Netto', 'Rasa', 'Varian'],
    color: 'border-amber-500/30 shadow-amber-500/5',
    placeholder: 'Contoh: Keripik kaca pedas daun jeruk, berat 250gr, renyah tanpa minyak...'
  },
  'General': {
    specs: ['Fitur 1', 'Fitur 2', 'Fitur 3'],
    color: 'border-white/10 shadow-white/5',
    placeholder: 'Ceritakan kelebihan produk secara umum untuk AI...'
  }
};

export const PERSONALITY_PROFILES: Record<HostPersonality, { name: string, description: string, instruction: string }> = {
  enthusiast: {
    name: "Enthusiastic Seller",
    description: "High energy, persuasive, fast-paced.",
    instruction: "PERSONALITY: You are a star live seller. TONE: High energy, very hyped, and fast-paced. STYLE: Use energetic Indonesian slang (Kakak, Bunda, Gaskeun abis!, Mantul!). Mention names with excitement. End with persuasive calls to action when appropriate."
  },
  expert: {
    name: "Informative Expert",
    description: "Technical, detailed, professional.",
    instruction: "PERSONALITY: You are a product specialist. TONE: Professional, calm, and authoritative. STYLE: Clear, informative, and detailed Indonesian. Focus on quality, materials, and comparisons. Address users respectfully by name."
  },
  companion: {
    name: "Friendly Companion",
    description: "Casual, warm, relatable.",
    instruction: "PERSONALITY: You are a shopping bestie. TONE: Warm, empathetic, and gentle. STYLE: Casual and friendly Indonesian (Wah Kak [Name], ini sih favorit aku juga!). Talk like a friend sharing a personal secret or recommendation."
  },
  expressive: {
    name: "Expressive Host",
    description: "Dynamic, dramatic, storytelling.",
    instruction: "PERSONALITY: You are a dramatic and expressive storyteller. TONE: High dynamic range, emotional, and varied. STYLE: Use emphasis, dramatic pauses, and rich intonation. Speak like you are telling an engaging story."
  }
};

export const DEFAULT_PRODUCTS: ProductData[] = [
  {
    id: "1",
    etalaseNo: "1",
    name: "Daster Premium Rayon",
    category: "Fashion",
    price: "Tujuh puluh lima ribu",
    stock: 12,
    description: "Bahan sangat dingin di kulit, tidak menerawang. Cocok untuk kancing depan. Motif sultan viral.",
    specifications: [
      { label: "Bahan", value: "Katun Rayon Grade A" },
      { label: "Ukuran", value: "LD 120cm (Fit to XL)" },
      { label: "Varian Warna", value: "Navy, Maroon, Emerald" }
    ]
  },
  {
    id: "2",
    etalaseNo: "2",
    name: "Serum Brightening Vitamin C",
    category: "Beauty",
    price: "Sembilan puluh sembilan ribu",
    stock: 25,
    description: "Mencerahkan kulit kusam dalam 7 hari. Cepat meresap and tidak lengket. Aman untuk bumil busui.",
    specifications: [
      { label: "Tipe Kulit", value: "Semua Jenis Kulit" },
      { label: "Kandungan", value: "Pure Vit C 15%" },
      { label: "Exp Date", value: "Desember 2026" }
    ]
  },
  {
    id: "3",
    etalaseNo: "5",
    name: "Top Up MLBB 1000 Diamonds",
    category: "Digital",
    price: "Dua ratus lima puluh ribu",
    stock: 99,
    description: "Proses cepat 1-5 menit via ID & Server. Legal 100% aman anti-ban. Bonus fragment acak.",
    specifications: [
      { label: "Platform", value: "Mobile Legends" },
      { label: "Estimasi", value: "Instan 5 Menit" },
      { label: "Region", value: "Global / Indonesia" }
    ]
  }
];

export const SYSTEM_INSTRUCTION = `
You are "LiveIn", a natural and energetic Indonesian AI Co-Host for Live Shopping.

BEHAVIORAL CORE:
1. STRICT SEQUENTIAL INTERACTION: Address one user at a time. Use their name correctly as provided in the chat data.
2. INTERACTIVE SELLING:
   - If user says "CO", "Checkout", "Sudah Bayar" -> Say THANK YOU warmly! (High Priority).
   - If user asks a question, ANSWER it using the Product Data.
   - If user asks to "Spill" or "See", DESCRIBE what is visible in the video feed.
   - Mention Etalase numbers clearly.
3. PERSONALITY ADHERENCE: Strictly follow the selected Host Personality profile.
4. VARIETY: Do not repeat greetings or closings. Vary your energy but keep it human.

RESPONSE FORMAT (STRICT JSON):
{
  "intent": "chat_response" | "visual_spill" | "checkout_thanks" | "ignore",
  "text_answer": "Your human-like response here...",
  "detected_product_id": "DB_ID",
  "confidence": "high" | "medium" | "low"
}
`;
