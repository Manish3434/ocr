import { useState, useRef } from "react";
import api from "../api";
import BankingReport from "./BankingReport";

const ACCEPTED = ".pdf,.csv,.xlsx,.xls,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp";
const TYPE_LABELS = {
  bank_statement: "Bank Statement",
  loan: "Loan Document",
  financial_report: "Financial Report",
  investment: "Investment Portfolio",
  unknown: "Financial Document",
};

export default function BankingUpload({ onAnalysisDone }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState("idle"); // idle | uploading | done | error
  const [stageLabel, setStageLabel] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const STAGES = [
    { pct: 10, label: "Uploading file…" },
    { pct: 25, label: "Extracting text content…" },
    { pct: 40, label: "Detecting document type & metadata…" },
    { pct: 55, label: "Extracting transactions…" },
    { pct: 70, label: "Categorising transactions…" },
    { pct: 82, label: "Running anomaly detection…" },
    { pct: 90, label: "Generating AI summary…" },
    { pct: 100, label: "Done!" },
  ];

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    setStage("idle");
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  }

  async function analyse() {
    if (!file) return;
    setStage("uploading");
    setError("");
    setResult(null);

    let stageIdx = 0;
    setProgress(STAGES[0].pct);
    setStageLabel(STAGES[0].label);

    const ticker = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, STAGES.length - 2);
      setProgress(STAGES[stageIdx].pct);
      setStageLabel(STAGES[stageIdx].label);
    }, 4500);

    try {
      const fd = new FormData();
      fd.append("document", file);
      const res = await api.post("/api/banking/analyse", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      clearInterval(ticker);
      setProgress(100);
      setStageLabel("Done!");
      setResult(res.data);
      setStage("done");
      if (onAnalysisDone) onAnalysisDone();
    } catch (err) {
      clearInterval(ticker);
      setError(err.response?.data?.message || "Analysis failed. Please try again.");
      setStage("error");
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
    setStage("idle");
    setProgress(0);
  }

  if (stage === "done" && result) {
    return <BankingReport result={result} onBack={reset} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Banking & Finance Analyser</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload bank statements, loan documents, financial reports, or investment portfolios for AI-powered analysis.
        </p>
      </div>

      {/* Supported types */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: "🏦", label: "Bank Statements", sub: "PDF / CSV / Image" },
          { icon: "📋", label: "Loan Documents", sub: "PDF / Word" },
          { icon: "📈", label: "Financial Reports", sub: "PDF / XLSX / Word" },
          { icon: "💼", label: "Investments", sub: "PDF / CSV / XLSX" },
        ].map(({ icon, label, sub }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xs font-semibold text-gray-800 dark:text-white">{label}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">{sub}</div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 select-none
          ${dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 bg-white dark:bg-gray-900"}`}
      >
        <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={e => pickFile(e.target.files[0])} />
        {file ? (
          <div>
            <div className="text-4xl mb-3">📄</div>
            <p className="font-semibold text-gray-800 dark:text-white">{file.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            <button onClick={e => { e.stopPropagation(); reset(); }} className="mt-2 text-xs text-red-500 hover:text-red-700 underline">Remove</button>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-4">🏦</div>
            <p className="text-gray-700 dark:text-gray-300 font-semibold">Drop your financial document here</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">PDF, Word, Excel, CSV, TXT, or Image (PNG/JPG) · Max 10 MB</p>
          </div>
        )}
      </div>

      {/* Upload progress */}
      {(stage === "uploading") && (
        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{stageLabel}</span>
            <span className="text-sm text-blue-600 dark:text-blue-400 font-mono">{progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500 dark:text-gray-400">This may take 30–60 seconds for large files</p>
          </div>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Analyse button */}
      {stage === "idle" && (
        <button
          onClick={analyse}
          disabled={!file}
          className={`mt-5 w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all
            ${file ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20" : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-400 dark:text-gray-500"}`}
        >
          🔍 Analyse Document
        </button>
      )}

      {stage === "error" && (
        <button onClick={reset} className="mt-3 w-full py-3 rounded-xl bg-gray-600 text-white text-sm font-semibold hover:bg-gray-700 transition">
          Try Again
        </button>
      )}
    </div>
  );
}