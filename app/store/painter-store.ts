import { create } from "zustand";

export const ROWS = 7;
export const COLS = 53;
export const CELL_COUNT = ROWS * COLS;
export const PAINT_COLORS = ["#EBE6D6", "#CBD8C0", "#9DBB94", "#5F8A66", "#2D5A3D"] as const;
export const COMMITS_BY_LEVEL = [0, 1, 3, 6, 10] as const;

export type Tool = "brush" | "erase";
export type PainterMode = "paint" | "spread";
export type SpreadPreset = "novice" | "beginner" | "intermediate" | "advanced" | "expert";

export function blankGrid() {
  return Array<number>(CELL_COUNT).fill(0);
}

type PainterStore = {
  activeLevel: number;
  copied: boolean;
  focusedCell: number;
  helpOpen: boolean;
  levels: number[];
  mode: PainterMode;
  repoUrl: string;
  spreadPreset: SpreadPreset | null;
  spreadSeed: number;
  text: string;
  tool: Tool;
  year: number;
  clearBoard: () => void;
  hydrateDesign: (payload: {
    levels: number[];
    mode?: PainterMode;
    repoUrl?: string;
    spreadPreset?: SpreadPreset | null;
    spreadSeed?: number;
    text?: string;
    year?: number;
  }) => void;
  paintCell: (index: number, toolOverride?: Tool) => void;
  setActiveLevel: (level: number) => void;
  setCopied: (copied: boolean) => void;
  setFocusedCell: (index: number) => void;
  setHelpOpen: (open: boolean) => void;
  setLevels: (levels: number[]) => void;
  setMode: (mode: PainterMode) => void;
  setRepoUrl: (repoUrl: string) => void;
  setSpreadPreset: (preset: SpreadPreset | null) => void;
  setSpreadSeed: (seed: number) => void;
  setText: (text: string) => void;
  setTool: (tool: Tool) => void;
  setYear: (year: number) => void;
};

export const usePainterStore = create<PainterStore>((set, get) => ({
  activeLevel: 4,
  copied: false,
  focusedCell: 0,
  helpOpen: false,
  levels: blankGrid(),
  mode: "paint",
  repoUrl: "",
  spreadPreset: null,
  spreadSeed: 1,
  text: "",
  tool: "brush",
  year: new Date().getFullYear(),
  clearBoard: () => set({ levels: blankGrid(), spreadPreset: null, text: "" }),
  hydrateDesign: (payload) =>
    set({
      levels: payload.levels.length === CELL_COUNT ? payload.levels : blankGrid(),
      mode: payload.mode ?? "paint",
      repoUrl: payload.repoUrl ?? "",
      spreadPreset: payload.spreadPreset ?? null,
      spreadSeed: payload.spreadSeed ?? 1,
      text: payload.text ?? "",
      year: payload.year ?? new Date().getFullYear(),
    }),
  paintCell: (index, toolOverride) => {
    const { activeLevel, levels, tool } = get();
    const next = [...levels];
    next[index] = (toolOverride ?? tool) === "erase" ? 0 : activeLevel;
    set({ levels: next });
  },
  setActiveLevel: (activeLevel) => set({ activeLevel }),
  setCopied: (copied) => set({ copied }),
  setFocusedCell: (focusedCell) => set({ focusedCell }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setLevels: (levels) => set({ levels }),
  setMode: (mode) => set({ mode }),
  setRepoUrl: (repoUrl) => set({ repoUrl }),
  setSpreadPreset: (spreadPreset) => set({ spreadPreset }),
  setSpreadSeed: (spreadSeed) => set({ spreadSeed }),
  setText: (text) => set({ text }),
  setTool: (tool) => set({ tool }),
  setYear: (year) => set({ year }),
}));
