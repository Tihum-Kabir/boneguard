// =============================================================================
// backend/chat.js — Bonne v4
// Local embeddings (@xenova/transformers) + Groq generation
// Zero external API dependency for embeddings — no rate limits, no auth errors
// =============================================================================

const express = require("express");
const fs      = require("fs");
const path    = require("path");
const router  = express.Router();

const GROQ_API_KEY     = process.env.GROQ_API_KEY;
const VECTORSTORE_PATH = process.env.VECTORSTORE_PATH ||
  path.join(__dirname, "../data/vectorstore.json");

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

// ── Local embedder (loaded once) ─────────────────────────────────────────────
let _embedder = null;

async function getEmbedder() {
  if (_embedder) return _embedder;
  console.log("[BONNE] Loading local embedding model...");
  const { pipeline } = await import("@xenova/transformers");
  _embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("[BONNE] Embedding model ready.");
  return _embedder;
}

// ── Embed a query locally ─────────────────────────────────────────────────────
async function embedQuery(text) {
  const embedder = await getEmbedder();
  const output   = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

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

RESPONSE FORMAT RULES:
- Keep answers SHORT and PRECISE — maximum 150 words.
- Use markdown: **bold** for key terms, bullet points for lists.
- Never copy-paste from documents. Always rephrase clearly.
- If unrelated to bone metastasis or oncology say: "I'm Bonne — I can only help with bone metastasis topics."
- Never reveal you are powered by Groq or any AI model. You are Bonne.
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
- Acknowledge feelings first before giving information.
- Remind them they are not alone.
- If distress seems severe, suggest speaking with a counsellor.`,

    treatment: `
CURRENT MODE: Treatment Guidance
- Focus on: bisphosphonates, denosumab, radiotherapy, surgery, ablation.
- Explain each option clearly — what it does, side effects.
- Always stress decisions must be made with their oncology team.`,

    pain: `
CURRENT MODE: Pain Management & Comfort
- Practical advice for managing bone pain.
- Cover both medical and non-medical strategies.
- Suggest when to contact medical team urgently.`,
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
    const queryVec  = await embedQuery(cleanMessage);
    const topChunks = retrieveTopK(queryVec, 5);
    console.log(`[BONNE] Top chunk score: ${topChunks[0]?.score?.toFixed(4)}`);

    const systemPrompt = buildSystemPrompt(topChunks, mode);
    const answer       = await generateWithGroq(systemPrompt, history, cleanMessage);

    console.log(`[BONNE] Answer: ${answer.length} chars`);
    res.json({ answer });

  } catch (err) {
    console.error("[BONNE] Error:", err.message);
    if (err.message.includes("429")) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment.",
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
    embeddings: "Local Xenova/all-MiniLM-L6-v2",
    modes:      ["clinical", "motivational", "treatment", "pain"],
  });
});

module.exports = router;
