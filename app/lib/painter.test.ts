import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPaintedEntries, formatDate, generateGridDays } from "./grid";
import { GITHUB_REPO_RE, parseRepo } from "./repo";
import { generateScript } from "./script-generator";
import { generateSpreadGrid } from "./spread";
import { drawTemplateToGrid, TEMPLATES } from "./templates";
import { drawTextToGrid, stampTextOnGrid } from "./text-to-grid";
import { decodeDesign, encodeDesign } from "./url-codec";
import { blankGrid, CELL_COUNT, COLS, COMMITS_BY_LEVEL, ROWS, usePainterStore } from "../store/painter-store";

afterEach(() => {
  vi.useRealTimers();
});

describe("grid dates and painted entries", () => {
  it("creates a complete GitHub-style year grid", () => {
    vi.setSystemTime(new Date("2026-06-29T12:00:00Z"));

    const days = generateGridDays(2026);

    expect(days).toHaveLength(CELL_COUNT);
    expect(formatDate(days[0].date)).toBe("2025-12-28");
    expect(days[0].disabled).toBe(true);
    expect(days.find((day) => formatDate(day.date) === "2026-01-01")?.disabled).toBe(false);
    expect(days.find((day) => formatDate(day.date) === "2026-12-31")?.disabled).toBe(true);
  });

  it("maps painted levels to commit counts and skips disabled cells", () => {
    const days = generateGridDays(2026);
    const levels = blankGrid();
    const janFirstIndex = days.findIndex((day) => formatDate(day.date) === "2026-01-01");
    levels[0] = 4;
    levels[janFirstIndex] = 3;

    expect(buildPaintedEntries(levels, days)).toEqual([
      { date: "2026-01-01", commits: COMMITS_BY_LEVEL[3] },
    ]);
  });
});

describe("repo helpers", () => {
  it("validates and parses GitHub repository URLs", () => {
    const repoUrl = "https://github.com/zayantech/gitgraph-painter";

    expect(GITHUB_REPO_RE.test(repoUrl)).toBe(true);
    expect(parseRepo(`${repoUrl}/`)).toEqual({ owner: "zayantech", repo: "gitgraph-painter" });
    expect(GITHUB_REPO_RE.test("https://gitlab.com/zayantech/gitgraph-painter")).toBe(false);
  });
});

describe("text and template engines", () => {
  it("draws normalized text into the contribution grid", () => {
    const grid = drawTextToGrid("A!", 4);
    const painted = grid.filter(Boolean);

    expect(grid).toHaveLength(CELL_COUNT);
    expect(new Set(painted)).toEqual(new Set([4]));
    expect(painted.length).toBeGreaterThan(0);
  });

  it("stamps text over an existing grid without clearing existing cells", () => {
    const base = blankGrid();
    base[0] = 2;

    const next = stampTextOnGrid(base, "Z", 3);

    expect(next[0]).toBe(2);
    expect(next.filter((level) => level === 3).length).toBeGreaterThan(0);
  });

  it("renders bundled templates inside grid bounds", () => {
    const grid = drawTemplateToGrid(TEMPLATES[0].name, 2);

    expect(grid).toHaveLength(CELL_COUNT);
    expect(grid.filter((level) => level === 2).length).toBe(TEMPLATES[0].cells.length);
  });
});

describe("spread mode", () => {
  it("generates deterministic spread grids and keeps disabled days empty", () => {
    vi.setSystemTime(new Date("2026-06-29T12:00:00Z"));
    const days = generateGridDays(2026);

    const first = generateSpreadGrid(days, "advanced", 42);
    const second = generateSpreadGrid(days, "advanced", 42);
    const third = generateSpreadGrid(days, "advanced", 43);

    expect(first).toEqual(second);
    expect(first).not.toEqual(third);
    expect(first[0]).toBe(0);
    expect(first.every((level, index) => !days[index].disabled || level === 0)).toBe(true);
  });
});

describe("share URL codec", () => {
  it("round-trips a full painter design", () => {
    const payload = {
      levels: blankGrid(),
      mode: "spread" as const,
      repoUrl: "https://github.com/zayantech/gitgraph-painter",
      spreadPreset: "expert" as const,
      spreadSeed: 77,
      text: "SHIP",
      year: 2026,
    };

    expect(decodeDesign(encodeDesign(payload))).toMatchObject(payload);
  });

  it("returns null for invalid encoded state", () => {
    expect(decodeDesign("not-valid")).toBeNull();
  });
});

describe("script generator", () => {
  const entries = [
    { date: "2026-01-02", commits: 3 },
    { date: "2026-01-03", commits: 1 },
  ];

  it("generates bash scripts with repo, dates, and totals", () => {
    const script = generateScript("sh", "https://github.com/zayantech/gitgraph-painter", entries, 1, null);

    expect(script).toContain('REPO_URL="https://github.com/zayantech/gitgraph-painter"');
    expect(script).toContain('WORK_DIR="gitgraph-painter-gitgraph-paint"');
    expect(script).toContain("2026-01-02");
    expect(script).toContain('echo "Painted 4 commits across 2 days."');
  });

  it("generates PowerShell scripts for spread mode with organic timing", () => {
    const script = generateScript("ps1", "https://github.com/zayantech/gitgraph-painter", entries, 9, "advanced");

    expect(script).toContain('$hour = 9 + ($hash % 9)');
    expect(script).toContain("Write-Host \"Painted 4 commits across 2 days.\"");
  });

  it("generates Windows batch scripts", () => {
    const script = generateScript("bat", "https://github.com/zayantech/gitgraph-painter", entries, 1, null);

    expect(script).toContain("@echo off");
    expect(script).toContain("call :commit 2026-01-02 3");
    expect(script).toContain("echo Painted 4 commits across 2 days.");
  });
});

describe("painter store", () => {
  it("paints, clears, and hydrates grid state", () => {
    const store = usePainterStore.getState();
    store.clearBoard();
    store.setActiveLevel(4);
    store.paintCell(ROWS + 1);

    expect(usePainterStore.getState().levels[ROWS + 1]).toBe(4);

    usePainterStore.getState().hydrateDesign({
      levels: Array.from({ length: CELL_COUNT }, (_, index) => (index === COLS ? 2 : 0)),
      mode: "spread",
      repoUrl: "https://github.com/zayantech/gitgraph-painter",
      spreadPreset: "beginner",
      spreadSeed: 12,
      text: "OK",
      year: 2026,
    });

    expect(usePainterStore.getState()).toMatchObject({
      mode: "spread",
      repoUrl: "https://github.com/zayantech/gitgraph-painter",
      spreadPreset: "beginner",
      spreadSeed: 12,
      text: "OK",
      year: 2026,
    });
    expect(usePainterStore.getState().levels[COLS]).toBe(2);
  });
});
