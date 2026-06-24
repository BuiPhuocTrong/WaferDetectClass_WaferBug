import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { WaferMap, BatchReport, GeminiAnalysis, DefectType } from "./types";
import {
  generateWafer,
  parseWaferImage,
  classifyWaferMap,
  calculateBatchReport
} from "./utils";
import WaferVisualizer from "./components/WaferVisualizer";
import BatchDashboard from "./components/BatchDashboard";
import SampleGenerator from "./components/SampleGenerator";
import {
  Upload,
  FileArchive,
  FileImage,
  Database,
  Github,
  Award,
  Sparkles,
  RefreshCw,
  Cpu,
  Binary,
  Microscope,
  TrendingUp,
  FileText,
  AlertCircle
} from "lucide-react";

const VIETNAMESE_LABELS: Record<DefectType, string> = {
  Normal: "Bình thường (Normal)",
  Center: "Lỗi trung tâm (Center)",
  Donut: "Hình khuyên (Donut)",
  "Edge-Loc": "Rìa cục bộ (Edge-Loc)",
  "Edge-Ring": "Lỗi vòng rìa (Edge-Ring)",
  Loc: "Cụm cục bộ (Loc)",
  Random: "Lỗi ngẫu nhiên (Random)",
  Scratch: "Vết xước (Scratch)",
  "Near-full": "Gần đầy lỗi (Near-full)"
};

const COLOR_BAR_MAP: Record<DefectType, string> = {
  Normal: "bg-emerald-500",
  Center: "bg-blue-500",
  Donut: "bg-purple-500",
  "Edge-Loc": "bg-amber-500",
  "Edge-Ring": "bg-cyan-500",
  Loc: "bg-indigo-500",
  Random: "bg-slate-500",
  Scratch: "bg-red-400",
  "Near-full": "bg-red-600"
};

