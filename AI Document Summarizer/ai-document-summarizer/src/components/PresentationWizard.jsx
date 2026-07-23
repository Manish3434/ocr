import { useState } from "react";

// ── Option data ───────────────────────────────────────────────────────────────
const PRESENTATION_TYPES = [
  "Business Pitch", "Board Meeting", "Sales Deck", "Investor Pitch",
  "Executive Summary", "Academic", "Research", "Financial Report",
  "Medical Report", "Bank Analysis", "Legal Report", "Education",
  "Training", "Conference", "Marketing", "Product Launch", "Custom",
];

const AUDIENCES = [
  "CEO", "Management", "Investors", "Customers", "Students",
  "Teachers", "Doctors", "Researchers", "Government", "Employees",
  "Clients", "Technical", "Non Technical", "Mixed",
];

const GOALS = [
  "Inform", "Convince", "Sell", "Educate", "Analyze",
  "Compare", "Report", "Present Findings", "Decision Making", "Executive Review",
];

const THEMES = [
  { key: "Modern",           swatch: ["#0D1B2A", "#00B4D8"], label: "Modern" },
  { key: "Glassmorphism",    swatch: ["#1E2761", "#C9A84C"], label: "Glassmorphism" },
  { key: "Minimal",          swatch: ["#0F3D3E", "#3FBFAE"], label: "Minimal" },
  { key: "Apple",            swatch: ["#1C1C1E", "#0A84FF"], label: "Apple" },
  { key: "Microsoft Fluent", swatch: ["#004E8C", "#0078D4"], label: "MS Fluent" },
  { key: "Dark",             swatch: ["#231F20", "#C0392B"], label: "Dark" },
  { key: "Corporate",        swatch: ["#1E2761", "#C9A84C"], label: "Corporate" },
  { key: "Luxury",           swatch: ["#1A0A2E", "#C9A84C"], label: "Luxury" },
  { key: "Professional",     swatch: ["#1E2761", "#C9A84C"], label: "Professional" },
  { key: "Creative",         swatch: ["#1B4332", "#F4A261"], label: "Creative" },
  { key: "AI Futuristic",    swatch: ["#0D1B2A", "#00FFF5"], label: "AI Futuristic" },
  { key: "Finance",          swatch: ["#1E2761", "#C9A84C"], label: "Finance" },
  { key: "Healthcare",       swatch: ["#0F3D3E", "#3FBFAE"], label: "Healthcare" },
  { key: "Education",        swatch: ["#1B4332", "#F4A261"], label: "Education" },
  { key: "Amber Grid",       swatch: ["#1B2A52", "#F5A623"], label: "Amber Grid" },
  { key: "Government",       swatch: ["#1B2A52", "#F5A623"], label: "Government" },
];

const SLIDE_COUNTS = ["Auto", "5", "10", "15", "20", "30", "40", "50", "Custom"];

const CONTENT_DENSITIES = [
  { key: "Minimal",          hint: "High-level, concise slides" },
  { key: "Balanced",         hint: "Recommended for most decks" },
  { key: "Detailed",         hint: "Deep content per slide" },
  { key: "Extremely Detailed", hint: "Max content, every point covered" },
];

const CHART_TYPES = [
  "Automatically Detect", "Pie", "Bar", "Line", "Area", "Scatter", "Radar",
  "Waterfall", "Funnel", "KPI Dashboard", "SWOT Diagram", "Timeline",
  "Donut", "Treemap", "Gantt", "Risk Matrix",
];

const SECTIONS = [
  "Executive Summary", "Agenda", "Key Insights", "Recommendations",
  "Conclusion", "References", "Appendix", "Questions Slide",
];

const LANGUAGES = [
  "English", "Tamil", "Hindi", "French", "Spanish", "German",
  "Arabic", "Japanese", "Chinese", "Portuguese",
];

const ANIMATION_STYLES = [
  "Professional", "Smooth", "Minimal", "Corporate", "No Animation",
];

const IMAGE_OPTIONS = [
  "Use AI Generated Icons", "Illustrations", "Professional Stock Style",
  "No Images", "Extract Images From PDF", "Generate AI diagrams",
];

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  { id: "type",     label: "Type & Audience",   icon: "🎯" },
  { id: "goal",     label: "Goal & Theme",       icon: "🎨" },
  { id: "slides",   label: "Slides & Content",  icon: "📐" },
  { id: "visuals",  label: "Visuals & Charts",  icon: "📊" },
  { id: "sections", label: "Sections & Export", icon: "📋" },
];

