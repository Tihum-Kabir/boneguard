import { useEffect, useState } from "react";

export default function ProbabilityBar({ probability, threshold, label }) {
  const [width, setWidth]   = useState(0);
  const pct                 = Math.round(probability * 100);
  const isCancer            = label === 1;
  const threshPct           = Math.round(threshold * 100);

  // Animate bar on mount
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  // Color zones
  const barColor = isCancer
    ? probability >= 0.80 ? "#C0392B"
    : probability >= 0.60 ? "#E74C3C"
    : "#F39C12"
    : probability <= 0.20 ? "#27AE60"
    : probability <= 0.40 ? "#4CAF50"
    : "#F39C12";

  const zoneBg = isCancer
    ? probability >= 0.80 ? "bg-cancer-light border-red-100"
    : "bg-warn-light border-yellow-100"
    : "bg-healthy-light border-green-100";

  return (
    <div className={`rounded-2xl border p-5 ${zoneBg}`}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="label-sm mb-1">Model confidence</p>
          <div className="flex items-baseline gap-2">
            <span
              className="font-display text-5xl leading-none"
              style={{ color: barColor }}
            >
              {pct}%
            </span>
            <span className="font-body text-sm text-bone-400 pb-1">
              probability
            </span>
          </div>
        </div>

        {/* Result badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-body font-semibold text-sm"
          style={{
            background: isCancer ? "#C0392B" : "#27AE60",
            color: "#fff",
          }}
        >
          {isCancer ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Cancer / Metastasis
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Healthy
            </>
          )}
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-3 bg-white rounded-full overflow-visible shadow-inner border border-bone-100">
        {/* Threshold marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 z-10"
          style={{ left: `${threshPct}%` }}
          title={`Decision threshold: ${threshPct}%`}
        >
          <div className="w-0.5 h-5 bg-bone-400 rounded-full -translate-y-1" />
          <div
            className="absolute -top-7 left-1/2 -translate-x-1/2 font-mono text-[10px]
                       text-bone-400 whitespace-nowrap"
          >
            threshold
          </div>
        </div>

        {/* Fill */}
        <div
          className="h-full rounded-full prob-bar-fill"
          style={{ width: `${width}%`, background: barColor }}
        />
      </div>

      {/* Zone labels */}
      <div className="flex justify-between mt-2 font-mono text-[10px] text-bone-300">
        <span>0% Healthy</span>
        <span>100% Cancer</span>
      </div>

      {/* Threshold info */}
      <p className="mt-3 font-mono text-xs text-bone-400">
        Decision threshold: {threshPct}% (Youden J — optimised on validation set)
      </p>
    </div>
  );
}
