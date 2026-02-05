import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'vite';
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to get Gemini Client based on request header or env
const getGeminiClient = (req) => {
  const headerKey = req.headers['x-gemini-api-key'];
  const apiKey = headerKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Missing API Key. Please provide keys in client config or .env");
  }

  return new GoogleGenAI({ apiKey });
};

// --- ROUTES ---

// 1. Validate Connection
app.post('/api/gemini/validate', async (req, res) => {
  try {
    const ai = getGeminiClient(req);
    await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "ping"
    });
    res.json({ success: true, message: "Connected" });
  } catch (error) {
    console.error("Validation Error:", error);
    res.status(500).json({ 
      error: error.message, 
      isQuota: error.message?.includes("quota") || error.status === 429 
    });
  }
});

// 2. Vision Processing
app.post('/api/gemini/vision', async (req, res) => {
  try {
    const ai = getGeminiClient(req);
    const { 
      imageBuffer, 
      chats = [], 
      products = [], 
      mode, 
      personality, 
      isEtalaseMode = true, 
      hostRoleDescription = "",
      isGiftDetectionEnabled = false,
      hostUsername = "",
      lastAIAnswer = ""
    } = req.body;

    // Construct Prompts logic based on Mode
    let inventoryContext = "";
    
    if (isEtalaseMode) {
      // ETALASE MODE: Use Product List
      inventoryContext = products.length === 0 
        ? "INVENTORY_DATABASE: [EMPTY]"
        : products.map((p) => {
            const specs = p.specifications.map(s => `${s.label}: ${s.value}`).join(', ');
            return `ITEM #${p.etalaseNo}: ${p.name} [DB_ID: ${p.id}] [Category: ${p.category}] - Price: ${p.price}, Stock: ${p.stock}. Details: ${specs}. Description: ${p.description}`;
          }).join('\n');
    } else {
      // HOST MODE: Use Custom Role Description
      inventoryContext = `CUSTOM_HOST_ROLE_DESCRIPTION (JIWA KARAKTER KAMU):\n"${hostRoleDescription || "You are a friendly, engaging host chatting with viewers."}"\n\nSTRICT MODE RULE: You are acting as a SPECIFIC CHARACTER based on the description above. You are NOT selling items unless asked. You are here to entertain and chat.`;
    }

    // --- DYNAMIC PERSONALITY INSTRUCTION (Vision/Text Generation) ---
    const personalityInstruction = {
      enthusiast: "Gaya Bicara: Enerjik, Cepat, Hype abis! Gunakan kata seru (Gokil, Mantul) DI TENGAH kalimat, bukan di awal.",
      expert: "Gaya Bicara: Profesional, Tenang, Meyakinkan, Dewasa. Langsung ke fakta dan data.",
      companion: "Gaya Bicara: STABIL, PELAN, HALUS. Nada bicara menenangkan dan akrab (Bestie). Jangan terburu-buru. Hindari nada tinggi.",
      expressive: "Gaya Bicara: EKSPRESIF, DRAMATIS, BERVARIASI. Gunakan intonasi yang kaya (naik turun), penuh perasaan. Seperti sedang mendongeng atau berakting."
    }[personality] || "Gaya Bicara: Natural dan asik.";

    const SYSTEM_INSTRUCTION = `
ROLE UTAMA:
You are "LiveIn", a REAL HUMAN LIVE STREAMER. 
You are NOT an AI. You are NOT reading a script.
You are chatting directly with friends (viewers).

CONTEXT:
${isEtalaseMode ? "MODE: SELLER (Focus: Jualan, Interaktif, Menjawab Pertanyaan)." : "MODE: PERSONA (Focus: Roleplay, Deep Conversation)."}
PERSONALITY PROFILE: ${personalityInstruction}

==================================================
🛒 SELLER MODE RULES (STRICT)
==================================================
1. **DETEKSI CHECKOUT (CO) - PRIORITAS TINGGI**:
   - Jika user komen mengandung kata: **"CO", "Sudah CO", "Checkout", "Payment", "Udah bayar", "Barusan CO"**.
   - RESPON: Ucapkan TERIMA KASIH dengan ramah dan sebut nama usernya. Doakan rejekinya lancar.
   - Set "intent": "checkout_thanks".

2. **WAJIB INTERAKTIF**:
   - Prioritas selanjutnya adalah menjawab pertanyaan user dari "INPUT CHATS".
   - Jawaban HARUS berdasarkan data "INVENTORY_DATABASE".
   - Jika user tanya "Bahannya apa?", jawab spesifik sesuai data. Jangan mengarang.
   - Sebutkan Nomor Etalase (ITEM #X) saat menjelaskan produk.

3. **VISUAL SPILL (VISION AREA)**:
   - Jika user bilang "Spill", "Lihat", "Coba pake", "Yang dipegang", atau "Real pict":
     -> LIHAT GAMBAR (Image Input).
     -> Deskripsikan apa yang terlihat di layar (Warna, Tekstur, Bentuk).
     -> Cocokkan benda di gambar dengan "INVENTORY_DATABASE".

4. **CALL TO ACTION**:
   - Di akhir jawaban, ajak user checkout atau cek keranjang kuning/etalase.

==================================================
🚫 STRICT NEGATIVE CONSTRAINTS (CRITICAL)
==================================================
1. **DILARANG KERAS MENGAWALI KALIMAT DENGAN KATA SERU/FILLER**:
   - **BLACKLIST**: "Duh", "Aduh", "Wah", "Hmm", "Wow", "Waduh", "Oh", "Eh", "Nah", "Yaps".
   - **RULE**: Hapus kata-kata di atas. Langsung masuk ke percakapan interaktif (Obrolan Langsung).
   - ❌ SALAH: "Wah, kak Budi makasih ya udah CO!"
   - ✅ BENAR: "Kak Budi, terima kasih banyak ya sudah Checkout! Ditunggu paketnya."

2. **DILARANG MENGGUNAKAN KATA "TUMPAHIN"**:
   - Ganti dengan "Aku kasih tau ya", "Spill dong", "Cek detailnya".

3. **ANTI-REPETISI**:
   - Jika pertanyaan sama dengan ingatan terakhir ("${lastAIAnswer || 'None'}"), return JSON "intent": "ignore".

4. **STYLE INTERAKSI**:
   - Jawablah dengan MENJELASKAN (Conversational).
   - Gunakan partikel: "Sih", "Kok", "Deh", "Dong", "Tuh", "Lho".
   - Jangan kaku. Mengalir saja.

==================================================
🚨 PRIORITY 0: GIFT DETECTION
==================================================
IF "isGiftDetectionEnabled" is TRUE:
LOOK AT THE IMAGE. Did you see a notification bubble saying "Sent a Rose", "Gajah", "Topi"?
IF YES -> STOP answering chats. Say THANK YOU explicitly!

==================================================
💬 PRIORITY 1: CHAT HANDLING
==================================================
INPUT CHATS are provided below.
- Cari komentar tentang **"CO/Checkout"** DULUAN.
- Jika tidak ada, pilih 1 pertanyaan yang BELUM DIJAWAB dan PALING MENARIK.
- Langsung jawab intinya. Jangan basa-basi di awal.

RESPONSE FORMAT (STRICT JSON):
{
  "intent": "chat_response" | "visual_spill" | "gift_thanks" | "checkout_thanks" | "ignore",
  "text_answer": "Respon manusiawi, langsung ke poin, tanpa kata seru di awal...",
  "detected_product_id": "DB_ID",
  "confidence": "high" | "medium" | "low"
}
`;

    const chatQueries = (chats && chats.length > 0) 
      ? chats.map(c => `"${c.user}: ${c.message}"`).join(' | ')
      : "No active questions.";

    let actionInstruction = "";
    
    if (mode === 'proactive') {
        actionInstruction = "ACTION: Silence Breaker. Talk about the product/vibe directly. Do NOT start with 'Wah/Halo'. Just start talking about the details or invite users to ask questions.";
        if (isGiftDetectionEnabled) actionInstruction += " (CHECK FOR GIFTS!)";
    } else {
        actionInstruction = `ACTION: Chat Response.
        INPUT CHATS: [${chatQueries}].
        INSTRUCTION: Pick a NEW topic. Answer DIRECTLY.
        - CHECK FIRST: Did anyone say "CO", "Sudah CO", "Checkout"? If yes, Say THANK YOU!
        - If asking for "Spill/Lihat/Show", LOOK at the image and describe the item being held/shown.
        - If asking for Price/Material, LOOK at INVENTORY_DATABASE.
        - Do not use filler words like 'Wah/Duh/Aduh' at the start.`;
    }

    const promptText = `
CONTEXT_DATABASE:
${inventoryContext}

${isEtalaseMode ? "STRICT_SYNC_RULE: Identify products by 'Etalase Number' (ITEM #X) and return 'DB_ID'." : "ROLE_ADHERENCE: Strictly follow the Custom Host Role Description."}

${actionInstruction}
`;

    const parts = [{ text: promptText }];
    if (imageBuffer) {
        parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBuffer
            }
        });
    }

    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json"
      },
      contents: {
        parts: parts
      }
    });

    const text = response.text || "";
    let cleanText = text.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    
    // Helper to sanitize start of sentence
    const sanitizeStart = (str) => {
        let s = str
          .replace(/tumpahin/gi, "kasih tau")
          .replace(/^(Duh|Aduh|Wah|Hmm|Wow|Waduh|Oh|Eh|Nah|Yaps)[!,\.]?\s*/i, "")
          .trim();
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    try {
      const json = JSON.parse(cleanText);
      // Safety Net: Filters
      if (json.text_answer) {
         json.text_answer = sanitizeStart(json.text_answer);
      }
      res.json(json);
    } catch {
      if (cleanText.length > 0) {
         let safeText = sanitizeStart(cleanText);
         res.json({ 
           intent: 'chat_response', 
           text_answer: safeText, 
           confidence: 'medium' 
         });
      } else {
         res.json({ intent: 'ignore', text_answer: "", confidence: 'low' });
      }
    }

  } catch (error) {
    console.error("Vision Error:", error);
    res.status(500).send(error.message);
  }
});

