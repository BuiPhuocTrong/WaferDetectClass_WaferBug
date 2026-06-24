import React, { useState } from "react";
import JSZip from "jszip";
import { generateWafer } from "../utils";
import { DefectType } from "../types";
import { Download, Sliders, Layers, Sparkles, Check } from "lucide-react";

interface SampleGeneratorProps {
  onLoadSample: (grid: number[][], name: string) => void;
}

const PRESET_PATTERNS: { name: string; label: string; desc: string; isMixed?: boolean }[] = [
  { name: "Normal", label: "Bình thường (Normal)", desc: "Không có lỗi, chất lượng hoàn hảo (<1.5% nhiễu)" },
  { name: "Center", label: "Lỗi trung tâm (Center)", desc: "Cụm lỗi khuyết tật gom ở giữa tâm tấm wafer" },
  { name: "Donut", label: "Hình khuyên (Donut)", desc: "Lỗi dạng vòng tròn đồng tâm ở cự ly giữa" },
  { name: "Edge-Ring", label: "Lỗi vòng rìa (Edge-Ring)", desc: "Mép ngoài chu vi wafer bị lỗi toàn bộ" },
  { name: "Edge-Loc", label: "Rìa cục bộ (Edge-Loc)", desc: "Khuyết tật gom thành mảng lớn ở sát mép viền" },
  { name: "Loc", label: "Cụm cục bộ (Loc)", desc: "Cụm lỗi xuất hiện tập trung ở vị trí bất kỳ bên trong" },
  { name: "Random", label: "Lỗi ngẫu nhiên (Random)", desc: "Lỗi rải rác hỗn loạn, bao phủ toàn bộ diện tích" },
  { name: "Scratch", label: "Vết xước (Scratch)", desc: "Vết rách thẳng hoặc cong tuyến tính kéo dài" },
  { name: "Near-full", label: "Gần đầy lỗi (Near-full)", desc: "Lỗi thảm họa diện rộng (>80% die hỏng)" },
  // Mixed presets
  { name: "Center+Scratch", label: "Trung tâm + Vết xước", desc: "Lỗi hỗn hợp: cụm tâm kèm vệt xước xéo", isMixed: true },
  { name: "Donut+Edge-Ring", label: "Vòng khuyên + Vòng rìa", desc: "Lỗi hỗn hợp dạng hình tròn đồng tâm kép", isMixed: true },
  { name: "Edge-Loc+Loc", label: "Rìa cục bộ + Cụm trong", desc: "Khuyết tật đa cụm tách rời", isMixed: true }
];

