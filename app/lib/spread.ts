import { blankGrid, ROWS, type SpreadPreset } from "../store/painter-store";
import type { GridDay } from "./types";

type SpreadConfig = {
  density: number;
  label: string;
  weights: [number, number, number, number];
};

export const SPREAD_PRESETS: Record<SpreadPreset, SpreadConfig> = {
  novice: { density: 0.25, label: "Novice", weights: [0.8, 0.18, 0.02, 0] },
  beginner: { density: 0.4, label: "Beginner", weights: [0.55, 0.35, 0.1, 0] },
  intermediate: { density: 0.55, label: "Intermediate", weights: [0.35, 0.35, 0.25, 0.05] },
  advanced: { density: 0.72, label: "Advanced", weights: [0.1, 0.3, 0.4, 0.2] },
  expert: { density: 0.9, label: "Expert", weights: [0, 0.15, 0.45, 0.4] },
};

export function generateSpreadGrid(days: GridDay[], preset: SpreadPreset, seed: number) {
  const random = mulberry32(seed);
  const config = SPREAD_PRESETS[preset];
  const next = blankGrid();

  days.forEach((day, index) => {
    if (day.disabled) return;
    const dow = index % ROWS;
    const weekdayBias = dow >= 1 && dow <= 5 ? 1 : preset === "expert" ? 0.85 : 0.5;
    next[index] = random() < config.density * weekdayBias ? weightedPick(config.weights, random) : 0;
  });

  return next;
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(weights: [number, number, number, number], random: () => number) {
  const roll = random();
  let cursor = 0;
  for (let index = 0; index < weights.length; index += 1) {
    cursor += weights[index];
    if (roll <= cursor) return index + 1;
  }
  return 1;
}
