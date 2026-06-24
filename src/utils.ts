import { DefectType, WaferMap, BatchReport } from "./types";

// Generate a simulated wafer map of size 52x52
export function generateWafer(patternType: string): number[][] {
  const size = 52;
  const grid: number[][] = Array(size)
    .fill(0)
    .map(() => Array(size).fill(0));
  const center = 25.5;
  const maxRadius = 25.0;

  // 1. Mark circular wafer boundary
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const dx = c - center;
      const dy = r - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= maxRadius) {
        grid[r][c] = 1; // Normal die
      }
    }
  }

  // 2. Add defect noise (1.5% base noise)
  const baseNoise = 0.015;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 1 && Math.random() < baseNoise) {
        grid[r][c] = 2; // Defect
      }
    }
  }

  // Add specific defect patterns
  const addCenter = (intensity = 0.75) => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 1) {
          const dx = c - center;
          const dy = r - center;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 8) {
            const prob = intensity * Math.exp(-(dist * dist) / 18);
            if (Math.random() < prob) {
              grid[r][c] = 2;
            }
          }
        }
      }
    }
  };

  const addDonut = (intensity = 0.7) => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 1) {
          const dx = c - center;
          const dy = r - center;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= 10 && dist <= 16) {
            const mean = 13;
            const prob = intensity * Math.exp(-Math.pow(dist - mean, 2) / 6);
            if (Math.random() < prob) {
              grid[r][c] = 2;
            }
          }
        }
      }
    }
  };

  const addEdgeRing = (intensity = 0.85) => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 1) {
          const dx = c - center;
          const dy = r - center;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= 21) {
            const prob = intensity * ((dist - 20) / 5.0);
            if (Math.random() < prob) {
              grid[r][c] = 2;
            }
          }
        }
      }
    }
  };

  const addEdgeLoc = (intensity = 0.8) => {
    const angle = Math.random() * 2 * Math.PI;
    const clusterX = center + 22 * Math.cos(angle);
    const clusterY = center + 22 * Math.sin(angle);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 1) {
          const dx = c - clusterX;
          const dy = r - clusterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 8) {
            const prob = intensity * Math.exp(-(dist * dist) / 12);
            if (Math.random() < prob) {
              grid[r][c] = 2;
            }
          }
        }
      }
    }
  };

  const addLoc = (intensity = 0.75) => {
    const angle = Math.random() * 2 * Math.PI;
    const rDist = Math.random() * 12 + 4; // between 4 and 16
    const clusterX = center + rDist * Math.cos(angle);
    const clusterY = center + rDist * Math.sin(angle);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 1) {
          const dx = c - clusterX;
          const dy = r - clusterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 6) {
            const prob = intensity * Math.exp(-(dist * dist) / 8);
            if (Math.random() < prob) {
              grid[r][c] = 2;
            }
          }
        }
      }
    }
  };

  const addScratch = () => {
    const x1 = Math.random() * 20 + 16;
    const y1 = Math.random() * 20 + 16;
    const angle = Math.random() * 2 * Math.PI;
    const len = Math.random() * 16 + 10;
    const x2 = x1 + len * Math.cos(angle);
    const y2 = y1 + len * Math.sin(angle);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 1) {
          const A = c - x1;
          const B = r - y1;
          const C = x2 - x1;
          const D = y2 - y1;
          const dot = A * C + B * D;
          const lenSq = C * C + D * D;
          let param = -1;
          if (lenSq !== 0) param = dot / lenSq;

          let xx, yy;
          if (param < 0) {
            xx = x1;
            yy = y1;
          } else if (param > 1) {
            xx = x2;
            yy = y2;
          } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
          }

          const dx = c - xx;
          const dy = r - yy;
          const distToLine = Math.sqrt(dx * dx + dy * dy);

          if (distToLine < 1.5) {
            if (Math.random() < 0.8) grid[r][c] = 2;
          } else if (distToLine < 3.0) {
            if (Math.random() < 0.2) grid[r][c] = 2;
          }
        }
      }
    }
  };

  const addRandom = (intensity = 0.18) => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 1) {
          if (Math.random() < intensity) {
            grid[r][c] = 2;
          }
        }
      }
    }
  };

  const addNearFull = () => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 1) {
          if (Math.random() < 0.85) {
            grid[r][c] = 2;
          }
        }
      }
    }
  };

  // Support mixed patterns e.g. "Center+Scratch"
  const patterns = patternType.split("+");
  for (const p of patterns) {
    const trimmed = p.trim().toLowerCase();
    if (trimmed === "center") addCenter();
    else if (trimmed === "donut") addDonut();
    else if (trimmed === "edge-ring") addEdgeRing();
    else if (trimmed === "edge-loc") addEdgeLoc();
    else if (trimmed === "loc") addLoc();
    else if (trimmed === "scratch") addScratch();
    else if (trimmed === "random") addRandom();
    else if (trimmed === "near-full") addNearFull();
  }

  return grid;
}

