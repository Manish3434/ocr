import api from "../api";
import { useState, useRef, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { useNotifications } from "../context/NotificationContext";
import DocumentChat from "./DocumentChat";
import PptOptionsModal from "./PptOptionsModal";
import PresentationWizard from "./PresentationWizard";
import UsageBadge from "./UsageBadge";
import {
  Upload as UploadIcon, BookOpen, Sparkles, Save, CheckCircle2,
  FileText, FileSpreadsheet, FileImage, File, Presentation, MessageSquare,
  Copy, Download, ArrowRight,
} from "lucide-react";

// ── SSE progress hook (inline — no extra file needed) ────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function useProgress() {
  const [progress, setProgress] = useState({ stage: "idle", percent: 0, message: "", done: false, error: false });
  const esRef = useRef(null);

  const reset = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setProgress({ stage: "idle", percent: 0, message: "", done: false, error: false });
  }, []);

  const startListening = useCallback((jobId) => {
    reset();
    setProgress({ stage: "uploading", percent: 5, message: "Uploading file…", done: false, error: false });

    const es = new EventSource(`${API_BASE}/api/progress/${jobId}`, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress({ stage: data.stage, percent: data.percent, message: data.message, done: data.stage === "done", error: data.stage === "error" });
        if (data.stage === "done" || data.stage === "error") { es.close(); esRef.current = null; }
      } catch (_) {}
    };
    es.onerror = () => { es.close(); esRef.current = null; };
  }, [reset]);

  useEffect(() => () => { if (esRef.current) esRef.current.close(); }, []);

  return { progress, startListening, reset };
}

// ── Stage label map ───────────────────────────────────────────────────────────
const STAGE_STEPS = [
  { key: "uploading",  label: "Upload",  Icon: UploadIcon   },
  { key: "extracting", label: "Extract", Icon: BookOpen     },
  { key: "ai",         label: "AI",      Icon: Sparkles     },
  { key: "saving",     label: "Save",    Icon: Save         },
  { key: "done",       label: "Done",    Icon: CheckCircle2 },
];

const STAGE_ORDER = STAGE_STEPS.map(s => s.key);

