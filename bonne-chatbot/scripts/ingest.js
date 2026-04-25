// =============================================================================
// scripts/ingest.js — Local Embeddings Version (no API key needed)
// Uses @xenova/transformers to run embedding model locally
// Run: node scripts/ingest.js
// =============================================================================

const fs   = require("fs");
const path = require("path");

const DATA_DIR    = path.join(__dirname, "../data");
const OUTPUT_FILE = path.join(__dirname, "../data/vectorstore.json");
const CHUNK_SIZE  = 400;
const CHUNK_OVERLAP = 80;

// ── Chunk text ────────────────────────────────────────────────────────────────
function chunkText(text, source) {
  const words  = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    chunks.push({
      content: words.slice(i, i + CHUNK_SIZE).join(" "),
      source,
    });
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

// ── Cosine similarity ─────────────────────────────────────────────────────────
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("  Bonne RAG — Local Embedding Ingestion Script");
  console.log("=".repeat(60));

  // Load the embedding pipeline locally
  console.log("\nLoading embedding model (downloads once, ~25MB)...");
  const { pipeline } = await import("@xenova/transformers");
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );
  console.log("Model loaded.\n");

  const txtFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith(".txt"));

  if (txtFiles.length === 0) {
    console.error(`No .txt files found in ${DATA_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${txtFiles.length} document(s): ${txtFiles.join(", ")}`);

  let allChunks = [];
  for (const file of txtFiles) {
    const text   = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
    const chunks = chunkText(text, file.replace(".txt", ""));
    console.log(`  > ${file}: ${chunks.length} chunks`);
    allChunks = allChunks.concat(chunks);
  }

  console.log(`\nEmbedding ${allChunks.length} chunks locally...`);

  const embedded = [];
  for (let i = 0; i < allChunks.length; i++) {
    const chunk  = allChunks[i];
    process.stdout.write(`  Chunk ${i + 1}/${allChunks.length}...`);

    const output = await embedder(chunk.content, {
      pooling:   "mean",
      normalize: true,
    });
    const vector = Array.from(output.data);

    embedded.push({
      id:        i,
      source:    chunk.source,
      content:   chunk.content,
      embedding: vector,
    });
    process.stdout.write(" done\n");
  }

  const vectorStore = {
    created:   new Date().toISOString(),
    model:     "Xenova/all-MiniLM-L6-v2",
    dims:      embedded[0]?.embedding?.length || 384,
    chunks:    embedded.length,
    documents: txtFiles,
    data:      embedded,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vectorStore, null, 2));
  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log(`  Saved: ${OUTPUT_FILE}`);
  console.log(`  Chunks: ${embedded.length} | Dims: ${vectorStore.dims} | Size: ${sizeKB} KB`);
  console.log("=".repeat(60));

  // Sanity check
  console.log("\nSanity check — searching for 'osteolytic'...");
  const qOut   = await embedder("What is osteolytic bone metastasis?", {
    pooling: "mean", normalize: true,
  });
  const qVec   = Array.from(qOut.data);
  const scored = embedded
    .map(c => ({ score: cosineSim(qVec, c.embedding), content: c.content.slice(0, 80) }))
    .sort((a, b) => b.score - a.score);

  console.log(`  Top match (score ${scored[0].score.toFixed(4)}): ${scored[0].content}...`);
  console.log("\nIngestion complete!");
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
