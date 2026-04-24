import { useState, useRef, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
        style={{
          background: isUser ? "#3A3731" : "#C0392B",
          color:      "#fff",
          fontSize:   "11px",
        }}
      >
        {isUser ? "You" : "B"}
      </div>

      {/* Bubble */}
      <div
        className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
        style={{
          background:  isUser ? "#3A3731"      : "#FFFFFF",
          color:       isUser ? "#FFFFFF"       : "#3A3731",
          borderRadius: isUser
            ? "18px 18px 4px 18px"
            : "18px 18px 18px 4px",
          border: isUser ? "none" : "1px solid #E5E3DC",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {msg.content}
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
        className="px-4 py-3 rounded-2xl border"
        style={{
          borderRadius: "18px 18px 18px 4px",
          background: "#fff",
          border: "1px solid #E5E3DC",
        }}
      >
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "#C0392B",
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ChatPanel component ──────────────────────────────────────────────────
export default function ChatPanel() {
  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [messages, setMessages] = useState([
    {
      role:    "assistant",
      content: "Hi, I'm Bonne 👋 I'm a clinical AI assistant specialising in bone metastasis. Ask me anything about bone metastases — types, symptoms, treatments, or imaging.",
    },
  ]);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const panelRef   = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setLoading(true);

    // History for context (exclude the greeting)
    const history = newMessages
      .slice(1)
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response.");
      }

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [
        ...prev,
        {
          role:    "assistant",
          content: "Sorry, I encountered an error. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Enter key ────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Suggested questions ─────────────────────────────────────────────────────
  const suggestions = [
    "What is osteolytic metastasis?",
    "How is bone metastasis treated?",
    "What are symptoms of bone metastasis?",
    "What is bisphosphonate therapy?",
  ];

  const showSuggestions = messages.length === 1;

  return (
    <>
      {/* Bounce keyframe */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* ── Floating button ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                     flex items-center justify-center shadow-lg
                     hover:scale-105 active:scale-95 transition-transform duration-150"
          style={{ background: "#C0392B" }}
          aria-label="Open Bonne chatbot"
        >
          {/* Chat icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              fill="white"
            />
          </svg>
          {/* Pulse ring */}
          <span
            className="absolute w-14 h-14 rounded-full animate-ping opacity-20"
            style={{ background: "#C0392B" }}
          />
        </button>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden"
          style={{
            width:     "380px",
            height:    "580px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            animation: "slideUp 0.25s ease forwards",
            background: "#F8F7F4",
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: "#C0392B" }}
          >
            {/* Bonne avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center
                         font-display text-base text-white flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              B
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-semibold text-white text-sm">Bonne</p>
              <p className="font-mono text-xs text-red-100">
                Bone Metastasis Specialist · AI
              </p>
            </div>
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors flex-shrink-0"
              aria-label="Close chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* ── Messages ── */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            style={{ background: "#F8F7F4" }}
          >
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {loading && <TypingIndicator />}

            {/* Suggested questions (shown only before first user message) */}
            {showSuggestions && !loading && (
              <div className="pt-2 space-y-2" style={{ animation: "fadeIn 0.4s ease" }}>
                <p className="font-mono text-xs text-center"
                   style={{ color: "#A8A498" }}>
                  Try asking:
                </p>
                {suggestions.map(q => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm
                               transition-colors duration-150"
                    style={{
                      background:  "#fff",
                      border:      "1px solid #E5E3DC",
                      color:       "#534F46",
                      fontSize:    "13px",
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

          {/* ── Error banner ── */}
          {error && (
            <div
              className="px-4 py-2 text-xs flex items-center gap-2 flex-shrink-0"
              style={{ background: "#FFF1F0", borderTop: "1px solid #FECACA", color: "#991B1B" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
              <button onClick={() => setError(null)} className="ml-auto">✕</button>
            </div>
          )}

          {/* ── Input area ── */}
          <div
            className="flex-shrink-0 px-3 py-3 flex gap-2 items-end"
            style={{
              background:  "#fff",
              borderTop:   "1px solid #E5E3DC",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about bone metastasis..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none transition-colors duration-150"
              style={{
                background:  "#F8F7F4",
                border:      "1px solid #E5E3DC",
                color:       "#3A3731",
                fontSize:    "13px",
                lineHeight:  "1.5",
                maxHeight:   "100px",
                fontFamily:  "inherit",
              }}
              onFocus={e  => e.target.style.borderColor = "#C0392B"}
              onBlur={e   => e.target.style.borderColor = "#E5E3DC"}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center
                         justify-center transition-all duration-150
                         disabled:opacity-40 disabled:cursor-not-allowed
                         active:scale-95"
              style={{ background: "#C0392B" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                   stroke="white" strokeWidth="2.5" strokeLinecap="round"
                   strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          {/* Disclaimer */}
          <div
            className="flex-shrink-0 px-4 py-1.5 text-center"
            style={{ background: "#fff", borderTop: "1px solid #F0EEE8" }}
          >
            <p className="font-mono" style={{ fontSize: "10px", color: "#C4C1B5" }}>
              For informational purposes only. Not medical advice.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