// Convert a visual wafer map image into a 52x52 grid
export async function parseWaferImage(file: File): Promise<number[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 52;
        canvas.height = 52;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Cannot create 2D canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, 52, 52);
        const imgData = ctx.getImageData(0, 0, 52, 52);
        const grid: number[][] = Array(52)
          .fill(0)
          .map(() => Array(52).fill(0));

        for (let r = 0; r < 52; r++) {
          for (let c = 0; c < 52; c++) {
            const idx = (r * 52 + c) * 4;
            const rVal = imgData.data[idx];
            const gVal = imgData.data[idx + 1];
            const bVal = imgData.data[idx + 2];
            const aVal = imgData.data[idx + 3];

            if (aVal < 40) {
              grid[r][c] = 0; // Transparent background
              continue;
            }

            const maxVal = Math.max(rVal, gVal, bVal);
            const minVal = Math.min(rVal, gVal, bVal);

            // Check for black/dark gray backgrounds
            if (maxVal < 40) {
              grid[r][c] = 0;
              continue;
            }

            // High brightness and gray/white backgrounds (borders/outside)
            const isWhiteOrGray = Math.abs(rVal - gVal) < 20 && Math.abs(gVal - bVal) < 20 && maxVal > 150;

            const dx = c - 25.5;
            const dy = r - 25.5;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 25.2) {
              grid[r][c] = 0; // Outside circular boundary
              continue;
            }

            // Defective color detection: Red, Yellow, Orange, Pink shades
            const isRedish = rVal > 120 && gVal < 100 && bVal < 100;
            const isYellowish = rVal > 120 && gVal > 110 && bVal < 100;
            const isOrangey = rVal > 150 && gVal > 70 && gVal < 140 && bVal < 80;
            const isPinky = rVal > 150 && gVal < 100 && bVal > 100;

            if (isRedish || isYellowish || isOrangey || isPinky) {
              grid[r][c] = 2; // Defect die
            } else if (isWhiteOrGray) {
              grid[r][c] = 0; // Outside boundary is blank
            } else {
              grid[r][c] = 1; // Normal die (Green or Blue shades)
            }
          }
        }
        resolve(grid);
      };
      img.onerror = () => reject(new Error("Failed to load wafer image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

interface Point {
  r: number;
  c: number;
  dist: number;
  angle: number;
}

// High-performance Grid-indexed DBSCAN to isolate primary defect clusters from background noise
function runDBSCAN(points: Point[], eps: number, minPts: number): {
  clusters: Point[][];
  noise: Point[];
} {
  const size = 52;
  const gridIndex: number[][] = Array(size)
    .fill(0)
    .map(() => Array(size).fill(-1));

  for (let i = 0; i < points.length; i++) {
    gridIndex[points[i].r][points[i].c] = i;
  }

  const visited = new Set<number>();
  const clustered = new Set<number>();
  const clusters: Point[][] = [];
  const noise: Point[] = [];

  const getNeighbors = (index: number) => {
    const neighbors: number[] = [];
    const p = points[index];
    const rMin = Math.max(0, Math.floor(p.r - eps));
    const rMax = Math.min(size - 1, Math.floor(p.r + eps));
    const cMin = Math.max(0, Math.floor(p.c - eps));
    const cMax = Math.min(size - 1, Math.floor(p.c + eps));

    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const idx = gridIndex[r][c];
        if (idx !== -1 && idx !== index) {
          const dr = p.r - r;
          const dc = p.c - c;
          if (Math.sqrt(dr * dr + dc * dc) <= eps) {
            neighbors.push(idx);
          }
        }
      }
    }
    return neighbors;
  };

  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);

    const neighbors = getNeighbors(i);
    if (neighbors.length < minPts - 1) {
      noise.push(points[i]);
    } else {
      const cluster: Point[] = [points[i]];
      clustered.add(i);

      const queue = [...neighbors];
      for (let q = 0; q < queue.length; q++) {
        const nextIdx = queue[q];
        if (!visited.has(nextIdx)) {
          visited.add(nextIdx);
          const nextNeighbors = getNeighbors(nextIdx);
          if (nextNeighbors.length >= minPts - 1) {
            for (const n of nextNeighbors) {
              if (!visited.has(n)) {
                queue.push(n);
              }
            }
          }
        }
        if (!clustered.has(nextIdx)) {
          clustered.add(nextIdx);
          cluster.push(points[nextIdx]);
        }
      }
      clusters.push(cluster);
    }
  }

  return { clusters, noise };
}

