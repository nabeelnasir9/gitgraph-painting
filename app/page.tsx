"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import Image from "next/image";
import { cn } from "./lib/utils";
import {
  blankGrid,
  COLS,
  COMMITS_BY_LEVEL,
  PAINT_COLORS,
  ROWS,
  usePainterStore,
  type PainterMode,
  type SpreadPreset,
  type Tool,
} from "./store/painter-store";
import { buildPaintedEntries, generateGridDays } from "./lib/grid";
import { GITHUB_REPO_RE, parseRepo } from "./lib/repo";
import { HELP_RUN_COMMAND, MAC_RUN_COMMAND, WINDOWS_RUN_COMMAND } from "./lib/run-commands";
import { generateScript } from "./lib/script-generator";
import { generateSpreadGrid, SPREAD_PRESETS } from "./lib/spread";
import { drawTemplateToGrid, stampTemplateOnGrid, TEMPLATES } from "./lib/templates";
import { stampTextOnGrid } from "./lib/text-to-grid";
import type { ConfirmDialog, RepoVisibilityStatus, RunCommandKey, ScriptKind } from "./lib/types";
import { decodeDesign, encodeDesign } from "./lib/url-codec";

const buttonBase = "min-h-9 rounded-full border border-stone/50 px-3 py-2 text-[13px] font-semibold text-charcoal transition hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
const panelClass = "rounded-2xl border border-stone/50 bg-linen/85 shadow-[0_1px_2px_rgba(26,26,23,.04),0_8px_24px_rgba(26,26,23,.05)]";
const fieldInput = "min-h-11 rounded-[10px] border border-stone/55 bg-parchment px-3 text-charcoal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";

