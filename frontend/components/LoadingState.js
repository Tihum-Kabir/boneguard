export default function LoadingState() {
  const steps = [
    { label: "Uploading scan",          icon: "upload"  },
    { label: "MVCL preprocessing",      icon: "process" },
    { label: "Running inference",        icon: "brain"   },
    { label: "Generating Score-CAM",    icon: "heat"    },
    { label: "Building clinical report", icon: "report"  },
  ];

  return (
    <div className="card p-8 text-center space-y-8 animate-fade-in">
      {/* Animated bone scan icon */}
      <div className="relative mx-auto w-24 h-32">
        {/* Bone outline */}
        <svg viewBox="0 0 64 96" className="w-full h-full opacity-20">
          <rect x="18" y="4"  width="28" height="88" rx="14" fill="#3A3731"/>
          <ellipse cx="32" cy="14" rx="12" ry="12" fill="#3A3731"/>
          <ellipse cx="32" cy="82" rx="12" ry="12" fill="#3A3731"/>
        </svg>
        {/* Scan line */}
        <div className="scan-overlay absolute inset-0" />
        {/* Pulsing center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-cancer-mid/30 animate-ping" />
          <div className="absolute w-3 h-3 rounded-full bg-cancer-mid animate-pulse" />
        </div>
      </div>

      <div>
        <p className="font-display text-xl text-bone-800 mb-1">Analysing scan</p>
        <p className="font-body text-sm text-bone-400">
          This may take up to 20 seconds on first request
        </p>
      </div>

      {/* Step indicators */}
      <div className="space-y-2.5 text-left max-w-xs mx-auto">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{
                borderColor: "#C4C1B5",
                animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full bg-bone-300"
                style={{
                  animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
                }}
              />
            </div>
            <span className="font-mono text-xs text-bone-400">{step.label}</span>
          </div>
        ))}
      </div>

      <p className="font-mono text-xs text-bone-300">
        Powered by CustomDenseNet k=32 · Score-CAM XAI
      </p>
    </div>
  );
}