// Calculate linearity of a cluster using PCA (principal component analysis)
function calculateClusterLinearity(cluster: Point[]): number {
  if (cluster.length < 5) return 0;
  const meanR = cluster.reduce((sum, p) => sum + p.r, 0) / cluster.length;
  const meanC = cluster.reduce((sum, p) => sum + p.c, 0) / cluster.length;

  let covRR = 0, covCC = 0, covRC = 0;
  for (const p of cluster) {
    covRR += (p.r - meanR) * (p.r - meanR);
    covCC += (p.c - meanC) * (p.c - meanC);
    covRC += (p.r - meanR) * (p.c - meanC);
  }
  covRR /= cluster.length;
  covCC /= cluster.length;
  covRC /= cluster.length;

  const trace = covRR + covCC;
  const det = covRR * covCC - covRC * covRC;
  const term = Math.sqrt(Math.max(0, trace * trace / 4 - det));
  const lambda1 = trace / 2 + term;
  const lambda2 = Math.max(0, trace / 2 - term);

  if (lambda1 > 0) {
    return (lambda1 - lambda2) / lambda1;
  }
  return 0;
}

// Calculate standard deviation of defects across 8 angular sectors
function calculateSectorStdDev(points: Point[]): number {
  if (points.length === 0) return 0;
  const sectors = Array(8).fill(0);
  for (const p of points) {
    let normAngle = p.angle;
    if (normAngle < 0) normAngle += 2 * Math.PI;
    const sIdx = Math.floor((normAngle / (2 * Math.PI)) * 8) % 8;
    sectors[sIdx]++;
  }
  const meanSec = points.length / 8;
  const variance = sectors.reduce((acc, val) => acc + Math.pow(val - meanSec, 2), 0) / 8;
  return Math.sqrt(variance) / (meanSec || 1);
}

