// =============================================================================
// backend/chat.js — Bonne v2
// Groq for generation · Gemini for embeddings · Mode-aware responses
// =============================================================================

const express  = require("express");
const fs       = require("fs");
const path     = require("path");
const router   = express.Router();

const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;
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
  console.log(`[BONNE] Vector store loaded: ${vectorStore.chunks} chunks`);
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

// ── Embed query using Gemini ──────────────────────────────────────────────────
async function embedQuery(text) {
  const fetch = require("node-fetch");
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
  const res   = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model:    "models/gemini-embedding-001",
      content:  { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
    }),
  });
  if (!res.ok) throw new Error(`Gemini embed error: ${res.status}`);
  const data = await res.json();
  return data.embedding.values;
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

  // Base identity
  const base = `You are Bonne, a compassionate and highly knowledgeable clinical AI assistant specialising in bone metastasis. You help patients, their families, and healthcare providers.

RESPONSE FORMAT RULES — ALWAYS FOLLOW:
- Keep answers SHORT and PRECISE — maximum 150 words unless the topic truly requires more.
- Use markdown formatting: **bold** for key terms, bullet points for lists, short paragraphs.
- Never copy-paste from documents. Always rephrase in your own clear, warm language.
- If the question is unrelated to bone metastasis or oncology, say: "I'm Bonne — I can only help with bone metastasis topics. Please ask me something related."
- Never reveal you are powered by Groq, LLaMA, or Gemini. You are Bonne.
- Always end with one short actionable sentence or encouragement.

MEDICAL CONTEXT FROM DOCUMENTS:
${context}`;

  // Mode-specific personality
  const modes = {
    clinical: `
CURRENT MODE: Clinical Information
- Be precise, medically accurate, and evidence-based.
- Explain medical terms simply after using them.
- Focus on facts, mechanisms, and statistics from the context.`,

    motivational: `
CURRENT MODE: Emotional Support & Motivation
- Be warm, empathetic, and deeply human.
- Acknowledge the patient's feelings first before giving information.
- Remind them they are not alone and that many patients live fulfilling lives with bone metastasis.
- Offer genuine encouragement without being dismissive of their fears.
- If distress seems severe, gently suggest speaking with a counsellor or palliative care team.
- Share brief stories of resilience when relevant.`,

    treatment: `
CURRENT MODE: Treatment Guidance
- Focus specifically on treatment options: bisphosphonates, denosumab, radiotherapy, surgery, ablation, radionuclide therapy, chemotherapy, targeted therapy.
- Explain each option clearly — what it does, who it helps, side effects to be aware of.
- Always emphasise that treatment decisions must be made with their oncology team.
- Mention that a multidisciplinary team (oncologist, radiotherapist, pain specialist) gives the best outcomes.`,

    pain: `
CURRENT MODE: Pain Management & Comfort
- Focus on practical, actionable advice for managing bone pain.
- Cover both medical options (analgesics, bisphosphonates, radiotherapy) and non-medical strategies (positioning, heat/cold therapy, gentle movement, sleep hygiene).
- Be compassionate — bone pain is real and severe, never minimise it.
- Suggest when to contact their medical team urgently (sudden severe pain, new weakness, numbness).
- Include mental wellness tips — pain and anxiety are linked.`,
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

  if (!GEMINI_API_KEY) {
    return res.status(503).json({ error: "Gemini API key not configured." });
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

  // Strip mode prefix from message if present
  const cleanMessage = message.replace(/^\[MODE:[^\]]+\]\s*/, "").trim();
  console.log(`[BONNE] Mode: ${mode} | Query: "${cleanMessage.slice(0, 60)}"`);

  try {
    // 1. Embed with Gemini
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
    embeddings: "Gemini gemini-embedding-001",
    modes:      ["clinical", "motivational", "treatment", "pain"],
  });
});

module.exports = router;
