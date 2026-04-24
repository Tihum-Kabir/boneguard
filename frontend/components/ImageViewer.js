import { useState } from "react";

const panels = [
  {
    key:   "original",
    label: "Raw scan",
    desc:  "Original uploaded image",
    badge: null,
  },
  {
    key:   "inferno",
    label: "Inferno mapped",
    desc:  "MVCL preprocessed — model input",
    badge: "Model input",
  },
  {
    key:   "scorecam",
    label: "Score-CAM heatmap",
    desc:  "Fire overlay — white/yellow = peak activation",
    badge: "XAI",
  },
];

export default function ImageViewer({ originalSrc, infernoB64, scorecamB64, isCancer }) {
  const [zoom, setZoom] = useState(null); // null | panel key

  const sources = {
    original: originalSrc,
    inferno:  infernoB64 ? `data:image/png;base64,${infernoB64}` : null,
    scorecam: scorecamB64 ? `data:image/png;base64,${scorecamB64}` : null,
  };

  const visiblePanels = panels.filter(p => {
    if (p.key === "scorecam" && !isCancer) return false; // only show for cancer
    return sources[p.key] !== null;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Scan analysis</h2>
        <span className="label-sm">Click image to zoom</span>
      </div>

      <div className={`grid gap-3 ${visiblePanels.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {visiblePanels.map((panel) => (
          <button
            key={panel.key}
            onClick={() => setZoom(panel.key)}
            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cancer-mid rounded-xl"
          >
            <div className="card overflow-hidden hover:shadow-lift transition-shadow duration-200">
              {/* Image */}
              <div
                className="relative overflow-hidden"
                style={{ background: "#0D0D0D", paddingTop: "400%" }}
              >
                <img
                  src={sources[panel.key]}
                  alt={panel.label}
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {/* Badge */}
                {panel.badge && (
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm
                                  text-white font-mono text-[10px] uppercase tracking-widest
                                  px-2 py-0.5 rounded-md">
                    {panel.badge}
                  </div>
                )}
                {/* Zoom icon */}
                <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm
                                text-white rounded-md p-1 opacity-0 group-hover:opacity-100">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                </div>
              </div>

              {/* Label */}
              <div className="p-3 border-t border-bone-100">
                <p className="font-body font-medium text-bone-800 text-sm">{panel.label}</p>
                <p className="font-mono text-[11px] text-bone-400 mt-0.5">{panel.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Score-CAM legend (only for cancer) */}
      {isCancer && scorecamB64 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-bone-50 rounded-xl border border-bone-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { color: "#FFFFFF", label: "Peak" },
              { color: "#FFFF00", label: "High" },
              { color: "#FF6600", label: "Elevated" },
              { color: "#FF2200", label: "Active" },
              { color: "#8B0000", label: "Low" },
              { color: "#000000", label: "None", border: true },
            ].map(({ color, label, border }) => (
              <div key={label} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{
                    background: color,
                    border: border ? "1px solid #C4C1B5" : undefined,
                  }}
                />
                <span className="font-mono text-[10px] text-bone-500">{label}</span>
              </div>
            ))}
          </div>
          <span className="font-mono text-[10px] text-bone-300 ml-auto whitespace-nowrap">
            Radiotracer uptake
          </span>
        </div>
      )}

      {/* Zoom modal */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoom(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "#0D0D0D" }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={sources[zoom]}
              alt={zoom}
              className="w-full h-full object-contain"
              style={{ maxHeight: "80vh" }}
            />
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white
                            font-mono text-xs uppercase tracking-widest px-3 py-1 rounded-lg">
              {panels.find(p => p.key === zoom)?.label}
            </div>
            <button
              onClick={() => setZoom(null)}
              className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white
                         w-8 h-8 rounded-full flex items-center justify-center
                         hover:bg-black/80 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