export default function SampleGenerator({ onLoadSample }: SampleGeneratorProps) {
  const [selectedPresets, setSelectedPresets] = useState<string[]>(["Center", "Scratch", "Center+Scratch"]);
  const [zipCount, setZipCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleTogglePreset = (name: string) => {
    setSelectedPresets((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => {
    if (selectedPresets.length === PRESET_PATTERNS.length) {
      setSelectedPresets([]);
    } else {
      setSelectedPresets(PRESET_PATTERNS.map((p) => p.name));
    }
  };

  const handleLoadSingle = (pattern: string) => {
    const grid = generateWafer(pattern);
    onLoadSample(grid, `Simulated_Wafer_${pattern}.png`);
  };

  const handleDownloadZip = async () => {
    if (selectedPresets.length === 0) return;
    setIsGenerating(true);
    try {
      const zip = new JSZip();

      for (const pattern of selectedPresets) {
        for (let i = 0; i < zipCount; i++) {
          const grid = generateWafer(pattern);

          // Draw onto high-contrast 150x150 offscreen canvas
          const canvas = document.createElement("canvas");
          canvas.width = 150;
          canvas.height = 150;
          const ctx = canvas.getContext("2d");

          if (ctx) {
            const cellSize = 150 / 52;
            ctx.fillStyle = "#020617"; // Slate-950 background
            ctx.fillRect(0, 0, 150, 150);

            // Wafer border circle
            ctx.strokeStyle = "#1e293b";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(75, 75, 73, 0, 2 * Math.PI);
            ctx.stroke();

            // Draw dies
            for (let r = 0; r < 52; r++) {
              for (let c = 0; c < 52; c++) {
                const val = grid[r][c];
                if (val === 1) {
                  ctx.fillStyle = "#10b981"; // Emerald-500 for normal
                  ctx.fillRect(c * cellSize, r * cellSize, cellSize - 0.4, cellSize - 0.4);
                } else if (val === 2) {
                  ctx.fillStyle = "#ef4444"; // Red-500 for defects
                  ctx.fillRect(c * cellSize, r * cellSize, cellSize - 0.4, cellSize - 0.4);
                }
              }
            }
          }

          // Convert canvas to png blob
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/png")
          );

          if (blob) {
            const safeName = pattern.replace("+", "_").toLowerCase();
            zip.file(`${safeName}_wafer_${i + 1}.png`, blob);
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);

      const a = document.createElement("a");
      a.href = url;
      a.download = `mixedwm38_sample_dataset_${selectedPresets.length * zipCount}_wafers.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white border-2 border-black rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-3">
        <Sparkles className="w-5 h-5 text-black" />
        <h3 className="text-sm font-bold text-black uppercase tracking-tight">Bộ giả lập dữ liệu lỗi Wafer (MixedWM38 Generator)</h3>
      </div>
      <p className="text-xs text-slate-600 mb-6 leading-relaxed">
        Công cụ này cho phép giả lập chính xác các mô hình lỗi có trong tập dữ liệu <b>MixedWM38</b> để kiểm tra hệ thống. Bạn có thể nạp thử 1 tấm wafer hoặc kết xuất ra gói tệp <b>ZIP</b> chứa hàng loạt ảnh để thử nghiệm chức năng quét thư mục hàng loạt.
      </p>

      {/* Preset Single Loading */}
      <div className="mb-8">
        <span className="text-xs font-bold text-black block mb-3 uppercase tracking-wider">Thử nhanh từng mẫu lỗi:</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRESET_PATTERNS.filter((p) => !p.isMixed).map((p) => (
            <button
              key={p.name}
              onClick={() => handleLoadSingle(p.name)}
              className="bg-white hover:bg-black hover:text-white border-2 border-black text-left px-3 py-2.5 rounded-none transition text-[11px] text-black flex flex-col justify-between h-20 group shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              <span className="font-bold uppercase tracking-tight">{p.label}</span>
              <span className="text-[9px] text-slate-500 line-clamp-2 group-hover:text-slate-300 leading-tight">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Mixed Loading */}
      <div className="mb-8">
        <span className="text-xs font-bold text-black block mb-3 uppercase tracking-wider">Mẫu lỗi hỗn hợp (Mixed Defect Types):</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_PATTERNS.filter((p) => p.isMixed).map((p) => (
            <button
              key={p.name}
              onClick={() => handleLoadSingle(p.name)}
              className="bg-[#F4F4F2] hover:bg-black hover:text-white border-2 border-black text-left px-3.5 py-3 rounded-none transition text-[11px] text-black flex flex-col justify-between h-20 group shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-bold uppercase tracking-tight text-black group-hover:text-white">{p.label}</span>
                <span className="text-[8px] bg-black text-white px-1.5 py-0.5 rounded-none font-mono uppercase group-hover:bg-white group-hover:text-black border border-black font-bold">Mixed</span>
              </div>
              <span className="text-[9px] text-slate-500 line-clamp-1 group-hover:text-slate-300">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Batch Generator to ZIP */}
      <div className="border-t-2 border-black pt-6">
        <span className="text-xs font-bold text-black block mb-4 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-black" />
          Xuất gói tệp nén ZIP hàng loạt làm tập mẫu thử nghiệm
        </span>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleSelectAll}
            className="text-[11px] bg-white text-black border-2 border-black hover:bg-black hover:text-white px-3 py-1.5 rounded-none font-bold uppercase transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            {selectedPresets.length === PRESET_PATTERNS.length ? "Bỏ chọn tất cả" : "Chọn tất cả mẫu"}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 max-h-48 overflow-y-auto pr-1">
          {PRESET_PATTERNS.map((p) => {
            const isSelected = selectedPresets.includes(p.name);
            return (
              <button
                key={p.name}
                onClick={() => handleTogglePreset(p.name)}
                className={`flex items-center justify-between px-3 py-2 rounded-none border-2 text-[11px] text-left transition duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-black border-black text-white font-bold"
                    : "bg-white border-black text-black hover:bg-slate-100"
                }`}
              >
                <span className="line-clamp-1 uppercase font-bold text-[10px] tracking-tight">{p.label.split(" (")[0]}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#F4F4F2] border-2 border-black p-4 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Sliders className="w-4 h-4 text-black" />
            <div className="text-[11px] text-slate-800 flex items-center gap-2 font-bold">
              <span>MỖI DẠNG LỖI TẠO RA:</span>
              <input
                type="number"
                min="1"
                max="50"
                value={zipCount}
                onChange={(e) => setZipCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-12 bg-white border-2 border-black text-black rounded-none px-1.5 py-0.5 text-center font-mono font-bold focus:outline-none"
              />
              <span>ẢNH</span>
            </div>
          </div>

          <div className="text-right w-full md:w-auto text-[11px] text-black font-mono font-bold">
            TỔNG CỘNG: <span className="text-red-600 font-bold underline">{selectedPresets.length * zipCount}</span> ẢNH WAFER
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isGenerating || selectedPresets.length === 0}
            className={`w-full md:w-auto flex items-center justify-center gap-2 bg-black hover:bg-slate-900 disabled:bg-slate-300 text-white disabled:text-slate-500 border-2 border-black font-bold uppercase text-xs px-5 py-2.5 rounded-none transition duration-200 shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer`}
          >
            <Download className="w-4 h-4" />
            {isGenerating ? "ĐANG KẾT XUẤT..." : "TẢI TỆP ZIP MẪU"}
          </button>
        </div>
      </div>
    </div>
  );
}