// ── Helper components ─────────────────────────────────────────────────────────
function ChipSelect({ options, value, onChange, multi = false, cols = 3 }) {
  const isActive = (opt) => multi ? (value || []).includes(opt) : value === opt;
  const toggle = (opt) => {
    if (!multi) { onChange(opt); return; }
    const cur = value || [];
    onChange(cur.includes(opt) ? cur.filter(v => v !== opt) : [...cur, opt]);
  };
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className="text-left px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{
            border: isActive(opt) ? "1.5px solid var(--primary)" : "1px solid var(--border)",
            background: isActive(opt) ? "rgba(var(--primary-rgb),0.12)" : "var(--secondary)",
            color: isActive(opt) ? "var(--primary)" : "var(--muted)",
            boxShadow: isActive(opt) ? "0 0 0 1px rgba(var(--primary-rgb),0.3)" : "none",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
      {children}
    </p>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────
/**
 * Props:
 *  - open: boolean
 *  - defaultTitle: string
 *  - onCancel: () => void
 *  - onGenerate: (wizardOptions) => void   ← calls the NEW /generate-ppt-ai endpoint
 *  - loading: boolean
 */
function PresentationWizard({ open, defaultTitle = "", onCancel, onGenerate, loading = false }) {
  const [step, setStep] = useState(0);

  // ── State ──────────────────────────────────────────────────────────────────
  const [title, setTitle]                   = useState(defaultTitle);
  const [presentationType, setPresentationType] = useState("Business Pitch");
  const [audience, setAudience]             = useState("Management");
  const [goal, setGoal]                     = useState("Inform");
  const [theme, setTheme]                   = useState("Professional");
  const [primaryColor, setPrimaryColor]     = useState("#1E2761");
  const [accentColor, setAccentColor]       = useState("#C9A84C");
  const [animationStyle, setAnimationStyle] = useState("Professional");
  const [slideCount, setSlideCount]         = useState("Auto");
  const [customSlideCount, setCustomSlideCount] = useState("12");
  const [contentDensity, setContentDensity] = useState("Balanced");
  const [language, setLanguage]             = useState("English");
  const [speakerNotes, setSpeakerNotes]     = useState("Yes");
  const [chartType, setChartType]           = useState("Automatically Detect");
  const [imageOption, setImageOption]       = useState("Use AI Generated Icons");
  const [sections, setSections]             = useState(["Executive Summary", "Key Insights", "Conclusion"]);

  if (!open) return null;

  const totalSteps = STEPS.length;
  const isLast = step === totalSteps - 1;

  function handleGenerate() {
    const finalSlideCount = slideCount === "Custom" ? customSlideCount : slideCount;
    onGenerate({
      title: title.trim() || defaultTitle,
      presentationType,
      audience,
      goal,
      theme,
      primaryColor,
      accentColor,
      animationStyle,
      slideCount: finalSlideCount,
      contentDensity,
      language,
      speakerNotes,
      chartType,
      imageOption,
      sections,
    });
  }

  // ── Step content ───────────────────────────────────────────────────────────
  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            {/* Title */}
            <div>
              <SectionLabel>Presentation Title</SectionLabel>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={defaultTitle || "Enter presentation title…"}
                className="w-full rounded-lg p-2.5 text-sm focus:outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--text)" }}
              />
            </div>
            {/* Type */}
            <div>
              <SectionLabel>Presentation Type</SectionLabel>
              <ChipSelect options={PRESENTATION_TYPES} value={presentationType} onChange={setPresentationType} cols={3} />
            </div>
            {/* Audience */}
            <div>
              <SectionLabel>Target Audience</SectionLabel>
              <ChipSelect options={AUDIENCES} value={audience} onChange={setAudience} cols={4} />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            {/* Goal */}
            <div>
              <SectionLabel>Presentation Goal</SectionLabel>
              <ChipSelect options={GOALS} value={goal} onChange={setGoal} cols={3} />
            </div>
            {/* Theme */}
            <div>
              <SectionLabel>Theme</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTheme(t.key)}
                    className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border transition-all"
                    style={{
                      border: theme === t.key ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                      background: theme === t.key ? "rgba(var(--primary-rgb),0.1)" : "var(--secondary)",
                    }}
                  >
                    <div className="flex gap-0.5">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.swatch[0] }} />
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.swatch[1] }} />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Custom Colors */}
            <div>
              <SectionLabel>Brand Colors (optional)</SectionLabel>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                  <span>Primary</span>
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer" style={{ border: "1px solid var(--border)" }} />
                  <code className="text-[10px]">{primaryColor}</code>
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                  <span>Accent</span>
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer" style={{ border: "1px solid var(--border)" }} />
                  <code className="text-[10px]">{accentColor}</code>
                </label>
              </div>
            </div>
            {/* Animation */}
            <div>
              <SectionLabel>Animation Style</SectionLabel>
              <ChipSelect options={ANIMATION_STYLES} value={animationStyle} onChange={setAnimationStyle} cols={5} />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            {/* Slide Count */}
            <div>
              <SectionLabel>Slide Count</SectionLabel>
              <ChipSelect options={SLIDE_COUNTS} value={slideCount} onChange={setSlideCount} cols={5} />
              {slideCount === "Custom" && (
                <input
                  type="number"
                  value={customSlideCount}
                  onChange={e => setCustomSlideCount(e.target.value)}
                  placeholder="Enter number of slides"
                  min={3} max={100}
                  className="mt-2 w-full rounded-lg p-2.5 text-sm focus:outline-none"
                  style={{ border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--text)" }}
                />
              )}
            </div>
            {/* Content Density */}
            <div>
              <SectionLabel>Content Density</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {CONTENT_DENSITIES.map(d => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setContentDensity(d.key)}
                    className="text-left px-3 py-2.5 rounded-lg border transition-all"
                    style={{
                      border: contentDensity === d.key ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                      background: contentDensity === d.key ? "rgba(var(--primary-rgb),0.1)" : "var(--secondary)",
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{d.key}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{d.hint}</p>
                  </button>
                ))}
              </div>
            </div>
            {/* Language */}
            <div>
              <SectionLabel>Output Language</SectionLabel>
              <ChipSelect options={LANGUAGES} value={language} onChange={setLanguage} cols={4} />
            </div>
            {/* Speaker Notes */}
            <div>
              <SectionLabel>Speaker Notes</SectionLabel>
              <ChipSelect options={["Yes", "No"]} value={speakerNotes} onChange={setSpeakerNotes} cols={2} />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            {/* Charts */}
            <div>
              <SectionLabel>Chart Type</SectionLabel>
              <ChipSelect options={CHART_TYPES} value={chartType} onChange={setChartType} cols={3} />
            </div>
            {/* Images */}
            <div>
              <SectionLabel>Images & Illustrations</SectionLabel>
              <ChipSelect options={IMAGE_OPTIONS} value={imageOption} onChange={setImageOption} cols={2} />
            </div>
            {/* AI Thinking info */}
            <div className="rounded-xl p-3 mt-2" style={{ background: "rgba(var(--primary-rgb),0.07)", border: "1px solid rgba(var(--primary-rgb),0.2)" }}>
              <p className="text-xs font-bold mb-1.5" style={{ color: "var(--primary)" }}>🧠 AI Thinking Pipeline</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Understand Document", "→", "Detect Audience", "→", "Create Strategy",
                  "→", "Build Outline", "→", "Write Narrative", "→", "Design Slides",
                  "→", "Assign Charts", "→", "Generate PPTX",
                ].map((step, i) => (
                  <span key={i} className="text-[10px]" style={{ color: step === "→" ? "var(--muted)" : "var(--text)", fontWeight: step !== "→" ? 600 : 400 }}>
                    {step}
                  </span>
                ))}
              </div>
              <p className="text-[10px] mt-2" style={{ color: "var(--muted)" }}>
                Uses Claude Opus 4 → Claude Sonnet 4 → GPT-5 → Gemini (fallback). Never reuses summary text.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            {/* Sections */}
            <div>
              <SectionLabel>Include Sections</SectionLabel>
              <ChipSelect options={SECTIONS} value={sections} onChange={setSections} multi cols={2} />
            </div>
            {/* Summary review */}
            <div className="rounded-xl p-4" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📋 Presentation Summary</p>
              <div className="space-y-1.5 text-xs" style={{ color: "var(--muted)" }}>
                {[
                  ["Title",         title || defaultTitle || "—"],
                  ["Type",          presentationType],
                  ["Audience",      audience],
                  ["Goal",          goal],
                  ["Theme",         theme],
                  ["Slides",        slideCount === "Custom" ? `${customSlideCount} slides` : slideCount],
                  ["Density",       contentDensity],
                  ["Language",      language],
                  ["Speaker Notes", speakerNotes],
                  ["Charts",        chartType],
                  ["Sections",      sections.length ? sections.join(", ") : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="font-semibold shrink-0" style={{ color: "var(--text)" }}>{k}</span>
                    <span className="text-right truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Quality note */}
            <div className="rounded-xl p-3" style={{ background: "rgba(var(--primary-rgb),0.07)", border: "1px solid rgba(var(--primary-rgb),0.2)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                ✨ McKinsey-Quality Output
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                AI QA checks: no duplicate slides, no text overflow, no empty slides, consistent typography, accurate data, professional layouts.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <div
        className="glass w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl"
        style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--primary-rgb),.2)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                🎨 AI Presentation Wizard
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                Step {step + 1} of {totalSteps} — {STEPS[step].label}
              </p>
            </div>
            <button onClick={onCancel} className="text-xl" style={{ color: "var(--muted)" }}>✕</button>
          </div>

          {/* Step tabs */}
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(i)}
                className="flex-1 flex flex-col items-center gap-1 px-1 py-2 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: i === step ? "rgba(var(--primary-rgb),0.15)" : "transparent",
                  color: i === step ? "var(--primary)" : i < step ? "var(--text)" : "var(--muted)",
                  border: i === step ? "1px solid rgba(var(--primary-rgb),0.3)" : "1px solid transparent",
                }}
              >
                <span className="text-base">{s.icon}</span>
                <span className="hidden sm:block text-center leading-tight">{s.label}</span>
                {i < step && <span className="text-green-500 text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Step body */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
              style={{ background: "var(--secondary)", color: "var(--text)" }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
            style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
          <div className="flex-1" />
          {!isLast ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: loading ? "var(--muted)" : "linear-gradient(135deg, var(--primary), #8b5cf6)" }}
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span> Generating with AI…
                </>
              ) : (
                <>🚀 Generate AI Presentation</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PresentationWizard;
