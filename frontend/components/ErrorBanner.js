export default function ErrorBanner({ error, onDismiss }) {
  if (!error) return null;

  const isTimeout   = error.code === "HF_TIMEOUT";
  const isUnreachable = error.code === "HF_UNREACHABLE";

  return (
    <div className="rounded-2xl border border-red-100 bg-cancer-light p-5 animate-fade-in">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center mt-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-body font-semibold text-red-800 text-sm mb-1">
            {isTimeout    ? "AI server is waking up" :
             isUnreachable ? "Cannot reach AI server" :
             "Something went wrong"}
          </p>
          <p className="font-body text-sm text-red-700 mb-2">
            {error.error || error.message || "An unexpected error occurred."}
          </p>
          {error.hint && (
            <p className="font-mono text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
              💡 {error.hint}
            </p>
          )}
          {(isTimeout || isUnreachable) && (
            <p className="font-body text-xs text-red-500 mt-2">
              HuggingFace free tier sleeps after 30 min of inactivity.
              Wait 20 seconds and try again.
            </p>
          )}
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