// 3. TTS Generation
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const ai = getGeminiClient(req);
    const { text, gender, personality } = req.body;
    
    const targetGender = String(gender).toLowerCase();
    const isMale = targetGender === 'male';
    const voiceName = isMale ? 'Fenrir' : 'Kore';

    console.log(`[TTS] Generating. Voice: ${voiceName}, Gender: ${targetGender}, Style: ${personality}`);

    // ENHANCED TONE WRAPPERS (STRICTER CONTROL & GENDER AWARE)
    const TONE_WRAPPERS = {
      enthusiast: isMale 
        ? "Speak with an energetic, fast-paced, deep male voice. High energy, confident: "
        : "Speak fast, excited, dynamic pitch, high energy, selling mode: ",
      expert: isMale
        ? "Speak with a deep, calm, authoritative, professional male voice. Stable and trustworthy: "
        : "Speak calm, deep, authoritative, professional, slow pace, trusting tone: ",
      companion: isMale
        ? "Speak with a warm, stable, gentle male voice. Deep pitch, comforting and masculine. No filler words: "
        : "Speak with a stable, slow, smooth, and soft tone. Sweet and comforting. Avoid filler words: ",
      expressive: isMale
        ? "Speak with a deep, dramatic, expressive male voice. Varied intonation but keep it masculine: "
        : "Speak with varied pitch, high expressiveness, and emotional range. Use dramatic pauses and emphasis: "
    };

    // Safety: Ensure text isn't empty
    if (!text || text.trim().length === 0) {
        return res.status(400).send("No text provided");
    }

    // Prepend instructions for TTS style
    const ttsPrompt = (TONE_WRAPPERS[personality] || "") + text;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: { parts: [{ text: ttsPrompt }] },
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        },
        audioEncoding: "LINEAR16" 
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      res.set('Content-Type', 'application/octet-stream');
      res.send(audioBuffer);
    } else {
      res.status(500).send("No audio generated");
    }

  } catch (error) {
    console.error("TTS Error:", error);
    res.status(500).send(error.message);
  }
});

app.listen(PORT, async () => {
  console.log(`\n🚀 LIVEIN AI SERVER STARTED`);
  console.log(`   ➜ API Backend:  http://localhost:${PORT}`);
  
  try {
    const vite = await createServer({
      server: {
        middlewareMode: false,
      },
    });
    await vite.listen();
    console.log(`   ➜ Frontend UI:  Wait for Vite output below...\n`);
  } catch (e) {
    console.error("Failed to start Vite server:", e);
  }
});