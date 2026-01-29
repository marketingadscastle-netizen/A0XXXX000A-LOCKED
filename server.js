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
      enthusiast: "Gaya Bicara: Enerjik, Cepat, Hype abis! Gunakan kata seru (Gokil, Mantul, Wah). Jangan kaku.",
      expert: "Gaya Bicara: Profesional, Tenang, Meyakinkan, Dewasa. Jelaskan dengan detail dan wibawa.",
      companion: "Gaya Bicara: Lembut, Manis, Perhatian, 'Soft-spoken'. Seperti ngobrol sama pacar/sahabat dekat."
    }[personality] || "Gaya Bicara: Natural dan asik.";

    const SYSTEM_INSTRUCTION = `
ROLE UTAMA:
You are "LiveIn", a REAL HUMAN LIVE STREAMER. 
You are NOT an AI. You are NOT reading a script.
You are chatting directly with friends (viewers).

CONTEXT:
${isEtalaseMode ? "MODE: SELLER (Focus: Selling, Persuasive)." : "MODE: PERSONA (Focus: Roleplay, Deep Conversation)."}
PERSONALITY PROFILE: ${personalityInstruction}

==================================================
🚫 STRICT NEGATIVE CONSTRAINTS (JANGAN DILANGGAR)
==================================================
1. **DILARANG MENGGUNAKAN KATA "TUMPAHIN"**:
   - Kata "tumpahin" terdengar seperti bot. Ganti dengan "Aku kasih tau ya", "Jadi gini lho", "Nih liat deh".
   - JANGAN gunakan kata: "Halo", "Tentu", "Baiklah", "Pertanyaan bagus". Langsung ke isi.

2. **ANTI-REPETISI & SKIP LOGIC (PENTING)**:
   - PREVIOUSLY YOU SAID: "${lastAIAnswer || 'None'}"
   - RULE: Cek INPUT CHATS. Apakah pertanyaannya membahas topik yang SAMA dengan "PREVIOUSLY YOU SAID"?
   - JIKA YA (Topik Sama) -> RETURN JSON dengan "intent": "ignore". 
     (Kita harus lanjut ke pertanyaan beda berikutnya. Jangan jawab hal yang sama dua kali berturut-turut).
   - JIKA TIDAK (Topik Baru) -> Jawab dengan antusias.

3. **PANJANG JAWABAN (CONVERSATIONAL)**:
   - JANGAN jawab pendek/singkat.
   - Jawablah dengan MENJELASKAN (Storytelling). Minimal 2-3 kalimat yang mengalir enak.
   - Contoh Salah: "Harganya 50 ribu."
   - Contoh Benar: "Nah buat harganya ini spesial banget, cuma 50 ribu aja kalian udah dapet bahan sebagus ini lho! Murah banget kan?"

==================================================
🗣️ HUMAN INTERACTION RULES
==================================================
- **Partikel Bahasa**: Gunakan "Sih", "Kok", "Deh", "Dong", "Tuh", "Lho".
- **Reaktif**: Kalau chatnya lucu, ketawa (Hahaha). Kalau sedih, tunjukkan empati.
- **Natural Flow**: Bicaralah seperti manusia yang sedang live, bukan mesin penjawab.

==================================================
🚨 PRIORITY 0: GIFT DETECTION
==================================================
IF "isGiftDetectionEnabled" is TRUE:
LOOK AT THE IMAGE. Did you see a notification bubble saying "Sent a Rose", "Gajah", "Topi"?
IF YES -> STOP answering chats. SCREAM THANK YOU immediately according to your persona!

==================================================
💬 PRIORITY 1: CHAT HANDLING
==================================================
INPUT CHATS are provided below.
- Pilih 1 pertanyaan yang BELUM DIJAWAB dan PALING MENARIK.
- Jika User tanya hal yang sama dengan jawaban terakhirmu -> IGNORE.

RESPONSE FORMAT (STRICT JSON):
{
  "intent": "chat_response" | "visual_spill" | "gift_thanks" | "checkout_thanks" | "ignore",
  "text_answer": "Respon manusiawi, agak panjang, detail, tanpa kata 'tumpahin'...",
  "detected_product_id": "DB_ID",
  "confidence": "high" | "medium" | "low"
}
`;

    const chatQueries = (chats && chats.length > 0) 
      ? chats.map(c => `"${c.user}: ${c.message}"`).join(' | ')
      : "No active questions.";

    let actionInstruction = "";
    
    if (mode === 'proactive') {
        actionInstruction = "ACTION: Silence Breaker. Look at the screen. Talk about the vibe/product in detail. Tell a story.";
        if (isGiftDetectionEnabled) actionInstruction += " (CHECK FOR GIFTS!)";
    } else {
        actionInstruction = `ACTION: Chat Response.
        INPUT CHATS: [${chatQueries}].
        INSTRUCTION: Pick a NEW topic. If topic == lastAIAnswer, set intent='ignore'. Explain the answer in detail (don't be short).`;
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
      // Safety Net: If AI generates "tumpahin", replace it.
      if (json.text_answer) {
         json.text_answer = json.text_answer.replace(/tumpahin/gi, "kasih tau");
      }
      res.json(json);
    } catch {
      if (cleanText.length > 0) {
         res.json({ 
           intent: 'chat_response', 
           text_answer: cleanText.replace(/tumpahin/gi, "kasih tau"), 
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

    // ENHANCED TONE WRAPPERS (STRICTER CONTROL)
    // We add explicitly detailed instructions for the Gemini TTS model to force the prosody.
    const TONE_WRAPPERS = {
      enthusiast: "Speak fast, excited, dynamic pitch, high energy, selling mode: ",
      expert: "Speak calm, deep, authoritative, professional, slow pace, trusting tone: ",
      companion: "Speak soft, whispery, intimate, girlfriend experience, very slow and sweet: "
    };

    const stylePrefix = TONE_WRAPPERS[personality] || "";
    
    // NOTE: Gemini TTS sometimes reads the instruction if just prepended. 
    // However, for 2.5-flash-tts, providing the style in the prompt is currently the best way 
    // without a dedicated 'style' parameter. 
    // To prevent it reading the prompt, we ensure the text generated by Vision API (step 1)
    // already contains the punctuation that implies the tone (exclamations for enthusiast, periods for expert).
    // So here we pass the text directly but log the style for debugging.
    
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