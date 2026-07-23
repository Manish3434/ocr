import { useState } from "react";

const THEMES = [
  { key: "navyGold",     label: "Navy & Gold",    swatch: ["#1E2761", "#C9A84C"] },
  { key: "tealSlate",    label: "Teal & Slate",   swatch: ["#0F3D3E", "#3FBFAE"] },
  { key: "charcoalRuby", label: "Charcoal & Ruby", swatch: ["#231F20", "#C0392B"] },
  { key: "midnightBlue", label: "Midnight Blue",  swatch: ["#0D1B2A", "#00B4D8"] },
  { key: "forestGreen",  label: "Forest & Amber", swatch: ["#1B4332", "#F4A261"] },
];

const DETAIL_LEVELS = [
  { key: "concise",  label: "Concise",  hint: "Fewer bullets, high-level only" },
  { key: "standard", label: "Standard", hint: "Balanced detail (recommended)"  },
  { key: "detailed", label: "Detailed", hint: "Maximum bullets & context"       },
];

const CHART_DENSITIES = [
  { key: "auto",    label: "Auto",    hint: "Smart chart injection based on data"    },
  { key: "rich",    label: "Rich",    hint: "Maximum charts — every section gets one" },
  { key: "minimal", label: "Minimal", hint: "Text-focused, only key charts"          },
];

/**
 * Props:
 *  - open: boolean
 *  - defaultTitle: string
 *  - onCancel: () => void
 *  - onConfirm: (options) => void
 *  - onConfirmPdf?: (options) => void
 *  - loading: boolean
 */
function PptOptionsModal({ open, defaultTitle = "", onCancel, onConfirm, onConfirmPdf, loading = false }) {
  const [title, setTitle]               = useState(defaultTitle);
  const [theme, setTheme]               = useState("navyGold");
  const [detailLevel, setDetailLevel]   = useState("standard");
  const [chartDensity, setChartDensity] = useState("auto");
  const [includeAgenda, setIncludeAgenda] = useState(true);
  const [includeNotes, setIncludeNotes]   = useState(true);
  const [exportFormat, setExportFormat]   = useState("pptx");

  if (!open) return null;

  const options = {
    title: title.trim() || defaultTitle,
    theme,
    detailLevel,
    chartDensity,
    includeAgenda,
    includeNotes,
  };

  function handleConfirm() {
    if (exportFormat === "pdf" && onConfirmPdf) {
      onConfirmPdf(options);
    } else {
      onConfirm(options);
    }
  }

  // Shared styles for selection cards
  const cardBase = "text-left px-3 py-2.5 rounded-lg border text-sm transition";
  const cardActive = (active) =>
    active
      ? { border: "1px solid var(--primary)", background: "rgba(var(--primary-rgb),.08)", boxShadow: "0 0 0 1px var(--primary)" }
      : { border: "1px solid var(--border)", background: "transparent" };

  return (
    // Backdrop — glass blur
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      {/* Modal card — .glass for premium feel */}
      <div
        className="glass w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{
          boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--primary-rgb),.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Generate Presentation</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Enterprise-grade slides with AI-powered charts and data visualizations.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
              Presentation Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="w-full rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                border: "1px solid var(--border)",
                background: "var(--secondary)",
                color: "var(--text)",
              }}
            />
          </div>

          {/* Detail level */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
              Detail Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DETAIL_LEVELS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDetailLevel(d.key)}
                  className={cardBase}
                  style={cardActive(detailLevel === d.key)}
                >
                  <p className="font-semibold" style={{ color: "var(--text)" }}>{d.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{d.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Chart Density */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
              Chart Density
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CHART_DENSITIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setChartDensity(c.key)}
                  className={cardBase}
                  style={
                    chartDensity === c.key
                      ? { border: "1px solid #8b5cf6", background: "rgba(139,92,246,.08)", boxShadow: "0 0 0 1px #8b5cf6" }
                      : { border: "1px solid var(--border)", background: "transparent" }
                  }
                >
                  <p className="font-semibold" style={{ color: "var(--text)" }}>{c.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{c.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
              Color Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTheme(t.key)}
                  className="flex flex-col items-center gap-2 px-3 py-3 rounded-lg border transition"
                  style={cardActive(theme === t.key)}
                >
                  <div className="flex gap-1">
                    <span className="w-5 h-5 rounded-full" style={{ backgroundColor: t.swatch[0] }} />
                    <span className="w-5 h-5 rounded-full" style={{ backgroundColor: t.swatch[1] }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "pptx", icon: "📊", label: "PowerPoint (.pptx)", hint: "Open in PowerPoint / Slides" },
                { key: "pdf",  icon: "📑", label: "PDF (.pdf)",          hint: "Ready to share or print"    },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setExportFormat(f.key)}
                  className={cardBase}
                  style={cardActive(exportFormat === f.key)}
                >
                  <p className="font-semibold" style={{ color: "var(--text)" }}>{f.icon} {f.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{f.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {[
              {
                key: "agenda",
                label: "Include agenda slide",
                hint: "A \"What's Inside\" overview after the cover",
                checked: includeAgenda,
                setter: setIncludeAgenda,
              },
              {
                key: "notes",
                label: "Include speaker notes",
                hint: "Plain-text notes attached to each slide",
                checked: includeNotes,
                setter: setIncludeNotes,
              },
            ].map(({ key, label, hint, checked, setter }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{label}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>{hint}</p>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setter(e.target.checked)}
                  className="w-5 h-5 accent-[var(--primary)]"
                />
              </label>
            ))}
          </div>

          {/* Info box */}
          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(var(--primary-rgb),.08)",
              border: "1px solid rgba(var(--primary-rgb),.2)",
            }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--primary)" }}>
              ✨ Premium Slide Types Included
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
              Cover • Agenda • KPI Dashboard • Bar Charts • Doughnut Charts •
              Line Trend Charts • Stacked Bar Charts • Radar Analysis •
              Timeline • Section Dividers • Key Takeaway • Closing
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
            style={{ background: "var(--secondary)", color: "var(--text)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: exportFormat === "pdf" ? "var(--danger)" : "#f97316" }}
          >
            {loading
              ? "⏳ Generating..."
              : exportFormat === "pdf"
              ? "📑 Generate PDF"
              : "📊 Generate PPT"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PptOptionsModal;