import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// ── Markdown bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-medium"
        style={{
          background: isUser ? "#3A3731" : "#C0392B",
          color: "#fff",
          fontSize: "11px",
        }}
      >
        {isUser ? "You" : "B"}
      </div>

      <div
        style={{
          maxWidth: "80%",
          background:   isUser ? "#3A3731" : "#FFFFFF",
          color:        isUser ? "#FFFFFF" : "#3A3731",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          border:       isUser ? "none" : "1px solid #E5E3DC",
          boxShadow:    "0 1px 3px rgba(0,0,0,0.06)",
          padding:      "10px 14px",
          fontSize:     "13px",
          lineHeight:   "1.6",
        }}
      >
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <div className="bonne-markdown">
            <ReactMarkdown
              components={{
                p:      ({ children }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p>,
                ul:     ({ children }) => <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>{children}</ul>,
                ol:     ({ children }) => <ol style={{ margin: "4px 0", paddingLeft: "16px" }}>{children}</ol>,
                li:     ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
                strong: ({ children }) => <strong style={{ fontWeight: 600, color: isUser ? "#fff" : "#C0392B" }}>{children}</strong>,
                em:     ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "#C0392B", color: "#fff", fontSize: "11px" }}
      >
        B
      </div>
      <div
        style={{
          padding: "10px 16px",
          borderRadius: "18px 18px 18px 4px",
          background: "#fff",
          border: "1px solid #E5E3DC",
        }}
      >
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: "6px", height: "6px",
                borderRadius: "50%",
                background: "#C0392B",
                animation: `bonneBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mode tabs ────────────────────────────────────────────────────────────────
const MODES = [
  { id: "clinical",      label: "Clinical",    emoji: "🔬" },
  { id: "motivational",  label: "Support",     emoji: "💙" },
  { id: "treatment",     label: "Treatment",   emoji: "💊" },
  { id: "pain",          label: "Pain relief", emoji: "🫂" },
];

// ── Quick prompts per mode ────────────────────────────────────────────────────
const QUICK_PROMPTS = {
  clinical: [
    "What is osteolytic metastasis?",
    "How is bone metastasis diagnosed?",
    "What imaging is used for bone metastasis?",
  ],
  motivational: [
    "I just received a bone metastasis diagnosis",
    "I'm feeling scared about my prognosis",
    "How do patients cope with bone cancer?",
  ],
  treatment: [
    "What are bisphosphonate treatments?",
    "What does radiotherapy involve?",
    "What is denosumab and how does it help?",
  ],
  pain: [
    "How can I manage bone pain at home?",
    "What medications help with bone pain?",
    "Tips for sleeping with bone metastasis pain",
  ],
};

// ── Main ChatPanel ────────────────────────────────────────────────────────────
export default function ChatPanel() {
  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [mode,    setMode]    = useState("clinical");
  const [messages, setMessages] = useState([
    {
      role:    "assistant",
      content: "Hi, I'm **Bonne** 👋 I'm your bone metastasis clinical assistant.\n\nI can help with:\n- 🔬 **Clinical info** — types, diagnosis, imaging\n- 💊 **Treatment options** — bisphosphonates, radiotherapy\n- 🫂 **Pain management** — practical relief strategies\n- 💙 **Emotional support** — you're not alone\n\nWhat would you like to know?",
    },
  ]);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // ── Mode-aware system context injected into message ──────────────────────
  const getModePrefix = () => {
    switch (mode) {
      case "motivational":
        return "[MODE: emotional support and motivation] ";
      case "treatment":
        return "[MODE: treatment options and medical guidance] ";
      case "pain":
        return "[MODE: pain management and comfort strategies] ";
      default:
        return "";
    }
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg    = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setLoading(true);

    const history = newMessages.slice(1).slice(-8).map(m => ({
      role: m.role, content: m.content,
    }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: getModePrefix() + msg,
          history,
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response.");

      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReset = () => {
    setMessages([{
      role:    "assistant",
      content: "Hi, I'm **Bonne** 👋 I'm your bone metastasis clinical assistant.\n\nI can help with:\n- 🔬 **Clinical info** — types, diagnosis, imaging\n- 💊 **Treatment options** — bisphosphonates, radiotherapy\n- 🫂 **Pain management** — practical relief strategies\n- 💙 **Emotional support** — you're not alone\n\nWhat would you like to know?",
    }]);
    setError(null);
    setInput("");
  };

  const currentQuickPrompts = QUICK_PROMPTS[mode] || [];
  const showQuickPrompts    = messages.length <= 1 && !loading;

  return (
    <>
      <style>{`
        @keyframes bonneBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes bonneSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bonne-markdown p:last-child { margin-bottom: 0; }
        .bonne-markdown ul, .bonne-markdown ol { margin-top: 4px; }
        .bonne-scroll::-webkit-scrollbar { width: 4px; }
        .bonne-scroll::-webkit-scrollbar-track { background: transparent; }
        .bonne-scroll::-webkit-scrollbar-thumb { background: #E5E3DC; border-radius: 2px; }
      `}</style>

      {/* ── Floating button ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Bonne chatbot"
          style={{
            position: "fixed", bottom: "24px", right: "24px", zIndex: 50,
            width: "56px", height: "56px", borderRadius: "50%",
            background: "#C0392B", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(192,57,43,0.4)",
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
          </svg>
          {/* Pulse */}
          <span style={{
            position: "absolute", width: "56px", height: "56px",
            borderRadius: "50%", background: "#C0392B",
            animation: "bonneBounce 2s ease-in-out infinite",
            opacity: 0.2,
          }}/>
        </button>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div
          style={{
            position: "fixed", bottom: "24px", right: "24px", zIndex: 50,
            width: "390px", height: "620px",
            display: "flex", flexDirection: "column",
            borderRadius: "20px", overflow: "hidden",
            boxShadow: "0 8px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            animation: "bonneSlideUp 0.25s ease forwards",
            background: "#F8F7F4",
          }}
        >
          {/* ── Header ── */}
          <div style={{ background: "#C0392B", padding: "12px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 600, fontSize: "15px", flexShrink: 0,
              }}>
                B
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>Bonne</div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "11px", fontFamily: "monospace" }}>
                  Bone Metastasis Specialist · AI
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {/* Reset */}
                <button
                  onClick={handleReset}
                  title="New conversation"
                  style={{
                    background: "rgba(255,255,255,0.15)", border: "none",
                    borderRadius: "8px", padding: "4px 6px",
                    color: "rgba(255,255,255,0.8)", cursor: "pointer",
                    fontSize: "11px", fontFamily: "monospace",
                  }}
                >
                  New
                </button>
                {/* Close */}
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: "none", border: "none",
                    color: "rgba(255,255,255,0.7)", cursor: "pointer",
                    display: "flex", alignItems: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Mode tabs */}
            <div style={{
              display: "flex", gap: "4px", marginTop: "10px",
              background: "rgba(0,0,0,0.15)", borderRadius: "10px", padding: "3px",
            }}>
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    flex: 1, border: "none", cursor: "pointer",
                    borderRadius: "7px", padding: "4px 0",
                    fontSize: "10px", fontFamily: "monospace",
                    fontWeight: mode === m.id ? 600 : 400,
                    background: mode === m.id ? "#fff" : "transparent",
                    color:      mode === m.id ? "#C0392B" : "rgba(255,255,255,0.75)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Messages ── */}
          <div
            className="bonne-scroll"
            style={{
              flex: 1, overflowY: "auto",
              padding: "16px", display: "flex",
              flexDirection: "column", gap: "12px",
            }}
          >
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {loading && <TypingIndicator />}

            {/* Quick prompts */}
            {showQuickPrompts && (
              <div style={{ paddingTop: "4px" }}>
                <div style={{
                  fontSize: "10px", fontFamily: "monospace",
                  color: "#A8A498", textAlign: "center", marginBottom: "8px",
                }}>
                  Try asking:
                </div>
                {currentQuickPrompts.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "8px 12px", marginBottom: "6px",
                      borderRadius: "10px", border: "1px solid #E5E3DC",
                      background: "#fff", color: "#534F46",
                      fontSize: "12px", cursor: "pointer",
                      transition: "border-color 0.15s",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#C0392B"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E3DC"}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{
              padding: "8px 16px", fontSize: "12px",
              background: "#FFF1F0", borderTop: "1px solid #FECACA",
              color: "#991B1B", display: "flex", alignItems: "center", gap: "6px",
              flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
              <button
                onClick={() => setError(null)}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#991B1B" }}
              >
                ✕
              </button>
            </div>
          )}

          {/* ── Input ── */}
          <div style={{
            padding: "10px 12px",
            background: "#fff",
            borderTop: "1px solid #E5E3DC",
            display: "flex", gap: "8px", alignItems: "flex-end",
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${MODES.find(m => m.id === mode)?.label?.toLowerCase() || "bone metastasis"}...`}
              rows={1}
              disabled={loading}
              style={{
                flex: 1, resize: "none", borderRadius: "12px",
                padding: "9px 12px", fontSize: "13px",
                border: "1px solid #E5E3DC", background: "#F8F7F4",
                color: "#3A3731", outline: "none", fontFamily: "inherit",
                lineHeight: 1.5, maxHeight: "90px",
                transition: "border-color 0.15s",
              }}
              onFocus={e  => e.target.style.borderColor = "#C0392B"}
              onBlur={e   => e.target.style.borderColor = "#E5E3DC"}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: !input.trim() || loading ? "#E5E3DC" : "#C0392B",
                border: "none", cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: "6px 16px", background: "#fff",
            borderTop: "1px solid #F0EEE8", textAlign: "center",
          }}>
            <span style={{ fontSize: "10px", color: "#C4C1B5", fontFamily: "monospace" }}>
              For informational purposes only · Not medical advice
            </span>
          </div>
        </div>
      )}
    </>
  );
}
