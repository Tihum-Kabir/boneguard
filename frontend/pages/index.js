import { useState, useRef } from "react";
import Head from "next/head";
import axios from "axios";

import ChatPanel      from "../components/ChatPanel";
import UploadZone     from "../components/UploadZone";
import ProbabilityBar from "../components/ProbabilityBar";
import ImageViewer    from "../components/ImageViewer";
import ClinicalReport from "../components/ClinicalReport";
import PDFExport      from "../components/PDFExport";
import ErrorBanner    from "../components/ErrorBanner";
import LoadingState   from "../components/LoadingState";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function Home() {
  const [file,    setFile]    = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const resultsRef = useRef(null);

  const handleFileSelected = (f) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const handleAnalyse = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("scan", file);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/predict`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000,
      });
      setResult(res.data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      const errData = err.response?.data || {
        error: err.code === "ECONNABORTED"
          ? "Request timed out. The AI server may be waking up."
          : "Could not connect to the backend server.",
        hint: err.code === "ECONNABORTED"
          ? "HuggingFace free tier sleeps after inactivity. Wait 20 seconds and try again."
          : "Make sure the backend server is running on port 3001.",
        code: err.code === "ECONNABORTED" ? "HF_TIMEOUT" : "NETWORK_ERROR",
      };
      setError(errData);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const isCancer = result?.prediction === 1;

  return (
    <>
      <Head>
        <title>BoneGuard — Bone Metastasis Detection</title>
        <meta name="description" content="AI-powered bone scintigraphy analysis" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🦴</text></svg>" />
      </Head>

      <div className="min-h-screen" style={{ background: "var(--bg)" }}>

        {/* ── Navbar ── */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-bone-100">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-bone-900 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="8" y="1" width="8" height="22" rx="4" fill="white" opacity="0.9"/>
                  <ellipse cx="12" cy="5"  rx="5" ry="5" fill="white"/>
                  <ellipse cx="12" cy="19" rx="5" ry="5" fill="white"/>
                </svg>
              </div>
              <span className="font-display text-lg text-bone-900">BoneGuard</span>
              <span className="font-mono text-xs text-bone-400 border border-bone-200 rounded-full px-2 py-0.5">
                Clinical AI
              </span>
            </div>
            <div className="flex items-center gap-3">
              {result && (
                <button onClick={handleReset} className="btn-secondary text-sm py-1.5 px-4">
                  New scan
                </button>
              )}
              <a
                href={`${BACKEND_URL}/api/health`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-mono text-xs text-bone-400 hover:text-bone-600 transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-healthy-mid" />
                API status
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-10">

          {/* ── Upload page (no result yet) ── */}
          {!result && !loading && (
            <div>
              {/* Hero */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-bone-100 rounded-full px-4 py-1.5 mb-6">
                  <span className="font-mono text-xs text-bone-500 uppercase tracking-widest">
                    CustomDenseNet k=32 · Grad-CAM XAI
                  </span>
                </div>
                <h1 className="font-display text-5xl sm:text-6xl text-bone-900 mb-4 leading-tight">
                  Bone metastasis<br />
                  <span style={{ color: "#C0392B" }}>detection</span>
                </h1>
                <p className="font-body text-bone-500 text-lg max-w-lg mx-auto">
                  Upload a whole-body bone scintigraphy scan. The AI analyses it and returns
                  a prediction, explainability heatmap, and clinical report.
                </p>
              </div>

              {/* Upload card */}
              <div className="max-w-2xl mx-auto space-y-5">
                <UploadZone onFileSelected={handleFileSelected} disabled={false} />
                <ErrorBanner error={error} onDismiss={() => setError(null)} />
                <button
                  onClick={handleAnalyse}
                  disabled={!file}
                  className="btn-primary w-full text-base py-4 flex items-center justify-center gap-3"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Analyse scan
                </button>

                {/* Steps */}
                <div className="grid grid-cols-3 gap-3 pt-4">
                  {[
                    { step: "01", label: "Upload",  desc: "Drag & drop your scintigraphy scan" },
                    { step: "02", label: "Analyse", desc: "AI processes with MVCL pipeline" },
                    { step: "03", label: "Results", desc: "Prediction + heatmap + clinical report" },
                  ].map(({ step, label, desc }) => (
                    <div key={step} className="text-center p-4 rounded-xl border border-bone-100 bg-white">
                      <p className="font-mono text-xs text-bone-300 mb-1">{step}</p>
                      <p className="font-body font-medium text-bone-700 text-sm">{label}</p>
                      <p className="font-mono text-[11px] text-bone-400 mt-1">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Bonne hint */}
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                  style={{ background: "#FFF8F8", borderColor: "#FECACA" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs text-white"
                    style={{ background: "#C0392B" }}
                  >
                    B
                  </div>
                  <p className="font-body text-sm" style={{ color: "#7F1D1D" }}>
                    Have questions about bone metastasis?{" "}
                    <span className="font-medium">Ask Bonne</span> — our AI clinical assistant.
                    Click the red button at the bottom right.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div className="max-w-lg mx-auto mt-8">
              <LoadingState />
            </div>
          )}

          {/* ── Results ── */}
          {result && !loading && (
            <div ref={resultsRef}>

              {/* Result banner */}
              <div
                className="mb-6 px-6 py-4 rounded-2xl border flex items-center gap-4"
                style={{
                  background:  isCancer ? "#FFF1F0" : "#F0FDF4",
                  borderColor: isCancer ? "#FECACA" : "#BBF7D0",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isCancer ? "#FEE2E2" : "#DCFCE7" }}
                >
                  {isCancer ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#27AE60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className="font-display text-2xl"
                    style={{ color: isCancer ? "#991B1B" : "#166534" }}
                  >
                    {result.label_text}
                  </p>
                  <p className="font-mono text-xs text-bone-400 mt-0.5">
                    {file?.name} · {(result.probability * 100).toFixed(1)}% probability
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="btn-secondary text-sm py-1.5 px-4 flex-shrink-0"
                >
                  Analyse new scan
                </button>
              </div>

              {/* ── Probability bar ── */}
              <div className="mb-6">
                <ProbabilityBar
                  probability={result.probability}
                  threshold={result.threshold_used}
                  label={result.prediction}
                />
              </div>

              {/* ── Images ── */}
              <div className="mb-6">
                <ImageViewer
                  originalSrc={preview}
                  infernoB64={result.inferno_png_b64}
                  scorecamB64={result.scorecam_png_b64}
                  isCancer={isCancer}
                />
              </div>

              {/* ── Clinical report ── */}
              <div className="mb-6">
                <ClinicalReport
                  report={result.clinical_report}
                  probability={result.probability}
                  threshold={result.threshold_used}
                  modelInfo={result.model_info}
                />
              </div>

              {/* ── PDF export ── */}
              <div className="mb-6 max-w-sm">
                <PDFExport result={result} originalSrc={preview} />
              </div>

              {/* ── Ask Bonne prompt (cancer only) ── */}
              {isCancer && (
                <div
                  className="mb-6 flex items-center gap-4 px-5 py-4 rounded-2xl border"
                  style={{ background: "#FFF8F8", borderColor: "#FECACA" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white"
                    style={{ background: "#C0392B" }}
                  >
                    B
                  </div>
                  <div>
                    <p className="font-body font-semibold text-sm" style={{ color: "#7F1D1D" }}>
                      Want to understand this result?
                    </p>
                    <p className="font-body text-sm mt-0.5" style={{ color: "#991B1B" }}>
                      Ask Bonne about treatment options, what these findings mean, or next steps.
                      Click the red chat button at the bottom right.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Audit trail ── */}
              {result.image_hash && (
                <div className="mb-6 px-4 py-3 bg-bone-50 rounded-xl border border-bone-100">
                  <p className="label-sm mb-1">Image hash (audit trail)</p>
                  <p className="font-mono text-[10px] text-bone-400 break-all">
                    SHA-256: {result.image_hash}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-bone-100 mt-16 py-8 px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-display text-bone-800">BoneGuard</span>
              <span className="font-mono text-xs text-bone-400">· Clinical AI v1.0</span>
            </div>
            <p className="font-mono text-xs text-bone-400 text-center max-w-md">
              For research and decision-support only. Not a substitute for clinical diagnosis.
            </p>
            <p className="font-mono text-xs text-bone-300">
              CustomDenseNet k=32 · Grad-CAM · HuggingFace
            </p>
          </div>
        </footer>

        {/* ── Bonne — floating chatbot ── */}
        <ChatPanel />

      </div>
    </>
  );
}