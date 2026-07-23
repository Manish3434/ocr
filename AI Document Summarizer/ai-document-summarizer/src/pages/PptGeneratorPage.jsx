/**
 * PptGeneratorPage.jsx — Complete Rewrite (v2)
 * Fixes:
 *  1. extractedData.extractedText → extractedData.documentText (matches server response)
 *  2. suggestedTitle → title is auto-set from filename (no server field needed)
 *  3. Progress steps are timer-driven and show correctly during generation
 *  4. Dark premium UI retained
 */

import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(bytes) {
  if (!bytes) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function fmtDate(d) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
const EXT_ICON = { pdf: "📄", docx: "📝", doc: "📝", txt: "📃", xlsx: "📊", xls: "📊", csv: "📊", png: "🖼️", jpg: "🖼️", jpeg: "🖼️", webp: "🖼️", pptx: "📊", ppt: "📊" };
function fileIcon(name = "") { const ext = (name.split(".").pop() || "").toLowerCase(); return EXT_ICON[ext] || "📎"; }

// ── Static data ───────────────────────────────────────────────────────────────
const THEMES = [
  { key: "Professional", label: "Professional", colors: ["#1E2761", "#C9A84C", "#2FA4A0"] },
  { key: "Modern",       label: "Modern",       colors: ["#0D1B2A", "#00B4D8", "#0077B6"] },
  { key: "Minimal",      label: "Minimal",      colors: ["#0F3D3E", "#3FBFAE", "#F39C12"] },
  { key: "Corporate",    label: "Corporate",    colors: ["#1A1A2E", "#7C3AED", "#06B6D4"] },
  { key: "Creative",     label: "Creative",     colors: ["#1B4332", "#F4A261", "#40916C"] },
  { key: "Dark",         label: "Dark",         colors: ["#0F0F0F", "#C0392B", "#E67E22"] },
  { key: "Finance",      label: "Finance",      colors: ["#0A2342", "#D4AF37", "#C0A030"] },
  { key: "Healthcare",   label: "Healthcare",   colors: ["#1B3A4B", "#52B788", "#40916C"] },
];

const AUDIENCES = [
  { key: "Executive/C-Suite",       icon: "👔" },
  { key: "Business Stakeholders",   icon: "💼" },
  { key: "Technical Team",          icon: "⚙️" },
  { key: "General Audience",        icon: "🌍" },
  { key: "Investors",               icon: "💰" },
  { key: "Clients",                 icon: "🤝" },
  { key: "Students",                icon: "🎓" },
  { key: "Medical Professionals",   icon: "🏥" },
];

const PURPOSES = [
  { key: "Inform and present findings",  label: "Present Findings",   icon: "📢" },
  { key: "Pitch / Persuade",            label: "Pitch/Persuade",     icon: "💡" },
  { key: "Training / Education",        label: "Training",           icon: "📚" },
  { key: "Project status update",       label: "Status Update",      icon: "📈" },
  { key: "Financial review",            label: "Financial Review",   icon: "💵" },
  { key: "Strategy presentation",       label: "Strategy",           icon: "🎯" },
  { key: "Research presentation",       label: "Research",           icon: "🔬" },
];

const SECTIONS_LIST = ["Cover", "Agenda", "Executive Summary", "Key Findings", "Data Analysis", "Charts & Visuals", "Recommendations", "Conclusions", "Appendix"];

const PROGRESS_STEPS = [
  { id: 1, icon: "📤", label: "Uploading & reading document" },
  { id: 2, icon: "🔍", label: "Detecting document type & structure" },
  { id: 3, icon: "🧠", label: "Building presentation strategy" },
  { id: 4, icon: "🗂", label: "Designing slide outline" },
  { id: 5, icon: "✍️", label: "Writing slide content" },
  { id: 6, icon: "🎨", label: "Assembling PPTX file" },
];

// NEW — Wizard static data
const PRESENTATION_TYPES = [
  "Business Pitch","Board Meeting","Sales Deck","Investor Pitch","Executive Summary","Academic",
  "Research","Financial Report","Medical Report","Risk Analysis","Legal Report","Education",
  "Training","Conference","Marketing","Product Launch","Custom",
];
const WIZARD_AUDIENCES = [
  "CEO","Management","Investors","Customers","Students","Teachers","Doctors","Researchers",
  "Government","Employees","Clients","Technical","Non Technical","Mixed",
];
const WIZARD_GOALS = [
  "Inform","Convince","Sell","Educate","Analyze","Compare","Report","Present Findings","Decision Making","Executive Review",
];
const WIZARD_THEMES_FULL = [
  "Modern","Glassmorphism","Minimal","Apple","MS Fluent","Dark","Corporate","Luxury",
  "Professional","Creative","AI Futuristic","Finance","Healthcare","Education","Amber Grid","Government",
];
const WIZARD_ANIMATIONS = ["Professional","Smooth","Minimal","Corporate","No Animation"];
const WIZARD_SLIDE_COUNTS = ["Auto","5","10","15","20","30","40","50","Custom"];
const WIZARD_LANGUAGES = ["English","Tamil","Hindi","French","Spanish","German","Arabic","Japanese","Chinese","Portuguese"];
const ALL_CHART_TYPES = [
  "Automatically Detect","Pie","Bar","Line","Area","Scatter","Radar","Waterfall","Funnel",
  "KPI Dashboard","SWOT Diagram","Timeline","Donut","Treemap","Gantt","Risk Matrix",
];
const WIZARD_SECTIONS_LIST = [
  "Executive Summary","Agenda","Key Insights","Recommendations","Conclusion","References","Appendix","Questions Slide",
];

// ── Theme colours ─────────────────────────────────────────────────────────────
const C = {
  bg: "#050A14", card: "#0B1120", cardBorder: "rgba(255,255,255,0.07)",
  accent: "#6366F1", accentGlow: "rgba(99,102,241,0.3)", cyan: "#22D3EE",
  success: "#10B981", error: "#EF4444",
  textPrimary: "#F1F5F9", textSecondary: "#94A3B8", textMuted: "#475569",
  divider: "rgba(255,255,255,0.06)",
};
const card = { background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 24 };
const T = "all 0.2s cubic-bezier(0.4,0,0.2,1)";

// ── Component ─────────────────────────────────────────────────────────────────
export default function PptGeneratorPage() {
  const [activeTab, setActiveTab]       = useState("generate");
  const [file, setFile]                 = useState(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [extracting, setExtracting]     = useState(false);
  const [extractedData, setExtractedData] = useState(null);   // full server response
  const [uploadError, setUploadError]   = useState("");
  const fileInputRef                    = useRef(null);

  // Wizard
  const [title, setTitle]               = useState("");
  const [subtitle, setSubtitle]         = useState("");
  const [audience, setAudience]         = useState("Executive/C-Suite");
  const [purpose, setPurpose]           = useState("Inform and present findings");
  const [theme, setTheme]               = useState("Professional");
  const [slideCount, setSlideCount]     = useState(12);
  const [contentDensity, setContentDensity] = useState("Balanced");
  const [chartType, setChartType]       = useState("Smart");
  const [sections, setSections]         = useState(["Cover", "Executive Summary", "Key Findings", "Conclusions"]);
  const [speakerNotes, setSpeakerNotes] = useState(true);

  // Generation
  const [generating, setGenerating]     = useState(false);
  const [currentStep, setCurrentStep]   = useState(0);
  const [generationError, setGenerationError] = useState("");
  const [success, setSuccess]           = useState(null);
  const stepTimersRef                   = useRef([]);

  // History
  const [history, setHistory]           = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch]   = useState("");

  // Smart detection label
  const [detectedType, setDetectedType] = useState("");

  // NEW — wizard modal state
  const [wizardOpen, setWizardOpen]         = useState(false);
  const [wizardStep, setWizardStep]         = useState(1);
  const [wizardPresentationType, setWizardPresentationType] = useState("Business Pitch");
  const [wizardGoal, setWizardGoal]         = useState("Inform");
  const [wizardTheme, setWizardTheme]       = useState("Professional");
  const [wizardAnimation, setWizardAnimation] = useState("Professional");
  const [wizardSlideCountOption, setWizardSlideCountOption] = useState("Auto");
  const [wizardContentDensity, setWizardContentDensity] = useState("Balanced");
  const [wizardLanguage, setWizardLanguage] = useState("English");
  const [wizardSpeakerNotes, setWizardSpeakerNotes] = useState("Yes");
  const [selectedChartTypes, setSelectedChartTypes] = useState([]);
  const [wizardSections, setWizardSections] = useState(["Executive Summary", "Key Insights", "Conclusion"]);

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab]);

  // Drive progress steps forward while generating
  useEffect(() => {
    stepTimersRef.current.forEach(clearTimeout);
    stepTimersRef.current = [];
    if (!generating) { setCurrentStep(0); return; }
    // Steps advance at realistic intervals matching the 4-step AI pipeline
    const delays = [0, 1000, 3500, 7000, 12000, 18000];
    delays.forEach((delay, i) => {
      stepTimersRef.current.push(setTimeout(() => setCurrentStep(i + 1), delay));
    });
    return () => stepTimersRef.current.forEach(clearTimeout);
  }, [generating]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const r = await fetch(`${API_BASE}/ppt/presentations`, { credentials: "include" });
      if (r.ok) { const d = await r.json(); setHistory(d.presentations || []); }
    } catch {}
    setHistoryLoading(false);
  }

  function inferDocType(filename = "") {
    const ext = (filename.split(".").pop() || "").toLowerCase();
    const map = { pdf:"PDF Document", xlsx:"Excel Spreadsheet", xls:"Excel Spreadsheet", csv:"CSV Data", docx:"Word Document", doc:"Word Document", png:"Image", jpg:"Image", jpeg:"Image", webp:"Image", txt:"Text Document", pptx:"PowerPoint", ppt:"PowerPoint" };
    return map[ext] || "Document";
  }

  const onDrop = useCallback(async (droppedFile) => {
    if (!droppedFile) return;
    setFile(droppedFile);
    setExtractedData(null);
    setUploadError("");
    setSuccess(null);
    setDetectedType("");
    setExtracting(true);

    const form = new FormData();
    form.append("file", droppedFile);
    try {
      const r = await fetch(`${API_BASE}/ppt/upload-and-extract`, { method: "POST", body: form, credentials: "include" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Upload failed");
      setExtractedData(d);
      // Auto-fill title from filename (strip extension)
      const autoTitle = droppedFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(d.suggestedTitle || autoTitle);
      setDetectedType(inferDocType(droppedFile.name));
    } catch (e) {
      setUploadError(e.message);
    }
    setExtracting(false);
  }, []);

  function handleDragOver(e)  { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave()  { setIsDragging(false); }
  function handleDrop(e)      { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) onDrop(f); }
  function handleFileInput(e) { const f = e.target.files[0]; if (f) onDrop(f); }

  async function handleGenerate() {
    if (!extractedData) return;

    // extractedData.documentText is the field the server returns
    const docText = extractedData.documentText || extractedData.extractedText || "";
    if (!docText && !extractedData.documentId) {
      setGenerationError("No document text found. Please re-upload the file.");
      return;
    }

    setGenerating(true);
    setGenerationError("");
    setSuccess(null);

    try {
      const body = {
        documentId:   extractedData.documentId,
        documentText: docText,
        filename:     file?.name || "Document",
        wizardOptions: {
          title,
          subtitle,
          audience,
          purpose,
          theme,
          slideCount,
          contentDensity,
          chartType: chartType === "Smart" ? "auto" : chartType === "Rich" ? "rich" : "minimal",
          sections,
          speakerNotes: speakerNotes ? "Yes" : "No",
          isImage:    extractedData.isImage    || false,
          base64Data: extractedData.base64Data || undefined,
          mimeType:   extractedData.mimeType   || undefined,
        },
      };

      const r = await fetch(`${API_BASE}/ppt/generate-ppt-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message || "Generation failed");
      }

      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${title || "presentation"}.pptx`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess({
        slides:  r.headers.get("X-Slide-Count") || slideCount,
        theme,
        docType: detectedType,
      });
      setCurrentStep(6);
    } catch (e) {
      setGenerationError(e.message);
    }
    setGenerating(false);
  }

  function toggleSection(s) {
    setSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  // NEW — wizard helpers
function toggleWizardSection(s) {
  setWizardSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
}
function toggleChartType(ct) {
  setSelectedChartTypes(prev => prev.includes(ct) ? prev.filter(x => x !== ct) : [...prev, ct]);
}
function openWizard() {
  setWizardStep(1);
  setWizardOpen(true);
}
function closeWizard() {
  setWizardOpen(false);
}
function applyWizardAndGenerate() {
  // Sync wizard choices into existing state before generating
  if (wizardTheme && THEMES.find(t => t.label === wizardTheme)) setTheme(wizardTheme);
  if (wizardSlideCountOption !== "Auto" && wizardSlideCountOption !== "Custom") {
    setSlideCount(parseInt(wizardSlideCountOption) || slideCount);
  }
  if (wizardContentDensity) setContentDensity(wizardContentDensity);
  if (wizardLanguage) {/* passed via wizardOptions below */}
  setSpeakerNotes(wizardSpeakerNotes === "Yes");
  if (wizardSections.length > 0) setSections(wizardSections);
  setWizardOpen(false);
  // Small delay to let state flush, then generate
  setTimeout(() => handleGenerateWithWizard(), 50);
}

async function handleGenerateWithWizard() {
  if (!extractedData) return;
  const docText = extractedData.documentText || extractedData.extractedText || "";
  if (!docText && !extractedData.documentId) {
    setGenerationError("No document text found. Please re-upload the file.");
    return;
  }
  setGenerating(true);
  setGenerationError("");
  setSuccess(null);

  const effectiveSlideCount = wizardSlideCountOption === "Auto" ? slideCount
    : wizardSlideCountOption === "Custom" ? slideCount
    : parseInt(wizardSlideCountOption) || slideCount;

  const effectiveChartType = selectedChartTypes.length > 0
    ? selectedChartTypes.join(",")
    : chartType === "Smart" ? "auto" : chartType === "Rich" ? "rich" : "minimal";

  try {
    const body = {
      documentId:   extractedData.documentId,
      documentText: docText,
      filename:     file?.name || "Document",
      wizardOptions: {
        title,
        subtitle,
        audience,
        purpose: wizardGoal || purpose,
        theme:   wizardTheme || theme,
        slideCount: effectiveSlideCount,
        contentDensity: wizardContentDensity || contentDensity,
        chartType: effectiveChartType,
        sections: wizardSections.length > 0 ? wizardSections : sections,
        speakerNotes: wizardSpeakerNotes,
        presentationType: wizardPresentationType,
        language: wizardLanguage,
        animationStyle: wizardAnimation,
        isImage:    extractedData.isImage    || false,
        base64Data: extractedData.base64Data || undefined,
        mimeType:   extractedData.mimeType   || undefined,
      },
    };

    const r = await fetch(`${API_BASE}/ppt/generate-ppt-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.message || "Generation failed");
    }

    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${title || "presentation"}.pptx`;
    a.click();
    URL.revokeObjectURL(url);

    setSuccess({
      slides:  r.headers.get("X-Slide-Count") || effectiveSlideCount,
      theme:   wizardTheme || theme,
      docType: detectedType,
    });
    setCurrentStep(6);
  } catch (e) {
    setGenerationError(e.message);
  }
  setGenerating(false);
  }

  async function downloadHistory(id, filename) {
    try {
      const r = await fetch(`${API_BASE}/ppt/presentations/${id}/download`, { credentials: "include" });
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url; a.download = filename || "presentation.pptx"; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  async function deleteHistory(id) {
    try {
      await fetch(`${API_BASE}/ppt/presentations/${id}`, { method: "DELETE", credentials: "include" });
      setHistory(prev => prev.filter(p => p._id !== id));
    } catch {}
  }

  const filteredHistory = history.filter(p =>
    !historySearch ||
    p.filename?.toLowerCase().includes(historySearch.toLowerCase()) ||
    p.sourceFilename?.toLowerCase().includes(historySearch.toLowerCase())
  );

  const canGenerate = !!extractedData && !generating && !extracting;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPrimary,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-track{background:#0B1120;}
        ::-webkit-scrollbar-thumb{background:#2D3748;border-radius:3px;}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#6366F1;cursor:pointer;box-shadow:0 0 0 3px rgba(99,102,241,0.3);}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}`}
      </style>

      {/* Hero */}
      <div style={{ background:"linear-gradient(180deg,#090F1E 0%,#050A14 100%)", borderBottom:`1px solid ${C.cardBorder}`, padding:"48px 0 36px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto", padding:"0 24px", textAlign:"center" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:40, padding:"6px 16px", marginBottom:18 }}>
            <span style={{ fontSize:12, color:C.accent, fontWeight:600, letterSpacing:1 }}>AI-POWERED</span>
          </div>
          <h1 style={{ margin:0, fontSize:44, fontWeight:700, lineHeight:1.15,
            background:`linear-gradient(135deg,${C.accent} 0%,${C.cyan} 100%)`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            AI Presentation Generator
          </h1>
          <p style={{ margin:"14px 0 0", color:C.textSecondary, fontSize:17 }}>
            Drop any document. Get a boardroom-ready presentation.
          </p>
          <div style={{ display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap", marginTop:20 }}>
            {["✦ 12 File Formats","✦ 8 Slide Types","✦ 8 Themes","✦ AI-Powered"].map(b => (
              <span key={b} style={{ fontSize:12, color:C.textMuted, fontWeight:500, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.cardBorder}`, borderRadius:20, padding:"5px 14px" }}>{b}</span>
            ))}
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", justifyContent:"center", gap:4, marginTop:28 }}>
            {[{key:"generate",label:"Generate"},{key:"history",label:"History"}].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                background: activeTab === tab.key ? C.accent : "transparent",
                color: activeTab === tab.key ? "#fff" : C.textSecondary,
                border:"none", borderRadius:8, padding:"9px 24px", fontSize:14, fontWeight:600, cursor:"pointer", transition:T }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"32px 24px 0" }}>

        {/* ── GENERATE TAB ───────────────────────────────────────────────── */}
        {activeTab === "generate" && (
          <>
            {/* Upload zone */}
            <div
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              style={{
                ...card, minHeight:260,
                display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column",
                cursor: file ? "default" : "pointer",
                border: isDragging ? `1.5px solid ${C.accent}` : `1.5px dashed ${extractedData ? C.success : C.cardBorder}`,
                boxShadow: isDragging ? `0 0 0 4px ${C.accentGlow}` : "none",
                transition:T, position:"relative", overflow:"hidden",
              }}>
              {isDragging && <div style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.06)", pointerEvents:"none" }} />}

              {extracting ? (
                <div style={{ textAlign:"center" }}>
                  <div style={{ width:260, height:5, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden", margin:"0 auto 16px" }}>
                    <div style={{ height:"100%", background:`linear-gradient(90deg,${C.accent},${C.cyan})`, borderRadius:3, animation:"shimmer 1.5s ease-in-out infinite", width:"60%" }} />
                  </div>
                  <p style={{ color:C.textSecondary, margin:0 }}>Extracting document content…</p>
                </div>
              ) : extractedData ? (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>{fileIcon(file?.name)}</div>
                  <div style={{ fontWeight:600, color:C.textPrimary, fontSize:16 }}>{file?.name}</div>
                  <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, background:"rgba(16,185,129,0.12)", color:C.success, border:"1px solid rgba(16,185,129,0.3)", borderRadius:20, padding:"3px 10px", fontWeight:600 }}>✓ Ready</span>
                    <span style={{ fontSize:11, background:"rgba(255,255,255,0.05)", color:C.textMuted, border:`1px solid ${C.cardBorder}`, borderRadius:20, padding:"3px 10px" }}>{fmt(file?.size)}</span>
                    {extractedData.stats && (
                      <span style={{ fontSize:11, background:"rgba(255,255,255,0.05)", color:C.textMuted, border:`1px solid ${C.cardBorder}`, borderRadius:20, padding:"3px 10px" }}>{extractedData.stats.words?.toLocaleString()} words</span>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); setExtractedData(null); setSuccess(null); setDetectedType(""); setTitle(""); }}
                    style={{ marginTop:12, background:"none", border:"none", color:C.textMuted, fontSize:12, cursor:"pointer", textDecoration:"underline" }}>
                    Remove file
                  </button>
                </div>
              ) : (
                <div style={{ textAlign:"center", pointerEvents:"none" }}>
                  <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ display:"block", margin:"0 auto 16px" }}>
                    <rect width="52" height="52" rx="14" fill="rgba(99,102,241,0.1)" />
                    <path d="M16 38h20M26 14v20M19 21l7-7 7 7" stroke={C.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="18" y="28" width="16" height="14" rx="2" stroke={C.textMuted} strokeWidth="1.5" />
                  </svg>
                  <div style={{ fontWeight:600, fontSize:18, color:C.textPrimary, marginBottom:8 }}>Drop your file here</div>
                  <div style={{ color:C.textMuted, fontSize:13, marginBottom:18 }}>PDF · Word · Excel · CSV · TXT · PNG · JPG · WEBP · PPTX</div>
                  <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    style={{ background:"rgba(99,102,241,0.15)", border:`1px solid rgba(99,102,241,0.4)`, color:C.accent, borderRadius:8, padding:"9px 22px", fontSize:13, fontWeight:600, cursor:"pointer", transition:T }}>
                    Browse files
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.pptx,.ppt" onChange={handleFileInput} style={{ display:"none" }} />
            </div>

            {uploadError && (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, padding:"12px 16px", color:"#FCA5A5", fontSize:13, marginTop:12 }}>
                ⚠️ {uploadError}
              </div>
            )}

            {/* Detection banner */}
            {detectedType && extractedData && (
              <div style={{ background:"rgba(34,211,238,0.07)", border:"1px solid rgba(34,211,238,0.2)", borderRadius:10, padding:"10px 16px", marginTop:12, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:16 }}>📊</span>
                <span style={{ color:C.cyan, fontSize:13, fontWeight:500 }}>
                  {detectedType} detected — optimising AI analysis for this document type
                </span>
              </div>
            )}

            {/* How it works (no file) */}
            {!extractedData && !extracting && (
              <div style={{ marginTop:32 }}>
                <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1.5, textAlign:"center", marginBottom:16 }}>HOW IT WORKS</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
                  {[
                    { icon:"📤", title:"Upload Document",  desc:"Drop any file — PDF, Word, Excel, CSV, image, or text" },
                    { icon:"🧠", title:"AI Analyses",      desc:"4-step pipeline extracts real data, insights, and structure" },
                    { icon:"🎨", title:"Configure Style",  desc:"Choose theme, audience, purpose, and slide density" },
                    { icon:"⬇️", title:"Download PPTX",   desc:"Professional deck ready to present, no editing required" },
                  ].map((s, i) => (
                    <div key={i} style={{ ...card, borderTop:`2px solid ${C.accent}`, padding:"18px 20px" }}>
                      <div style={{ fontSize:22, marginBottom:8 }}>{s.icon}</div>
                      <div style={{ fontWeight:600, fontSize:13, color:C.textPrimary, marginBottom:4 }}>{s.title}</div>
                      <div style={{ color:C.textMuted, fontSize:12 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wizard — shown after upload, hidden during generation / success */}
            {extractedData && !success && !generating && (
              <div style={{ marginTop:24 }}>
                {/* Presentation Identity */}
                <WizardSection title="Presentation Identity">
                  <div style={{ marginBottom:14 }}>
                    <label style={labelStyle}>Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Auto-generated from document" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Subtitle / Tagline <span style={{ color:C.textMuted, fontWeight:400 }}>(optional)</span></label>
                    <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="e.g. Q1 2026 Financial Review" style={inputStyle} />
                  </div>
                </WizardSection>

                {/* Audience & Purpose */}
                <WizardSection title="Audience & Purpose">
                  <div style={{ marginBottom:18 }}>
                    <label style={labelStyle}>Target Audience</label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {AUDIENCES.map(a => (
                        <ChipCard key={a.key} selected={audience === a.key} onClick={() => setAudience(a.key)} icon={a.icon} label={a.key} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Purpose</label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {PURPOSES.map(p => (
                        <ChipCard key={p.key} selected={purpose === p.key} onClick={() => setPurpose(p.key)} icon={p.icon} label={p.label} />
                      ))}
                    </div>
                  </div>
                </WizardSection>

                {/* Visual Style */}
                <WizardSection title="Visual Style">
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:10 }}>
                    {THEMES.map(t => (
                      <div key={t.key} onClick={() => setTheme(t.key)} style={{
                        ...card, padding:"12px 10px", cursor:"pointer",
                        border: theme === t.key ? `2px solid ${C.accent}` : `1px solid ${C.cardBorder}`,
                        boxShadow: theme === t.key ? `0 0 0 3px ${C.accentGlow}` : "none",
                        transition:T, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:3, justifyContent:"center", marginBottom:8 }}>
                          {t.colors.map((c, i) => <div key={i} style={{ width:18, height:18, borderRadius:4, background:c }} />)}
                        </div>
                        <div style={{ fontSize:11, fontWeight:600, color: theme === t.key ? C.accent : C.textSecondary }}>{t.label}</div>
                        {theme === t.key && <div style={{ width:8, height:8, borderRadius:"50%", background:C.accent, margin:"6px auto 0" }} />}
                      </div>
                    ))}
                  </div>
                </WizardSection>

                {/* Slide Configuration */}
                <WizardSection title="Slide Configuration">
                  <div style={{ marginBottom:20 }}>
                    <label style={labelStyle}>
                      Slide Count — <span style={{ color:C.accent, fontSize:22, fontWeight:700 }}>{slideCount}</span>
                    </label>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:6 }}>
                      <span style={{ color:C.textMuted, fontSize:12 }}>5</span>
                      <input type="range" min={5} max={30} step={1} value={slideCount}
                        onChange={e => setSlideCount(Number(e.target.value))} style={{ flex:1 }} />
                      <span style={{ color:C.textMuted, fontSize:12 }}>30</span>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                    <div>
                      <label style={labelStyle}>Content Density</label>
                      <ToggleGroup options={["Concise","Balanced","Detailed"]} value={contentDensity} onChange={setContentDensity} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Chart Types (select all you want — AI picks best fit per slide)</label>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
                        {ALL_CHART_TYPES.map(ct => (
                          <button key={ct} onClick={() => toggleChartType(ct)} style={{
                            background: selectedChartTypes.includes(ct) ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${selectedChartTypes.includes(ct) ? "rgba(99,102,241,0.5)" : C.cardBorder}`,
                            color: selectedChartTypes.includes(ct) ? C.accent : C.textMuted,
                            borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                          }}>
                            {ct}
                          </button>
                        ))}
                      </div>
                      {selectedChartTypes.length === 0 && (
                        <div style={{ fontSize:11, color:C.textMuted, marginTop:6 }}>
                          No types selected — AI will automatically detect the best chart types from your document.
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop:18 }}>
                    <label style={labelStyle}>Sections to Include</label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:6 }}>
                      {SECTIONS_LIST.map(s => (
                        <button key={s} onClick={() => toggleSection(s)} style={{
                          background: sections.includes(s) ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${sections.includes(s) ? "rgba(99,102,241,0.5)" : C.cardBorder}`,
                          color: sections.includes(s) ? C.accent : C.textMuted,
                          borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:18, padding:"14px 16px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:`1px solid ${C.cardBorder}` }}>
                    <div>
                      <div style={{ fontWeight:600, color:C.textPrimary, fontSize:13 }}>Speaker Notes</div>
                      <div style={{ color:C.textMuted, fontSize:12 }}>Include presenter talking points</div>
                    </div>
                    <div onClick={() => setSpeakerNotes(p => !p)} style={{ width:46, height:26, borderRadius:13, background: speakerNotes ? C.accent : "rgba(255,255,255,0.1)", cursor:"pointer", transition:T, position:"relative" }}>
                      <div style={{ position:"absolute", top:3, left: speakerNotes ? 23 : 3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:T }} />
                    </div>
                  </div>
                </WizardSection>

                {/* Generate button */}
                {/* AI Thinking Pipeline banner */}
                <div style={{ background:"rgba(99,102,241,0.07)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:12, padding:"12px 18px", marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:14 }}>🤖</span>
                    <span style={{ fontSize:12, fontWeight:700, color:C.accent, letterSpacing:0.5 }}>AI Thinking Pipeline</span>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, alignItems:"center" }}>
                    {["Understand Document","→","Detect Audience","→","Create Strategy","→","Build Outline","→","Write Narrative","→","Design Slides","→","Assign Charts","→","Generate PPTX"].map((s, i) => (
                      <span key={i} style={{ fontSize:11, color: s === "→" ? C.textMuted : C.textSecondary, fontWeight: s === "→" ? 400 : 500 }}>{s}</span>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:6 }}>
                    Uses Claude Opus 4 → Claude Sonnet 4 → GPT-5 → Gemini (fallback). Never reuse summary text.
                  </div>
                </div>

                {/* Generate button — opens wizard */}
                <button onClick={canGenerate ? openWizard : undefined} disabled={!canGenerate} style={{
                  width:"100%", height:56, borderRadius:12, border:"none",
                  background: canGenerate ? `linear-gradient(135deg,${C.accent} 0%,#8B5CF6 100%)` : "rgba(255,255,255,0.05)",
                  color: canGenerate ? "#fff" : C.textMuted,
                  fontSize:16, fontWeight:700, cursor: canGenerate ? "pointer" : "not-allowed",
                  opacity: canGenerate ? 1 : 0.5,
                  boxShadow: canGenerate ? `0 4px 20px ${C.accentGlow}` : "none",
                  transition:T, marginTop:8 }}>
                  Generate Presentation →
                  <span style={{ fontWeight:400, opacity:0.75, marginLeft:8, fontSize:13 }}>(~{slideCount} slides)</span>
                </button>

                {generationError && (
                  <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"12px 16px", color:"#FCA5A5", fontSize:13, marginTop:12 }}>
                    ⚠️ {generationError}
                  </div>
                )}
              </div>
            )}

            {/* ── PROGRESS (shown while generating) ── */}
            {generating && (
              <div style={{ ...card, marginTop:24 }}>
                <div style={{ fontWeight:600, color:C.textPrimary, marginBottom:20, fontSize:15 }}>
                  Generating your presentation…
                </div>
                {PROGRESS_STEPS.map(step => {
                  const done   = currentStep > step.id;
                  const active = currentStep === step.id;
                  return (
                    <div key={step.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: step.id < 6 ? `1px solid ${C.divider}` : "none" }}>
                      <div style={{
                        width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                        background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${done ? C.success : active ? C.accent : "rgba(255,255,255,0.1)"}`,
                        fontSize:14, transition:T,
                      }}>
                        {done
                          ? <span style={{ color:C.success, fontWeight:700 }}>✓</span>
                          : active
                            ? <span style={{ display:"inline-block", animation:"spin 1s linear infinite", color:C.accent }}>◌</span>
                            : <span style={{ color:C.textMuted, fontSize:11 }}>·</span>}
                      </div>
                      <div>
                        <span style={{ fontSize:16, marginRight:8 }}>{step.icon}</span>
                        <span style={{ fontSize:13, color: done ? C.success : active ? C.textPrimary : C.textMuted, transition:T }}>
                          {step.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {/* Progress bar */}
                <div style={{ marginTop:20, height:4, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{
                    height:"100%",
                    background:`linear-gradient(90deg,${C.accent},${C.cyan})`,
                    borderRadius:2,
                    width:`${Math.min((currentStep / 6) * 100, 100)}%`,
                    transition:"width 1s ease",
                  }} />
                </div>
                <div style={{ marginTop:10, fontSize:12, color:C.textMuted, textAlign:"center" }}>
                  This usually takes 20–60 seconds depending on document size
                </div>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {success && (
              <div style={{ ...card, marginTop:24, textAlign:"center", padding:40 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                <div style={{ fontWeight:700, fontSize:22, color:C.textPrimary, marginBottom:8 }}>Your presentation is ready!</div>
                <div style={{ color:C.textMuted, fontSize:14, marginBottom:20 }}>
                  {success.slides} slides · {success.theme} theme · {success.docType}
                </div>
                <button onClick={() => { setSuccess(null); setFile(null); setExtractedData(null); setDetectedType(""); setTitle(""); }}
                  style={{ background:`linear-gradient(135deg,${C.accent} 0%,#8B5CF6 100%)`, color:"#fff", border:"none", borderRadius:10, padding:"12px 28px", fontSize:14, fontWeight:600, cursor:"pointer" }}>
                  Generate Another →
                </button>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ───────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div>
            <div style={{ marginBottom:20 }}>
              <input value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                placeholder="Search presentations…" style={{ ...inputStyle, width:"100%", margin:0 }} />
            </div>

            {historyLoading ? (
              <div style={{ textAlign:"center", padding:"60px 0", color:C.textMuted }}>Loading history…</div>
            ) : filteredHistory.length === 0 ? (
              <div style={{ ...card, textAlign:"center", padding:"60px 0" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
                <div style={{ fontWeight:600, color:C.textPrimary, marginBottom:6 }}>No presentations yet</div>
                <div style={{ color:C.textMuted, fontSize:13 }}>Generate your first one above.</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {filteredHistory.map(p => (
                  <div key={p._id} style={{ ...card, padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{ fontSize:26, flexShrink:0 }}>{fileIcon(p.sourceFilename)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, color:C.textPrimary, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.filename}</div>
                      <div style={{ color:C.textMuted, fontSize:12, marginTop:2 }}>
                        {p.sourceFilename} · {p.slideCount} slides · {fmtDate(p.createdAt)} · {fmt(p.sizeBytes)}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      {p.theme && (
                        <span style={{ fontSize:11, background:"rgba(99,102,241,0.1)", color:C.accent, border:"1px solid rgba(99,102,241,0.25)", borderRadius:12, padding:"3px 8px" }}>{p.theme}</span>
                      )}
                      <button onClick={() => downloadHistory(p._id, p.filename)}
                        style={{ background:`linear-gradient(135deg,${C.accent},#8B5CF6)`, color:"#fff", border:"none", borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                        Download
                      </button>
                      <button onClick={() => deleteHistory(p._id)}
                        style={{ background:"rgba(239,68,68,0.1)", color:"#FCA5A5", border:"1px solid rgba(239,68,68,0.2)", borderRadius:7, padding:"6px 12px", fontSize:12, cursor:"pointer" }}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── WIZARD MODAL ──────────────────────────────────────────── */}
      {wizardOpen && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:16,
        }}>
          <div style={{
            background:"#0B1120", border:`1px solid rgba(255,255,255,0.1)`,
            borderRadius:20, width:"100%", maxWidth:560,
            maxHeight:"90vh", overflowY:"auto",
            padding:28, position:"relative",
          }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <span style={{ fontSize:18 }}>🎯</span>
              <span style={{ fontWeight:700, fontSize:18, color:C.textPrimary }}>AI Presentation Wizard</span>
              <button onClick={closeWizard} style={{ marginLeft:"auto", background:"none", border:"none", color:C.textMuted, fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>
            <div style={{ fontSize:12, color:C.textMuted, marginBottom:18 }}>Step {wizardStep} of 5 — {["Type & Audience","Goal & Theme","Slides & Content","Visuals & Charts","Sections & Export"][wizardStep - 1]}</div>

            {/* Step tabs */}
            <div style={{ display:"flex", gap:4, marginBottom:24 }}>
              {[
                { n:1, icon:"🎯", label:"Type & Audience" },
                { n:2, icon:"🎨", label:"Goal & Theme" },
                { n:3, icon:"📄", label:"Slides & Content" },
                { n:4, icon:"📊", label:"Visuals & Charts" },
                { n:5, icon:"📋", label:"Sections & Export" },
              ].map(tab => (
                <div key={tab.n} onClick={() => setWizardStep(tab.n)} style={{
                  flex:1, padding:"8px 4px", textAlign:"center", cursor:"pointer", borderRadius:10,
                  background: wizardStep === tab.n ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${wizardStep === tab.n ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)"}`,
                  transition:T,
                }}>
                  <div style={{ fontSize:16 }}>{tab.icon}</div>
                  <div style={{ fontSize:10, color: wizardStep === tab.n ? C.accent : C.textMuted, fontWeight:600, marginTop:2 }}>{tab.label}</div>
                  {wizardStep > tab.n && <div style={{ fontSize:9, color:C.success }}>✓</div>}
                </div>
              ))}
            </div>

            {/* ── STEP 1: Type & Audience ── */}
            {wizardStep === 1 && (
              <div>
                <div style={{ marginBottom:20 }}>
                  <label style={labelStyle}>Presentation Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Auto-generated from document" style={inputStyle} />
                </div>
                <div style={{ marginBottom:20 }}>
                  <label style={labelStyle}>Presentation Type</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {PRESENTATION_TYPES.map(pt => (
                      <button key={pt} onClick={() => setWizardPresentationType(pt)} style={{
                        background: wizardPresentationType === pt ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${wizardPresentationType === pt ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)"}`,
                        color: wizardPresentationType === pt ? C.accent : C.textSecondary,
                        borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                      }}>{pt}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Target Audience</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {WIZARD_AUDIENCES.map(a => (
                      <button key={a} onClick={() => setAudience(a)} style={{
                        background: audience === a ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${audience === a ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)"}`,
                        color: audience === a ? C.accent : C.textSecondary,
                        borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                      }}>{a}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Goal & Theme ── */}
            {wizardStep === 2 && (
              <div>
                <div style={{ marginBottom:20 }}>
                  <label style={labelStyle}>Presentation Goal</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {WIZARD_GOALS.map(g => (
                      <button key={g} onClick={() => setWizardGoal(g)} style={{
                        background: wizardGoal === g ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${wizardGoal === g ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)"}`,
                        color: wizardGoal === g ? C.accent : C.textSecondary,
                        borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                      }}>{g}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:20 }}>
                  <label style={labelStyle}>Theme</label>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                    {WIZARD_THEMES_FULL.map(t => (
                      <button key={t} onClick={() => setWizardTheme(t)} style={{
                        background: wizardTheme === t ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${wizardTheme === t ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)"}`,
                        color: wizardTheme === t ? C.accent : C.textSecondary,
                        borderRadius:8, padding:"8px 6px", fontSize:11, fontWeight:500, cursor:"pointer", transition:T, textAlign:"center",
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Brand Colors <span style={{ color:C.textMuted, fontWeight:400 }}>(optional)</span></label>
                  <div style={{ fontSize:12, color:C.textMuted }}>Using theme defaults. Customize in your PPTX editor after download.</div>
                </div>
                <div style={{ marginTop:16 }}>
                  <label style={labelStyle}>Animation Style</label>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {WIZARD_ANIMATIONS.map(a => (
                      <button key={a} onClick={() => setWizardAnimation(a)} style={{
                        background: wizardAnimation === a ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${wizardAnimation === a ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)"}`,
                        color: wizardAnimation === a ? C.accent : C.textSecondary,
                        borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                      }}>{a}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Slides & Content ── */}
            {wizardStep === 3 && (
              <div>
                <div style={{ marginBottom:20 }}>
                  <label style={labelStyle}>Slide Count</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {WIZARD_SLIDE_COUNTS.map(sc => (
                      <button key={sc} onClick={() => setWizardSlideCountOption(sc)} style={{
                        background: wizardSlideCountOption === sc ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${wizardSlideCountOption === sc ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)"}`,
                        color: wizardSlideCountOption === sc ? C.accent : C.textSecondary,
                        borderRadius:8, padding:"6px 16px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                      }}>{sc}</button>
                    ))}
                  </div>
                  {wizardSlideCountOption === "Custom" && (
                    <div style={{ marginTop:10 }}>
                      <input type="range" min={5} max={50} step={1} value={slideCount}
                        onChange={e => setSlideCount(Number(e.target.value))}
                        style={{ width:"100%" }} />
                      <div style={{ textAlign:"center", color:C.accent, fontWeight:700, fontSize:18, marginTop:4 }}>{slideCount} slides</div>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom:20 }}>
                  <label style={labelStyle}>Content Density</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {[
                      { key:"Minimal", desc:"High-level, concise slides" },
                      { key:"Balanced", desc:"Recommended for most decks" },
                      { key:"Detailed", desc:"Deep content per slide" },
                      { key:"Extremely Detailed", desc:"Max content, every point covered" },
                    ].map(opt => (
                      <button key={opt.key} onClick={() => setWizardContentDensity(opt.key)} style={{
                        background: wizardContentDensity === opt.key ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${wizardContentDensity === opt.key ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: wizardContentDensity === opt.key ? C.accent : C.textSecondary,
                        borderRadius:10, padding:"12px 14px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                        textAlign:"left",
                      }}>
                        <div style={{ fontWeight:600 }}>{opt.key}</div>
                        <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:20 }}>
                  <label style={labelStyle}>Output Language</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {WIZARD_LANGUAGES.map(lang => (
                      <button key={lang} onClick={() => setWizardLanguage(lang)} style={{
                        background: wizardLanguage === lang ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${wizardLanguage === lang ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)"}`,
                        color: wizardLanguage === lang ? C.accent : C.textSecondary,
                        borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                      }}>{lang}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Speaker Notes</label>
                  <div style={{ display:"flex", gap:6 }}>
                    {["Yes","No"].map(v => (
                      <button key={v} onClick={() => setWizardSpeakerNotes(v)} style={{
                        background: wizardSpeakerNotes === v ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${wizardSpeakerNotes === v ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)"}`,
                        color: wizardSpeakerNotes === v ? C.accent : C.textSecondary,
                        borderRadius:8, padding:"6px 22px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                      }}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Visuals & Charts ── */}
            {wizardStep === 4 && (
              <div>
                <div style={{ marginBottom:20 }}>
                  <label style={labelStyle}>Chart Types <span style={{ color:C.textMuted, fontWeight:400 }}>(select as many as you want)</span></label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {ALL_CHART_TYPES.map(ct => (
                      <button key={ct} onClick={() => toggleChartType(ct)} style={{
                        background: selectedChartTypes.includes(ct) ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${selectedChartTypes.includes(ct) ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.08)"}`,
                        color: selectedChartTypes.includes(ct) ? C.accent : C.textSecondary,
                        borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                      }}>{ct}</button>
                    ))}
                  </div>
                  {selectedChartTypes.length === 0 && (
                    <div style={{ fontSize:11, color:C.textMuted, marginTop:8, background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"8px 12px" }}>
                      💡 No types selected — AI will automatically detect and assign the most meaningful chart for each data slide based on your document content.
                    </div>
                  )}
                </div>

                {/* AI Thinking Pipeline */}
                <div style={{ background:"rgba(99,102,241,0.07)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:14 }}>🤖</span>
                    <span style={{ fontSize:12, fontWeight:700, color:C.accent, letterSpacing:0.5 }}>AI Thinking Pipeline</span>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, alignItems:"center", marginBottom:8 }}>
                    {["Understand Document","→","Detect Audience","→","Create Strategy","→","Build Outline","→","Write Narrative","→","Design Slides","→","Assign Charts","→","Generate PPTX"].map((s, i) => (
                      <span key={i} style={{ fontSize:11, color: s === "→" ? C.textMuted : C.textSecondary, fontWeight: s === "→" ? 400 : 500 }}>{s}</span>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted }}>
                    Uses Claude Opus 4 → Claude Sonnet 4 → GPT-5 → Gemini (fallback). Never reuse summary text.
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5: Sections & Export ── */}
            {wizardStep === 5 && (
              <div>
                <div style={{ marginBottom:20 }}>
                  <label style={labelStyle}>Include Sections</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {WIZARD_SECTIONS_LIST.map(s => (
                      <button key={s} onClick={() => toggleWizardSection(s)} style={{
                        background: wizardSections.includes(s) ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                        border:`1px solid ${wizardSections.includes(s) ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: wizardSections.includes(s) ? C.accent : C.textSecondary,
                        borderRadius:8, padding:"8px 12px", fontSize:12, fontWeight:500, cursor:"pointer", transition:T,
                        textAlign:"left",
                      }}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* McKinsey-Quality Output badge */}
                <div style={{ background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:10, padding:"12px 14px", marginBottom:18 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:13 }}>✅</span>
                    <span style={{ fontSize:12, fontWeight:700, color:C.success }}>McKinsey-Quality Output</span>
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted }}>
                    AI QA checks: no duplicate slides, no text overflow, no empty slides, consistent typography, accurate data, professional layouts.
                  </div>
                </div>

                {/* Presentation Summary */}
                <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.cardBorder}`, borderRadius:12, padding:16 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:C.textPrimary, marginBottom:12 }}>📋 Presentation Summary</div>
                  {[
                    ["Title", title || "Auto-generated"],
                    ["Type", wizardPresentationType],
                    ["Audience", audience],
                    ["Goal", wizardGoal],
                    ["Theme", wizardTheme],
                    ["Slides", wizardSlideCountOption === "Auto" || wizardSlideCountOption === "Custom" ? slideCount : wizardSlideCountOption],
                    ["Density", wizardContentDensity],
                    ["Language", wizardLanguage],
                    ["Speaker Notes", wizardSpeakerNotes],
                    ["Charts", selectedChartTypes.length > 0 ? selectedChartTypes.join(", ") : "Automatically Detect"],
                    ["Sections", wizardSections.join(", ")],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid rgba(255,255,255,0.04)`, fontSize:12 }}>
                      <span style={{ color:C.textMuted }}>{k}</span>
                      <span style={{ color:C.textSecondary, fontWeight:500, textAlign:"right", maxWidth:"60%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:24 }}>
              <div style={{ display:"flex", gap:8 }}>
                {wizardStep > 1 && (
                  <button onClick={() => setWizardStep(s => s - 1)} style={{
                    background:"rgba(255,255,255,0.05)", border:`1px solid ${C.cardBorder}`,
                    color:C.textSecondary, borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer", transition:T,
                  }}>← Back</button>
                )}
                <button onClick={closeWizard} style={{
                  background:"none", border:`1px solid ${C.cardBorder}`,
                  color:C.textMuted, borderRadius:8, padding:"9px 18px", fontSize:13, cursor:"pointer",
                }}>Cancel</button>
              </div>
              {wizardStep < 5 ? (
                <button onClick={() => setWizardStep(s => s + 1)} style={{
                  background:`linear-gradient(135deg,${C.accent} 0%,#8B5CF6 100%)`,
                  color:"#fff", border:"none", borderRadius:8, padding:"9px 22px", fontSize:13, fontWeight:700, cursor:"pointer", transition:T,
                }}>Next →</button>
              ) : (
                <button onClick={applyWizardAndGenerate} style={{
                  background:`linear-gradient(135deg,${C.accent} 0%,#8B5CF6 100%)`,
                  color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", fontSize:14, fontWeight:700, cursor:"pointer",
                  boxShadow:`0 4px 20px ${C.accentGlow}`, transition:T,
                }}>✨ Generate AI Presentation</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function WizardSection({ title, children }) {
  return (
    <div style={{ background:"#0B1120", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:24, marginBottom:16 }}>
      <div style={{ fontWeight:700, fontSize:12, color:"#475569", letterSpacing:1.2, textTransform:"uppercase", marginBottom:18 }}>{title}</div>
      {children}
    </div>
  );
}

function ChipCard({ selected, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{
      background: selected ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${selected ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)"}`,
      color: selected ? "#6366F1" : "#94A3B8",
      borderRadius:10, padding:"8px 14px", fontSize:12.5, fontWeight:500, cursor:"pointer",
      transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)",
      display:"flex", alignItems:"center", gap:6 }}>
      <span>{icon}</span>{label}
    </button>
  );
}

function ToggleGroup({ options, value, onChange }) {
  return (
    <div style={{ display:"flex", gap:4, marginTop:6 }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          flex:1, padding:"8px 0", fontSize:12, fontWeight:600,
          background: value === opt ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${value === opt ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)"}`,
          color: value === opt ? "#6366F1" : "#94A3B8",
          borderRadius:8, cursor:"pointer", transition:"all 0.2s cubic-bezier(0.4,0,0.2,1)" }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

const labelStyle = { display:"block", fontSize:11, fontWeight:700, color:"#475569", letterSpacing:0.8, textTransform:"uppercase", marginBottom:8 };
const inputStyle = {
  width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
  borderRadius:10, padding:"11px 14px", color:"#F1F5F9", fontSize:14, outline:"none",
  transition:"all 0.2s", marginBottom:0,
};