export default function App() {
  const [activeWafer, setActiveWafer] = useState<WaferMap | null>(null);
  const [batchReport, setBatchReport] = useState<BatchReport | null>(null);
  const [activeTab, setActiveTab] = useState<"inspector" | "dashboard">("inspector");

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Gemini state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<GeminiAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Load a preset sample initially so the user has visual content on mount
  useEffect(() => {
    // Start with a cool visual "Center+Scratch" mixed defect
    const grid = generateWafer("Center+Scratch");
    const { predictions, primaryDefect } = classifyWaferMap(grid);
    let totalDies = 0;
    let defectsCount = 0;
    for (let r = 0; r < 52; r++) {
      for (let c = 0; c < 52; c++) {
        if (grid[r][c] > 0) {
          totalDies++;
          if (grid[r][c] === 2) defectsCount++;
        }
      }
    }
    setActiveWafer({
      id: "initial-sample",
      name: "mẫu_thử_mixed_center_scratch.png",
      grid,
      defectsCount,
      totalDies,
      defectRate: defectsCount / (totalDies || 1),
      predictions,
      primaryDefect
    });
  }, []);

  // Clear states when wafer changes
  useEffect(() => {
    setAiReport(null);
    setAiError(null);
  }, [activeWafer?.id]);

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = async (file: File) => {
    const isZip = file.name.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed";

    if (isZip) {
      await handleZipUpload(file);
    } else {
      await handleSingleImageUpload(file);
    }
  };

  const handleSingleImageUpload = async (file: File) => {
    setIsLoading(true);
    setLoadingMsg("Đang quét cấu trúc hình học của wafer...");
    try {
      const grid = await parseWaferImage(file);
      const { predictions, primaryDefect } = classifyWaferMap(grid);

      let totalDies = 0;
      let defectsCount = 0;
      for (let r = 0; r < 52; r++) {
        for (let c = 0; c < 52; c++) {
          if (grid[r][c] > 0) {
            totalDies++;
            if (grid[r][c] === 2) defectsCount++;
          }
        }
      }

      const wafer: WaferMap = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        grid,
        defectsCount,
        totalDies,
        defectRate: defectsCount / (totalDies || 1),
        predictions,
        primaryDefect
      };

      setActiveWafer(wafer);
      setBatchReport(null); // Clear batch report for single uploads
      setActiveTab("inspector");
    } catch (err) {
      console.error(err);
      alert("Không thể đọc được ảnh wafer. Vui lòng đảm bảo ảnh có hình tròn wafer rõ nét với màu xanh/đỏ phân biệt.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleZipUpload = async (file: File) => {
    setIsLoading(true);
    setLoadingMsg("Đang giải nén tệp lưu trữ ZIP...");
    try {
      const zip = await JSZip.loadAsync(file);
      const parsedWafers: WaferMap[] = [];

      // Filter for image files
      const imageFiles = Object.values(zip.files).filter(
        (f) => !f.dir && /\.(png|jpe?g)$/i.test(f.name)
      );

      if (imageFiles.length === 0) {
        alert("Không tìm thấy tệp ảnh phù hợp (.png, .jpg, .jpeg) trong thư mục ZIP nén.");
        setIsLoading(false);
        return;
      }

      const total = imageFiles.length;
      for (let i = 0; i < total; i++) {
        const zFile = imageFiles[i];
        setLoadingMsg(`Đang xử lý ảnh wafer (${i + 1}/${total}): ${zFile.name}`);

        const blob = await zFile.async("blob");
        const imgFile = new File([blob], zFile.name, { type: "image/png" });

        const grid = await parseWaferImage(imgFile);
        const { predictions, primaryDefect } = classifyWaferMap(grid);

        let totalDies = 0;
        let defectsCount = 0;
        for (let r = 0; r < 52; r++) {
          for (let c = 0; c < 52; c++) {
            if (grid[r][c] > 0) {
              totalDies++;
              if (grid[r][c] === 2) defectsCount++;
            }
          }
        }

        parsedWafers.push({
          id: Math.random().toString(36).substring(2, 9),
          name: zFile.name,
          grid,
          defectsCount,
          totalDies,
          defectRate: defectsCount / (totalDies || 1),
          predictions,
          primaryDefect
        });
      }

      const report = calculateBatchReport(parsedWafers);
      setBatchReport(report);

      if (parsedWafers.length > 0) {
        setActiveWafer(parsedWafers[0]);
      }
      setActiveTab("dashboard");
    } catch (err) {
      console.error(err);
      alert("Xảy ra lỗi trong quá trình xử lý tệp nén ZIP.");
    } finally {
      setIsLoading(false);
    }
  };

  // Run Gemini AI deep analysis
  const handleAiDeepAnalysis = async () => {
    if (!activeWafer) return;
    setIsAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/deep-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grid: activeWafer.grid,
          primaryDefect: activeWafer.primaryDefect
        })
      });

      if (!response.ok) {
        throw new Error("Mất kết nối tới máy chủ phân tích.");
      }

      const data = await response.json();
      setAiReport(data);
    } catch (err) {
      console.error(err);
      setAiError("Không thể hoàn tất kết nối phân tích AI. Vui lòng kiểm tra lại cấu hình API key.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLoadSampleFromGenerator = (grid: number[][], name: string) => {
    const { predictions, primaryDefect } = classifyWaferMap(grid);

    let totalDies = 0;
    let defectsCount = 0;
    for (let r = 0; r < 52; r++) {
      for (let c = 0; c < 52; c++) {
        if (grid[r][c] > 0) {
          totalDies++;
          if (grid[r][c] === 2) defectsCount++;
        }
      }
    }

    setActiveWafer({
      id: Math.random().toString(36).substring(2, 9),
      name,
      grid,
      defectsCount,
      totalDies,
      defectRate: defectsCount / (totalDies || 1),
      predictions,
      primaryDefect
    });
    setBatchReport(null); // Clear batch report
    setActiveTab("inspector");
  };

  // Edit individual die by clicking on the map (lets users design patterns)
  const handleDieClick = (r: number, c: number, currentVal: number) => {
    if (!activeWafer) return;
    const newGrid = activeWafer.grid.map((row, rIdx) =>
      row.map((val, cIdx) => {
        if (rIdx === r && cIdx === c) {
          return currentVal === 1 ? 2 : 1; // Toggle between normal and defect
        }
        return val;
      })
    );

    const { predictions, primaryDefect } = classifyWaferMap(newGrid);

    let totalDies = 0;
    let defectsCount = 0;
    for (let rowIdx = 0; rowIdx < 52; rowIdx++) {
      for (let colIdx = 0; colIdx < 52; colIdx++) {
        if (newGrid[rowIdx][colIdx] > 0) {
          totalDies++;
          if (newGrid[rowIdx][colIdx] === 2) defectsCount++;
        }
      }
    }

    setActiveWafer({
      ...activeWafer,
      grid: newGrid,
      defectsCount,
      totalDies,
      defectRate: defectsCount / (totalDies || 1),
      predictions,
      primaryDefect
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F4F2] text-[#1A1A1A] font-sans selection:bg-black/10 selection:text-black">
      {/* Header Banner */}
      <header className="border-b-2 border-black bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black border border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-black uppercase flex items-center gap-2">
                Wafer Map Defect Intelligent Analyzer
                <span className="text-[9px] bg-black text-white font-bold px-2 py-0.5 rounded-none uppercase border border-black">
                  MixedWM38 v1.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-600 font-bold">
                Hệ thống nhận diện khuyết tật tấm bán dẫn sử dụng thuật toán không gian và phân tích AI chuyên sâu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Junliangwangdhu/WaferMap"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-white hover:bg-black hover:text-white border-2 border-black text-black px-3 py-1.5 rounded-none text-[11px] font-mono font-bold uppercase transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              <Github className="w-3.5 h-3.5" />
              <span>WaferMap Repo</span>
            </a>
            <div className="flex items-center gap-1.5 bg-white border-2 border-black text-black px-3 py-1.5 rounded-none text-[11px] font-mono font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Award className="w-3.5 h-3.5 text-red-600" />
              <span>MixedType Dataset</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Loading overlay for file processing */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white border-4 border-black p-8 rounded-none max-w-md w-full text-center space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <RefreshCw className="w-10 h-10 text-black animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">Đang xử lý dữ liệu...</h3>
              <p className="text-xs text-black leading-relaxed font-mono bg-[#F4F4F2] p-3 border-2 border-black">
                {loadingMsg}
              </p>
            </div>
          </div>
        )}

        {/* Upload Box Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-none p-6 text-center transition duration-200 overflow-hidden group ${
            dragActive
              ? "border-black bg-white"
              : "border-black bg-white hover:bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          }`}
        >
          <input
            id="file-upload-input"
            type="file"
            accept=".png,.jpg,.jpeg,.zip"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-3 relative z-10">
            <div className="w-12 h-12 rounded-none bg-[#F4F4F2] border-2 border-black flex items-center justify-center mx-auto text-black group-hover:bg-black group-hover:text-white transition duration-300">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <label htmlFor="file-upload-input" className="cursor-pointer text-xs font-bold text-black hover:underline uppercase block mb-1">
                Kéo thả hoặc nhấp chọn để tải lên
              </label>
              <p className="text-[11px] text-slate-600 font-bold leading-normal">
                HỖ TRỢ TẢI FILE ẢNH ĐƠN LẺ (.PNG, .JPG) HOẶC FILE NÉN (.ZIP) CHỨA HÀNG LOẠT ẢNH
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-slate-800 font-bold border-t border-black/10 pt-3 uppercase">
              <div className="flex items-center gap-1">
                <FileImage className="w-3.5 h-3.5" />
                <span>Single: 52x52 matrix</span>
              </div>
              <div className="flex items-center gap-1">
                <FileArchive className="w-3.5 h-3.5" />
                <span>Batch: Zip of PNGs</span>
              </div>
            </div>
          </div>

          {/* Sparkle subtle decoration */}
          <div className="absolute right-3 bottom-3 opacity-5 select-none">
            <Database className="w-24 h-24 text-black" />
          </div>
        </div>

        {/* Tab Toggle (Aggregate Dashboard vs Specific Inspector) */}
        {batchReport && (
          <div className="flex gap-2 border-b-2 border-black pb-px">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`pb-3 text-xs uppercase tracking-wider font-bold border-b-4 transition duration-200 px-1 cursor-pointer ${
                activeTab === "dashboard"
                  ? "border-black text-black"
                  : "border-transparent text-slate-500 hover:text-black"
              }`}
            >
              📊 Báo cáo tổng hợp ({batchReport.totalWafers} wafers)
            </button>
            <button
              onClick={() => setActiveTab("inspector")}
              className={`pb-3 text-xs uppercase tracking-wider font-bold border-b-4 transition duration-200 px-1 cursor-pointer ${
                activeTab === "inspector"
                  ? "border-black text-black"
                  : "border-transparent text-slate-500 hover:text-black"
              }`}
            >
              🔍 Kiểm nghiệm chi tiết từng tấm wafer
            </button>
          </div>
        )}

        {/* Core Layout Panels */}
        {activeTab === "dashboard" && batchReport ? (
          /* Render Aggregate Dashboard */
          <BatchDashboard
            report={batchReport}
            selectedWaferId={activeWafer?.id}
            onSelectWafer={(w) => {
              setActiveWafer(w);
              setActiveTab("inspector");
            }}
          />
        ) : (
          /* Render Single Wafer Inspector */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left/Middle Column (Visualizer & Info) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border-2 border-black rounded-none p-4 flex justify-between items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="truncate max-w-[70%]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Active Target:</span>
                  <span className="text-xs font-bold text-black truncate block">
                    {activeWafer?.name}
                  </span>
                </div>
                {activeWafer && (
                  <span
                    className={`text-[9px] px-2.5 py-1 rounded-none font-bold uppercase tracking-wider border-2 ${
                      activeWafer.primaryDefect === "Normal"
                        ? "text-emerald-700 bg-emerald-50 border-emerald-700"
                        : "text-red-700 bg-red-50 border-red-700"
                    }`}
                  >
                    {activeWafer.primaryDefect === "Normal" ? "Sản phẩm tốt" : `Lỗi: ${activeWafer.primaryDefect}`}
                  </span>
                )}
              </div>

              {activeWafer && (
                <WaferVisualizer
                  grid={activeWafer.grid}
                  size={340}
                  onDieClick={handleDieClick}
                />
              )}

              {/* Informative Help note */}
              <div className="bg-white border-2 border-black p-3.5 rounded-none text-[10px] text-slate-800 leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-medium">
                💡 <b>Mẹo thiết kế:</b> Bạn có thể nhấp chuột trực tiếp lên các ô vuông của wafer map phía trên để tùy biến thêm/bớt các điểm lỗi nhằm mô phỏng thử nghiệm thuật toán phân loại trong thời gian thực!
              </div>
            </div>

            {/* Right Column (Predictions & Gemini Deep AI Analysis) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Statistical Predictions Panel */}
              <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <div className="flex items-center justify-between border-b border-black pb-3">
                  <div className="flex items-center gap-2">
                    <Binary className="w-4 h-4 text-black" />
                    <h3 className="text-xs font-bold text-black uppercase tracking-wider">Tỷ lệ dự đoán từng nhóm lỗi</h3>
                  </div>
                  {activeWafer && (
                    <span className="text-[10px] text-slate-700 font-mono font-bold uppercase">
                      Hỏng: <b className="text-red-600 underline">{activeWafer.defectsCount}</b> / {activeWafer.totalDies} dies ({(activeWafer.defectRate * 100).toFixed(2)}%)
                    </span>
                  )}
                </div>

                <div className="space-y-3.5">
                  {activeWafer &&
                    (Object.entries(activeWafer.predictions) as [DefectType, number][])
                      .sort((a, b) => b[1] - a[1]) // Sort highest prediction first
                      .map(([defect, percentage]) => (
                        <div key={defect} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono font-bold">
                            <span className="text-black uppercase text-[10px]">{VIETNAMESE_LABELS[defect]}</span>
                            <span className="text-slate-700">{percentage}%</span>
                          </div>
                          <div className="w-full bg-[#F4F4F2] border border-black rounded-none h-2.5 overflow-hidden">
                            <div
                              className={`h-full border-r border-black ${COLOR_BAR_MAP[defect] || "bg-black"} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                </div>
              </div>

              {/* Gemini AI Deep Semiconductor Engineering Report */}
              <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 relative overflow-hidden">
                {/* Header of AI Analysis */}
                <div className="flex items-center justify-between border-b border-black pb-3">
                  <div className="flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-black" />
                    <h3 className="text-xs font-bold text-black uppercase tracking-wider">Báo cáo kiểm nghiệm chuyên sâu AI (Gemini)</h3>
                  </div>
                  <span className="text-[9px] bg-black text-white px-2 py-0.5 rounded-none uppercase border border-black font-bold font-mono">
                    Gemini 3.5 AI Ready
                  </span>
                </div>

                {/* AI report content logic */}
                {!aiReport && !isAiLoading && (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium">
                      Kích hoạt trí tuệ nhân tạo Gemini để lý giải nguyên nhân vật lý, nhận diện thiết bị hỏng hóc và nhận khuyến nghị kỹ thuật sửa lỗi trong quy trình sản xuất wafer.
                    </p>
                    <button
                      onClick={handleAiDeepAnalysis}
                      className="bg-black hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-none transition duration-200 inline-flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      Yêu cầu AI phân tích sâu
                    </button>
                  </div>
                )}

                {/* AI Loading state */}
                {isAiLoading && (
                  <div className="py-10 text-center space-y-4">
                    <div className="relative w-10 h-10 mx-auto">
                      <div className="absolute inset-0 border-2 border-black/20 rounded-full" />
                      <div className="absolute inset-0 border-2 border-t-black rounded-full animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-black uppercase tracking-wide">Đang lập báo cáo quy trình...</p>
                      <p className="text-[10px] text-slate-600 font-mono font-bold">Dựa trên mô hình MixedWM38 và dữ liệu cảm biến xưởng</p>
                    </div>
                  </div>
                )}

                {/* AI Error message */}
                {aiError && (
                  <div className="bg-red-50 border-2 border-red-700 p-4 rounded-none flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 leading-relaxed font-mono font-bold">
                      {aiError}
                    </p>
                  </div>
                )}

                {/* AI Report display card (Stunning format) */}
                {aiReport && (
                  <div className="space-y-5">
                    {/* Defect Highlight Block */}
                    <div className="bg-[#F4F4F2] p-4 rounded-none border-2 border-black flex items-center justify-between text-black">
                      <div>
                        <span className="text-[10px] text-slate-600 font-mono font-bold block">MÔ HÌNH NHẬN DIỆN:</span>
                        <span className="text-xs font-extrabold">
                          {VIETNAMESE_LABELS[aiReport.defectType] || aiReport.defectType}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-600 font-mono font-bold block">MỨC ĐỘ TIN CẬY:</span>
                        <span className="text-xs font-extrabold text-red-600 font-mono">
                          {aiReport.confidence}%
                        </span>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-black uppercase tracking-wider block">
                        🔬 Lý giải biểu hiện lỗi (Visual Analysis):
                      </span>
                      <p className="text-xs text-black leading-relaxed bg-white p-3 rounded-none border border-black font-medium">
                        {aiReport.explanation}
                      </p>
                    </div>

                    {/* Root cause */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-black uppercase tracking-wider block">
                        ⚙️ Nguyên nhân gốc rễ (Root Cause Analysis):
                      </span>
                      <p className="text-xs text-black leading-relaxed bg-white p-3 rounded-none border border-black font-medium">
                        {aiReport.rootCause}
                      </p>
                    </div>

                    {/* Corrective Actions */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold text-black uppercase tracking-wider block">
                        🛠️ Hành động khắc phục đề xuất (Corrective Actions):
                      </span>
                      <ul className="space-y-1.5">
                        {aiReport.recommendations.map((rec, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-[#1A1A1A] bg-white p-2.5 rounded-none border-2 border-black flex gap-2.5 items-start shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-semibold"
                          >
                            <span className="w-5 h-5 rounded-none bg-black border border-black text-[10px] font-extrabold text-white shrink-0 flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recalibrate / Re-run */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleAiDeepAnalysis}
                        className="text-[10px] bg-white text-black hover:bg-[#F4F4F2] px-3 py-1.5 rounded-none border-2 border-black font-bold uppercase flex items-center gap-1 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Chạy lại phân tích AI
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Simulator Panel Section */}
        <SampleGenerator onLoadSample={handleLoadSampleFromGenerator} />
      </main>

      {/* Footer copyright */}
      <footer className="border-t-2 border-black bg-white py-8 text-center text-[11px] text-slate-800 font-mono space-y-1 font-bold uppercase">
        <p>© 2026 Wafer Map Defect Classification (MixedWM38 Reference App)</p>
        <p className="text-slate-500">Phát triển chuyên nghiệp cho kỹ sư tích hợp quy trình chế tạo tấm bán dẫn (PIE / MES).</p>
      </footer>
    </div>
  );
}
