export type DefectType =
  | "Normal"
  | "Center"
  | "Donut"
  | "Edge-Loc"
  | "Edge-Ring"
  | "Loc"
  | "Random"
  | "Scratch"
  | "Near-full";

export interface WaferMap {
  id: string;
  name: string;
  grid: number[][]; // 52x52, where 0 = blank, 1 = normal, 2 = defect
  defectsCount: number;
  totalDies: number;
  defectRate: number;
  predictions: Record<DefectType, number>;
  primaryDefect: DefectType;
  deepAnalysis?: GeminiAnalysis;
}

export interface GeminiAnalysis {
  defectType: DefectType;
  confidence: number;
  explanation: string;
  rootCause: string;
  recommendations: string[];
}

export interface BatchReport {
  totalWafers: number;
  defectiveWafers: number;
  normalWafers: number;
  defectDistribution: Record<DefectType, number>;
  averageDefectRate: number;
  byFile: WaferMap[];
}
