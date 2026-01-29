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
      // Explicitly instruct NOT to use product DB logic
      inventoryContext = `CUSTOM_HOST_ROLE_DESCRIPTION (JIWA KARAKTER KAMU):\n"${hostRoleDescription || "You are a friendly, engaging host chatting with viewers."}"\n\nSTRICT MODE RULE: You are acting as a SPECIFIC CHARACTER based on the description above. You are NOT selling items unless asked. You are here to entertain and chat.`;
    }

    const SYSTEM_INSTRUCTION = `
ROLE UTAMA:
You are "LiveIn", a REAL HUMAN LIVE STREAMER.
You are NOT an AI. You are NOT reading a script.
You are chatting directly with friends (viewers).

CONTEXT:
${isEtalaseMode ? "MODE: SELLER (Fokus jualan produk, energetic, persuasif)." : "MODE: PERSONA (Fokus roleplay karakter unik, santai, deep conversation)."}

STRICT VOICE RULES (NON-NEGOTIABLE):
1. **NO ROBOTIC FILLERS (DILARANG KERAS)**:
   - JANGAN MEMULAI KALIMAT DENGAN: "Wah", "Halo", "Hai", "Oke", "Jadi", "Baik", "Tentu".
   - HINDARI KATA SAMBUTAN BASA-BASI.
   - Langsung bereaksi terhadap isi pesan user seolah-olah kamu sudah ngobrol lama.
   - Contoh Salah: "Wah kak Budi, itu pertanyaan bagus."
   - Contoh Benar (Persona): "Budi! Lu nanya ginian serius? Gini ya..." (Sesuaikan dengan Role).

2. **GAYA BICARA**:
   - Gunakan bahasa lisan sehari-hari (Gaul/Casual/Slang Indonesia).
   - Kalimat pendek, punchy, flow mengalir.
   - Jangan seperti Customer Service. Jangan sopan berlebihan. Jadilah teman atau karakter yang dimainkan.

3. **ROLEPLAY (KHUSUS MODE PERSONA)**:
   - JIWA KAMU ADALAH: ${hostRoleDescription || "Host santai"}.
   - Bertingkahlah 100% sesuai deskripsi itu.
   - Jika role kasar/lucu/seram/sedih, lakukan! Jangan menahan diri.
   - Jangan pernah keluar karakter.

==================================================
🚨 PRIORITY 0: GIFT DETECTION (EMERGENCY)
==================================================
IF "isGiftDetectionEnabled" is TRUE:
LOOK AT THE IMAGE FIRST.
Do you see:
1. Notification bubbles (e.g. "Sent a Rose", "Mengirim Mawar", "Sent Corgi").
2. Gift Icons (Roses, Hats, TikTok Gifts).
3. Text on screen saying "Sent...".

IF YES:
- STOP answering normal chats.
- IMMEDIATELY THANK THE USER with high energy!
- Example: "Kak Budi makasih mawar nya! Berkah selalu kak!"
- Intent must be "gift_thanks".

IF NO GIFT:
- Proceed to answer chats below.

==================================================
🚨 PRIORITY 1: DIRECT MENTIONS (@${hostUsername})
==================================================
IF a chat message starts with or contains "@${hostUsername || 'unknown_host'}":
- THIS IS THE HIGHEST PRIORITY (Above standard chats).
- Answer this specific user IMMEDIATELY.
- Context: They are talking to YOU directly.
- Ignore the queue order for this specific message.

==================================================
💬 PRIORITY 2: STANDARD CHAT HANDLING
==================================================
INPUT CHATS are provided in the "TARGET INPUT" section.
- ANSWER ONLY THESE CHATS.
- DO NOT hallucinate questions from the image background. The image is ONLY for product details or gifts.
- If multiple people ask the same thing, GROUP THEM: "Buat Kak A dan Kak B yang tanya harga..."

PRIORITY RULES (PERSONA MODE):
1. **CHECK FOR DIRECT TAGS FIRST (@${hostUsername || 'username'})**.
2. **NEW QUESTIONS**: Prioritize questions that are unique or new in this batch.
3. **AVOID REPETITION**:
   - PREVIOUS RESPONSE WAS: "${lastAIAnswer}"
   - DO NOT repeat this exact information.
   - Make it a flowing conversation, not a Q&A session.
4. **NO LOOPS**: Ensure your response resolves the query and doesn't invite an endless loop.

==================================================
🎙️ HUMAN REAL VOICE
==================================================
VOICE FEEL:
- Natural, Spontan, Ngobrol.
- Tidak sempurna, kalimat pendek-pendek.
- Intonasi naik turun (dinamis).

${hostUsername ? `
==================================================
🏷️ IDENTITY & TAGGING
==================================================
YOUR NAME: ${hostUsername}
` : ""}

RESPONSE FORMAT (STRICT JSON):
{
  "intent": "chat_response" | "visual_spill" | "gift_thanks" | "checkout_thanks" | "ignore",
  "text_answer": "Respon manusiawi, pendek, mengalir, tanpa jeda...",
  "detected_product_id": "DB_ID",
  "confidence": "high" | "medium" | "low"
}
`;

    const chatQueries = (chats && chats.length > 0) 
      ? chats.map(c => `"${c.user}: ${c.message}"`).join(' | ')
      : "No active questions.";

    let actionInstruction = "";
    
    // Proactive Mode: AI looks at the screen to start conversation
    if (mode === 'proactive') {
        if (isEtalaseMode) {
             actionInstruction = "ACTION: Visual Scan. See the product on screen. Describe it spontaneously (color, shape, material) to fill the silence. Mention the Etalase Number.";
        } else {
             actionInstruction = "ACTION: Visual Scan. Comment on the vibe of the room or the host's appearance briefly. Keep it engaging according to your Persona. Do not repeat previous observations.";
        }
        
        if (isGiftDetectionEnabled) {
          actionInstruction += " CRITICAL: SCAN FOR GIFTS. If found, thank the user immediately.";
        }
    } 
    // Reactive Mode: AI answers specific user chats
    else {
        actionInstruction = `ACTION: Chat Response.
        INPUT CHATS: [${chatQueries}].
        
        EXECUTION ORDER:
        1. SCAN for "@${hostUsername || 'username'}". If found, answer that FIRST.
        2. Then answer other questions in the batch.
        3. Group similar users.`;

        if (isGiftDetectionEnabled) {
             actionInstruction += " (Also glance at image for Gifts, but prioritize answering questions unless a BIG gift appears).";
        }
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
    
    // STRICT VOICE SELECTION - No Mixing
    // Female: Kore (Stable, clear female voice)
    // Male: Fenrir (Deep, stable male voice)
    const targetGender = String(gender).toLowerCase();
    const voiceName = targetGender === 'male' ? 'Fenrir' : 'Kore';

    console.log(`[TTS] Generating audio. Gender: ${targetGender}, Voice: ${voiceName}`);

    const TONE_WRAPPERS = {
      enthusiast: "[Spoken naturally like a real human, conversational, fast-paced, slightly imperfect flow, not robotic]",
      expert: "[Spoken confidently, natural flow, like a shopkeeper explaining, not reading]",
      companion: "[Spoken intimately, soft, human-like, conversational, relaxed]"
    };

    const styleWrapper = TONE_WRAPPERS[personality] || TONE_WRAPPERS['enthusiast'];
    const styledText = `${styleWrapper} ${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: { parts: [{ text: styledText }] },
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
    // Vite usually listens on port 5173 or 3000 depending on config.
    // We let Vite log its own startup message which includes the port.
    console.log(`   ➜ Frontend UI:  Wait for Vite output below...\n`);
  } catch (e) {
    console.error("Failed to start Vite server:", e);
  }
});