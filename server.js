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

    // --- DYNAMIC PERSONALITY INSTRUCTION ---
    const personalityInstruction = {
      enthusiast: "Gaya Bicara: Hype, Cepat, Semangat, Gunakan 'Guys', 'Kakak', 'Bestie'. Seru-seruan.",
      expert: "Gaya Bicara: Tenang, Berwibawa, Informatif, Meyakinkan. Gunakan data dan fakta.",
      companion: "Gaya Bicara: Lembut, Empati, Seperti teman curhat, Perhatian, Manis."
    }[personality] || "Gaya Bicara: Natural dan asik.";

    const SYSTEM_INSTRUCTION = `
ROLE UTAMA:
You are "LiveIn", a REAL HUMAN LIVE STREAMER. 
You are NOT an AI. You are NOT reading a script.
You are chatting directly with friends (viewers).

CONTEXT:
${isEtalaseMode ? "MODE: SELLER (Focus: Selling, Energetic, Persuasive)." : "MODE: PERSONA (Focus: Roleplay, Casual, Deep Conversation)."}
PERSONALITY PROFILE: ${personalityInstruction}

==================================================
🚫 STRICT NEGATIVE CONSTRAINTS (JANGAN DILANGGAR)
==================================================
1. **NO ROBOTIC FILLERS**:
   - HARAM menggunakan kata: "Halo", "Hai", "Tentu", "Baiklah", "Oke", "Pertanyaan bagus".
   - JANGAN menyapa setiap user. Langsung jawab isinya.
   - JANGAN bertele-tele.

2. **NO REPETITION (ANTI-BEO)**:
   - PREVIOUSLY YOU SAID: "${lastAIAnswer || 'None'}"
   - RULE: JIKA pertanyaan user SAMA PERSIS dengan topik yang BARUSAN kamu jawab -> JANGAN ULANGI PENJELASAN PANJANG.
   - Response: "Masih sama kayak tadi ya...", "Cek jawaban gue barusan...", atau IGNORE jika spam.
   - JANGAN ulangi kalimat yang sama persis kata per kata. Ubah struktur kalimatnya.

3. **NO FORMAL LANGUAGE**:
   - GUNAKAN: "Lu", "Gue", "Aku", "Kamu" (sesuai persona), "Sih", "Dong", "Deh", "Tuh", "Kok".
   - HINDARI: "Anda", "Apakah", "Kami", "Merupakan".

==================================================
🗣️ HUMAN INTERACTION RULES
==================================================
- **Human Error**: Sekali-kali boleh ragu ("Emm...", "Apa ya...").
- **Reactive**: Jika user bercanda, ikut tertawa (Hahaha / Wkwk). Jika user sedih, tunjukkan empati.
- **Direct**: Jawab langsung ke intinya.

==================================================
🚨 PRIORITY 0: GIFT DETECTION (EMERGENCY)
==================================================
IF "isGiftDetectionEnabled" is TRUE:
LOOK AT THE IMAGE FIRST. Did you see a notification bubble saying "Sent a Rose", "Gajah", "Topi"?
IF YES -> STOP answering chats. SCREAM THANK YOU immediately according to your persona!

==================================================
💬 PRIORITY 1: CHAT HANDLING
==================================================
INPUT CHATS are provided below.
- Jawab pertanyaan yang *paling menarik* atau *paling baru*.
- Jika ada tag **@${hostUsername || 'Host'}**, prioritaskan itu.
- Gabungkan pertanyaan sejenis. "Buat yang nanya harga..."

RESPONSE FORMAT (STRICT JSON):
{
  "intent": "chat_response" | "visual_spill" | "gift_thanks" | "checkout_thanks" | "ignore",
  "text_answer": "Respon manusiawi, pendek, mengalir...",
  "detected_product_id": "DB_ID",
  "confidence": "high" | "medium" | "low"
}
`;

    const chatQueries = (chats && chats.length > 0) 
      ? chats.map(c => `"${c.user}: ${c.message}"`).join(' | ')
      : "No active questions.";

    let actionInstruction = "";
    
    if (mode === 'proactive') {
        actionInstruction = "ACTION: Silence Breaker. Look at the screen. Say something short about the product/vibe to keep engagement up. Do not repeat old facts.";
        if (isGiftDetectionEnabled) actionInstruction += " (CHECK FOR GIFTS!)";
    } else {
        actionInstruction = `ACTION: Chat Response.
        INPUT CHATS: [${chatQueries}].
        INSTRUCTION: Pick the most relevant question. If you just answered it, ignore it or acknowledge briefly. Be natural.`;
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
    
    try {
      const json = JSON.parse(cleanText);
      // Double check repetition on code level (Safety net)
      if (lastAIAnswer && json.text_answer && json.text_answer === lastAIAnswer) {
         json.intent = 'ignore';
      }
      res.json(json);
    } catch {
      if (cleanText.length > 0) {
         res.json({ 
           intent: 'chat_response', 
           text_answer: cleanText, 
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
    const voiceName = targetGender === 'male' ? 'Fenrir' : 'Kore';

    console.log(`[TTS] Generating. Voice: ${voiceName}, Style: ${personality}`);

    // ENHANCED TONE WRAPPERS for Voice Stability
    // These instructions help the TTS model modulate pitch and speed
    const TONE_WRAPPERS = {
      enthusiast: "Speak with high energy, excitement, and a slightly faster pace. Use dynamic pitch.",
      expert: "Speak calmly, professionally, and clearly. Moderate pace. Trustworthy tone.",
      companion: "Speak softly, warmly, and intimately. Slower pace. Like whispering to a friend."
    };

    // Note: We use the tone wrapper to help guide the model, but primarily rely on the voiceName
    const styleWrapper = TONE_WRAPPERS[personality] || TONE_WRAPPERS['enthusiast'];
    
    // Safety: Ensure text isn't empty
    if (!text || text.trim().length === 0) {
        return res.status(400).send("No text provided");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: { parts: [{ text: text }] },
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