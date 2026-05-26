/* cspell:disable */
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "mathlive";

// Global error catcher for debugging white screens
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    // We can keep a quiet console log instead of the red screen now that it's fixed
    console.error("CRASH:", event.error?.message || event.message);
  });
}

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname.includes("vercel.app")
    ? `https://${window.location.hostname}/_/backend`
    : "http://localhost:8000");

// ==========================================
// PREMIUM INLINE VECTOR SVG ICON COMPONENTS
// ==========================================
const TargetIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const WaveIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 10c3-3 3-3 6 0s3 3 6 0 3-3 6 0" />
    <path d="M2 14c3-3 3-3 6 0s3 3 6 0 3-3 6 0" />
  </svg>
);

const SheetIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const CogIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const BookIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5v-15z" />
  </svg>
);

const RefreshIcon = ({ className = "w-3 h-3" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const CloudIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.88 18.04A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    <path d="M12 12v6" />
    <path d="m9 15 3 3 3-3" />
  </svg>
);

const FolderIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
);

const AlertIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const RobotIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="8" cy="16" r="1" />
    <circle cx="16" cy="16" r="1" />
    <path d="M9 22v-2h6v2" />
    <path d="M12 11V9" />
    <circle cx="12" cy="7" r="1" />
    <path d="M21 15h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1" />
    <path d="M3 15H2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1" />
  </svg>
);

const PdfIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M8 13h4M8 17h6" />
  </svg>
);

const GraphIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

