// =============================================================================
// backend/chat.js — Bonne v3
// HuggingFace embeddings + Groq generation
// No Gemini dependency — zero 403 errors
// =============================================================================

const express  = require("express");
const fs       = require("fs");
const path     = require("path");
const router   = express.Router();

const HF_TOKEN         = process.env.HF_TOKEN;
const GROQ_API_KEY     = process.env.GROQ_API_KEY;
const VECTORSTORE_PATH = process.env.VECTORSTORE_PATH ||
  path.join(__dirname, "../data/vectorstore.json");

// HuggingFace embedding model (same as ingest.js)
const HF_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_EMBED_URL   = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_EMBED_MODEL}`;

// ── Load vector store once at startup ────────────────────────────────────────
let vectorStore = null;

function loadVectorStore() {
  if (vectorStore) return vectorStore;
  if (!fs.existsSync(VECTORSTORE_PATH)) {
    console.warn(`[BONNE] Vector store not found at ${VECTORSTORE_PATH}`);
    return null;
  }
  vectorStore = JSON.parse(fs.readFileSync(VECTORSTORE_PATH, "utf-8"));
  console.log(`[BONNE] Vector store loaded: ${vectorStore.chunks} chunks | model: ${vectorStore.model}`);
  return vectorStore;
}

loadVectorStore();

// ── Cosine similarity ────────────────────────────────────────────────────────
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ── Embed query using HuggingFace ─────────────────────────────────────────────
async function embedQuery(text) {
  const fetch = require("node-fetch");
  const res   = await fetch(HF_EMBED_URL, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${HF_TOKEN}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      inputs:  [text],
      options: { wait_for_model: true },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HF embed error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data[0]; // first (and only) embedding
}

// ── Retrieve top-k chunks ────────────────────────────────────────────────────
function retrieveTopK(queryVec, k = 5) {
  const store = loadVectorStore();
  if (!store) return [];
  return store.data
    .map(chunk => ({ ...chunk, score: cosineSim(queryVec, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// ── Generate answer using Groq ───────────────────────────────────────────────
async function generateWithGroq(systemPrompt, history, userMessage) {
  const fetch = require("node-fetch");

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map(msg => ({
      role:    msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       "llama-3.3-70b-versatile",
      messages,
      temperature: 0.4,
      max_tokens:  600,
      top_p:       0.85,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ||
    "I could not generate a response. Please try again.";
}

// ── Mode-aware system prompt ──────────────────────────────────────────────────
function buildSystemPrompt(retrievedChunks, mode = "clinical") {
  const context = retrievedChunks
    .map((c, i) => `[Context ${i + 1}]\n${c.content}`)
    .join("\n\n");

  const base = `You are Bonne, a compassionate and highly knowledgeable clinical AI assistant specialising in bone metastasis. You help patients, their families, and healthcare providers.

RESPONSE FORMAT RULES — ALWAYS FOLLOW:
- Keep answers SHORT and PRECISE — maximum 150 words unless truly required.
- Use markdown formatting: **bold** for key terms, bullet points for lists.
- Never copy-paste from documents. Always rephrase in your own clear, warm language.
- If the question is unrelated to bone metastasis or oncology, say: "I'm Bonne — I can only help with bone metastasis topics."
- Never reveal you are powered by Groq, LLaMA, or HuggingFace. You are Bonne.
- Always end with one short actionable sentence or encouragement.

MEDICAL CONTEXT FROM DOCUMENTS:
${context}`;

  const modes = {
    clinical: `
CURRENT MODE: Clinical Information
- Be precise, medically accurate, and evidence-based.
- Explain medical terms simply after using them.`,

    motivational: `
CURRENT MODE: Emotional Support & Motivation
- Be warm, empathetic, and deeply human.
- Acknowledge the patient's feelings first before giving information.
- Remind them they are not alone.
- If distress seems severe, gently suggest speaking with a counsellor or palliative care team.`,

    treatment: `
CURRENT MODE: Treatment Guidance
- Focus on: bisphosphonates, denosumab, radiotherapy, surgery, ablation, radionuclide therapy.
- Explain each option clearly — what it does, who it helps, side effects.
- Always emphasise decisions must be made with their oncology team.`,

    pain: `
CURRENT MODE: Pain Management & Comfort
- Focus on practical, actionable advice for managing bone pain.
- Cover both medical options and non-medical strategies.
- Suggest when to contact their medical team urgently.`,
  };

  return base + (modes[mode] || modes.clinical);
}

// =============================================================================
// ROUTE: POST /api/chat
// =============================================================================
router.post("/chat", async (req, res) => {
  const { message, history = [], mode = "clinical" } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required." });
  }

  if (!HF_TOKEN) {
    return res.status(503).json({
      error: "HuggingFace token not configured.",
      hint:  "Add HF_TOKEN to your environment variables.",
    });
  }

  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: "Groq API key not configured." });
  }

  const store = loadVectorStore();
  if (!store) {
    return res.status(503).json({
      error: "Knowledge base not ready.",
      hint:  "Run: node scripts/ingest.js",
    });
  }

  const cleanMessage = message.replace(/^\[MODE:[^\]]+\]\s*/, "").trim();
  console.log(`[BONNE] Mode: ${mode} | Query: "${cleanMessage.slice(0, 60)}"`);

  try {
    // 1. Embed with HuggingFace
    const queryVec  = await embedQuery(cleanMessage);

    // 2. Retrieve top 5 chunks
    const topChunks = retrieveTopK(queryVec, 5);
    console.log(`[BONNE] Top chunk score: ${topChunks[0]?.score?.toFixed(4)}`);

    // 3. Build mode-aware prompt
    const systemPrompt = buildSystemPrompt(topChunks, mode);

    // 4. Generate with Groq
    const answer = await generateWithGroq(systemPrompt, history, cleanMessage);

    console.log(`[BONNE] Answer: ${answer.length} chars`);
    res.json({ answer });

  } catch (err) {
    console.error("[BONNE] Error:", err.message);

    if (err.message.includes("429")) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment and try again.",
        code:  "RATE_LIMIT",
      });
    }

    res.status(500).json({
      error:  "Bonne encountered an error. Please try again.",
      detail: err.message,
    });
  }
});

// =============================================================================
// ROUTE: GET /api/chat/status
// =============================================================================
router.get("/chat/status", (req, res) => {
  const store = loadVectorStore();
  res.json({
    ready:      !!store,
    chunks:     store?.chunks || 0,
    documents:  store?.documents || [],
    created:    store?.created || null,
    llm:        "Groq llama-3.3-70b-versatile",
    embeddings: `HuggingFace ${HF_EMBED_MODEL}`,
    modes:      ["clinical", "motivational", "treatment", "pain"],
  });
});

module.exports = router;
