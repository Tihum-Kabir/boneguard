import { useState } from "react";

export default function PDFExport({ result, originalSrc }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Dynamically import jsPDF to avoid SSR issues
      const { jsPDF }       = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc  = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const W    = doc.internal.pageSize.getWidth();
      const now  = new Date();
      const dateStr = now.toLocaleString("en-US", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      const isCancer = result.prediction === 1;
      const report   = result.clinical_report;

      // ── Colour palette ──
      const RED    = [192, 57,  43];
      const GREEN  = [ 39, 174, 96];
      const BONE   = [58,  55,  49];
      const MUTED  = [138, 133, 120];
      const BG     = [248, 247, 244];

      // ── Header bar ──
      doc.setFillColor(...(isCancer ? RED : GREEN));
      doc.rect(0, 0, W, 20, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("BONEGUARD", 14, 12);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Clinical Bone Metastasis Detection Report", 14, 17);
      doc.text(dateStr, W - 14, 12, { align: "right" });

      // ── Result banner ──
      doc.setFillColor(...BG);
      doc.roundedRect(14, 26, W - 28, 18, 3, 3, "F");
      doc.setDrawColor(220, 218, 210);
      doc.roundedRect(14, 26, W - 28, 18, 3, 3, "S");

      doc.setTextColor(...(isCancer ? RED : GREEN));
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(isCancer ? "⚠ CANCER / METASTASIS DETECTED" : "✓ HEALTHY — NO METASTASIS", 20, 35);

      doc.setTextColor(...MUTED);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Probability: ${(result.probability * 100).toFixed(1)}%   ·   Threshold: ${(result.threshold_used * 100).toFixed(1)}%   ·   Confidence: ${report.confidence?.toUpperCase()}`, 20, 40);

      // ── Metrics table ──
      autoTable(doc, {
        startY: 50,
        head:   [["Metric", "Value"]],
        body:   [
          ["Prediction",       isCancer ? "Cancer / Metastasis" : "Healthy"],
          ["Probability",      `${(result.probability * 100).toFixed(2)}%`],
          ["Decision threshold", `${(result.threshold_used * 100).toFixed(2)}%`],
          ["Confidence tier",  report.confidence || "—"],
          ["Activated area",   `${report.activated_area_pct}% of scan`],
          ["XAI method",       result.model_info?.cam_method || "Score-CAM"],
          ["Model",            result.model_info?.name || "CustomDenseNet-k32"],
          ["Device",           result.model_info?.device || "CPU"],
        ],
        theme:       "striped",
        headStyles:  { fillColor: BONE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        bodyStyles:  { fontSize: 8, textColor: BONE },
        columnStyles:{ 0: { fontStyle: "bold", cellWidth: 55 } },
        margin:      { left: 14, right: 14 },
      });

      let y = doc.lastAutoTable.finalY + 8;

      // ── Hotspot zones ──
      if (report.hotspot_zones?.length > 0) {
        doc.setFillColor(...BONE);
        doc.rect(14, y, W - 28, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("HOTSPOT ZONES", 18, y + 4.5);
        y += 9;

        report.hotspot_zones.forEach((zone, i) => {
          doc.setFillColor(i === 0 ? 255 : 250, i === 0 ? 235 : 250, i === 0 ? 235 : 250);
          doc.rect(14, y, W - 28, 6, "F");
          doc.setTextColor(...(i === 0 ? RED : MUTED));
          doc.setFontSize(8);
          doc.setFont("helvetica", i === 0 ? "bold" : "normal");
          doc.text(`${i + 1}.  ${zone}${i === 0 ? "  (primary)" : ""}`, 20, y + 4);
          y += 6;
        });
        y += 4;
      }

      // ── Interpretation ──
      if (y > 240) { doc.addPage(); y = 20; }

      doc.setFillColor(...BONE);
      doc.rect(14, y, W - 28, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("CLINICAL INTERPRETATION", 18, y + 4.5);
      y += 10;

      doc.setTextColor(...BONE);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(report.interpretation || "", W - 28);
      doc.text(lines, 14, y);
      y += lines.length * 4.5 + 6;

      // ── Images ──
      const addImage = async (b64, title, startY) => {
        if (startY > 220) { doc.addPage(); startY = 20; }
        doc.setFillColor(...BONE);
        doc.rect(14, startY, W - 28, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(title, 18, startY + 4.5);
        startY += 9;

        try {
          const imgW = W - 28;
          const imgH = imgW * (1024 / 256); // native aspect ratio
          const maxH = 80;
          const scale = Math.min(1, maxH / imgH);
          doc.addImage(b64, "PNG", 14, startY, imgW * scale, imgH * scale);
          return startY + imgH * scale + 6;
        } catch {
          doc.setTextColor(...MUTED);
          doc.setFontSize(8);
          doc.text("[Image could not be embedded]", 14, startY + 6);
          return startY + 12;
        }
      };

      if (result.inferno_png_b64) {
        y = await addImage(`data:image/png;base64,${result.inferno_png_b64}`,
                           "INFERNO MAP (MODEL INPUT)", y);
      }
      if (result.scorecam_png_b64) {
        y = await addImage(`data:image/png;base64,${result.scorecam_png_b64}`,
                           "SCORE-CAM HEATMAP (XAI)", y);
      }

      // ── Disclaimer ──
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFillColor(...BG);
      doc.roundedRect(14, y, W - 28, 20, 2, 2, "F");
      doc.setDrawColor(220, 218, 210);
      doc.roundedRect(14, y, W - 28, 20, 2, 2, "S");
      doc.setTextColor(...MUTED);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      const disc = doc.splitTextToSize(report.disclaimer || "", W - 32);
      doc.text(disc, 18, y + 5);

      // ── Footer ──
      const pages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setTextColor(...MUTED);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(`BoneGuard AI  ·  Page ${p} of ${pages}  ·  Generated ${dateStr}`, W / 2, 293, { align: "center" });
      }

      // ── Save ──
      doc.save(`boneguard-report-${now.toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="btn-secondary flex items-center gap-2 w-full justify-center"
    >
      {loading ? (
        <>
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          Generating PDF…
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PDF report
        </>
      )}
    </button>
  );
}