// Komponen Renderer Markdown & LaTeX Menggunakan react-markdown dan KaTeX
const AIMarkdownRenderer = ({ content }) => {
  if (!content) return null;

  return (
    <div className="text-slate-700 leading-relaxed font-sans text-xs md:text-sm text-left">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        /* eslint-disable no-unused-vars */
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-lg md:text-xl font-black text-slate-950 mt-6 mb-3 border-b border-slate-200 pb-2"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-base md:text-lg font-black text-slate-900 mt-5 mb-2.5"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-sm md:text-base font-extrabold text-teal-700 mt-4 mb-2 flex items-center gap-2">
              <TargetIcon className="w-3.5 h-3.5 text-teal-650" />
              <span {...props} />
            </h3>
          ),
          p: ({ node, ...props }) => (
            <p
              className="text-slate-600 my-1.5 text-xs md:text-sm leading-relaxed"
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-teal-500 bg-teal-50/50 px-4 py-2.5 rounded-r-xl my-3 text-slate-650 italic"
              {...props}
            />
          ),
          hr: ({ node, ...props }) => (
            <hr className="border-slate-200 my-4" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-extrabold text-slate-950" {...props} />
          ),
          code: ({ node, inline, ...props }) =>
            inline ? (
              <code
                className="px-1 py-0.5 mx-0.5 bg-slate-100 border border-slate-200 rounded text-teal-700 font-mono text-[10px] md:text-xs"
                {...props}
              />
            ) : (
              <code
                className="block p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl font-mono text-teal-700 overflow-x-auto shadow-inner text-xs font-semibold my-3"
                {...props}
              />
            ),
          ul: ({ node, ...props }) => (
            <ul
              className="list-disc pl-5 my-2.5 space-y-1.5 marker:text-teal-500"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal pl-5 my-2.5 space-y-1.5 marker:text-teal-600 font-semibold"
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li className="text-slate-700 font-normal" {...props} />
          ),
        }}
        /* eslint-enable no-unused-vars */
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const Calculator = () => {
  // Inisialisasi ID Pengguna Unik untuk memisahkan Riwayat Cloud per HP/Laptop
  const [userId] = useState(() => {
    let id = localStorage.getItem("regula_falsi_user_id");
    if (!id) {
      id =
        "usr_" +
        Date.now().toString(36) +
        Math.random().toString(36).substr(2, 5);
      localStorage.setItem("regula_falsi_user_id", id);
    }
    return id;
  });

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("regula_falsi_active_tab") || "single";
  }); // 'single', 'multi', 'excel', 'theory'

  // Sub-tab untuk panel hasil sebelah kanan
  const [activeResultTab, setActiveResultTab] = useState("ai"); // 'ai', 'table', 'export'

  // States Excel
  const [excelFile, setExcelFile] = useState(null);
  const [excelResult, setExcelResult] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelError, setExcelError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedRowDetails, setSelectedRowDetails] = useState(null);
  const [history, setHistory] = useState([]);

  // States Tunggal & Ganda
  const [singleData, setSingleData] = useState({
    fungsi: "3x^2 - 12x - 20",
    a: 1.0,
    b: 6.0,
    epsilon: 0.0001,
  });

  const [multiData, setMultiData] = useState({
    fungsi: "x^2 - 4",
    range_min: -5.0,
    range_max: 5.0,
    epsilon: 0.0001,
    step: 1.0,
  });

  const singleInputRef = useRef(null);
  const multiInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [multiResult, setMultiResult] = useState(null);
  const [error, setError] = useState("");

  // Ambil data riwayat kalkulasi cloud dari Supabase via backend
  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/history`, {
        params: { user_id: userId },
      });
      setHistory(response.data);
    } catch (err) {
      console.error("Gagal memuat riwayat kalkulasi cloud:", err);
    }
  }, [userId]);

  const deleteHistoryItem = async (itemId) => {
    if (
      window.confirm(
        "Apakah Anda yakin ingin menghapus riwayat komputasi ini secara permanen dari cloud?",
      )
    ) {
      try {
        await axios.delete(`${API_BASE}/api/history/${itemId}`);
        fetchHistory();
      } catch (err) {
        console.error("Gagal menghapus riwayat:", err);
        alert("Gagal menghapus riwayat.");
      }
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setResult(null);
    setMultiResult(null);
    setExcelResult(null);
    setError("");
    setExcelError("");
    setActiveResultTab("ai");
    localStorage.setItem("regula_falsi_active_tab", tab);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  const parseNum = (val) => {
    if (typeof val === "string") {
      const replaced = val.replace(/,/g, ".");
      const num = parseFloat(replaced);
      return isNaN(num) ? 0.0 : num;
    }
    return parseFloat(val) || 0.0;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setExcelFile(e.target.files[0]);
      setExcelError("");
      setExcelResult(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setExcelFile(e.dataTransfer.files[0]);
      setExcelError("");
      setExcelResult(null);
    }
  };

  const uploadExcelFile = async (e) => {
    e.preventDefault();
    if (!excelFile) return;

    setExcelLoading(true);
    setExcelError("");
    setExcelResult(null);

    const formData = new FormData();
    formData.append("file", excelFile);
    formData.append("user_id", userId);

    try {
      const response = await axios.post(
        `${API_BASE}/api/upload-excel`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      setExcelResult(response.data);
      setActiveResultTab("ai");
      fetchHistory();
    } catch (err) {
      if (err.response && err.response.data) {
        setExcelError(err.response.data.detail);
      } else {
        setExcelError("Gagal mengirim berkas Excel ke server.");
      }
    } finally {
      setExcelLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(`${API_BASE}/api/download-template`, "_blank");
  };

  const handleSingleChange = (e) => {
    setSingleData({ ...singleData, [e.target.name]: e.target.value });
  };

  const handleMultiChange = (e) => {
    setMultiData({ ...multiData, [e.target.name]: e.target.value });
  };

  const calculateSingle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setMultiResult(null);

    try {
      const response = await axios.post(`${API_BASE}/api/calculate-single`, {
        fungsi: singleData.fungsi,
        a: parseNum(singleData.a),
        b: parseNum(singleData.b),
        epsilon: parseNum(singleData.epsilon),
        user_id: userId,
      });
      setResult(response.data);
      setActiveResultTab("ai");
      fetchHistory();
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.detail);
      } else {
        setError("Terjadi kegagalan koneksi ke server API backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateMulti = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setMultiResult(null);

    try {
      const response = await axios.post(`${API_BASE}/api/calculate-multi`, {
        fungsi: multiData.fungsi,
        range_min: parseNum(multiData.range_min),
        range_max: parseNum(multiData.range_max),
        epsilon: parseNum(multiData.epsilon),
        step: parseNum(multiData.step),
        user_id: userId,
      });
      setMultiResult(response.data);
      setActiveResultTab("ai");
      fetchHistory();
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.detail);
      } else {
        setError("Terjadi kegagalan koneksi ke server API backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async (
    fungsi,
    a,
    b,
    epsilon,
    root,
    iterations,
    ai_explanation,
  ) => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/export-pdf`,
        {
          fungsi,
          a: parseNum(a),
          b: parseNum(b),
          epsilon: parseNum(epsilon),
          root: parseNum(root),
          iterations,
          ai_explanation,
        },
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `laporan_regula_falsi_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Gagal mengunduh laporan PDF: " + err.message);
    }
  };

  const exportBatchPDF = async (results, ai_summary) => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/export-batch-pdf`,
        {
          results,
          ai_summary,
        },
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `laporan_batch_regula_falsi_${Date.now()}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Gagal mengunduh laporan PDF Batch: " + err.message);
    }
  };

  const exportBatchExcel = async (results) => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/export-batch-excel`,
        {
          results,
        },
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `hasil_batch_regula_falsi_${Date.now()}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Gagal mengunduh berkas Excel Batch: " + err.message);
    }
  };

  const exportSingleExcel = async (fungsi, a, b, epsilon, root, iterations) => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/export-single-excel`,
        {
          fungsi,
          a: parseNum(a),
          b: parseNum(b),
          epsilon: parseNum(epsilon),
          root: parseNum(root),
          iterations,
        },
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `hasil_regula_falsi_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert("Gagal mengunduh berkas Excel: " + err.message);
    }
  };

  // Membagi riwayat cloud berdasarkan tab aktif
  const getFilteredHistory = () => {
    if (activeTab === "single") {
      return history.filter(
        (item) => item.file_name && item.file_name.startsWith("single_root_"),
      );
    }
    if (activeTab === "multi") {
      return history.filter(
        (item) => item.file_name && item.file_name.startsWith("multi_root_"),
      );
    }
    if (activeTab === "excel") {
      return history.filter(
        (item) =>
          item.file_name &&
          !item.file_name.startsWith("single_root_") &&
          !item.file_name.startsWith("multi_root_"),
      );
    }
    return [];
  };

  const filteredHistory = getFilteredHistory();

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* 1. 🎛️ PREMIUM TOP NAVBAR HEADER */}
      <header className="w-full bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 gap-4 shrink-0 z-30 shadow-xs text-left">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/10 font-black text-white shrink-0">
            <svg
              className="w-4.5 h-4.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="16" y1="14" x2="16" y2="18" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
              Regula<span className="text-teal-600">Falsi</span>
            </h1>
            <span className="text-[7.5px] text-slate-400 uppercase tracking-widest font-black block mt-1">
              Global Numerical Lab
            </span>
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none scroll-smooth">
          <button
            onClick={() => handleTabChange("single")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-250 flex items-center gap-2 cursor-pointer shrink-0 border border-transparent select-none ${activeTab === "single" ? "bg-teal-50 text-teal-850 border-teal-100 shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
          >
            <TargetIcon className="w-3.5 h-3.5" />
            <span>Akar Tunggal</span>
          </button>
          <button
            onClick={() => handleTabChange("multi")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-250 flex items-center gap-2 cursor-pointer shrink-0 border border-transparent select-none ${activeTab === "multi" ? "bg-teal-50 text-teal-850 border-teal-100 shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
          >
            <WaveIcon className="w-3.5 h-3.5" />
            <span>Akar Ganda Scan</span>
          </button>
          <button
            onClick={() => handleTabChange("excel")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-250 flex items-center gap-2 cursor-pointer shrink-0 border border-transparent select-none ${activeTab === "excel" ? "bg-teal-50 text-teal-850 border-teal-100 shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
          >
            <SheetIcon className="w-3.5 h-3.5" />
            <span>AI Batch Excel</span>
          </button>
          <button
            onClick={() => handleTabChange("theory")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-250 flex items-center gap-2 cursor-pointer shrink-0 border border-transparent select-none ${activeTab === "theory" ? "bg-teal-50 text-teal-850 border-teal-100 shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
          >
            <BookIcon className="w-3.5 h-3.5" />
            <span>Teori & Panduan</span>
          </button>
        </nav>
      </header>

      {/* 2. 💻 WORKSPACE CONTENT LAYOUT (SCROLLABLE CANVAS) */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 custom-scrollbar text-slate-800">
        {/* TAMPILAN JIKA MENU TEORI DIAKTIFKAN */}
        {activeTab === "theory" ? (
          <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-left space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="w-12 h-12 bg-teal-50 border border-teal-100/60 text-teal-700 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <BookIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Landasan Teori Komprehensif
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                  Metode Posisi Palsu (Regula Falsi)
                </p>
              </div>
            </div>

            <div className="space-y-4 text-slate-650 text-xs md:text-sm leading-relaxed font-semibold">
              <p>
                <strong>Metode Regula Falsi</strong> merupakan salah satu metode
                pencarian akar tertutup (bracketing) yang paling andal dalam
                analisis numerik. Metode ini mengawali pencariannya dengan
                menggunakan dua tebakan awal, batas bawah{" "}
                <code className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-teal-700 font-mono">
                  a
                </code>{" "}
                dan batas atas{" "}
                <code className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-teal-700 font-mono">
                  b
                </code>
                , dengan syarat nilai fungsi keduanya harus berlawanan tanda:
              </p>

              <div className="p-4 bg-teal-50/40 border border-teal-100/50 rounded-2xl text-center font-mono text-teal-700 font-black text-xs md:text-sm">
                f(a) * f(b) &lt; 0
              </div>

              <p>
                Tidak seperti Metode Biseksi (Bagi Dua) yang hanya memotong
                selang tepat di tengah secara buta, Regula Falsi memanfaatkan
                garis lurus (interpolasi linier) yang menghubungkan titik{" "}
                <code className="text-slate-800 font-mono">[a, f(a)]</code> and{" "}
                <code className="text-slate-800 font-mono">[b, f(b)]</code>.
                Perpotongan garis tersebut dengan sumbu mendatar (sumbu-X)
                dijadikan estimasi akar baru{" "}
                <code className="px-1.5 py-0.5 bg-teal-50 border border-teal-150 rounded text-teal-700 font-mono font-black">
                  xr
                </code>
                . Rumus matematisnya didefinisikan sebagai:
              </p>

              <div className="p-4 bg-teal-50/40 border border-teal-100/50 rounded-2xl text-center font-mono text-teal-700 font-black text-xs md:text-sm">
                xr = b - (f(b) * (b - a)) / (f(b) - f(a))
              </div>

              <div className="space-y-2.5 border-t border-slate-100 pt-5">
                <h4 className="font-extrabold text-slate-900 text-xs md:text-sm flex items-center gap-1.5">
                  <TargetIcon className="w-4 h-4 text-teal-650" />
                  <span>Langkah Algoritma Perhitungan:</span>
                </h4>
                <ol className="space-y-2 pl-5 list-decimal text-slate-600 text-xs">
                  <li>
                    Evaluasi tebakan selang awal: Pastikan{" "}
                    <code className="font-mono">f(a) * f(b) &lt; 0</code>. Jika
                    tidak, sistem akan mengembalikan error karena akar tidak
                    dijamin ada di dalam selang tersebut.
                  </li>
                  <li>
                    Hitung nilai estimasi akar pertama{" "}
                    <code className="font-mono">xr</code> menggunakan rumus
                    interpolasi di atas.
                  </li>
                  <li>
                    Evaluasi nilai fungsi pada titik akar baru tersebut:{" "}
                    <code className="font-mono">f(xr)</code>.
                  </li>
                  <li>
                    Tentukan selang baru untuk iterasi berikutnya:
                    <ul className="pl-4 list-disc space-y-1 mt-1 text-[11px]">
                      <li>
                        Jika{" "}
                        <code className="font-mono">f(a) * f(xr) &lt; 0</code>,
                        akar berada pada selang kiri. Maka, batas atas diganti:{" "}
                        <code className="font-mono">b = xr</code>.
                      </li>
                      <li>
                        Jika{" "}
                        <code className="font-mono">f(a) * f(xr) &gt; 0</code>,
                        akar berada pada selang kanan. Maka, batas bawah
                        diganti: <code className="font-mono">a = xr</code>.
                      </li>
                    </ul>
                  </li>
                  <li>
                    Kalkulasi nilai kesalahan (error):{" "}
                    <code className="font-mono">
                      | (xr_baru - xr_lama) / xr_baru |
                    </code>{" "}
                    atau <code className="font-mono">| f(xr) |</code>.
                  </li>
                  <li>
                    Ulangi proses dari langkah 2 sampai nilai kesalahan lebih
                    kecil dari toleransi toleransi error (
                    <code className="font-mono">epsilon</code>) yang Anda
                    tentukan.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          // JIKA WORKSPACE PERHITUNGAN AKTIF ('single', 'multi', atau 'excel')
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Workspace Canvas Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/60 pb-4 mb-2 text-left">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {activeTab === "single" && (
                    <>
                      <TargetIcon className="w-5 h-5 text-teal-600" />
                      <span>Akar Tunggal Workspace</span>
                    </>
                  )}
                  {activeTab === "multi" && (
                    <>
                      <WaveIcon className="w-5 h-5 text-teal-600" />
                      <span>Akar Ganda Scan Workspace</span>
                    </>
                  )}
                  {activeTab === "excel" && (
                    <>
                      <SheetIcon className="w-5 h-5 text-teal-600" />
                      <span>AI Batch Excel Solver</span>
                    </>
                  )}
                </h2>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
                  {activeTab === "single" &&
                    "Komputasi dan Visualisasi Interaktif Regula Falsi"}
                  {activeTab === "multi" &&
                    "Pencarian Akar Banyak dengan Metode Pemindaian Selang"}
                  {activeTab === "excel" &&
                    "Penyelesaian Persamaan Masal Berbasis File Spreadsheet"}
                </p>
              </div>
            </div>

            {/* NOTIFIKASI ERROR VALIDASI */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 shadow-sm text-left animate-fade-in shrink-0">
                <div className="p-1 bg-rose-100 rounded-lg border border-rose-200 shrink-0">
                  <AlertIcon className="w-4.5 h-4.5 text-rose-700" />
                </div>
                <div>
                  <strong className="block text-rose-950 text-xs mb-0.5 font-extrabold uppercase tracking-wide">
                    Pemberitahuan Selang / Parameter
                  </strong>
                  <p className="text-xs font-semibold leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {excelError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 shadow-sm text-left animate-fade-in shrink-0">
                <div className="p-1 bg-rose-100 rounded-lg border border-rose-200 shrink-0">
                  <AlertIcon className="w-4.5 h-4.5 text-rose-700" />
                </div>
                <div>
                  <strong className="block text-rose-950 text-xs mb-0.5 font-extrabold uppercase tracking-wide">
                    Pemberitahuan Berkas Batch
                  </strong>
                  <p className="text-xs font-semibold leading-relaxed">
                    {excelError}
                  </p>
                </div>
              </div>
            )}

            {/* TWO COLUMN WORKSPACE WORK BENCH */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* COLUMN KIRI: INPUT PARAMETER FORM (WIDTH: col-span-5) */}
              <div className="lg:col-span-5 space-y-6">
                {activeTab === "single" && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                      <div className="w-6 h-6 rounded bg-teal-50 text-teal-650 flex items-center justify-center">
                        <CogIcon className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Konfigurasi Nilai Tunggal
                      </h3>
                    </div>

                    <form onSubmit={calculateSingle} className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                          Persamaan Fungsi f(x)
                        </label>
                        <div className="relative">
                          <math-field
                            ref={(node) => {
                              singleInputRef.current = node;
                              if (node && !node.value && singleData.fungsi) {
                                try {
                                  node.value = singleData.fungsi;
                                } catch (err) {
                                  console.warn(err);
                                }
                              }
                            }}
                            onInput={(e) => {
                              const asciiMath = e.target.getValue("ascii-math");
                              setSingleData({
                                ...singleData,
                                fungsi: asciiMath,
                              });
                            }}
                            style={{ fontSize: "1.25rem", outline: "none" }}
                            className="w-full bg-slate-50 border border-slate-200/80 focus:border-teal-500 rounded-xl px-4 py-2.5 text-slate-800 font-bold focus:ring-1 focus:ring-teal-500/20 transition-all duration-300"
                          ></math-field>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                            Batas Bawah (a)
                          </label>
                          <input
                            type="text"
                            name="a"
                            value={singleData.a}
                            onChange={handleSingleChange}
                            className="w-full bg-slate-50 border border-slate-200/80 focus:border-teal-500 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:ring-1 focus:ring-teal-500/20 transition-all duration-300"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                            Batas Atas (b)
                          </label>
                          <input
                            type="text"
                            name="b"
                            value={singleData.b}
                            onChange={handleSingleChange}
                            className="w-full bg-slate-50 border border-slate-200/80 focus:border-teal-500 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:ring-1 focus:ring-teal-500/20 transition-all duration-300"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                          Epsilon (Toleransi Error)
                        </label>
                        <input
                          type="text"
                          name="epsilon"
                          value={singleData.epsilon}
                          onChange={handleSingleChange}
                          className="w-full bg-slate-50 border border-slate-200/80 focus:border-teal-500 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:ring-1 focus:ring-teal-500/20 transition-all duration-300"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-md shadow-teal-500/10 hover:shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition-all duration-300 flex items-center justify-center cursor-pointer mt-2"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <svg
                              className="animate-spin h-5 w-5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <span>Merumuskan Langkah AI...</span>
                          </div>
                        ) : (
                          <span>Hitung & Analisis AI</span>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === "multi" && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                      <div className="w-6 h-6 rounded bg-teal-50 text-teal-650 flex items-center justify-center">
                        <WaveIcon className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Konfigurasi Scan Multi Akar
                      </h3>
                    </div>

                    <form onSubmit={calculateMulti} className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                          Persamaan Fungsi f(x)
                        </label>
                        <div className="relative">
                          <math-field
                            ref={(node) => {
                              multiInputRef.current = node;
                              if (node && !node.value && multiData.fungsi) {
                                try {
                                  node.value = multiData.fungsi;
                                } catch (err) {
                                  console.warn(err);
                                }
                              }
                            }}
                            onInput={(e) => {
                              const asciiMath = e.target.getValue("ascii-math");
                              setMultiData({ ...multiData, fungsi: asciiMath });
                            }}
                            style={{ fontSize: "1.25rem", outline: "none" }}
                            className="w-full bg-slate-50 border border-slate-200/80 focus:border-teal-500 rounded-xl px-4 py-2.5 text-slate-800 font-bold focus:ring-1 focus:ring-teal-500/20 transition-all duration-300"
                          ></math-field>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                            Scan Rentang Min
                          </label>
                          <input
                            type="text"
                            name="range_min"
                            value={multiData.range_min}
                            onChange={handleMultiChange}
                            className="w-full bg-slate-50 border border-slate-200/80 focus:border-teal-500 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:ring-1 focus:ring-teal-500/20 transition-all duration-300"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                            Scan Rentang Max
                          </label>
                          <input
                            type="text"
                            name="range_max"
                            value={multiData.range_max}
                            onChange={handleMultiChange}
                            className="w-full bg-slate-50 border border-slate-200/80 focus:border-teal-500 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:ring-1 focus:ring-teal-500/20 transition-all duration-300"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                            Langkah Step Scan
                          </label>
                          <input
                            type="text"
                            name="step"
                            value={multiData.step}
                            onChange={handleMultiChange}
                            className="w-full bg-slate-50 border border-slate-200/80 focus:border-teal-500 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:ring-1 focus:ring-teal-500/20 transition-all duration-300"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                            Toleransi Epsilon
                          </label>
                          <input
                            type="text"
                            name="epsilon"
                            value={multiData.epsilon}
                            onChange={handleMultiChange}
                            className="w-full bg-slate-50 border border-slate-200/80 focus:border-teal-500 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:ring-1 focus:ring-teal-500/20 transition-all duration-300"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-md shadow-teal-500/10 hover:shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition-all duration-300 flex items-center justify-center cursor-pointer mt-2"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <svg
                              className="animate-spin h-5 w-5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <span>Memindai Domain...</span>
                          </div>
                        ) : (
                          <span>Mulai Pemindaian</span>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === "excel" && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <div className="w-6 h-6 rounded bg-teal-50 text-teal-650 flex items-center justify-center">
                        <SheetIcon className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Unggah Berkas Excel
                      </h3>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Gunakan template Excel standar untuk melakukan pemrosesan
                      akar persamaan linier/non-linier massal secara cepat dalam
                      satu kali unggah.
                    </p>

                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="w-full py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-100/80 text-teal-700 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm shadow-teal-100/20"
                    >
                      <span>Unduh Template Excel</span>
                    </button>

                    <form onSubmit={uploadExcelFile} className="space-y-4">
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() =>
                          document.getElementById("excelFileInput").click()
                        }
                        className={`w-full h-32.5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${dragActive ? "border-teal-500 bg-teal-50" : excelFile ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 hover:border-slate-350 bg-slate-50"}`}
                      >
                        <input
                          type="file"
                          id="excelFileInput"
                          className="hidden"
                          accept=".xlsx, .xls"
                          onChange={handleFileChange}
                        />
                        {excelFile ? (
                          <>
                            <SheetIcon className="w-8 h-8 text-emerald-600 animate-bounce" />
                            <strong className="block text-[11px] text-slate-800 mt-2 truncate max-w-50">
                              {excelFile.name}
                            </strong>
                            <span className="block text-[8px] text-slate-400 mt-0.5">
                              {(excelFile.size / 1024).toFixed(1)} KB — Ganti
                              berkas
                            </span>
                          </>
                        ) : (
                          <>
                            <FolderIcon className="w-8 h-8 text-slate-400 group-hover:scale-110 transition-transform duration-300" />
                            <span className="block text-[11px] text-slate-700 font-bold mt-2">
                              Tarik & Lepas File di Sini
                            </span>
                            <span className="block text-[8px] text-slate-400 mt-0.5">
                              Atau klik untuk browsing berkas (.xlsx)
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={excelLoading || !excelFile}
                          className="flex-1 h-11 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-md shadow-teal-500/10 hover:shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 transition-all duration-300 flex items-center justify-center cursor-pointer"
                        >
                          {excelLoading ? (
                            <div className="flex items-center gap-2">
                              <svg
                                className="animate-spin h-5 w-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              <span className="text-xs">
                                Memproses data paralel...
                              </span>
                            </div>
                          ) : (
                            <span>Kalkulasi Batch</span>
                          )}
                        </button>
                        {excelFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setExcelFile(null);
                              setExcelResult(null);
                              setExcelError("");
                            }}
                            className="px-3 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer animate-fade-in"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}

                {/* 3. ☁️ INTEGRATED BOTTOM CLOUD HISTORY */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center shadow-xs">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Riwayat Komputasi Cloud
                        </h3>
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
                          Hasil perhitungan sebelumnya yang tersimpan di cloud
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={fetchHistory}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 text-[10px] font-extrabold text-teal-700 hover:text-teal-850 transition-colors duration-250 cursor-pointer shadow-xs self-start sm:self-auto"
                      title="Segarkan Riwayat"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" />
                      <span>Segarkan Riwayat</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-120 overflow-y-auto custom-scrollbar pr-1">
                    {filteredHistory.length === 0 ? (
                      <div className="col-span-full py-10 text-center text-slate-400 text-xs font-semibold border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        Belum ada riwayat kalkulasi untuk workspace ini.
                      </div>
                    ) : (
                      filteredHistory.map((item) => {
                        const reportParts = item.report_url
                          ? item.report_url.split("|")
                          : [];
                        const pdfUrl = reportParts[0] || "#";
                        const excelUrl = reportParts[1] || null;

                        return (
                          <div
                            key={item.id}
                            className="bg-slate-50 hover:bg-teal-50/20 border border-slate-200/60 hover:border-teal-150 p-4 rounded-2xl transition-all duration-200 flex items-center justify-between gap-4 group hover:scale-[1.01]"
                          >
                            <div className="min-w-0 text-left flex-1">
                              <strong
                                className="block text-xs font-extrabold text-slate-800 truncate"
                                title={item.file_name}
                              >
                                {activeTab === "excel"
                                  ? item.file_name
                                  : item.file_name.replace(
                                      /^(single_root_|multi_root_)/,
                                      "f(x) = ",
                                    )}
                              </strong>
                              <span className="block text-[9px] font-bold text-slate-400 mt-1">
                                {new Date(item.created_at).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-teal-700 rounded-lg text-[9px] font-black transition-colors duration-200"
                                title="Download PDF"
                              >
                                PDF
                              </a>
                              {excelUrl && (
                                <a
                                  href={excelUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-emerald-650 rounded-lg text-[9px] font-black transition-colors duration-200"
                                  title="Download Excel"
                                >
                                  EXCEL
                                </a>
                              )}
                              <button
                                onClick={() => deleteHistoryItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors duration-200 cursor-pointer shrink-0"
                                title="Hapus Riwayat"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* COLUMN KANAN: ACTIVE COMPUTATION RESULTS VIEW (WIDTH: col-span-7) */}
              <div className="lg:col-span-7 h-full">
                {/* EMPTY STATE: WAITING FOR COMPUTATION */}
                {!result &&
                  !multiResult &&
                  !excelResult &&
                  !loading &&
                  !excelLoading && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm text-center animate-fade-in flex flex-col items-center justify-center min-h-100 gap-6">
                      {/* Animated icon */}
                      <div className="relative flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-teal-50 border border-teal-100/60 flex items-center justify-center shadow-sm">
                          <svg
                            className="w-9 h-9 text-teal-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                            />
                          </svg>
                        </div>
                        {/* Ping circles */}
                        <span className="absolute w-20 h-20 rounded-full border border-teal-200/60 animate-ping opacity-30"></span>
                        <span
                          className="absolute w-28 h-28 rounded-full border border-teal-100/40 animate-ping opacity-20"
                          style={{ animationDelay: "0.4s" }}
                        ></span>
                      </div>

                      {/* Text */}
                      <div className="space-y-2">
                        <h3 className="text-base font-black text-slate-800 tracking-tight">
                          {activeTab === "single" &&
                            "Siap Menghitung Akar Tunggal"}
                          {activeTab === "multi" && "Siap Memindai Banyak Akar"}
                          {activeTab === "excel" &&
                            "Siap Memproses Batch Excel"}
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto leading-relaxed">
                          {activeTab === "single" &&
                            "Isi f(x), batas a & b, lalu tekan tombol hitung. Hasil iterasi, grafik, dan analisis AI akan muncul di sini."}
                          {activeTab === "multi" &&
                            "Isi f(x), rentang sapuan, dan step, lalu tekan tombol scan. Semua akar dalam rentang tersebut akan ditampilkan di sini."}
                          {activeTab === "excel" &&
                            "Unduh template, isi data persamaan di spreadsheet, unggah kembali, dan hasil batch komputasi akan tampil di sini."}
                        </p>
                      </div>

                      {/* Quick hint chips */}
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        <span className="px-3 py-1.5 bg-teal-50 border border-teal-100 text-teal-700 rounded-full text-[10px] font-bold">
                          ⌨️ Ketik rumus matematika secara langsung
                        </span>
                        <span className="px-3 py-1.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                          ⚠️ f(a) × f(b) &lt; 0
                        </span>
                        <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-full text-[10px] font-bold">
                          📄 Hasil tersimpan di cloud
                        </span>
                      </div>
                    </div>
                  )}

                {/* LOADING STATE VIEW */}
                {(loading || excelLoading) && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm text-center flex flex-col items-center justify-center space-y-4 min-h-87.5">
                    <div className="w-12 h-12 rounded-full border-4 border-teal-100 border-t-teal-600 animate-spin"></div>
                    <strong className="text-sm text-slate-800">
                      Menyusun Laporan & Ulasan AI...
                    </strong>
                    <p className="text-xs text-slate-450 font-semibold max-w-xs leading-relaxed">
                      Kami sedang memproses iterasi komputasi numerik presisi
                      tinggi dan model Llama 3.1 AI sedang merumuskan langkah
                      penjelasan detail untuk Anda.
                    </p>
                  </div>
                )}

                {/* HASIL SINGLE ROOT CALCULATOR DENGAN SUB-TABS */}
                {activeTab === "single" &&
                  result &&
                  result.status === "success" &&
                  !loading && (
                    <div
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left flex flex-col transition-all duration-300 overflow-hidden"
                      style={{ height: "700px" }}
                    >
                      {/* Dashboard Header & Sub-tab navigation */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-5 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-teal-50 border border-teal-100/60 text-teal-700 flex items-center justify-center">
                            <TargetIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-xs text-slate-800">
                              f(x) = {singleData.fungsi}
                            </strong>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              Konvergensi Sukses
                            </span>
                          </div>
                        </div>

                        {/* Sub-Tab Navigation */}
                        <div className="bg-slate-100/80 border border-slate-200 p-0.5 rounded-lg flex gap-1 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setActiveResultTab("ai")}
                            className={`px-3 py-1 rounded transition-colors duration-200 cursor-pointer ${activeResultTab === "ai" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Ulasan AI
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveResultTab("table")}
                            className={`px-3 py-1 rounded transition-colors duration-200 cursor-pointer ${activeResultTab === "table" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Tabel Iterasi
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveResultTab("export")}
                            className={`px-3 py-1 rounded transition-colors duration-200 cursor-pointer ${activeResultTab === "export" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Ekspor & File
                          </button>
                        </div>
                      </div>

                      {/* SUB-TAB 1: AI REVIEW */}
                      {activeResultTab === "ai" && (
                        <div className="flex-1 flex flex-col space-y-4 animate-fade-in text-left min-h-0">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl text-center">
                              <span className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">
                                Akar Konvergen
                              </span>
                              <strong className="text-lg md:text-xl font-mono text-teal-650 font-black">
                                {result.root.toFixed(7)}
                              </strong>
                            </div>
                            <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl text-center">
                              <span className="block text-[8px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">
                                Jumlah Iterasi
                              </span>
                              <strong className="text-lg md:text-xl font-mono text-slate-800 font-black">
                                {result.iterations.length}
                              </strong>
                            </div>
                          </div>

                          <div className="bg-teal-50/40 border border-teal-100/60 rounded-2xl p-5 relative overflow-y-auto custom-scrollbar flex-1 text-left">
                            <div className="flex items-center gap-2 mb-3.5 border-b border-teal-100/50 pb-2">
                              <RobotIcon className="w-4 h-4 text-teal-700 animate-pulse" />
                              <strong className="text-[10px] text-teal-950 font-black uppercase tracking-wider">
                                Langkah Analitis AI
                              </strong>
                            </div>
                            <AIMarkdownRenderer
                              content={result.ai_explanation}
                            />
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 2: COMPUTATION TABLE */}
                      {activeResultTab === "table" && (
                        <div className="flex-1 flex flex-col animate-fade-in">
                          <div className="overflow-x-auto border border-slate-150 rounded-2xl shadow-inner flex-1 max-h-95 overflow-y-auto custom-scrollbar bg-slate-50/20">
                            <table className="w-full font-mono text-[10px] md:text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 text-left">
                                  <th className="py-2.5 px-3 text-center font-extrabold">
                                    Iter
                                  </th>
                                  <th className="py-2.5 px-2 font-extrabold">
                                    a
                                  </th>
                                  <th className="py-2.5 px-2 font-extrabold">
                                    b
                                  </th>
                                  <th className="py-2.5 px-2 font-extrabold text-teal-650">
                                    xr
                                  </th>
                                  <th className="py-2.5 px-2 font-semibold">
                                    f(xr)
                                  </th>
                                  <th className="py-2.5 px-3 text-right font-extrabold">
                                    Error
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-left text-slate-600">
                                {result.iterations.map((row) => (
                                  <tr
                                    key={row.iterasi}
                                    className="hover:bg-slate-50/50 odd:bg-slate-50/20 transition-colors duration-150"
                                  >
                                    <td className="py-2.5 px-3 text-center text-slate-400 font-extrabold">
                                      {row.iterasi}
                                    </td>
                                    <td className="py-2.5 px-2">
                                      {row.a.toFixed(5)}
                                    </td>
                                    <td className="py-2.5 px-2">
                                      {row.b.toFixed(5)}
                                    </td>
                                    <td className="py-2.5 px-2 font-extrabold text-teal-650">
                                      {row.xr.toFixed(5)}
                                    </td>
                                    <td className="py-2.5 px-2 font-semibold">
                                      {row.fxr.toFixed(5)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-semibold text-slate-400">
                                      {row.error.toFixed(5)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 3: EXPORT & DOWNLOAD */}
                      {activeResultTab === "export" && (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center animate-fade-in p-2 text-left">
                          <div className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-5 text-center transition-all duration-300 flex flex-col justify-between h-45">
                            <div className="space-y-1.5">
                              <div className="w-10 h-10 bg-rose-50 border border-rose-100 text-rose-650 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                                <PdfIcon className="w-5 h-5" />
                              </div>
                              <h4 className="text-xs font-black text-slate-800">
                                Laporan Akademis PDF
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                Ekspor hasil komputasi dan analisis virtual
                                asisten AI lengkap dalam dokumen PDF resmi.
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                exportPDF(
                                  singleData.fungsi,
                                  singleData.a,
                                  singleData.b,
                                  singleData.epsilon,
                                  result.root,
                                  result.iterations,
                                  result.ai_explanation,
                                )
                              }
                              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] uppercase tracking-wide font-black transition-all duration-200 cursor-pointer shadow-sm shadow-rose-500/10"
                            >
                              Unduh PDF
                            </button>
                          </div>

                          <div className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-5 text-center transition-all duration-300 flex flex-col justify-between h-45">
                            <div className="space-y-1.5">
                              <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-650 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                                <SheetIcon className="w-5 h-5" />
                              </div>
                              <h4 className="text-xs font-black text-slate-800">
                                Data Grid Excel
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                Simpan lembar konvergensi iterasi tabel numerik
                                di atas dalam berkas spreadsheet (.xlsx).
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                exportSingleExcel(
                                  singleData.fungsi,
                                  singleData.a,
                                  singleData.b,
                                  singleData.epsilon,
                                  result.root,
                                  result.iterations,
                                )
                              }
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] uppercase tracking-wide font-black transition-all duration-200 cursor-pointer shadow-sm shadow-emerald-500/10"
                            >
                              Unduh Excel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* HASIL MULTIPLE ROOT SCAN DENGAN SUB-TABS */}
                {activeTab === "multi" &&
                  multiResult &&
                  multiResult.status === "success" &&
                  !loading && (
                    <div
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left flex flex-col transition-all duration-300 overflow-hidden"
                      style={{ height: "700px" }}
                    >
                      {/* Tab Header & Navigation */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-5 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-teal-50 border border-teal-100/60 text-teal-700 flex items-center justify-center">
                            <WaveIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-xs text-slate-800">
                              Hasil Scan: {multiResult.roots.length} Akar
                            </strong>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              Rentang: [{multiData.range_min},{" "}
                              {multiData.range_max}]
                            </span>
                          </div>
                        </div>

                        {/* Sub-Tabs */}
                        <div className="bg-slate-100/80 border border-slate-200 p-0.5 rounded-lg flex gap-1 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setActiveResultTab("ai")}
                            className={`px-3 py-1 rounded transition-colors duration-200 cursor-pointer ${activeResultTab === "ai" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Ringkasan AI
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveResultTab("table")}
                            className={`px-3 py-1 rounded transition-colors duration-200 cursor-pointer ${activeResultTab === "table" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Daftar Akar Scan
                          </button>
                        </div>
                      </div>

                      {/* SCAN RESULT SUB-TAB 1: RINGKASAN ASISTEN AI */}
                      {activeResultTab === "ai" && (
                        <div className="flex-1 flex flex-col space-y-4 animate-fade-in text-left min-h-0">
                          <div className="p-4 bg-teal-50/40 border border-teal-100/60 rounded-2xl flex items-center gap-3">
                            <div className="w-9 h-9 bg-teal-100 border border-teal-200/60 text-teal-700 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                              <RobotIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <strong className="block text-slate-800 text-xs">
                                Asisten Virtual Laboratorium AI
                              </strong>
                              <p className="text-[10px] text-slate-450 leading-relaxed font-semibold mt-0.5">
                                Kami mendeteksi {multiResult.roots.length}{" "}
                                interval tanda berlawanan di dalam domain dan
                                berhasil melakukan pemetaan akar komplit.
                              </p>
                            </div>
                          </div>

                          {multiResult.roots.length > 0 ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                              {multiResult.roots.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-left space-y-2"
                                >
                                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                                    <strong className="text-slate-800 text-[11px]">
                                      Ulasan Akar #{idx + 1} —{" "}
                                      {item.root.toFixed(5)}
                                    </strong>
                                    <span className="text-[8px] bg-teal-50 border border-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-black font-mono">
                                      Selang: [{item.interval[0]},{" "}
                                      {item.interval[1]}]
                                    </span>
                                  </div>
                                  <div className="text-[11px] leading-relaxed">
                                    <AIMarkdownRenderer
                                      content={item.ai_explanation}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center text-slate-400 text-xs font-semibold">
                              Tidak ada akar nyata dalam interval scan.
                            </div>
                          )}
                        </div>
                      )}

                      {/* SCAN RESULT SUB-TAB 2: DAFTAR AKAR SCAN */}
                      {activeResultTab === "table" && (
                        <div className="flex-1 flex flex-col animate-fade-in text-left">
                          {multiResult.roots.length === 0 ? (
                            <div className="py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center text-slate-400 text-xs font-semibold">
                              Tidak ada akar terdeteksi.
                            </div>
                          ) : (
                            <div className="space-y-3.5 max-h-90 overflow-y-auto pr-1 custom-scrollbar">
                              {multiResult.roots.map((rootItem, idx) => (
                                <div
                                  key={idx}
                                  className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:scale-[1.005] transition-transform duration-200"
                                >
                                  <div className="text-left w-full sm:w-auto">
                                    <strong className="block text-slate-850 text-xs">
                                      Akar Terdeteksi #{idx + 1}
                                    </strong>
                                    <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
                                      Sub-Interval: [
                                      {rootItem.interval[0].toFixed(2)},{" "}
                                      {rootItem.interval[1].toFixed(2)}]
                                    </span>
                                    <strong className="block text-sm font-mono text-teal-650 font-black mt-1">
                                      {rootItem.root.toFixed(6)}
                                    </strong>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:w-auto sm:gap-2 shrink-0">
                                    <button
                                      onClick={() =>
                                        setSelectedRowDetails({
                                          fungsi: multiData.fungsi,
                                          a: rootItem.interval[0],
                                          b: rootItem.interval[1],
                                          root: rootItem.root,
                                          iterations_count:
                                            rootItem.data.iterations.length,
                                          iterations: rootItem.data.iterations,
                                        })
                                      }
                                      className="w-full sm:w-auto flex items-center justify-center px-2 py-1.5 bg-teal-50 hover:bg-teal-600 hover:text-white border border-teal-150 text-[9px] uppercase font-bold text-teal-700 rounded-lg transition-all duration-300 cursor-pointer shadow-sm animate-fade-in"
                                    >
                                      <span>Detail</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        exportPDF(
                                          multiData.fungsi,
                                          rootItem.interval[0],
                                          rootItem.interval[1],
                                          multiData.epsilon,
                                          rootItem.root,
                                          rootItem.data.iterations,
                                          rootItem.ai_explanation,
                                        )
                                      }
                                      className="w-full sm:w-auto flex items-center justify-center px-2 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-250/20 text-[9px] uppercase font-bold text-rose-600 rounded-lg transition-all duration-300 cursor-pointer shadow-sm animate-fade-in"
                                    >
                                      <span>PDF</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        exportSingleExcel(
                                          multiData.fungsi,
                                          rootItem.interval[0],
                                          rootItem.interval[1],
                                          multiData.epsilon,
                                          rootItem.root,
                                          rootItem.data.iterations,
                                        )
                                      }
                                      className="w-full sm:w-auto flex items-center justify-center px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250/20 text-[9px] uppercase font-bold text-emerald-600 rounded-lg transition-all duration-300 cursor-pointer shadow-sm animate-fade-in"
                                    >
                                      <span>Excel</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                {/* HASIL EXCEL BATCH SOLVER DENGAN SUB-TABS */}
                {activeTab === "excel" &&
                  excelResult &&
                  excelResult.status === "success" &&
                  !excelLoading && (
                    <div
                      className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-left flex flex-col transition-all duration-300 overflow-hidden"
                      style={{ height: "700px" }}
                    >
                      {/* Header & Sub-tabs */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-5 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-teal-50 border border-teal-100/60 text-teal-700 flex items-center justify-center">
                            <SheetIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-xs text-slate-800">
                              Batch Hasil: {excelResult.total_uploaded} Baris
                            </strong>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                              Konvergen: {excelResult.success_count} | Gagal:{" "}
                              {excelResult.fail_count}
                            </span>
                          </div>
                        </div>

                        {/* Sub-Tabs */}
                        <div className="bg-slate-100/80 border border-slate-200 p-0.5 rounded-lg flex gap-1 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setActiveResultTab("ai")}
                            className={`px-3 py-1 rounded transition-colors duration-200 cursor-pointer ${activeResultTab === "ai" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Ulasan AI
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveResultTab("table")}
                            className={`px-3 py-1 rounded transition-colors duration-200 cursor-pointer ${activeResultTab === "table" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Daftar Hasil Persamaan
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveResultTab("export")}
                            className={`px-3 py-1 rounded transition-colors duration-200 cursor-pointer ${activeResultTab === "export" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                          >
                            Ekspor Batch
                          </button>
                        </div>
                      </div>

                      {/* BATCH EXCEL SUB-TAB 1: AI BATCH SUMMARY */}
                      {activeResultTab === "ai" && (
                        <div className="flex-1 flex flex-col space-y-4 animate-fade-in text-left min-h-0">
                          <div className="bg-teal-50/40 border border-teal-100/60 rounded-2xl p-5 relative overflow-y-auto custom-scrollbar flex-1 text-left">
                            <div className="flex items-center gap-2 mb-3.5 border-b border-teal-100/50 pb-2">
                              <RobotIcon className="w-4 h-4 text-teal-700 animate-pulse" />
                              <strong className="text-[10px] text-teal-950 font-black uppercase tracking-wider">
                                Kesimpulan AI Analisis Batch
                              </strong>
                            </div>
                            <AIMarkdownRenderer
                              content={excelResult.ai_summary}
                            />
                          </div>
                        </div>
                      )}

                      {/* BATCH EXCEL SUB-TAB 2: DAFTAR PERSAMAAN TABLE */}
                      {activeResultTab === "table" && (
                        <div className="flex-1 flex flex-col animate-fade-in text-left">
                          <div className="overflow-x-auto border border-slate-150 rounded-2xl shadow-inner flex-1 max-h-90 overflow-y-auto custom-scrollbar bg-slate-50/20">
                            <table className="w-full text-xs text-slate-600 border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 text-[9px] uppercase tracking-wider text-left font-bold">
                                  <th className="py-2.5 px-3 text-center">
                                    No
                                  </th>
                                  <th className="py-2.5 px-2">Fungsi</th>
                                  <th className="py-2.5 px-2">Interval</th>
                                  <th className="py-2.5 px-2 text-center">
                                    Status
                                  </th>
                                  <th className="py-2.5 px-2">Akar</th>
                                  <th className="py-2.5 px-3 text-center">
                                    Aksi
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono text-left text-[11px]">
                                {excelResult.results.map((row) => (
                                  <tr
                                    key={row.no}
                                    className="hover:bg-slate-50/50 transition-colors duration-150 odd:bg-slate-50/20"
                                  >
                                    <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                                      {row.no}
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-900 font-bold">
                                      {row.fungsi}
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-500">
                                      [{row.a}, {row.b}]
                                    </td>
                                    <td className="py-2.5 px-2 text-center font-sans">
                                      {row.status === "success" ? (
                                        <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 text-[8px] font-bold">
                                          SUKSES
                                        </span>
                                      ) : (
                                        <span
                                          className="inline-flex px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[8px] font-bold"
                                          title={row.message}
                                        >
                                          GAGAL
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-900 font-extrabold">
                                      {row.status === "success"
                                        ? row.root.toFixed(6)
                                        : "-"}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-sans">
                                      {row.status === "success" ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedRowDetails(row)
                                          }
                                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-600 hover:text-white border border-teal-150 text-teal-700 rounded-lg text-[9px] font-extrabold transition-all duration-300 cursor-pointer shadow-sm"
                                        >
                                          Detail
                                        </button>
                                      ) : (
                                        <span
                                          className="text-[10px] text-rose-550 font-bold"
                                          title={row.message}
                                        >
                                          Info
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* BATCH EXCEL SUB-TAB 3: EXPORT & BATCH EXPORTS */}
                      {activeResultTab === "export" && (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center animate-fade-in p-2 text-left">
                          {excelResult.download_url && (
                            <div className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center transition-all duration-300 flex flex-col justify-between h-42.5">
                              <div className="space-y-1">
                                <div className="w-8 h-8 bg-teal-50 border border-teal-100/60 text-teal-700 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                                  <CloudIcon className="w-4 h-4" />
                                </div>
                                <h4 className="text-[11px] font-black text-slate-800">
                                  Laporan Cloud
                                </h4>
                                <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                                  Akses dokumen komputasi batch yang tersimpan
                                  otomatis di Supabase Storage.
                                </p>
                              </div>
                              <a
                                href={excelResult.download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[9px] font-black tracking-wide transition-all duration-200 shadow-sm no-underline inline-block"
                              >
                                Buka Laporan
                              </a>
                            </div>
                          )}

                          <div className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center transition-all duration-300 flex flex-col justify-between h-42.5">
                            <div className="space-y-1">
                              <div className="w-8 h-8 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                                <PdfIcon className="w-4 h-4" />
                              </div>
                              <h4 className="text-[11px] font-black text-slate-800">
                                Batch Laporan PDF
                              </h4>
                              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                                Ekspor seluruh hasil perhitungan persamaan Excel
                                ter-filter komplit dalam format PDF.
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                exportBatchPDF(
                                  excelResult.results,
                                  excelResult.ai_summary,
                                )
                              }
                              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-black tracking-wide transition-all duration-200 cursor-pointer shadow-sm"
                            >
                              Unduh PDF
                            </button>
                          </div>

                          <div className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center transition-all duration-300 flex flex-col justify-between h-42.5">
                            <div className="space-y-1">
                              <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                                <SheetIcon className="w-4 h-4" />
                              </div>
                              <h4 className="text-[11px] font-black text-slate-800">
                                Batch Hasil Excel
                              </h4>
                              <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                                Unduh file hasil spreadsheet (.xlsx) yang telah
                                dilengkapi nilai akar konvergen.
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                exportBatchExcel(excelResult.results)
                              }
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black tracking-wide transition-all duration-200 cursor-pointer shadow-sm"
                            >
                              Unduh Excel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Footnote Canvas */}
            <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 font-bold gap-3 text-left">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-500">Llama 3.1 AI Connected</span>
              </div>
              <div>Teknologi Informasi Global © 2026</div>
            </div>
          </div>
        )}
      </main>

      {/* DETAILS OVERLAY MODAL FOR BATCH ITEM ITERATIONS (LIGHT MODE) */}
      {selectedRowDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col p-6 shadow-2xl overflow-hidden relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 mb-4 gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <GraphIcon className="w-5 h-5 text-teal-650" />
                  <span>Detail Iterasi Konvergensi</span>
                </h3>
                <p className="text-[10px] text-teal-650 font-mono mt-0.5 font-bold">
                  Persamaan: {selectedRowDetails.fungsi} | Batas: [
                  {selectedRowDetails.a}, {selectedRowDetails.b}]
                </p>
              </div>
              <button
                onClick={() => setSelectedRowDetails(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-655 hover:text-slate-900 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 my-2 custom-scrollbar">
              <div className="overflow-x-auto border border-slate-150 rounded-2xl shadow-sm">
                <table className="w-full font-mono text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-500 bg-slate-50/50">
                      <th className="py-2.5 px-3 text-center font-extrabold">
                        Iter
                      </th>
                      <th className="py-2.5 px-2 font-extrabold">a</th>
                      <th className="py-2.5 px-2 font-extrabold">b</th>
                      <th className="py-2.5 px-2 font-extrabold text-teal-650">
                        xr
                      </th>
                      <th className="py-2.5 px-2 font-extrabold">f(a)</th>
                      <th className="py-2.5 px-2 font-extrabold">f(b)</th>
                      <th className="py-2.5 px-2 font-extrabold">f(xr)</th>
                      <th className="py-2.5 px-3 text-right font-extrabold">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-655">
                    {selectedRowDetails.iterations.map((row) => (
                      <tr
                        key={row.iterasi}
                        className="hover:bg-slate-50/50 odd:bg-slate-50/20 transition-colors duration-150"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-extrabold">
                          {row.iterasi}
                        </td>
                        <td className="py-2.5 px-2">{row.a.toFixed(5)}</td>
                        <td className="py-2.5 px-2">{row.b.toFixed(5)}</td>
                        <td className="py-2.5 px-2 font-extrabold text-teal-650">
                          {row.xr.toFixed(5)}
                        </td>
                        <td className="py-2.5 px-2">{row.fa.toFixed(5)}</td>
                        <td className="py-2.5 px-2">{row.fb.toFixed(5)}</td>
                        <td className="py-2.5 px-2">{row.fxr.toFixed(5)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-400">
                          {row.error.toFixed(5)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-semibold gap-3.5">
              <div className="text-slate-500">
                Total iterasi:{" "}
                <strong className="text-slate-800 font-bold">
                  {selectedRowDetails.iterations_count}
                </strong>
              </div>
              <div className="text-slate-500">
                Nilai akar konvergen:{" "}
                <strong className="text-emerald-600 font-mono font-bold text-sm bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                  {selectedRowDetails.root.toFixed(7)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calculator;