// Math/Stat-based defect classifier mimicking MixedWM38 dataset
export function classifyWaferMap(grid: number[][]): {
  predictions: Record<DefectType, number>;
  primaryDefect: DefectType;
} {
  const size = 52;
  const center = 25.5;
  let totalDies = 0;
  let defectsCount = 0;

  // Track counts inside concentric radial zones dynamically to handle grid boundary effects
  let totalCenter = 0, defectCenter = 0;  // r < 8.0
  let totalDonut = 0, defectDonut = 0;    // 8.0 <= r < 17.5
  let totalOuter = 0, defectOuter = 0;    // 17.5 <= r < 21.5
  let totalRing = 0, defectRing = 0;      // r >= 21.5

  const points: Point[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] > 0) {
        totalDies++;
        const dx = c - center;
        const dy = r - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        if (dist < 8.0) totalCenter++;
        else if (dist >= 8.0 && dist < 17.5) totalDonut++;
        else if (dist >= 17.5 && dist < 21.5) totalOuter++;
        else if (dist >= 21.5) totalRing++;

        if (grid[r][c] === 2) {
          defectsCount++;
          const pt: Point = { r, c, dist, angle };
          points.push(pt);

          if (dist < 8.0) defectCenter++;
          else if (dist >= 8.0 && dist < 17.5) defectDonut++;
          else if (dist >= 17.5 && dist < 21.5) defectOuter++;
          else if (dist >= 21.5) defectRing++;
        }
      }
    }
  }

  const defectRate = defectsCount / (totalDies || 1);

  const scores: Record<DefectType, number> = {
    Normal: 0,
    Center: 0,
    Donut: 0,
    "Edge-Loc": 0,
    "Edge-Ring": 0,
    Loc: 0,
    Random: 0,
    Scratch: 0,
    "Near-full": 0,
  };

  // Case 1: Extremely clean wafer
  if (defectRate < 0.02) {
    scores.Normal = 96;
    scores.Random = 3;
    scores.Loc = 1;
    return finalizeScores(scores);
  }

  // Case 2: Catastrophic / Near-full defect
  if (defectRate > 0.65) {
    scores["Near-full"] = 95 + (defectRate - 0.65) * 10;
    scores.Random = 4;
    scores["Edge-Ring"] = 1;
    return finalizeScores(scores);
  }

  // Calculate zone densities
  const centerDensity = defectCenter / (totalCenter || 1);
  const donutDensity = defectDonut / (totalDonut || 1);
  const outerDensity = defectOuter / (totalOuter || 1);
  const ringDensity = defectRing / (totalRing || 1);

  const outerRatio = (defectOuter + defectRing) / (defectsCount || 1);

  // Run DBSCAN to extract clusters (eps = 2.2, minPts = 4 is extremely robust for wafer defects)
  const { clusters, noise } = runDBSCAN(points, 2.2, 4);
  const noiseCount = noise.length;
  const noiseRatio = noiseCount / (defectsCount || 1);
  const sectorStdDev = calculateSectorStdDev(points);

  // Extract cluster taxonomy features
  let clusterCenterScore = 0;
  let clusterDonutScore = 0;
  let clusterEdgeRingScore = 0;
  let clusterScratchScore = 0;
  let clusterEdgeLocScore = 0;
  let clusterLocScore = 0;

  let maxLinearity = 0;
  let linearClusterSize = 0;

  for (const c of clusters) {
    if (c.length < 4) continue;

    const meanR = c.reduce((sum, p) => sum + p.r, 0) / c.length;
    const meanC = c.reduce((sum, p) => sum + p.c, 0) / c.length;
    const centroidDist = Math.sqrt(Math.pow(meanR - center, 2) + Math.pow(meanC - center, 2));
    const meanPointDist = c.reduce((sum, p) => sum + p.dist, 0) / c.length;
    const linearity = calculateClusterLinearity(c);

    if (linearity > maxLinearity && c.length >= 6) {
      maxLinearity = linearity;
      linearClusterSize = c.length;
    }

    const weight = c.length / defectsCount;

    if (linearity > 0.78 && c.length >= 6) {
      clusterScratchScore += weight * 250;
    } else if (centroidDist < 7.5) {
      // Centered clusters
      if (meanPointDist < 8.5) {
        clusterCenterScore += weight * 220;
      } else if (meanPointDist >= 8.5 && meanPointDist < 17.5) {
        clusterDonutScore += weight * 250;
      } else {
        clusterEdgeRingScore += weight * 250;
      }
    } else {
      // Off-center clusters
      if (meanPointDist >= 17.5) {
        clusterEdgeLocScore += weight * 180;
      } else {
        clusterLocScore += weight * 160;
      }
    }
  }

  // 1. Center Score
  if (centerDensity > 0.15) {
    scores.Center += centerDensity * 160;
  }
  scores.Center += (defectCenter / defectsCount) * 100;
  scores.Center += clusterCenterScore;
  // High clean outer and donut region suppresses Center score or shifts to Donut
  if (donutDensity > centerDensity * 1.3) {
    scores.Center = Math.max(0, scores.Center - 100);
  }

  // 2. Donut Score
  if (donutDensity > 0.12) {
    scores.Donut += donutDensity * 180;
  }
  scores.Donut += (defectDonut / defectsCount) * 120;
  scores.Donut += clusterDonutScore;

  if (donutDensity > centerDensity * 1.2) {
    scores.Donut += (donutDensity - centerDensity) * 120 + 50;
  }
  if (sectorStdDev < 0.75) {
    scores.Donut += (1 - sectorStdDev) * 120;
  }
  // If center is very clean, boost Donut even more
  if (centerDensity < 0.08 && donutDensity > 0.12) {
    scores.Donut += 80;
  }

  // 3. Edge-Ring Score
  if (ringDensity > 0.15) {
    scores["Edge-Ring"] += ringDensity * 180;
  }
  scores["Edge-Ring"] += (defectRing / defectsCount) * 120;
  scores["Edge-Ring"] += clusterEdgeRingScore;

  if (ringDensity > centerDensity * 1.2) {
    scores["Edge-Ring"] += (ringDensity - centerDensity) * 120 + 50;
  }
  if (sectorStdDev < 0.70) {
    scores["Edge-Ring"] += (1 - sectorStdDev) * 120;
  }

  // 4. Scratch Score
  scores.Scratch += clusterScratchScore;
  if (maxLinearity > 0.75) {
    scores.Scratch += (maxLinearity - 0.70) * 350 + (linearClusterSize / defectsCount) * 80;
  }

  // 5. Edge-Loc Score
  scores["Edge-Loc"] += clusterEdgeLocScore;
  if (sectorStdDev >= 0.55) {
    scores["Edge-Loc"] += outerRatio * 120 * sectorStdDev;
  }

  // 6. Loc Score
  scores.Loc += clusterLocScore;
  if (sectorStdDev >= 0.50) {
    scores.Loc += (defectDonut / defectsCount) * 100 * sectorStdDev;
  }

  // 7. Random Score
  if (noiseRatio > 0.40) {
    scores.Random += noiseRatio * 120;
  }
  const largestClusterSize = clusters.length > 0 ? Math.max(...clusters.map(c => c.length)) : 0;
  if (largestClusterSize < 6 && defectRate < 0.20) {
    scores.Random += 100;
  }
  scores.Random += defectRate * 40;

  // 8. Normal Score
  if (defectRate < 0.05) {
    scores.Normal = (0.05 - defectRate) * 500;
  }

  return finalizeScores(scores);
}

