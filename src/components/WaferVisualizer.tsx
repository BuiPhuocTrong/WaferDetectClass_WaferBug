import React, { useRef, useEffect, useState } from "react";

interface WaferVisualizerProps {
  grid: number[][];
  size?: number; // Visual size in pixels
  interactive?: boolean;
  onDieHover?: (x: number | null, y: number | null, status: string | null) => void;
  onDieClick?: (r: number, c: number, currentVal: number) => void;
  id?: string;
}

export default function WaferVisualizer({
  grid,
  size = 320,
  interactive = true,
  onDieHover,
  onDieClick,
  id = "wafer-canvas"
}: WaferVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredDie, setHoveredDie] = useState<{ r: number; c: number; val: number } | null>(null);

  const gridSize = 52;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear previous drawing
    ctx.clearRect(0, 0, size, size);

    // Calculate dimensions
    const cellSize = size / gridSize;
    const center = size / 2;
    const radius = size / 2 - 2;

    // 1. Draw outer circular wafer boundary ring
    ctx.strokeStyle = "#1A1A1A"; // Geometric black
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Subtle radial grid background
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 0.5;
    for (let r = 5; r <= radius; r += radius / 5) {
      ctx.beginPath();
      ctx.arc(center, center, r, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // 2. Draw wafer notch at the bottom center (representing alignment notch of real silicon wafers!)
    ctx.fillStyle = "#1A1A1A"; // Geometric black
    ctx.beginPath();
    ctx.arc(center, size - 2, 6, 0, Math.PI, true);
    ctx.fill();

    // 3. Draw the 52x52 Dies
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const val = grid[r][c];
        if (val === 0) continue; // Skip blank spots

        const x = c * cellSize;
        const y = r * cellSize;

        // Choose color based on state
        // 1 = Normal (Green-blue/Teal), 2 = Defect (Vibrant Red)
        if (val === 1) {
          ctx.fillStyle = "#10b981"; // Emerald-500
          ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
        } else if (val === 2) {
          ctx.fillStyle = "#ef4444"; // Red-500
          ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
        }

        // Draw die square
        ctx.fillRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

        // Overlay a highlight if hovered
        if (hoveredDie && hoveredDie.r === r && hoveredDie.c === c) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
          ctx.fillRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        }
      }
    }
  }, [grid, size, hoveredDie]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellSize = size / gridSize;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);

    if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
      const val = grid[r][c];
      if (val > 0) {
        setHoveredDie({ r, c, val });
        if (onDieHover) {
          const statusStr = val === 1 ? "Bình thường" : "Lỗi khuyết tật";
          onDieHover(c, r, statusStr);
        }
      } else {
        setHoveredDie(null);
        if (onDieHover) onDieHover(null, null, null);
      }
    } else {
      setHoveredDie(null);
      if (onDieHover) onDieHover(null, null, null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredDie(null);
    if (onDieHover) onDieHover(null, null, null);
  };

  const handleClick = () => {
    if (!hoveredDie || !onDieClick) return;
    onDieClick(hoveredDie.r, hoveredDie.c, hoveredDie.val);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center bg-white p-6 rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden group"
    >
      <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        Wafer Map Grid: 52 x 52
      </div>

      <canvas
        ref={canvasRef}
        id={id}
        width={size}
        height={size}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="cursor-crosshair relative z-10 transition-transform duration-300 group-hover:scale-[1.01] my-2"
      />

      {interactive && hoveredDie && (
        <div className="absolute bottom-3 left-3 bg-black text-white border border-black rounded-none px-2.5 py-1 text-[10px] font-mono flex gap-4 z-20 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div>
            <span className="text-slate-400">Coord:</span> ({hoveredDie.c}, {hoveredDie.r})
          </div>
          <div>
            <span className="text-slate-400">Status:</span>{" "}
            <span className={hoveredDie.val === 2 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
              {hoveredDie.val === 1 ? "Normal" : "Defect"}
            </span>
          </div>
        </div>
      )}

      {/* Grid Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-[11px] font-mono text-slate-800 select-none z-10 border-t border-black/10 pt-3 w-full">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-none bg-emerald-500 border border-black block" />
          <span>Normal (Die tốt)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-none bg-red-500 border border-black block" />
          <span>Defect (Die lỗi)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-none border border-black bg-[#F4F4F2] block" />
          <span>Blank (Rỗng)</span>
        </div>
      </div>
    </div>
  );
}
