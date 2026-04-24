// =============================================================================
// BoneGuard Backend — Node.js Express API Gateway
// Receives scan image from Next.js frontend, forwards to HuggingFace,
// returns structured prediction + Score-CAM + clinical report.
// =============================================================================

require("dotenv").config();

const chatRouter = require("../bonne-chatbot/backend/chat");
const express  = require("express");
const cors     = require("cors");
const multer   = require("multer");
const fetch    = require("node-fetch");
const FormData = require("form-data");

const app = express();
const HF_API_URL   = process.env.HF_API_URL   || "https://tihumkabir-boneguard-api.hf.space";
const PORT         = process.env.PORT          || 3001;
const HF_TIMEOUT   = parseInt(process.env.HF_TIMEOUT_MS) || 60000;

// ── CORS: allow Next.js dev server and production ────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());
app.use("/api", chatRouter);

// ── Multer: accept image in memory (max 20MB) ─────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/bmp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Please upload PNG, JPG, or BMP.`));
    }
  },
});

// ── Helper: check if HF Space is awake ───────────────────────────────────────
async function checkHealth() {
  try {
    const res = await fetch(`${HF_API_URL}/health`, { timeout: 10000 });
    return res.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// GET /api/health
// Checks both this server and the HuggingFace Space are alive.
// =============================================================================
app.get("/api/health", async (req, res) => {
  try {
    const hfRes  = await fetch(`${HF_API_URL}/health`, { timeout: 15000 });
    const hfData = await hfRes.json();
    res.json({
      gateway:  "ok",
      hf_space: hfRes.ok ? "ok" : "error",
      hf_data:  hfData,
    });
  } catch (err) {
    res.status(503).json({
      gateway:  "ok",
      hf_space: "sleeping_or_unreachable",
      error:    err.message,
      hint:     "HuggingFace free tier sleeps after 30 min. First request may take 15-20 seconds.",
    });
  }
});

// =============================================================================
// POST /api/predict
// Receives multipart/form-data with field "scan" (image file).
// Forwards to HuggingFace /predict, returns JSON result.
// =============================================================================
app.post("/api/predict", upload.single("scan"), async (req, res) => {

  // ── Validate upload ──
  if (!req.file) {
    return res.status(400).json({
      error: "No image uploaded.",
      hint:  "Send a multipart/form-data POST with field name 'scan'.",
    });
  }

  const { originalname, mimetype, size, buffer } = req.file;
  console.log(`[PREDICT] Received: ${originalname} | ${mimetype} | ${(size/1024).toFixed(1)} KB`);

  // ── Build FormData for HuggingFace ──
  const form = new FormData();
  form.append("file", buffer, {
    filename:    originalname,
    contentType: mimetype,
  });

  // ── Wake-up hint ──
  const hfAlive = await checkHealth();
  if (!hfAlive) {
    console.log("[PREDICT] HF Space appears sleeping — sending request anyway (may take 20s)");
  }

  // ── Forward to HuggingFace ──
  let hfResponse;
  try {
    hfResponse = await fetch(`${HF_API_URL}/predict`, {
      method:  "POST",
      body:    form,
      headers: form.getHeaders(),
      timeout: HF_TIMEOUT,
    });
  } catch (err) {
    console.error("[PREDICT] Network error reaching HuggingFace:", err.message);

    if (err.type === "request-timeout" || err.code === "ETIMEDOUT") {
      return res.status(504).json({
        error: "The AI server took too long to respond.",
        hint:  "HuggingFace free tier sleeps after inactivity. Try again in 20 seconds.",
        code:  "HF_TIMEOUT",
      });
    }

    return res.status(502).json({
      error: "Could not reach the AI server.",
      hint:  "Check that your HuggingFace Space is running.",
      code:  "HF_UNREACHABLE",
      detail: err.message,
    });
  }

  // ── Parse HuggingFace response ──
  let hfData;
  try {
    hfData = await hfResponse.json();
  } catch (err) {
    return res.status(502).json({
      error:  "AI server returned an invalid response.",
      code:   "HF_BAD_RESPONSE",
      status: hfResponse.status,
    });
  }

  if (!hfResponse.ok) {
    console.error("[PREDICT] HF returned error:", hfResponse.status, hfData);
    return res.status(hfResponse.status).json({
      error:  hfData.detail || "AI server returned an error.",
      code:   "HF_ERROR",
      status: hfResponse.status,
    });
  }

  console.log(`[PREDICT] Success: label=${hfData.label_text} prob=${hfData.probability}`);
  res.json(hfData);
});

// ── Global error handler for multer errors ────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "Image too large. Maximum size is 20MB.",
      code:  "FILE_TOO_LARGE",
    });
  }
  if (err.message && err.message.startsWith("Unsupported file type")) {
    return res.status(415).json({
      error: err.message,
      code:  "UNSUPPORTED_FILE_TYPE",
    });
  }
  console.error("[ERROR]", err);
  res.status(500).json({ error: "Internal server error.", detail: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log(`  BoneGuard API Gateway running on http://localhost:${PORT}`);
  console.log(`  Forwarding to HuggingFace: ${HF_API_URL}`);
  console.log(`  HF timeout: ${HF_TIMEOUT}ms`);
  console.log("=".repeat(60));
});