function finalizeScores(scores: Record<DefectType, number>): {
  predictions: Record<DefectType, number>;
  primaryDefect: DefectType;
} {
  const normalized: Record<DefectType, number> = {
    Normal: 0,
    Center: 0,
    Donut: 0,
    "Edge-Loc": 0,
    "Edge-Ring": 0,
    Loc: 0,
    Random: 0,
    Scratch: 0,
    "Near-full": 0,
  };

  let total = 0;
  const keys = Object.keys(scores) as DefectType[];

  for (const k of keys) {
    scores[k] = Math.max(0, scores[k]);
    total += scores[k];
  }

  if (total === 0) {
    normalized.Normal = 100;
  } else {
    for (const k of keys) {
      normalized[k] = Math.round((scores[k] / total) * 100);
    }
  }

  // Ensure total sum is exactly 100%
  const sum = (Object.values(normalized) as number[]).reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    const diff = 100 - sum;
    // Find the key with max score and add/subtract difference to maintain exactness
    let maxK = keys[0];
    let maxV = -1;
    for (const k of keys) {
      if (normalized[k] > maxV) {
        maxV = normalized[k];
        maxK = k;
      }
    }
    normalized[maxK] += diff;
  }

  let primaryDefect: DefectType = "Normal";
  let maxScore = -1;
  for (const k of keys) {
    if (normalized[k] > maxScore) {
      maxScore = normalized[k];
      primaryDefect = k;
    }
  }

  return { predictions: normalized, primaryDefect };
}

// Compile stats from multiple wafers to produce the Batch Report
export function calculateBatchReport(wafers: WaferMap[]): BatchReport {
  const totalWafers = wafers.length;
  const normalWafers = wafers.filter((w) => w.primaryDefect === "Normal").length;
  const defectiveWafers = totalWafers - normalWafers;

  const defectDistribution: Record<DefectType, number> = {
    Normal: 0,
    Center: 0,
    Donut: 0,
    "Edge-Loc": 0,
    "Edge-Ring": 0,
    Loc: 0,
    Random: 0,
    Scratch: 0,
    "Near-full": 0,
  };

  let sumDefectRate = 0;
  for (const w of wafers) {
    sumDefectRate += w.defectRate;
    defectDistribution[w.primaryDefect]++;
  }

  const averageDefectRate = sumDefectRate / (totalWafers || 1);

  return {
    totalWafers,
    defectiveWafers,
    normalWafers,
    defectDistribution,
    averageDefectRate,
    byFile: wafers,
  };
}