function downloadFile(filename: string, contents: string, type = "text/plain") {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const paintingRef = useRef(false);
  const currentYear = new Date().getFullYear();
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [copiedRunCommand, setCopiedRunCommand] = useState<RunCommandKey | null>(null);
  const [repoVisibility, setRepoVisibility] = useState<RepoVisibilityStatus>("idle");
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const {
    activeLevel,
    copied,
    focusedCell,
    helpOpen,
    levels,
    mode,
    repoUrl,
    spreadPreset,
    spreadSeed,
    text,
    tool,
    clearBoard: resetBoard,
    hydrateDesign,
    paintCell,
    setActiveLevel,
    setCopied,
    setFocusedCell,
    setHelpOpen,
    setLevels,
    setMode,
    setRepoUrl,
    setSpreadPreset,
    setSpreadSeed,
    setText,
    setTool,
    setYear,
    year,
  } = usePainterStore();

  const days = useMemo(() => generateGridDays(year), [year]);
  const entries = useMemo(() => buildPaintedEntries(levels, days), [levels, days]);
  const totalCommits = entries.reduce((sum, item) => sum + item.commits, 0);
  const repoIsValid = GITHUB_REPO_RE.test(repoUrl);
  const canExport = repoIsValid && entries.length > 0;
  const exportStatus = !repoIsValid
    ? "Add a valid GitHub repository URL to unlock downloads."
    : entries.length === 0
      ? "Paint at least one day to download a script."
      : `Script ready: ${totalCommits.toLocaleString()} commits across ${entries.length} days.`;
  const textTooLong = text.replace(/[^A-Za-z0-9]/g, "").length > 8;
  const futurePainted = levels.some((level, index) => level > 0 && days[index].disabled);
  const spreadLabel = spreadPreset ? SPREAD_PRESETS[spreadPreset].label : null;
  const yearOptions = Array.from({ length: currentYear - 2018 + 1 }, (_, index) => currentYear - index);

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get("d");
    if (!encoded) return;
    const decoded = decodeDesign(encoded);
    if (decoded) hydrateDesign(decoded);
  }, [hydrateDesign]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const encoded = encodeDesign({ levels, mode, repoUrl, spreadPreset, spreadSeed, text, year });
      const url = new URL(window.location.href);
      url.searchParams.set("d", encoded);
      window.history.replaceState(null, "", url);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [levels, mode, repoUrl, spreadPreset, spreadSeed, text, year]);

  useEffect(() => {
    if (mode === "spread" && spreadPreset) {
      setLevels(generateSpreadGrid(days, spreadPreset, spreadSeed));
    }
  }, [days, mode, setLevels, spreadPreset, spreadSeed]);

  function paintAvailableCell(index: number, selectedTool?: Tool) {
    if (!days[index].disabled) paintCell(index, selectedTool);
  }

  function chooseShade(level: number) {
    setActiveLevel(level);
    setTool("brush");
    if (text.trim()) setLevels(stampTextOnGrid(spreadPreset ? levels : blankGrid(), text, level));
    if (selectedTemplateName) setLevels(spreadPreset ? stampTemplateOnGrid(levels, selectedTemplateName, level) : drawTemplateToGrid(selectedTemplateName, level));
  }

  function handlePointerDown(index: number, event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    paintingRef.current = true;
    paintAvailableCell(index, event.button === 2 ? "erase" : tool);
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const shadeKeys: Record<string, number> = { a: 1, s: 2, d: 3, f: 4 };
    if (shadeKeys[event.key]) chooseShade(shadeKeys[event.key]);

    const row = focusedCell % ROWS;
    const col = Math.floor(focusedCell / ROWS);
    let nextCell = focusedCell;

    if (event.key === "ArrowUp") nextCell = col * ROWS + Math.max(0, row - 1);
    if (event.key === "ArrowDown") nextCell = col * ROWS + Math.min(ROWS - 1, row + 1);
    if (event.key === "ArrowLeft") nextCell = Math.max(0, col - 1) * ROWS + row;
    if (event.key === "ArrowRight") nextCell = Math.min(COLS - 1, col + 1) * ROWS + row;
    if (event.key === " " || event.key === "Enter") paintAvailableCell(focusedCell);

    if (nextCell !== focusedCell) {
      event.preventDefault();
      setFocusedCell(nextCell);
    }
  }

  function handleTextChange(value: string) {
    setText(value);
    setSelectedTemplateName(null);
    setLevels(value.trim() ? stampTextOnGrid(spreadPreset ? levels : blankGrid(), value, activeLevel) : spreadPreset ? levels : blankGrid());
  }

  function requestConfirmation(dialog: ConfirmDialog) {
    setConfirmDialog(dialog);
  }

  function runConfirmed(action: () => void) {
    action();
    setConfirmDialog(null);
  }

  function applyTemplate(templateName: string) {
    setText("");
    setSelectedTemplateName(templateName);
    setLevels(spreadPreset ? stampTemplateOnGrid(levels, templateName, activeLevel) : drawTemplateToGrid(templateName, activeLevel));
  }

  function resetCanvas() {
    resetBoard();
    setSelectedTemplateName(null);
  }

  function handleTemplate(templateName: string) {
    if (entries.length > 0) {
      requestConfirmation({
        title: "Replace the current painting?",
        body: "This template will overwrite painted cells. Your repository URL and year stay in place.",
        confirmLabel: "Replace with template",
        onConfirm: () => applyTemplate(templateName),
      });
      return;
    }

    applyTemplate(templateName);
  }

  function clearBoard() {
    if (entries.length > 0) {
      requestConfirmation({
        title: "Clear the board?",
        body: "This removes every painted day from the canvas. Your repository URL stays in place.",
        confirmLabel: "Clear board",
        onConfirm: resetCanvas,
      });
      return;
    }

    resetCanvas();
  }

  function handleDownload(kind: ScriptKind) {
    if (!canExport) return;
    downloadFile(`gitgraph-painter.${kind}`, generateScript(kind, repoUrl, entries, spreadSeed, spreadPreset));
  }

  async function copyShareLink() {
    const encoded = encodeDesign({ levels, mode, repoUrl, spreadPreset, spreadSeed, text, year });
    await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?d=${encoded}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function copyRunCommand(key: RunCommandKey, command: string) {
    await navigator.clipboard.writeText(command);
    setCopiedRunCommand(key);
    window.setTimeout(() => setCopiedRunCommand(null), 1600);
  }

  async function checkRepoVisibility() {
    if (!repoIsValid) {
      setRepoVisibility("invalid");
      return;
    }

    const { owner, repo } = parseRepo(repoUrl);
    setRepoVisibility("checking");

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Accept: "application/vnd.github+json" },
      });

      if (response.ok) {
        setRepoVisibility("public");
        return;
      }

      if (response.status === 404) {
        setRepoVisibility("private-or-missing");
        return;
      }

      setRepoVisibility("error");
    } catch {
      setRepoVisibility("error");
    }
  }

  function fillSpread(preset: SpreadPreset, seed?: number) {
    const nextSeed = seed ?? spreadSeed + 1;
    setMode("spread");
    setText("");
    setSelectedTemplateName(null);
    setSpreadPreset(preset);
    setSpreadSeed(nextSeed);
    setLevels(generateSpreadGrid(days, preset, nextSeed));
  }

  function applySpread(preset: SpreadPreset, seed?: number) {
    if (entries.length > 0) {
      requestConfirmation({
        title: "Replace with a spread?",
        body: "This fills the valid year with a new spread. Switch back to Paint afterward to stamp a name on top.",
        confirmLabel: "Apply spread",
        onConfirm: () => fillSpread(preset, seed),
      });
      return;
    }

    fillSpread(preset, seed);
  }

  function regenerateSpread() {
    if (!spreadPreset) return;
    const nextSeed = spreadSeed + 1;
    setSpreadSeed(nextSeed);
    setLevels(generateSpreadGrid(days, spreadPreset, nextSeed));
  }

  function exportPng() {
    const cell = 14;
    const gap = 4;
    const padding = 28;
    const canvas = document.createElement("canvas");
    canvas.width = COLS * (cell + gap) + padding * 2;
    canvas.height = ROWS * (cell + gap) + padding * 2 + 36;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#FAF7F0";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#353530";
    context.font = "500 16px ui-monospace, monospace";
    context.fillText(`GitGraph Painter - ${totalCommits} commits across ${entries.length} days`, padding, 24);

    levels.forEach((level, index) => {
      const row = index % ROWS;
      const col = Math.floor(index / ROWS);
      context.fillStyle = PAINT_COLORS[level];
      roundRect(context, padding + col * (cell + gap), padding + 32 + row * (cell + gap), cell, cell, 2);
      context.fill();
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "gitgraph-painter.png";
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <main className="mx-auto max-w-[1120px] px-3.5 pb-28 text-charcoal sm:px-6 sm:pb-12">
      <noscript>
        <section className="mt-6 rounded-2xl border border-stone/50 bg-sage p-4 text-charcoal">
          GitGraph Painter is an interactive frontend tool for designing GitHub contribution graph art and downloading a local commit script. Enable JavaScript to paint the grid and export scripts.
        </section>
      </noscript>
      <header className="flex min-h-16 items-center justify-between border-b border-stone/45 py-4">
        <a className="flex items-center gap-3 font-display text-2xl font-medium tracking-[-.01em] text-charcoal no-underline" href="#">
          <Image
            src="/logo_new.png"
            alt=""
            aria-hidden="true"
            width={4000}
            height={4000}
            className="h-20 w-20 rounded-xl object-contain"
          />
          GitGraph Painter
        </a>
        <div className="flex items-center gap-1 sm:gap-2">
          <a className={buttonBase} href="https://github.com/nabeelnasir9" target="_blank" rel="noreferrer">
            Star on GitHub
          </a>
          <button className={buttonBase} type="button" onClick={() => setHelpOpen(true)}>
            Help
          </button>
        </div>
      </header>

      <section className="max-w-[760px] py-8 sm:py-11">
        <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[.08em] text-forest">Design your graph. Generate the script.</p>
        <h1 className="mb-5 font-display text-[clamp(2.35rem,7vw,4.25rem)] font-medium leading-none tracking-[-.01em]">
          Paint your contribution graph before you touch git.
        </h1>
        <p className="m-0 text-[17px] leading-7 text-taupe">
          Design the pattern, review exactly what it will do, then download a script for your repository when the canvas is ready.
        </p>
      </section>

      <section className={cn(panelClass, "mb-4 p-[18px]")}>
        <label className="grid gap-2 text-[13px] font-bold text-taupe">
          <span>Target repository</span>
          <input
            className={cn(fieldInput, "font-mono")}
            value={repoUrl}
            placeholder="https://github.com/you/repo"
            onChange={(event) => {
              setRepoUrl(event.target.value.trim());
              setRepoVisibility("idle");
            }}
          />
          <small className="font-medium leading-5 text-taupe">
            Paste the repo you want to paint into. We never connect to your GitHub account; the script runs locally on your machine.
          </small>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className={cn(buttonBase, "rounded-xl bg-forest text-warm hover:bg-forest/90 disabled:bg-cream disabled:text-stone")}
            disabled={repoVisibility === "checking"}
            type="button"
            onClick={checkRepoVisibility}
          >
            {repoVisibility === "checking" ? "Checking..." : "Check visibility"}
          </button>
          <p className={cn("m-0 text-[13px] leading-5", repoVisibility === "public" ? "text-forest" : "text-taupe")} aria-live="polite">
            {repoVisibility === "idle" ? "Public repos show by default. Private repos work if private contributions are enabled." : null}
            {repoVisibility === "invalid" ? "Enter a valid GitHub repository URL first." : null}
            {repoVisibility === "public" ? "Public repository found." : null}
            {repoVisibility === "private-or-missing" ? "GitHub cannot verify this publicly. It may be private, misspelled, or unavailable." : null}
            {repoVisibility === "error" ? "Could not check right now. You can still download and run the script if your local git has access." : null}
          </p>
        </div>
      </section>

      <section className={cn(panelClass, "grid gap-5 p-4")} aria-label="Painter toolbar">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-cream p-1 shadow-[inset_0_1px_3px_rgba(26,26,23,.05)]">
              {(["paint", "spread"] as PainterMode[]).map((item) => (
                <button
                  className={cn(
                    "min-h-11 rounded-xl px-6 py-2 text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
                    mode === item ? "bg-forest text-warm shadow-[0_8px_18px_rgba(45,90,61,.16)]" : "text-taupe hover:bg-sage hover:text-charcoal",
                  )}
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                >
                  {item === "paint" ? "Paint" : "Spread"}
                </button>
              ))}
            </div>

            <div
              className="relative flex items-center gap-3 text-base font-semibold text-taupe"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setYearMenuOpen(false);
              }}
            >
              <span>Year</span>
              <button
                aria-expanded={yearMenuOpen}
                aria-haspopup="menu"
                className={cn(
                  "flex min-h-11 min-w-[116px] items-center justify-between gap-4 rounded-xl border border-stone/40 bg-warm px-5 font-mono text-lg font-semibold text-charcoal shadow-[0_1px_3px_rgba(26,26,23,.04)] transition hover:border-forest hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
                  yearMenuOpen && "border-forest bg-sage",
                )}
                type="button"
                onClick={() => setYearMenuOpen((open) => !open)}
              >
                {year}
                <ChevronIcon open={yearMenuOpen} />
              </button>
              {yearMenuOpen ? (
                <div
                  className="absolute left-[52px] top-[calc(100%+8px)] z-30 grid max-h-64 min-w-[116px] overflow-y-auto rounded-2xl border border-stone/45 bg-warm p-2 shadow-[0_14px_34px_rgba(26,26,23,.14)]"
                  role="menu"
                >
                  {yearOptions.map((item) => (
                    <button
                      className={cn(
                        "rounded-xl px-3 py-2 text-left font-mono text-sm font-semibold text-charcoal transition hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
                        item === year && "bg-forest text-warm hover:bg-forest/90",
                      )}
                      key={item}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setYear(item);
                        setYearMenuOpen(false);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

        {mode === "paint" ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="min-h-11 rounded-xl border border-stone/45 bg-warm px-4 text-[13px] font-semibold text-[#8A3030] transition hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              type="button"
              onClick={clearBoard}
            >
              Clear board
            </button>
            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setTemplateMenuOpen(false);
              }}
            >
              <button
                aria-expanded={templateMenuOpen}
                aria-haspopup="menu"
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-xl border border-stone/45 bg-warm px-4 text-[13px] font-semibold text-charcoal shadow-[0_1px_3px_rgba(26,26,23,.04)] transition hover:border-forest hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
                  (templateMenuOpen || selectedTemplateName) && "border-forest bg-sage",
                )}
                type="button"
                onClick={() => setTemplateMenuOpen((open) => !open)}
              >
                {selectedTemplateName ?? "Templates"}
                <ChevronIcon open={templateMenuOpen} />
              </button>
              {templateMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+8px)] z-30 grid min-w-40 gap-1 rounded-2xl border border-stone/45 bg-warm p-2 shadow-[0_14px_34px_rgba(26,26,23,.14)]"
                  role="menu"
                >
                  {TEMPLATES.map((template) => (
                    <button
                      className={cn(
                        "rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-charcoal transition hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
                        selectedTemplateName === template.name && "bg-forest text-warm hover:bg-forest/90",
                      )}
                      key={template.name}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        handleTemplate(template.name);
                        setTemplateMenuOpen(false);
                      }}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        </div>

        {mode === "paint" ? (
          <>
            <div className="flex w-fit flex-wrap items-center gap-3 rounded-2xl border border-stone/45 bg-cream p-2 shadow-[0_1px_3px_rgba(26,26,23,.04)]">
              <div className="flex items-center gap-2" aria-label="Paint shade">
                <span className="px-2 text-[12px] font-bold text-taupe">Ink</span>
                {PAINT_COLORS.slice(1).map((color, index) => {
                  const level = index + 1;
                  return (
                    <button
                      className={cn(
                        "relative grid h-11 w-11 place-items-center rounded-xl border border-stone/35 bg-warm transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
                        activeLevel === level && "scale-105 border-forest bg-sage shadow-[0_0_0_2px_var(--forest),0_10px_18px_rgba(26,26,23,.14)]",
                      )}
                      key={color}
                      type="button"
                      aria-pressed={activeLevel === level}
                      aria-label={`Level ${level}, ${COMMITS_BY_LEVEL[level]} commits per day`}
                      onClick={() => chooseShade(level)}
                    >
                      <span className="h-7 w-7 rounded-full shadow-[inset_0_0_0_1px_rgba(26,26,23,.12)]" style={{ background: color } as CSSProperties} />
                      {activeLevel === level ? <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-warm bg-forest" /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="h-8 w-px bg-stone/40" aria-hidden="true" />

              <div className="grid grid-cols-2 gap-1 rounded-xl bg-warm p-1 shadow-[inset_0_1px_3px_rgba(26,26,23,.05)]" aria-label="Paint tool">
                <button
                  className={cn(
                    "min-h-10 rounded-lg px-4 text-[13px] font-semibold text-charcoal transition hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
                    tool === "brush" && "bg-forest text-warm hover:bg-forest/90",
                  )}
                  type="button"
                  onClick={() => setTool("brush")}
                >
                  Brush
                </button>
                <button
                  className={cn(
                    "min-h-10 rounded-lg px-4 text-[13px] font-semibold text-charcoal transition hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
                    tool === "erase" && "bg-forest text-warm hover:bg-forest/90",
                  )}
                  type="button"
                  onClick={() => setTool("erase")}
                >
                  Erase
                </button>
              </div>
            </div>

            <label className="grid gap-2 text-[13px] font-bold text-taupe">
              <span>Type to paint</span>
              <input
                className={cn(fieldInput, "font-mono")}
                value={text}
                placeholder="Type a word to paint it"
                onChange={(event) => handleTextChange(event.target.value)}
              />
              {textTooLong ? <small className="font-medium leading-5 text-taupe">That is longer than the canvas. About 8 characters fit.</small> : null}
            </label>
          </>
        ) : (
          <div className="grid gap-3 md:col-span-4">
            <p className="m-0 text-[13px] leading-5 text-taupe">
              Fills the whole year with a natural, random spread. Switch to Paint to add a name on top.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(SPREAD_PRESETS) as SpreadPreset[]).map((preset) => (
                <button
                  className={cn(buttonBase, "flex items-center gap-2", spreadPreset === preset && "border-forest bg-forest text-warm hover:bg-forest/90")}
                  key={preset}
                  type="button"
                  onClick={() => applySpread(preset)}
                >
                  <span>{SPREAD_PRESETS[preset].label}</span>
                  <span className="flex gap-0.5" aria-hidden="true">
                    {PAINT_COLORS.slice(1).map((color) => (
                      <span className="h-2.5 w-2.5 rounded-[2px]" key={color} style={{ background: color }} />
                    ))}
                  </span>
                </button>
              ))}
              <button className={buttonBase} disabled={!spreadPreset} title="Shuffle the spread." type="button" onClick={regenerateSpread}>
                Regenerate
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-5 overflow-x-auto py-5" aria-label="Contribution canvas">
        <div className="ml-12 grid min-w-max grid-cols-[repeat(53,14px)] gap-1 font-mono text-[11px] text-taupe" aria-hidden="true">
          {Array.from({ length: COLS }, (_, col) => (
            <span className="h-[18px]" key={col}>
              {days[col * ROWS]?.monthLabel}
            </span>
          ))}
        </div>
        <div className="flex min-w-max items-center gap-3 rounded-2xl border border-stone/40 bg-warm p-6 shadow-[inset_0_2px_6px_rgba(26,26,23,.06)]">
          <div className="grid gap-[18px] font-mono text-[11px] text-taupe" aria-hidden="true">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div
            className="grid auto-cols-[14px] grid-flow-col grid-rows-[repeat(7,14px)] gap-1"
            role="grid"
            aria-label="Paintable GitHub contribution grid"
            onKeyDown={handleGridKeyDown}
            onPointerLeave={() => {
              paintingRef.current = false;
            }}
          >
            {levels.map((level, index) => {
              const day = days[index];
              return (
                <button
                  aria-label={`${day.label}, level ${level}, ${COMMITS_BY_LEVEL[level]} commits`}
                  className={cn(
                    "h-3.5 w-3.5 cursor-crosshair rounded-[2px] border-0 p-0 shadow-[inset_0_0_0_1px_rgba(53,53,48,.06)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest",
                    level > 0 && "shadow-[inset_0_1px_2px_rgba(26,26,23,.16)]",
                    focusedCell === index && "ring-1 ring-forest",
                    day.disabled && "cursor-not-allowed opacity-40",
                  )}
                  key={`${day.label}-${index}`}
                  role="gridcell"
                  style={{ background: PAINT_COLORS[level] } as CSSProperties}
                  tabIndex={focusedCell === index ? 0 : -1}
                  title={`${day.label} - level ${level} - ${COMMITS_BY_LEVEL[level]} commits`}
                  type="button"
                  onFocus={() => setFocusedCell(index)}
                  onPointerDown={(event) => handlePointerDown(index, event)}
                  onPointerEnter={() => {
                    if (paintingRef.current) paintAvailableCell(index);
                  }}
                  onPointerUp={() => {
                    paintingRef.current = false;
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    paintAvailableCell(index, "erase");
                  }}
                />
              );
            })}
          </div>
        </div>
        {entries.length === 0 ? <p className="ml-12 mt-3 text-[13px] text-taupe">Paint here, choose a template, or type a word above.</p> : null}
      </section>

      <section className="my-5 flex flex-wrap items-center gap-2 border-y border-stone/40 py-4 font-mono text-taupe" aria-live="polite">
        {spreadLabel ? <span className="text-forest">{spreadLabel} ·</span> : null}
        <strong className="text-forest">{totalCommits.toLocaleString()}</strong> commits across <strong className="text-forest">{entries.length}</strong> days - {year}
        {totalCommits > 2000 ? <span className="text-forest">Large painting - the script will run a few minutes.</span> : null}
        {futurePainted ? <span className="text-forest">Days in the future will not count yet.</span> : null}
      </section>

      <section className={cn(panelClass, "mt-4 bg-sage p-[18px]")} aria-label="Pre-flight checklist">
        <h2 className="mb-3.5 font-display text-2xl font-medium tracking-[-.01em]">Pre-flight</h2>
        {[
          ["Commit email", "Your git email must match a verified GitHub email.", "git config user.email"],
          ["Default branch", "The script auto-detects the default branch and pushes there.", ""],
          ["Visibility", "Use a public repo, or turn on \"Include private contributions\" in GitHub settings.", ""],
        ].map(([summary, body, code], index) => (
          <details className="border-t border-stone/45 py-3" key={summary} open={index === 0}>
            <summary className="cursor-pointer font-bold">{summary}</summary>
            <p className="my-2 leading-6 text-taupe">{body}</p>
            {code ? <code className="inline-block rounded-md bg-warm px-2.5 py-1.5 font-mono text-near">{code}</code> : null}
          </details>
        ))}
      </section>

      <section className={cn(panelClass, "mt-4 p-[18px]")} aria-label="Run script commands">
        <div className="mb-4">
          <h2 className="m-0 font-display text-2xl font-medium tracking-[-.01em]">Run the downloaded script</h2>
          <p className="mb-0 mt-2 text-[13px] leading-5 text-taupe">
            After downloading, open your terminal and run the command for your system from the folder where the file was saved.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative rounded-2xl border border-stone/40 bg-warm p-4">
            <h3 className="mb-2 mt-0 text-base font-semibold">macOS or Linux</h3>
            <button
              className="absolute right-6 top-5 grid h-8 w-8 place-items-center rounded-full border border-stone/40 bg-cream text-charcoal transition hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              type="button"
              aria-label="Copy macOS or Linux command"
              onClick={() => copyRunCommand("mac", MAC_RUN_COMMAND)}
            >
              {copiedRunCommand === "mac" ? <CheckIcon /> : <CopyIcon />}
            </button>
            <pre className="overflow-x-auto rounded-xl bg-near p-3 pr-12 text-warm"><code>{MAC_RUN_COMMAND}</code></pre>
          </div>
          <div className="relative rounded-2xl border border-stone/40 bg-warm p-4">
            <h3 className="mb-2 mt-0 text-base font-semibold">Windows PowerShell</h3>
            <button
              className="absolute right-6 top-5 grid h-8 w-8 place-items-center rounded-full border border-stone/40 bg-cream text-charcoal transition hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              type="button"
              aria-label="Copy Windows PowerShell command"
              onClick={() => copyRunCommand("windows", WINDOWS_RUN_COMMAND)}
            >
              {copiedRunCommand === "windows" ? <CheckIcon /> : <CopyIcon />}
            </button>
            <pre className="overflow-x-auto rounded-xl bg-near p-3 pr-12 text-warm"><code>{WINDOWS_RUN_COMMAND}</code></pre>
          </div>
        </div>
      </section>

      <section className={cn(panelClass, "sticky bottom-0 z-30 mt-5 flex flex-wrap items-center justify-center gap-2 rounded-b-none p-3.5 sm:bottom-3 sm:rounded-2xl")}>
        <p className={cn("basis-full text-center font-mono text-xs", canExport ? "text-forest" : "text-taupe")} aria-live="polite">
          {exportStatus}
        </p>
        <button className={cn(buttonBase, "bg-forest text-warm hover:bg-forest/90 disabled:bg-cream disabled:text-stone")} disabled={!canExport} title={canExport ? "Download script" : "Add a repository URL and paint at least one day."} type="button" onClick={() => handleDownload("sh")}>
          Download script
        </button>
        <button className={cn(buttonBase, "disabled:bg-cream disabled:text-stone")} disabled={!canExport} type="button" onClick={() => handleDownload("ps1")}>
          .ps1
        </button>
        <button className={cn(buttonBase, "disabled:bg-cream disabled:text-stone")} disabled={!canExport} type="button" onClick={() => handleDownload("bat")}>
          .bat
        </button>
        <button className={buttonBase} type="button" onClick={copyShareLink}>
          {copied ? "Link copied" : "Copy share link"}
        </button>
        <button className={buttonBase} type="button" onClick={exportPng}>
          Export PNG
        </button>
      </section>

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-dvh w-[min(92vw,420px)] max-w-[420px] translate-x-[105%] border-l border-stone/60 bg-cream p-7 shadow-[-12px_0_36px_rgba(26,26,23,.12)] transition-transform",
          helpOpen && "translate-x-0",
        )}
        aria-hidden={!helpOpen}
      >
        <button className={cn(buttonBase, "bg-warm")} type="button" onClick={() => setHelpOpen(false)}>
          Close
        </button>
        <h2 className="my-5 font-display text-3xl font-medium tracking-[-.01em]">How to make it count</h2>
        <ol className="list-decimal space-y-2 pl-5 text-taupe">
          <li>Paint the grid or type a short word.</li>
          <li>Paste the repository URL you want to use.</li>
          <li>Download the script for your terminal.</li>
          <li>Run it from a clean working folder and let it push empty commits.</li>
        </ol>
        <h3 className="mb-1.5 mt-6 text-lg font-semibold">Run commands</h3>
        <p className="leading-6 text-taupe">Use the command for the script you downloaded.</p>
        <div className="relative">
          <button
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-stone/40 bg-cream text-charcoal transition hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            type="button"
            aria-label="Copy run commands"
            onClick={() => copyRunCommand("help", HELP_RUN_COMMAND)}
          >
            {copiedRunCommand === "help" ? <CheckIcon /> : <CopyIcon />}
          </button>
          <pre className="overflow-x-auto rounded-xl bg-near p-3 pr-12 text-warm"><code>{HELP_RUN_COMMAND}</code></pre>
        </div>
        <h3 className="mb-1.5 mt-6 text-lg font-semibold">What the script does</h3>
        <p className="leading-6 text-taupe">It clones the repo, detects the default branch, creates dated empty commits, and pushes them. Review the commit count before downloading.</p>
        <h3 className="mb-1.5 mt-6 text-lg font-semibold">Why shades can shift</h3>
        <p className="leading-6 text-taupe">
          GitHub shades are relative to your busiest day, not fixed numbers. A fresh repo or low-activity account gives the cleanest painting because existing busy days can rescale the colors.
        </p>
        <h3 className="mb-1.5 mt-6 text-lg font-semibold">Undo path</h3>
        <p className="leading-6 text-taupe">Use a throwaway repository for experiments. If you need to remove a painting, delete that throwaway repo or reset it from GitHub.</p>
      </aside>
      {helpOpen ? <button className="fixed inset-0 z-40 border-0 bg-near/20" aria-label="Close help panel" type="button" onClick={() => setHelpOpen(false)} /> : null}
      {confirmDialog ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-near/20 px-4" role="presentation">
          <section
            aria-describedby="confirm-dialog-body"
            aria-labelledby="confirm-dialog-title"
            aria-modal="true"
            className="w-full max-w-[420px] rounded-2xl border border-stone/50 bg-cream p-5 shadow-[0_1px_2px_rgba(26,26,23,.04),0_18px_48px_rgba(26,26,23,.16)]"
            role="dialog"
          >
            <h2 className="m-0 font-display text-2xl font-medium tracking-[-.01em]" id="confirm-dialog-title">
              {confirmDialog.title}
            </h2>
            <p className="mb-5 mt-3 leading-6 text-taupe" id="confirm-dialog-body">
              {confirmDialog.body}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button className={buttonBase} type="button" onClick={() => setConfirmDialog(null)}>
                Keep editing
              </button>
              <button
                className={cn(buttonBase, "border-forest bg-forest text-warm hover:bg-forest/90")}
                type="button"
                onClick={() => runConfirmed(confirmDialog.onConfirm)}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M8 8h10v10H8z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 animate-[tick_220ms_ease-out] text-forest" fill="none" viewBox="0 0 24 24">
      <path d="m5 12 4 4 10-10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" className={cn("h-4 w-4 transition", open && "rotate-180")} fill="none" viewBox="0 0 24 24">
      <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
