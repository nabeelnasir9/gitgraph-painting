import type { PainterMode, SpreadPreset } from "../store/painter-store";

export type ScriptKind = "sh" | "ps1" | "bat";

export type GridDay = {
  date: Date;
  label: string;
  monthLabel: string;
  disabled: boolean;
};

export type PaintedEntry = {
  date: string;
  commits: number;
};

export type RepoVisibilityStatus = "idle" | "checking" | "public" | "private-or-missing" | "invalid" | "error";

export type ConfirmDialog = {
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  title: string;
};

export type RunCommandKey = "mac" | "windows" | "help";

export type EncodedDesign = {
  levels: number[];
  mode?: PainterMode;
  repoUrl?: string;
  spreadPreset?: SpreadPreset | null;
  spreadSeed?: number;
  text?: string;
  year?: number;
};
