import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { PainterMode, SpreadPreset } from "../store/painter-store";
import type { EncodedDesign } from "./types";

export function encodeDesign(payload: {
  levels: number[];
  mode: PainterMode;
  repoUrl: string;
  spreadPreset: SpreadPreset | null;
  spreadSeed: number;
  text: string;
  year: number;
}) {
  return compressToEncodedURIComponent(JSON.stringify({ ...payload, v: 1 }));
}

export function decodeDesign(encoded: string): EncodedDesign | null {
  try {
    const raw = decompressFromEncodedURIComponent(encoded);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EncodedDesign;
    if (!Array.isArray(parsed.levels)) return null;
    return { ...parsed, levels: parsed.levels };
  } catch {
    return null;
  }
}
