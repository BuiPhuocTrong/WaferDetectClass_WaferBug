import React, { useState, useMemo } from "react";
import { BatchReport, WaferMap, DefectType } from "../types";
import { Search, Filter, BarChart3, AlertTriangle, ShieldCheck, Layers, FileImage, LayoutGrid, List } from "lucide-react";

interface BatchDashboardProps {
  report: BatchReport;
  onSelectWafer: (wafer: WaferMap) => void;
  selectedWaferId?: string;
}

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

const COLOR_MAP: Record<DefectType, string> = {
  Normal: "bg-emerald-500",
  Center: "bg-blue-500",
  Donut: "bg-purple-500",
  "Edge-Loc": "bg-amber-500",
  "Edge-Ring": "bg-cyan-500",
  Loc: "bg-indigo-500",
  Random: "bg-slate-400",
  Scratch: "bg-red-400",
  "Near-full": "bg-red-600"
};

export default function BatchDashboard({ report, onSelectWafer, selectedWaferId }: BatchDashboardProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Calculate yield (good wafers / total wafers)
  const yieldRate = useMemo(() => {
    if (report.totalWafers === 0) return 0;
    return (report.normalWafers / report.totalWafers) * 100;
  }, [report]);

  // Find the top defect in the batch
  const topDefect = useMemo(() => {
    let maxCount = 0;
    let top: DefectType | null = null;
    const entries = Object.entries(report.defectDistribution) as [DefectType, number][];
    for (const [defect, count] of entries) {
      if (defect !== "Normal" && count > maxCount) {
        maxCount = count;
        top = defect;
      }
    }
    return { defect: top, count: maxCount };
  }, [report]);

  // Filter and search lists
  const filteredWafers = useMemo(() => {
    return report.byFile.filter((w) => {
      const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterType === "all" || w.primaryDefect === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [report, search, filterType]);

  return (
    <div className="space-y-6">
      {/* 1. Aggregated Summary Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Processed */}
        <div className="bg-white border-2 border-black p-5 rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">Tổng số lượng quét</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold font-sans text-black">{report.totalWafers}</span>
            <span className="text-xs text-slate-600 ml-1.5 font-bold uppercase">wafers</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Xử lý tự động siêu tốc</span>
        </div>

        {/* Yield Rate (Độ sạch/Hiệu suất sản lượng) */}
        <div className="bg-white border-2 border-black p-5 rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">Tỷ lệ Yield (Đạt chuẩn)</span>
          <div className="my-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono ${yieldRate > 80 ? "text-emerald-600" : "text-amber-600"}`}>
              {yieldRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-[#F4F4F2] border border-black h-2 rounded-none overflow-hidden">
            <div
              className={`h-full ${yieldRate > 80 ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${yieldRate}%` }}
            />
          </div>
        </div>

        {/* Defective Count */}
        <div className="bg-white border-2 border-black p-5 rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">Số lượng khuyết tật</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-red-600 font-sans">{report.defectiveWafers}</span>
            <span className="text-xs text-slate-600 ml-2 font-bold uppercase">lỗi</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {report.normalWafers} wafers đạt chuẩn (Normal)
          </span>
        </div>

        {/* Average Defect Rate across dies */}
        <div className="bg-white border-2 border-black p-5 rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">Mật độ khuyết tật bình quân</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-black font-mono">
              {(report.averageDefectRate * 100).toFixed(2)}%
            </span>
            <span className="text-xs text-slate-600 ml-1.5 font-bold uppercase">dies / wafer</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Tính trên tổng diện tích</span>
        </div>
      </div>

      {/* 2. Process Hazard Advisory */}
      {report.defectiveWafers > 0 && topDefect.defect && (
        <div className="bg-white border-2 border-black p-4 rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-start gap-4">
          <div className="p-1.5 bg-red-100 border border-red-500 text-red-600">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide">Cảnh báo quy trình sản xuất (FAB Process Alert)</h4>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Mô hình lỗi chiếm ưu thế trong tệp dữ liệu này là <b className="text-black">{VIETNAMESE_LABELS[topDefect.defect]}</b> với{" "}
              <span className="text-red-600 font-bold underline">{topDefect.count}</span> mẫu. 
              {topDefect.defect === "Center" && " Đề nghị kiểm tra gấp vòi phun quang kháng và nhiệt độ bàn nướng quang kháng tại buồng Lithography."}
              {topDefect.defect === "Edge-Ring" && " Đề nghị kiểm tra độ mòn của vòng kẹp plasma (Focus Ring) và căn chỉnh vòi rửa rìa EBR."}
              {topDefect.defect === "Scratch" && " Phát hiện nguy cơ cọ xát cơ học cao. Đề nghị kiểm tra lực bám tay gắp chân không robot vận chuyển hoặc tấm chà CMP."}
              {topDefect.defect === "Donut" && " Cảnh báo phân bổ luồng khí cấp buồng CVD mất cân bằng hoặc lệch đèn nhiệt lò hấp hồng ngoại."}
              {topDefect.defect === "Edge-Loc" && " Kiểm tra định vị của mâm kẹp wafer robot hoặc ma sát nạp xả Load Lock."}
              {topDefect.defect === "Loc" && " Phát hiện tích tụ hạt bụi vật lý cao rơi tự do trong thiết bị xử lý chân không."}
            </p>
          </div>
        </div>
      )}

      {/* 3. Distribution Visualizer & Filter Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Defect Distribution List (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <div className="flex items-center gap-2 mb-2 border-b border-black pb-3">
            <BarChart3 className="w-4 h-4 text-black" />
            <h3 className="text-xs font-bold text-black uppercase tracking-wider">Phân bố phân loại khuyết tật (Defect Pattern Distribution)</h3>
          </div>

          <div className="space-y-3.5">
            {(Object.entries(report.defectDistribution) as [DefectType, number][]).map(([defect, count]) => {
              const percentage = report.totalWafers > 0 ? (count / report.totalWafers) * 100 : 0;
              return (
                <div key={defect} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-black font-bold uppercase text-[10px]">{VIETNAMESE_LABELS[defect]}</span>
                    <span className="text-slate-600">
                      <b className="text-black font-bold">{count}</b> wafers ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#F4F4F2] border border-black rounded-none h-3 overflow-hidden flex">
                    <div
                      className={`h-full border-r border-black ${COLOR_MAP[defect] || "bg-black"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Insights Card */}
        <div className="bg-white border-2 border-black p-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-black pb-3">
              <Layers className="w-4 h-4 text-black" />
              <h3 className="text-xs font-bold text-black uppercase tracking-wider">Chỉ số xưởng (FAB KPI)</h3>
            </div>

            <div className="space-y-3">
              <div className="bg-[#F4F4F2] p-3 rounded-none border border-black flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span className="text-[11px] font-bold text-slate-800 uppercase">Trạng thái Yield</span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border border-black ${yieldRate > 85 ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                  {yieldRate > 85 ? "TỐT (PASS)" : "CẦN LƯU Ý"}
                </span>
              </div>

              <div className="bg-[#F4F4F2] p-3 rounded-none border border-black flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-black" />
                  <span className="text-[11px] font-bold text-slate-800 uppercase">Khuyết tật chính</span>
                </div>
                <span className="text-[10px] font-mono text-red-600 border border-black bg-white px-2 py-0.5 font-bold max-w-[120px] truncate text-right">
                  {topDefect.defect ? topDefect.defect.toUpperCase() : "N/A"}
                </span>
              </div>

              <div className="bg-[#F4F4F2] p-3 rounded-none border border-black flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-black" />
                  <span className="text-[11px] font-bold text-slate-800 uppercase">Tổng số lượng</span>
                </div>
                <span className="text-[10px] font-mono text-black font-bold">
                  {report.totalWafers} TỆP
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-600 font-mono mt-4 leading-relaxed bg-[#F4F4F2] p-3 border border-black">
            * Hệ thống tự động phân loại dán nhãn thông qua phân tích mẫu toán học mô hình của dự án nghiên cứu <b>MixedWM38 / WaferMap</b>.
          </div>
        </div>
      </div>

      {/* 4. Filter Grid & Search of Wafers in the Batch */}
      <div className="border-t-2 border-black pt-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <h3 className="text-sm font-bold text-black uppercase tracking-tight">Danh sách wafers trong tệp ({filteredWafers.length})</h3>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-black" />
              <input
                type="text"
                placeholder="Tìm tên tệp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border-2 border-black text-xs pl-8 pr-3 py-1.5 text-black placeholder-slate-400 focus:outline-none focus:ring-0 rounded-none font-medium"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-black px-2.5 py-1.5 text-xs text-black rounded-none font-bold">
              <Filter className="w-3.5 h-3.5 text-black" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-black focus:outline-none cursor-pointer uppercase text-[10px] tracking-tight"
              >
                <option value="all">Tất cả mô hình lỗi</option>
                {Object.keys(VIETNAMESE_LABELS).map((k) => (
                  <option key={k} value={k}>
                    {VIETNAMESE_LABELS[k as DefectType]}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle View Mode */}
            <div className="flex bg-[#F4F4F2] border-2 border-black p-0.5 rounded-none">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-none transition ${viewMode === "grid" ? "bg-black text-white" : "text-black hover:bg-black/10"}`}
                title="Dạng lưới"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-none transition ${viewMode === "list" ? "bg-black text-white" : "text-black hover:bg-black/10"}`}
                title="Dạng danh sách"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredWafers.length === 0 && (
          <div className="bg-white border-2 border-black p-10 text-center rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-slate-500 text-xs font-mono font-bold block uppercase">Không tìm thấy tấm wafer nào khớp điều kiện lọc.</span>
          </div>
        )}

        {/* Grid View */}
        {viewMode === "grid" && filteredWafers.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {filteredWafers.map((w) => {
              const isSelected = selectedWaferId === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => onSelectWafer(w)}
                  className={`relative hover:bg-[#F4F4F2] border-2 p-3 rounded-none text-left transition duration-200 overflow-hidden group flex flex-col items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer ${
                    isSelected ? "border-black bg-black text-white" : "border-black bg-white text-black"
                  }`}
                >
                  {/* Micro Wafer Thumbnail representation */}
                  <div className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center relative overflow-hidden mb-2">
                    <div
                      className={`w-4 h-4 rounded-full ${COLOR_MAP[w.primaryDefect] || "bg-black"} opacity-80`}
                    />
                    <div className="absolute inset-0 border border-dashed border-black/20 rounded-full" />
                  </div>

                  <span className={`text-[10px] font-bold font-mono truncate w-full text-center mb-1 ${isSelected ? "text-white" : "text-black"}`}>
                    {w.name}
                  </span>

                  <span
                    className={`text-[8px] px-1.5 py-0.5 border-2 border-black font-bold text-center select-none uppercase tracking-wider ${
                      isSelected
                        ? "text-black bg-white"
                        : "text-white bg-black"
                    }`}
                  >
                    {w.primaryDefect}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && filteredWafers.length > 0 && (
          <div className="bg-white border-2 border-black rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden divide-y divide-black">
            {filteredWafers.map((w) => {
              const isSelected = selectedWaferId === w.id;
              return (
                <div
                  key={w.id}
                  className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 transition ${
                    isSelected ? "bg-[#F4F4F2]" : "hover:bg-[#F4F4F2]/50"
                  }`}
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className={`w-3.5 h-3.5 rounded-none border border-black ${COLOR_MAP[w.primaryDefect] || "bg-black"}`} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-black uppercase tracking-tight">{w.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-bold">ID: {w.id}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-2 sm:mt-0 text-[11px] font-mono font-medium">
                    <div className="text-slate-700">
                      Dies hỏng: <span className="text-red-600 font-bold">{w.defectsCount}</span> / {w.totalDies} ({(w.defectRate * 100).toFixed(1)}%)
                    </div>
                    <div className="text-slate-700">
                      Mô hình: <span className="text-black font-bold uppercase text-[10px]">{VIETNAMESE_LABELS[w.primaryDefect]}</span>
                    </div>
                    <button
                      onClick={() => onSelectWafer(w)}
                      className="bg-black hover:bg-slate-900 border-2 border-black text-white px-3 py-1 rounded-none font-bold text-[10px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition cursor-pointer"
                    >
                      Kiểm nghiệm kĩ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
