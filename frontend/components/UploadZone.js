import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

const ACCEPTED = {
  "image/png":  [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/bmp":  [".bmp"],
};

export default function UploadZone({ onFileSelected, disabled }) {
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState(null);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      const err = rejected[0].errors[0];
      alert(err.code === "file-too-large"
        ? "File too large. Maximum 20MB."
        : "Unsupported format. Please upload PNG, JPG, or BMP.");
      return;
    }
    if (accepted.length === 0) return;

    const file = accepted[0];
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    onFileSelected(file);
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   ACCEPTED,
    maxFiles: 1,
    maxSize:  20 * 1024 * 1024,
    disabled,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl
          transition-all duration-200 cursor-pointer
          ${isDragActive
            ? "border-cancer-mid bg-cancer-light scale-[1.01]"
            : "border-bone-200 bg-bone-50 hover:border-bone-400 hover:bg-white"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />

        {preview ? (
          /* ── Preview state ── */
          <div className="flex items-center gap-4 p-5">
            <div
              className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-bone-200"
              style={{ background: "#0D0D0D" }}
            >
              <img
                src={preview}
                alt="scan preview"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-bone-400 uppercase tracking-widest mb-1">
                Scan loaded
              </p>
              <p className="font-body font-medium text-bone-800 truncate text-sm">
                {fileName}
              </p>
              <p className="text-xs text-bone-400 mt-1">
                Click or drop a new image to replace
              </p>
            </div>
            {/* Scan icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-healthy-light flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            {/* Bone scan icon */}
            <div className={`
              w-20 h-20 rounded-2xl flex items-center justify-center mb-5
              transition-colors duration-200
              ${isDragActive ? "bg-cancer-light" : "bg-bone-100"}
            `}>
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
                <rect x="22" y="2" width="20" height="60" rx="10"
                  fill={isDragActive ? "#FF6B6B22" : "#DDDBD2"}
                  stroke={isDragActive ? "#C0392B" : "#8A8578"}
                  strokeWidth="2"/>
                <ellipse cx="32" cy="12" rx="8" ry="8"
                  fill={isDragActive ? "#FF6B6B44" : "#C4C1B5"}/>
                <ellipse cx="32" cy="52" rx="8" ry="8"
                  fill={isDragActive ? "#FF6B6B44" : "#C4C1B5"}/>
                <line x1="24" y1="28" x2="40" y2="28"
                  stroke={isDragActive ? "#C0392B" : "#A8A498"} strokeWidth="2"/>
                <line x1="24" y1="36" x2="40" y2="36"
                  stroke={isDragActive ? "#C0392B" : "#A8A498"} strokeWidth="2"/>
              </svg>
            </div>

            <h3 className="font-display text-xl text-bone-800 mb-2">
              {isDragActive ? "Drop to analyse" : "Upload bone scan"}
            </h3>
            <p className="text-bone-400 text-sm max-w-xs">
              Drag & drop a whole-body scintigraphy scan, or click to browse.
              <br />
              <span className="font-mono text-xs">PNG · JPG · BMP · max 20MB</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