// ── ProgressBar — uses CSS design token vars, not raw Tailwind colour classes ─
function ProgressBar({ progress, isImage }) {
  const { stage, percent, message, error } = progress;
  const currentIdx = error ? -1 : STAGE_ORDER.indexOf(stage);

  // Colours sourced from design token vars so they survive a palette change
  const barBg    = error ? "var(--danger)"  : percent === 100 ? "var(--success)" : "var(--primary)";
  const titleCol = error ? "var(--danger)"  : "var(--primary)";

  return (
    <div
      className="mt-6 p-5 rounded-xl"
      style={{
        background: "rgba(var(--primary-rgb), .06)",
        border: "1px solid rgba(var(--primary-rgb), .15)",
      }}
    >
      {/* Title row */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-sm" style={{ color: titleCol }}>
          {error
            ? "Error"
            : stage === "done"
            ? "Summary Complete!"
            : isImage
            ? "Analyzing image with AI…"
            : "Generating AI Summary…"}
        </h2>
        <span className="text-sm font-bold tabular-nums" style={{ color: error ? "var(--danger)" : "var(--primary)" }}>
          {error ? "Failed" : `${percent}%`}
        </span>
      </div>

      {/* Sub-message */}
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>{message}</p>

      {/* Bar track */}
      <div
        className="w-full h-3 rounded-full overflow-hidden"
        style={{ background: "var(--secondary)" }}
      >
        <div
          className={`h-3 rounded-full transition-all duration-500 ${stage !== "done" && !error ? "relative overflow-hidden" : ""}`}
          style={{ width: `${error ? 100 : percent}%`, background: barBg }}
        >
          {/* Shimmer while in progress */}
          {stage !== "done" && !error && (
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.4s_infinite]" />
          )}
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex justify-between mt-3">
        {STAGE_STEPS.map((step, idx) => {
          const done   = !error && currentIdx >= idx;
          const active = !error && currentIdx === idx;
          const StepIcon = step.Icon;
          return (
            <div key={step.key} className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: done
                    ? "var(--primary)"
                    : error
                    ? "rgba(239,68,68,.2)"
                    : "var(--secondary)",
                  boxShadow: done ? "0 1px 4px rgba(var(--primary-rgb),.3)" : "none",
                }}
              >
                <StepIcon
                  size={11}
                  color={done ? "#fff" : error ? "var(--danger)" : "var(--muted)"}
                  className={active && stage !== "done" ? "animate-pulse" : ""}
                />
              </div>
              <span
                className="text-[10px] font-medium leading-none"
                style={{
                  color: done ? "var(--primary)" : error ? "var(--danger)" : "var(--muted)",
                  opacity: done ? 1 : 0.6,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── File type helpers ─────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv", "application/csv",
];

const EXCEL_EXTENSIONS = [".xlsx", ".xls", ".csv"];
function getExt(file) { return "." + file.name.split(".").pop().toLowerCase(); }
function isImageFile(file)  { return file && file.type.startsWith("image/"); }
function isPdfFile(file)    { return file && (file.type === "application/pdf" || getExt(file) === ".pdf"); }
function isExcelFile(file)  { return file && EXCEL_EXTENSIONS.includes(getExt(file)); }
function isTextFile(file)   { return file && (file.type === "text/plain" || getExt(file) === ".txt"); }
function isDocxFile(file)   { return file && (getExt(file) === ".docx"); }
function isAllowedFile(file){ return file && (ALLOWED_TYPES.includes(file.type) || isExcelFile(file)); }

function fileTypeLabel(file) {
  if (isImageFile(file))  return { label: "Image",       color: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300", Icon: FileImage       };
  if (isPdfFile(file))    return { label: "PDF",         color: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",             Icon: FileText        };
  if (isExcelFile(file))  return { label: "Spreadsheet", color: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300", Icon: FileSpreadsheet };
  if (isDocxFile(file))   return { label: "Word Doc",    color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",         Icon: FileText        };
  if (isTextFile(file))   return { label: "Text",        color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",         Icon: FileText        };
  return                         { label: "Document",    color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",         Icon: File            };
}

// ── FilePreview component ─────────────────────────────────────────────────────
function FilePreview({ file }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const objUrlRef = useRef(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; }
    setPreview(null);

    if (isImageFile(file)) {
      const url = URL.createObjectURL(file);
      objUrlRef.current = url;
      setPreview({ type: "image", src: url });
      return;
    }
    if (isPdfFile(file)) {
      const url = URL.createObjectURL(file);
      objUrlRef.current = url;
      setPreview({ type: "pdf", src: url });
      return;
    }
    if (isTextFile(file)) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || "";
        setPreview({ type: "text", content: text.slice(0, 2000) + (text.length > 2000 ? "\n…" : "") });
        setLoading(false);
      };
      reader.onerror = () => setLoading(false);
      reader.readAsText(file);
      return;
    }
    if (getExt(file) === ".csv") {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || "";
        const rows = text.trim().split("\n").slice(0, 10).map(r => r.split(",").map(c => c.replace(/^"|"$/g, "").trim()));
        setPreview({ type: "table", rows });
        setLoading(false);
      };
      reader.onerror = () => setLoading(false);
      reader.readAsText(file);
      return;
    }
    if (isExcelFile(file)) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
          const wb = XLSX.read(e.target.result, { type: "array" });
          const sheetName = wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          setPreview({ type: "table", rows: rows.slice(0, 10), sheetName, totalSheets: wb.SheetNames.length });
        } catch {
          setPreview({ type: "error", message: "Could not render spreadsheet preview." });
        }
        setLoading(false);
      };
      reader.onerror = () => { setPreview({ type: "error", message: "Failed to read file." }); setLoading(false); };
      reader.readAsArrayBuffer(file);
      return;
    }
    if (isDocxFile(file)) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const mammoth = await import("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js");
          const result = await mammoth.convertToHtml({ arrayBuffer: e.target.result });
          setPreview({ type: "docx-html", html: result.value, name: file.name, size: file.size });
        } catch {
          // Fallback if mammoth fails
          setPreview({ type: "docx", name: file.name, size: file.size });
        }
        setLoading(false);
      };
      reader.onerror = () => { setPreview({ type: "docx", name: file.name, size: file.size }); setLoading(false); };
      reader.readAsArrayBuffer(file);
      return;
    }
  }, [file]);

  useEffect(() => () => { if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current); }, []);

  if (!file) return null;

  const wrapper = (children) => (
    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", minHeight: "360px" }}>
      {/* Panel header */}
      <div className="px-4 py-3 flex items-center gap-2 shrink-0"
        style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
        <div className="w-2 h-2 rounded-full" style={{ background: "var(--primary)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Preview</span>
        <span className="text-xs ml-auto truncate max-w-[60%]" style={{ color: "var(--muted)" }}>{file.name}</span>
      </div>
      <div style={{ background: "var(--card)" }} className="flex-1 p-4 overflow-auto">{children}</div>
    </div>
  );

  if (loading) return wrapper(
    <div className="flex items-center justify-center py-8 gap-2" style={{ color: "var(--muted)" }}>
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <span className="text-sm">Loading preview…</span>
    </div>
  );

  if (!preview) return null;

  if (preview.type === "image") return wrapper(
    <div className="flex justify-center">
      <img src={preview.src} alt={file.name} className="max-h-72 max-w-full rounded-lg object-contain shadow-md" />
    </div>
  );

  if (preview.type === "pdf") return wrapper(
    <div className="w-full" style={{ height: "320px" }}>
      <iframe src={preview.src + "#toolbar=0&navpanes=0&scrollbar=0&page=1"} title="PDF Preview" className="w-full h-full rounded border-0" />
    </div>
  );

  if (preview.type === "text") return wrapper(
    <pre className="text-xs whitespace-pre-wrap break-words max-h-56 overflow-y-auto font-mono leading-relaxed"
      style={{ color: "var(--text)" }}>
      {preview.content || "(empty file)"}
    </pre>
  );

  if (preview.type === "table") {
    const [header, ...rows] = preview.rows;
    return wrapper(
      <div>
        {preview.sheetName && (
          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>
            Sheet: <strong>{preview.sheetName}</strong>{preview.totalSheets > 1 && ` (+${preview.totalSheets - 1} more)`}
          </p>
        )}
        <div className="overflow-x-auto max-h-56 overflow-y-auto rounded" style={{ border: "1px solid var(--border)" }}>
          <table className="text-xs w-full border-collapse">
            {header && header.length > 0 && (
              <thead>
                <tr style={{ background: "var(--secondary)" }} className="sticky top-0">
                  {header.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                      style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>
                      {String(h || "")}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? "var(--card)" : "var(--secondary)" }}>
                  {(Array.isArray(row) ? row : []).map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 whitespace-nowrap max-w-xs truncate"
                      style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      {String(cell ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--muted)", opacity: 0.6 }}>Showing up to 10 rows</p>
      </div>
    );
  }

  if (preview.type === "docx-html") return wrapper(
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📝</span>
        <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{preview.name} · {(preview.size / 1024).toFixed(1)} KB</span>
      </div>
      <div
        className="overflow-y-auto max-h-72 rounded p-3 text-sm leading-relaxed prose prose-sm max-w-none"
        style={{
          background: "#fff",
          color: "#1a1a1a",
          border: "1px solid var(--border)",
          fontFamily: "'Calibri', 'Georgia', serif",
        }}
        dangerouslySetInnerHTML={{ __html: preview.html || "<p><em>No content found in document.</em></p>" }}
      />
      <p className="text-xs mt-1.5" style={{ color: "var(--muted)", opacity: 0.6 }}>Showing document content preview</p>
    </div>
  );

  if (preview.type === "docx") return wrapper(
    <div className="flex items-center gap-4 py-4">
      <div className="text-5xl">📝</div>
      <div>
        <p className="font-semibold" style={{ color: "var(--text)" }}>{preview.name}</p>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Word Document · {(preview.size / 1024).toFixed(1)} KB
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--muted)", opacity: 0.6 }}>
          Click "Summarize Document" to extract and analyze content
        </p>
      </div>
    </div>
  );

  if (preview.type === "error") return wrapper(
    <p className="text-sm py-4 text-center" style={{ color: "var(--danger)" }}>{preview.message}</p>
  );

  return null;
}

// ── Main Uploadcard ───────────────────────────────────────────────────────────
function Uploadcard() {
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [dragging,      setDragging]      = useState(false);
  const [summary,       setSummary]       = useState("");
  const [filename,      setFilename]      = useState("");
  const [loading,       setLoading]       = useState(false);
  const [pptLoading,    setPptLoading]    = useState(false);
  const [pptPdfLoading, setPptPdfLoading] = useState(false);
  const [showPptPdfMenu, setShowPptPdfMenu] = useState(false);
  const [stats,         setStats]         = useState(null);
  const [copied,        setCopied]        = useState(false);
  const [documentId,    setDocumentId]    = useState(null);
  const [showPptModal,  setShowPptModal]  = useState(false);
  const [showWizard,    setShowWizard]    = useState(false);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [usageKey,      setUsageKey]      = useState(0);

  const { addNotification } = useNotifications();
  const { progress, startListening, reset: resetProgress } = useProgress();

  async function handleSummarize() {
    if (!selectedFile) return;

    if (!isAllowedFile(selectedFile)) {
      toast.error("Only PDF, DOCX, TXT, XLSX, XLS, CSV, JPG, PNG, and WEBP files are allowed");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("Maximum file size is 10 MB");
      return;
    }

    try {
      setLoading(true);
      setSummary("");
      setStats(null);
      setDocumentId(null);

      const jobId = crypto.randomUUID();
      startListening(jobId);

      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("jobId", jobId);

      const response = await api.post("/api/summarize", formData);
      const data = response.data;

      setSummary(data.summary);
      setFilename(data.filename || selectedFile.name);
      setStats(data.stats);
      setDocumentId(data._id);
      setUsageKey(k => k + 1);
      toast.success("Summary generated successfully!");
      addNotification({ title: "Summary ready", message: `${selectedFile.name} was summarized successfully.`, type: "success" });
    } catch (error) {
      console.error(error);
      const errData = error.response?.data || {};
      const message = errData.message || "Error summarizing document";
      if (errData.limitReached) {
        toast.error(`Plan limit reached — ${message}`);
        addNotification({ title: "Usage limit reached", message: `Upgrade your plan to continue. ${message}`, type: "warning" });
      } else {
        toast.error(message);
        addNotification({ title: "Summarization failed", message: `${selectedFile?.name || "Document"}: ${message}`, type: "error" });
      }
      setSummary("");
      setStats(null);
      setDocumentId(null);
    } finally {
      setLoading(false);
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Failed to copy"); }
  }

  function downloadTXT() {
    try {
      const blob = new Blob([summary], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "Summary.txt"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded as TXT");
      addNotification({ title: "Download complete", message: "Summary.txt was downloaded.", type: "info" });
    } catch { toast.error("Failed to download"); }
  }

  function downloadPDF() {
    try {
      const pdf = new jsPDF();
      pdf.setFontSize(18);
      pdf.text("AI Document Summary", 10, 15);
      pdf.setFontSize(11);
      pdf.text(pdf.splitTextToSize(summary, 180), 10, 30);
      pdf.save("Summary.pdf");
      toast.success("Downloaded as PDF");
      addNotification({ title: "Download complete", message: "Summary.pdf was downloaded.", type: "info" });
    } catch { toast.error("Failed to download PDF"); }
  }

  async function downloadPPT(options) {
    if (!summary) return;
    try {
      setPptLoading(true);
      toast("Generating presentation...", { icon: "⏳" });
      const response = await api.post("/api/generate-ppt", { summary, filename: filename || selectedFile?.name || "Summary", documentId, options }, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (options?.title || filename || "Summary").replace(/\.[^/.]+$/, "");
      a.download = `${safeName}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Presentation downloaded!");
      addNotification({ title: "Download complete", message: `${safeName}.pptx was downloaded.`, type: "info" });
      setShowPptModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate presentation");
    } finally {
      setPptLoading(false);
    }
  }

  // ── NEW: AI Wizard Presentation ───────────────────────────────────────────
  async function downloadAIPPT(wizardOptions) {
    if (!summary) return;
    try {
      setWizardLoading(true);
      toast("🧠 AI is building your presentation strategy…", { icon: "⏳", duration: 8000 });
      const response = await api.post(
        "/api/generate-ppt-ai",
        {
          documentText: summary,
          filename: filename || selectedFile?.name || "Document",
          documentId,
          wizardOptions,
        },
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (wizardOptions?.title || filename || "Presentation").replace(/\.[^/.]+$/, "");
      a.download = `${safeName}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("🎉 AI Presentation downloaded!");
      addNotification({ title: "AI Presentation ready", message: `${safeName}.pptx downloaded.`, type: "info" });
      setShowWizard(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate AI presentation. Please try again.");
    } finally {
      setWizardLoading(false);
    }
  }

  async function downloadPPTAsPDF(options) {
    if (!summary) return;
    try {
      setPptPdfLoading(true);
      toast("Generating presentation PDF...", { icon: "⏳" });
      await api.post(
        "/api/generate-ppt",
        { summary, filename: filename || selectedFile?.name || "Summary", documentId, options },
        { responseType: "blob" }
      );
      const { jsPDF } = await import("jspdf");
      const pdfName = (options?.title || filename || "Summary").replace(/\.[^/.]+$/, "");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

      pdf.setFillColor(30, 39, 97);
      pdf.rect(0, 0, 792, 612, "F");
      pdf.setFontSize(30);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      const titleLines = pdf.splitTextToSize(pdfName, 680);
      pdf.text(titleLines, 56, 210);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(201, 168, 76);
      pdf.text("AI Document Summarizer — Presentation Export", 56, 280);
      pdf.setFontSize(11);
      pdf.setTextColor(160, 176, 208);
      pdf.text(`Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 56, 308);
      pdf.setFillColor(201, 168, 76);
      pdf.rect(56, 330, 120, 4, "F");

      pdf.addPage();
      pdf.setFillColor(247, 249, 252);
      pdf.rect(0, 0, 792, 612, "F");
      pdf.setFillColor(30, 39, 97);
      pdf.rect(0, 0, 792, 60, "F");
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("AI Summary Excerpt", 40, 38);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(26, 26, 46);
      const cleanSummary = summary.replace(/[#*_`>]/g, "").trim().slice(0, 1200);
      const summaryLines = pdf.splitTextToSize(cleanSummary, 710);
      pdf.text(summaryLines.slice(0, 38), 40, 90);
      pdf.setFillColor(201, 168, 76);
      pdf.rect(0, 600, 792, 12, "F");

      pdf.save(`${pdfName}.pdf`);
      toast.success("Presentation PDF downloaded!");
      addNotification({ title: "PDF download complete", message: `${pdfName}.pdf was downloaded.`, type: "info" });
      setShowPptPdfMenu(false);
      setShowPptModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate presentation PDF");
    } finally {
      setPptPdfLoading(false);
    }
  }

  function clearFile() {
    setSelectedFile(null);
    setSummary("");
    setFilename("");
    setStats(null);
    setDocumentId(null);
    resetProgress();
  }

  function handleFileSelect(file) {
    if (!file) return;
    setSelectedFile(file);
    setSummary("");
    setStats(null);
    setDocumentId(null);
    resetProgress();
  }

  const { Icon: FileTypeIcon = File, label: typeLabel, color: typeBadgeColor } = selectedFile ? fileTypeLabel(selectedFile) : {};

  const dropLabel = selectedFile && isImageFile(selectedFile) ? "Image ready for analysis"
    : selectedFile && isPdfFile(selectedFile)   ? "PDF ready for summary"
    : selectedFile && isExcelFile(selectedFile) ? "Spreadsheet ready for summary"
    : selectedFile && isDocxFile(selectedFile)  ? "Word document ready for summary"
    : selectedFile && isTextFile(selectedFile)  ? "Text file ready for summary"
    : "Drag & Drop your file here";

  const summarizeLabel = loading
    ? (isImageFile(selectedFile) ? "Analyzing Image…" : isExcelFile(selectedFile) ? "Summarizing Spreadsheet…" : "Generating Summary…")
    : (isImageFile(selectedFile) ? "Analyze Image"    : isExcelFile(selectedFile) ? "Summarize Spreadsheet"    : "Summarize Document");

  const showProgress = loading || progress.stage === "done" || progress.stage === "error";

  return (
    <section className="rounded-xl shadow-lg transition-colors duration-300 overflow-hidden"
      style={{ background: "var(--card)" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Upload Document</h2>
        <UsageBadge key={usageKey} type="summarize" className="w-56 shrink-0" />
      </div>

      {/* ── Two-panel body ── */}
      <div className={`flex gap-0 ${selectedFile ? "flex-col lg:flex-row" : ""}`}>

        {/* LEFT PANEL — Drop zone / Preview */}
        <div
          className={`flex flex-col ${selectedFile ? "lg:w-[55%] lg:min-h-[520px]" : "w-full"}`}
          style={selectedFile ? { borderRight: "1px solid var(--border)" } : {}}
        >
          {!selectedFile ? (
            /* ── Empty drop zone ── */
            <div
              className="m-6 border-2 border-dashed rounded-xl p-14 flex flex-col items-center transition-all duration-300"
              style={{
                borderColor: dragging ? "var(--primary)" : "var(--border)",
                background: dragging ? "rgba(var(--primary-rgb),.06)" : "transparent",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(var(--primary-rgb),.08)" }}>
                <UploadIcon size={28} style={{ color: "var(--primary)" }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>Drag & Drop your file here</h3>
              <p className="text-sm mb-6 text-center" style={{ color: "var(--muted)" }}>
                PDF, DOCX, TXT, XLSX, CSV, JPG, PNG, WEBP supported
              </p>
              <label className="px-7 py-3 rounded-lg cursor-pointer text-white font-medium transition hover:opacity-90 shadow"
                style={{ background: "var(--primary)" }}>
                Select File
                <input type="file" className="hidden" accept=".pdf,.txt,.docx,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.gif"
                  onChange={(e) => handleFileSelect(e.target.files[0])} />
              </label>
              <p className="text-xs mt-4" style={{ color: "var(--muted)", opacity: 0.5 }}>Max file size: 10 MB</p>
            </div>
          ) : (
            /* ── File selected: show full-height preview ── */
            <div className="flex flex-col h-full">
              {/* File name bar */}
              <div className="px-5 py-3 flex items-center gap-3 shrink-0"
                style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
                <FileTypeIcon size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{selectedFile.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {typeLabel && <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${typeBadgeColor}`}>{typeLabel}</span>}
                    <span className="text-[11px]" style={{ color: "var(--muted)" }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
                {/* Replace file */}
                <label className="shrink-0 text-xs px-3 py-1.5 rounded-lg cursor-pointer font-medium transition hover:opacity-80"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                  Replace
                  <input type="file" className="hidden" accept=".pdf,.txt,.docx,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.gif"
                    onChange={(e) => handleFileSelect(e.target.files[0])} />
                </label>
              </div>

              {/* Preview fills remaining height */}
              <div className="flex-1 p-4"
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]); }}>
                <FilePreview file={selectedFile} />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — AI controls + summary (only when file selected) */}
        {selectedFile && (
          <div className="flex flex-col lg:w-[45%] px-6 py-5 gap-4">

            {/* AI badge */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ background: "rgba(var(--primary-rgb),.12)", color: "var(--primary)" }}>✦</div>
              <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>AI Analysis</span>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>
                {isImageFile(selectedFile) ? "Analyze Image" : "Summarize Document"}
              </h3>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {isImageFile(selectedFile)
                  ? "AI will describe and analyze the image content."
                  : "AI will extract key insights and summarize the document."}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={handleSummarize} disabled={loading}
                className="flex-1 py-3 rounded-lg text-white font-semibold transition"
                style={{
                  background: loading ? "var(--warning)" : "var(--primary)",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 2px 12px rgba(var(--primary-rgb),.3)",
                }}>
                {summarizeLabel}
              </button>
              <button onClick={clearFile}
                className="px-4 py-3 rounded-lg font-semibold transition hover:opacity-80"
                style={{ background: "var(--secondary)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                ✕
              </button>
            </div>

            {/* Progress */}
            {showProgress && (
              <ProgressBar progress={progress} isImage={isImageFile(selectedFile)} />
            )}

            {/* Summary Output */}
            {summary && (
              <div className="rounded-xl p-5 flex-1 overflow-y-auto"
                style={{ background: "rgba(var(--primary-rgb),.04)", border: "1px solid rgba(var(--primary-rgb),.12)" }}>
                <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>AI Summary</h2>

                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--primary)" }}>{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2" style={{ color: "var(--text)" }}>{children}</h2>,
                  p:  ({ children }) => <p className="leading-6 mb-2 text-sm" style={{ color: "var(--muted)" }}>{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ml-5 mb-2 text-sm" style={{ color: "var(--muted)" }}>{children}</ul>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => <strong className="font-bold" style={{ color: "var(--text)" }}>{children}</strong>,
                }}>
                  {summary}
                </ReactMarkdown>

                {stats && (
                  <div className="mt-5">
                    <h2 className="text-base font-bold mb-3" style={{ color: "var(--text)" }}>Document Statistics</h2>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: "📝", label: "Words",        value: stats.words },
                        { icon: "🔤", label: "Characters",   value: stats.characters },
                        { icon: "⏱",  label: "Reading Time", value: `${stats.readingTime} min` },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="rounded-lg p-3 shadow"
                          style={{ background: "var(--secondary)" }}>
                          <h3 className="text-xs" style={{ color: "var(--muted)" }}>{icon} {label}</h3>
                          <p className="text-xl font-bold mt-0.5" style={{ color: "var(--text)" }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Next-step CTA panel ── */}
                <div
                  className="mt-5 rounded-xl p-4"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
                    What's next?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowWizard(true)}
                      disabled={wizardLoading || !summary}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 2px 10px rgba(124,58,237,.3)" }}
                    >
                      <Presentation size={14} />
                      {wizardLoading ? "Generating…" : "Export to PPT"}
                      <ArrowRight size={12} style={{ opacity: 0.7 }} />
                    </button>
                    <button
                      onClick={() => {
                        // Scroll down to the chat section
                        document.getElementById("doc-chat-anchor")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-80"
                      style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)" }}
                    >
                      <MessageSquare size={14} />
                      Chat with doc
                    </button>
                    <button
                      onClick={copySummary}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-80"
                      style={{ background: "var(--card)", color: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      <Copy size={13} />
                      {copied ? "Copied!" : "Copy text"}
                    </button>
                  </div>
                </div>

                {/* ── Export options ── */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button onClick={copySummary}
                    className="px-4 py-2 rounded-lg text-white text-sm transition hover:opacity-90"
                    style={{ background: "var(--primary)" }}>
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                  <button onClick={downloadTXT}
                    className="px-4 py-2 rounded-lg text-white text-sm transition hover:opacity-90"
                    style={{ background: "var(--success)" }}>
                    📄 TXT
                  </button>
                  <button onClick={downloadPDF}
                    className="px-4 py-2 rounded-lg text-white text-sm transition hover:opacity-90"
                    style={{ background: "var(--danger)" }}>
                    📑 PDF
                  </button>

                  {/* PPT split button */}
                  <div className="relative flex rounded-lg overflow-hidden shadow-sm">
                  
                    <div className="w-px" style={{ background: "#ea6b10" }} />
                    <div className="relative">
                      {showPptPdfMenu && (
                        <div
                          className="absolute right-0 bottom-full mb-1 w-52 rounded-xl shadow-xl z-50"
                          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                          onMouseLeave={() => setShowPptPdfMenu(false)}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider px-3 pt-2.5 pb-1"
                            style={{ color: "var(--muted)" }}>
                            Export as PDF
                          </p>
                          {[
                            { key: "navyGold",     label: "Navy & Gold",     colors: ["#1E2761", "#C9A84C"] },
                            { key: "tealSlate",    label: "Teal & Slate",    colors: ["#0F3D3E", "#3FBFAE"] },
                            { key: "charcoalRuby", label: "Charcoal & Ruby", colors: ["#231F20", "#C0392B"] },
                          ].map(t => (
                            <button
                              key={t.key}
                              onClick={() => downloadPPTAsPDF({ title: (filename || selectedFile?.name || "Summary").replace(/\.[^/.]+$/, ""), theme: t.key, detailLevel: "standard", includeAgenda: true, includeNotes: false })}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm transition hover:opacity-80"
                              style={{ color: "var(--text)" }}
                            >
                              <span className="flex gap-1">
                                <span className="w-3 h-3 rounded-full" style={{ background: t.colors[0] }} />
                                <span className="w-3 h-3 rounded-full" style={{ background: t.colors[1] }} />
                              </span>
                              {t.label}
                            </button>
                          ))}
                          <div className="border-t mt-1 mb-1" style={{ borderColor: "var(--border)" }} />
                          <button
                            onClick={() => { setShowPptPdfMenu(false); setShowPptModal(true); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm transition hover:opacity-80"
                            style={{ color: "var(--primary)" }}
                          >
                            ⚙️ Custom options…
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                 
                </div>

                <div id="doc-chat-anchor"><DocumentChat documentId={documentId} /></div>
              </div>
            )}
          </div>
        )}
      </div>
      

      <PptOptionsModal
        open={showPptModal}
        defaultTitle={(filename || selectedFile?.name || "Summary").replace(/\.[^/.]+$/, "")}
        onCancel={() => setShowPptModal(false)}
        onConfirm={downloadPPT}
        onConfirmPdf={downloadPPTAsPDF}
        loading={pptLoading || pptPdfLoading}
      />

      {/* NEW: AI Presentation Wizard */}
      <PresentationWizard
        open={showWizard}
        defaultTitle={(filename || selectedFile?.name || "Presentation").replace(/\.[^/.]+$/, "")}
        onCancel={() => setShowWizard(false)}
        onGenerate={downloadAIPPT}
        loading={wizardLoading}
      />
    </section>
  );
}

export default Uploadcard;