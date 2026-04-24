export default function ClinicalReport({ report, probability, threshold, modelInfo }) {
  if (!report) return null;

  const {
    summary,
    confidence,
    hotspot_zones,
    activated_area_pct,
    interpretation,
    disclaimer,
  } = report;

  const isCancer = summary?.toLowerCase().includes("metastasis detected");

  const confidenceColor = {
    high:     { bg: "bg-red-50",    text: "text-red-700",   dot: "#C0392B" },
    moderate: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "#F59E0B" },
    low:      { bg: "bg-bone-50",   text: "text-bone-600",   dot: "#8A8578" },
  }[confidence] || { bg: "bg-bone-50", text: "text-bone-600", dot: "#8A8578" };

  return (
    <div className="space-y-4">
      <h2 className="section-title">Clinical report</h2>

      {/* Summary banner */}
      <div className={`
        rounded-2xl border p-5
        ${isCancer
          ? "bg-cancer-light border-red-100"
          : "bg-healthy-light border-green-100"
        }
      `}>
        <div className="flex items-start gap-3">
          <div className={`
            flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5
            ${isCancer ? "bg-red-100" : "bg-green-100"}
          `}>
            {isCancer ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#27AE60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
          <div>
            <p className="label-sm mb-1">
              {isCancer ? "Positive finding" : "Negative finding"}
            </p>
            <p className={`font-body font-semibold text-base ${isCancer ? "text-red-800" : "text-green-800"}`}>
              {summary}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="label-sm mb-1">Confidence</p>
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: confidenceColor.dot }} />
            <span className={`font-body font-semibold capitalize text-sm ${confidenceColor.text}`}>
              {confidence}
            </span>
          </div>
        </div>
        <div className="card p-4 text-center">
          <p className="label-sm mb-1">Activated area</p>
          <span className="font-display text-2xl text-bone-800">
            {activated_area_pct}
            <span className="text-sm font-body font-normal text-bone-400">%</span>
          </span>
        </div>
        <div className="card p-4 text-center">
          <p className="label-sm mb-1">CAM method</p>
          <span className="font-mono text-xs text-bone-600">
            {modelInfo?.cam_method?.split(" ")[0] || "Score-CAM"}
          </span>
        </div>
      </div>

      {/* Hotspot zones */}
      {hotspot_zones && hotspot_zones.length > 0 && (
        <div className="card p-5">
          <p className="label-sm mb-3">Hotspot zones detected</p>
          <div className="space-y-2">
            {hotspot_zones.map((zone, i) => (
              <div key={zone} className="flex items-center gap-3">
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                             font-mono text-[10px] font-medium text-white"
                  style={{
                    background: i === 0 ? "#C0392B"
                               : i === 1 ? "#E74C3C"
                               : i === 2 ? "#F39C12"
                               : "#A8A498",
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-body text-sm text-bone-700 capitalize">{zone}</span>
                    {i === 0 && (
                      <span className="font-mono text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                        primary
                      </span>
                    )}
                  </div>
                </div>
                {/* Intensity bar */}
                <div className="flex-shrink-0 w-20 h-1.5 bg-bone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${100 - i * 18}%`,
                      background: i === 0 ? "#C0392B" : i === 1 ? "#E74C3C" : "#F39C12",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interpretation */}
      <div className="card p-5">
        <p className="label-sm mb-3">Interpretation</p>
        <p className="report-text">{interpretation}</p>
      </div>

      {/* Model info */}
      {modelInfo && (
        <div className="px-4 py-3 bg-bone-50 rounded-xl border border-bone-100">
          <p className="label-sm mb-2">Model information</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {[
              ["Model",      modelInfo.name],
              ["Device",     modelInfo.device],
              ["Resolution", modelInfo.resolution],
              ["XAI",        modelInfo.cam_method],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-bone-400">{k}:</span>
                <span className="font-mono text-[10px] text-bone-600">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="px-4 py-4 rounded-xl border border-bone-200 bg-bone-50">
        <div className="flex items-start gap-2">
          <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8578" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="font-body text-xs text-bone-500 leading-relaxed">{disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
