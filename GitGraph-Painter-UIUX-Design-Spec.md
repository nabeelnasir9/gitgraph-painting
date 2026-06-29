# GitGraph Painter — Build Spec (single source of truth)

> **For the implementer (Claude Code / any agent):** Build the product described below exactly. It is a **100% frontend** web app — **no backend, no database, no auth.** Its only output is a downloadable shell script the user runs themselves. Use the tech stack in §6, follow the design system in §10–13 precisely (colors and type are non-negotiable), and ship in the order given in §15. Acceptance criteria are in §16. When a detail isn't specified, prefer the simplest choice that preserves the "no backend / no DB" property.

---

## 1. What this is

A web tool that lets a user "paint" their GitHub contribution graph. The user designs a pattern (a shape, text like their name, or a full-year activity spread) on a 7×53 grid, pastes their repo URL, and downloads a ready-to-run script. Running that script locally creates backdated git commits that render the design on their real GitHub profile.

**Reference products:** github-painter.vercel.app, paintgithub.com.

---

## 2. The one architectural rule (protect this)

The app **never touches the user's GitHub account.** It is a pure design tool whose only output is a **text file (a shell script)**. The user runs that script in their own terminal, where they're already authenticated with git/SSH; the commits and `git push` happen on their machine.

Consequences (all intended):
- No auth, no OAuth, no tokens, no scary `repo` scope.
- No infra, no scaling, nothing to crash — a static site on Vercel's free tier.
- No security liability — we never hold credentials or repo access.
- **Save/Share works without a DB** by encoding the whole design into the URL.

Every decision below preserves this.

---

## 3. How GitHub's contribution graph actually works (get these right)

**Grid geometry**
- 7 rows (days, Sunday→Saturday, top→bottom) × ~53 columns (weeks). Each cell = one calendar day.
- For a selected year, cell (col 0, row 0) = the **Sunday on or before Jan 1**. A cell's date = `firstSunday + (col×7 + row)` days.
- Cells outside the selected year, or in the **future**, are disabled/ignored.

**Color intensity**
- A day's color depends on the **number of commits** that day. 5 levels (0–4).
- Shading is **relative (quartile-based) to the user's own busiest day**, not absolute. So a clean painting wants a **fresh repo / low-activity account**, else real busy days re-scale the colors. Surface this as a tip.

**What makes a commit count** (verified against GitHub docs + community)
- The commit's **author email must match a verified email** on the user's account. ← #1 reason paintings don't show.
- Commits must land on the repo's **default branch** (or `gh-pages`). **Forks don't count.**
- Empty commits (`--allow-empty`) **do** count.
- The graph can take up to ~24h to refresh.

**Backdating mechanism (the core trick)**
```bash
GIT_AUTHOR_DATE="2025-03-15T12:00:00" \
GIT_COMMITTER_DATE="2025-03-15T12:00:00" \
git commit --allow-empty -m "paint"
```
Both env vars are set because GitHub keys the graph off the commit date. More commits on a day → darker cell.

---

## 4. Features

### MVP

| # | Feature | Notes |
|---|---------|-------|
| F1 | Paintable **7×53 grid**, brush + eraser | Core canvas |
| F2 | **5 intensity shades** | The paint scale (§11.2) |
| F3 | **Text → graph** | Type a word, render in pixel font |
| F4 | **Template library** | heart, arrow, invader, wave |
| F5 | **Live preview + commit counter** | Honesty before the click |
| F6 | **Shareable URL** | Design encoded in link, no DB |
| F7 | **Script generation** | `.sh` + `.bat`/`.ps1` |
| F8 | **Safety / Help panel** | Email-match + cleanup — do not skip |
| F9 | **PNG export** | For social sharing |
| F10 | **Year-Spread fill** (Novice→Expert) + regenerate | Fills the *whole* year with realistic random commits |

**Two modes, one canvas.** F1–F4 = **Paint mode** (shapes/text). F10 = **Spread mode** (populate the whole year). They share the same grid and **compose**: lay a spread as a base, then paint a name on top.

### Phase 2 (design for it, don't build yet)
Image → graph upload, randomized "organic" commit times/messages, advanced tools (line/rect/fill), undo/redo, dark mode, keyboard shortcuts.

### Explicitly NOT in scope
User accounts, server, database, GitHub API, OAuth, doing the commits for the user.

---

## 5. High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      BROWSER (Vercel static)                   │
│   ┌────────────┐   reads/writes   ┌──────────────────────┐    │
│   │  UI Layer  │ ◄──────────────► │   App State (store)   │    │
│   └─────┬──────┘                  └──────────┬───────────┘    │
│         ▼                                      ▼               │
│   ┌──────────────────────────────────────────────────────┐    │
│   │  CORE ENGINES (pure JS)                                │   │
│   │  ① Text→Graph  ② Script Gen  ③ URL Codec  ④ Year-Spread │  │
│   └──────────────────────────────────────────────────────┘    │
│                              ▼ Blob download / clipboard        │
│                    ┌───────────────────┐                       │
│                    │  github_painter.sh │  ← the only output    │
│                    └───────────────────┘                       │
└──────────────────────────────────────────────────────────────┘
              │ user runs locally → clone → commit×N → push → GitHub
```
No network boundary inside the app. The only "integration" is a text file crossing into the user's terminal.

---

## 6. Tech stack

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | **Next.js (React) + TypeScript** | Static export, Vercel-native |
| Styling | **Tailwind CSS** | Map the design tokens in §13 to Tailwind theme |
| State | **Zustand** | Tiny store; easy history for undo/redo later |
| URL compression | **lz-string** | Compact, URL-safe grid encoding |
| Canvas/PNG | Native `<canvas>` | No dependency |
| Hosting | **Vercel (free, static)** | Zero infra |

**No backend. No database. No auth library.**

### Project structure
```
gitgraph-painter/
├─ app/page.tsx               # single-page app
├─ components/
│  ├─ Toolbar/                # ModeSwitch, YearSelect, ShadePicker, ToolButtons,
│  │                          # TextInput, TemplateMenu, SpreadPresets
│  ├─ ContributionGrid.tsx
│  ├─ PreviewStats.tsx
│  ├─ RepoInput.tsx
│  ├─ PreflightChecklist.tsx
│  ├─ ExportBar.tsx
│  └─ HelpPanel.tsx
├─ lib/
│  ├─ engines/
│  │  ├─ textToGraph.ts       # ① + font map
│  │  ├─ scriptGenerator.ts   # ② (sh + bat/ps1)
│  │  ├─ urlCodec.ts          # ③
│  │  └─ yearSpread.ts        # ④ + mulberry32
│  ├─ dates.ts                # dateForCell, validity, week math
│  └─ templates.ts            # preset Uint8Arrays
├─ store/usePainterStore.ts   # Zustand store + actions
└─ public/
```

---

## 7. State / data model

```ts
type Level = 0 | 1 | 2 | 3 | 4;            // 0 = empty

interface PainterState {
  year: number;
  grid: Uint8Array;                         // length 371 (7*53); index = col*7 + row; each = Level
  activeLevel: Level;                       // current brush shade (1..4)
  tool: 'brush' | 'eraser';                 // Phase 2: 'line' | 'rect' | 'fill'
  repoUrl: string;
  branch: string;                           // 'main' default; script auto-detects real one
  isPainting: boolean;

  mode: 'paint' | 'spread';                 // F10
  spreadPreset: 'novice'|'beginner'|'intermediate'|'advanced'|'expert' | null;
  spreadSeed: number;                       // bumped by regenerate 🔄

  // derived (computed): totalCommits, litDays, dateForCell(i), isCellValid(i)
}
```

**Why `Uint8Array(371)`:** compact, fast, trivially serializable for the share URL. Index math is the whole model: `index = col*7 + row`.

**Cell → date:**
```ts
function dateForCell(year: number, col: number, row: number): Date {
  const jan1 = new Date(year, 0, 1);
  const firstSunday = new Date(jan1);
  firstSunday.setDate(jan1.getDate() - jan1.getDay()); // back up to Sunday
  const d = new Date(firstSunday);
  d.setDate(firstSunday.getDate() + col * 7 + row);
  return d;
}
// valid if d.getFullYear() === year && d <= today
```

---

## 8. Core engines

### ① Text-to-Graph
Renders typed text into grid cells using a **5-row pixel bitmap font**.
- `FONT: Record<string, number[][]>` — each glyph a 5-row × N-col matrix of 0/1 (A–Z, 0–9, space).
- Place letters left→right from a start column, **vertically centered in rows 1–5** (rows 0 & 6 margin), 1 empty column between letters.
- Each "1" pixel → set cell to `activeLevel` (default 4). Clip past column 52 and warn on overflow.

```
"HI" →   H . . H      (rows 1–5 used)
         H . . H
         H H H H
         H . . H
         H . . H
```

### ② Script Generator (the product's actual output)
Intensity → commits/day (tunable): **L1=1, L2=3, L3=6, L4=10.**

Generated `github_painter.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/USER/REPO"   # baked in from RepoInput
WORKDIR="gitgraph_tmp"

git clone "$REPO_URL" "$WORKDIR"
cd "$WORKDIR"
BRANCH="$(git symbolic-ref --short HEAD)"  # auto-detect default branch

commit () {  # $1 = ISO date, $2 = count
  for i in $(seq 1 "$2"); do
    GIT_AUTHOR_DATE="$1T12:00:00" GIT_COMMITTER_DATE="$1T12:00:00" \
      git commit --allow-empty -m "🎨 $1" >/dev/null
  done
}

# ---- generated, one line per lit day ----
commit "2025-03-15" 10
commit "2025-03-16" 6
# -----------------------------------------

git push origin "$BRANCH"
echo "✅ Done. Check your profile in a few minutes."
```
- Clones fresh so the user can run it from anywhere; push uses the user's existing git auth.
- Ship a parallel `.bat`/`.ps1` generator (PowerShell env-var date syntax).
- In **Spread mode**, default commit times to **randomized hours + varied messages** (see ④) so the history doesn't look bot-dumped.

### ③ URL Codec (save/share without a DB)
- Serialize `grid` (371 levels) + `year` (+ `spreadSeed`/`spreadPreset` if set) → compact string.
- Compress with **lz-string** → URL-safe; write to `?d=…` via `history.replaceState` (debounced).
- On load, read `?d=`, decompress, hydrate the store. 371 levels compress very well → short links.

### ④ Year-Spread (the "active developer" fill)
Populates the **entire valid year** with a natural-looking random distribution.

| Preset | `density` | `levelWeights` [L1,L2,L3,L4] |
|--------|-----------|------------------------------|
| Novice | 0.25 | [0.80, 0.18, 0.02, 0.00] |
| Beginner | 0.40 | [0.55, 0.35, 0.10, 0.00] |
| Intermediate | 0.55 | [0.35, 0.35, 0.25, 0.05] |
| Advanced | 0.72 | [0.10, 0.30, 0.40, 0.20] |
| Expert | 0.90 | [0.00, 0.15, 0.45, 0.40] |

```ts
function fillYear(grid, year, preset, seed) {
  const rng = mulberry32(seed);                   // seeded → regenerate = new, reproducible spread
  for (const i of validCellIndices(year)) {
    const dow = i % 7;                             // 0=Sun … 6=Sat
    const weekday = dow >= 1 && dow <= 5 ? 1 : 0.5; // weekday bias → organic, not uniform
    grid[i] = rng() < preset.density * weekday
      ? weightedPick(preset.levelWeights, rng)     // 1..4
      : 0;
  }
}
```
- **Seeded RNG (`mulberry32`)** → the 🔄 regenerate control just bumps `spreadSeed`. Same seed in the URL reproduces the exact graph.
- **Weekday bias** stops it looking machine-uniform; Expert may flatten toward 1.0 for a near-solid wall.
- **Composable:** Spread writes a base layer; switching to Paint stamps a name at L4 on top — it embosses against the noise.
- **Cost surfacing:** Expert × full year ≈ thousands of commits. The counter (F5) must show this up front, e.g. `Expert · 2025 · ~3,100 commits`.

---

## 9. Primary data flow
```
1. Paint / type text / load template — OR pick a Spread preset (Novice→Expert)
1b. (Spread) ④ fills the whole valid year; 🔄 re-rolls the seed
2. ① (if text) writes Levels into grid — can stamp on top of a spread
3. <ContributionGrid> re-renders by level; <PreviewStats> recomputes totals
4. ③ keeps ?d= in sync (debounced)            → shareable anytime
5. User pastes repo URL → clicks Download script
6. ② walks grid → emits commit() lines → Blob → download
7. User runs script locally → commits push → graph updates
```

---

# DESIGN SYSTEM

## 10. Direction — "Atelier × Terminal"

A **warm paper studio** you make marks in, wired to a **terminal's honesty** about what those marks do. Human copy is crafted and warm; everything touching data/dates/commits/script is monospace, treated as a precise instrument readout.

**Hero / thesis:** the contribution grid itself, as paint laid on parchment. Forest green is the single pigment in five tints. Nothing competes with it.

**Principles**
1. **The canvas is sacred** — largest, brightest, most central. Toolbars frame, never crowd.
2. **Green is paint, not chrome** — forest green = grid pigment + the single primary action. Never decorative.
3. **Data wears monospace** — counts, dates, URLs, script.
4. **Honesty before the click** — show exact commit count / date range before download.
5. **Quiet everywhere else** — hairline borders, tonal cream-on-cream surfaces, barely-there shadows.

---

## 11. Color

### 11.1 Palette → roles
| Token | Hex | Role |
|-------|-----|------|
| `--warm-white` | `#FAF7F0` | App background |
| `--cream` | `#F4F0E6` | Secondary surface, cards |
| `--linen` | `#EDE8DB` | Toolbars, panels |
| `--parchment` | `#EBE6D6` | Empty grid cell, inset wells, inputs |
| `--sage-tint` | `#F3F6EE` | Active/selected bg, success surfaces |
| `--stone` | `#A8A59C` | Hairline borders, disabled, dividers |
| `--taupe` | `#6B675E` | Secondary text, icons, captions |
| `--charcoal` | `#353530` | Primary text & headings |
| `--near-black` | `#1A1A17` | Max-contrast text; script panel ground |
| `--forest` | `#2D5A3D` | Primary accent · darkest paint level · CTAs |

### 11.2 The Paint Scale (defining decision)
A single ramp empty parchment → deep forest, desaturated toward sage so it sits on warm paper (no neon glare).

| Level | Hex | Commits/day |
|-------|-----|-------------|
| 0 | `#EBE6D6` | 0 |
| 1 | `#CBD8C0` | 1 |
| 2 | `#9DBB94` | 3 |
| 3 | `#5F8A66` | 6 |
| 4 | `#2D5A3D` | 10 |

Cells carry a 1px inner border `rgba(53,53,48,0.06)` so the grid reads as discrete tiles even at L0.

### 11.3 Semantic (kept off the main canvas — Help/checklist zone only)
| Use | Color |
|-----|-------|
| Primary action / focus ring | `--forest` |
| Success ("script ready") | `--forest` on `--sage-tint` |
| Warning | text `#8A5A2B` on `#F6EEDF` (warm amber) |
| Destructive (clear board) | text `--charcoal`, hover `#8A3A2E` (brick) |

### 11.4 Contrast
- Body text: `--charcoal` on light surfaces ✔. Secondary: `--taupe` (never `--stone` for text).
- Buttons: `--warm-white` on `--forest` ✔ AA. Focus ring: 2px `--forest` + 2px offset, always visible.

---

## 12. Typography
A deliberate triad — warm display, clean body, instrument mono.

| Role | Typeface | Sub |
|------|----------|-----|
| Display / headings | **Fraunces** | Newsreader |
| Body / UI | **Hanken Grotesk** | Inter |
| Data / code | **JetBrains Mono** | Space Mono |

| Token | Size/line | Weight | Face | Use |
|-------|-----------|--------|------|-----|
| Display | 40/44 | 540 | Fraunces | App title (once) |
| H2 | 24/30 | 500 | Fraunces | Panel headers |
| H3 | 18/26 | 600 | Hanken | Section labels |
| Body | 15/24 | 400 | Hanken | Help, descriptions |
| Label | 13/18 | 600 | Hanken | Buttons, field labels |
| Data | 14/20 | 500 | JetBrains Mono | Counts, dates, URL |
| Caption | 12/16 | 500 | JetBrains Mono | Tooltips, fine print |

Headings sentence case (never ALL CAPS); numbers always mono; letter-spacing only on display (-0.01em).

---

## 13. Foundations + token sheet
```
Radius:   sm 6 · md 10 · lg 16 · grid-cell 2 (near-square, intentional)
Spacing:  4 · 8 · 12 · 16 · 24 · 32 · 48   (8pt base)
Border:   1px solid var(--stone) @ 50% opacity  (hairlines only)
Shadow:   panel  0 1px 2px rgba(26,26,23,.04), 0 8px 24px rgba(26,26,23,.05)
          inset (canvas well)  inset 0 2px 6px rgba(26,26,23,.06)
Motion:   fast 120ms · base 200ms · slow 360ms · ease cubic-bezier(.2,.6,.2,1)
Max width: 1120px content column, centered
```
```css
:root{
  --warm-white:#FAF7F0; --cream:#F4F0E6; --linen:#EDE8DB; --parchment:#EBE6D6;
  --sage-tint:#F3F6EE; --stone:#A8A59C; --taupe:#6B675E; --charcoal:#353530;
  --near-black:#1A1A17; --forest:#2D5A3D;
  --lvl0:#EBE6D6; --lvl1:#CBD8C0; --lvl2:#9DBB94; --lvl3:#5F8A66; --lvl4:#2D5A3D;
  --font-display:"Fraunces",serif;
  --font-body:"Hanken Grotesk",system-ui,sans-serif;
  --font-mono:"JetBrains Mono",ui-monospace,monospace;
  --r-sm:6px; --r-md:10px; --r-lg:16px; --r-cell:2px;
  --ease:cubic-bezier(.2,.6,.2,1);
}
```

---

## 14. Layout & components

### Desktop (≥1024px) — single centered column
```
┌──────────────────────────────────────────────────────────────────┐
│  GitGraph Painter                              ★ Star   ? Help     │  Header
├──────────────────────────────────────────────────────────────────┤
│ [Paint|Spread] │ Year ▾ │ ◍◍◍◍◍ shades │ ✎Brush ⌫Erase ⌧Clear │ Templates ▾ │  Toolbar
│  ┌────────────────────  Type to paint  ─────────────────────────┐ │  (Paint mode)
│  │  NABEEL                                                       │ │
│  └───────────────────────────────────────────────────────────────┘│
│  — or Spread mode —                                                │
│  [Novice][Beginner][Intermediate][ADVANCED][Expert]   🔄 shuffle   │
├──────────────────────────────────────────────────────────────────┤
│      ░░▓▓░░░  ← THE CANVAS (inset well on warm-white) ░░░░         │  Grid
├──────────────────────────────────────────────────────────────────┤
│  ▸ Expert · 2025 · ~3,100 commits across 312 days   [mono readout] │  Preview stats
├──────────────────────────────────────────────────────────────────┤
│  Repo URL  [ https://github.com/you/repo            ]              │  Repo input
│  Pre-flight: ✓ email  ✓ default branch  ✓ visibility   [check]     │  Checklist
├──────────────────────────────────────────────────────────────────┤
│        [ Download script ]   .bat/.ps1   ⧉ Copy link   ⬇ PNG       │  Export bar
└──────────────────────────────────────────────────────────────────┘
```
Flow top→bottom mirrors the user's journey: **mode → design/spread → review → target → safety → export.**

### Mobile (<640px)
Toolbar collapses (mode switch + year + shades stay; tools/templates → bottom sheet). Spread presets → horizontal scrolling chips, 🔄 pinned at end. Grid scrolls horizontally in its well with edge fades + pinch-zoom. Export bar sticky at bottom, primary full-width. Touch targets ≥ 44px.

### Component specs

**Header** — warm-white, 64px, hairline base. Title in Fraunces. Right: ghost "★ Star on GitHub" + "? Help".

**Toolbar** — `--linen`, 12px radius. Far-left **Paint/Spread** segmented switch (active = `--forest` text on `--sage-tint`). Then:
- *Year select* — pill dropdown, mono value; changing year re-validates cells.
- *Shade picker* (both modes) — 5 swatches = the paint scale; active lifts 2px + `--forest` ring + mono keycap hint `a s d f`.
- *(Paint)* Tool buttons (Brush/Erase/Clear — Clear confirms if non-empty); Text input (parchment, placeholder *"Type a word to paint it"*, live render, overflow warns); Templates dropdown (heart/arrow/invader/wave; preview on hover, confirm if non-empty).

**Spread Presets** *(Spread mode)* — five chips `Novice·Beginner·Intermediate·Advanced·Expert`, each with a 4-cell mini paint-scale preview. Rest = `--cream` + hairline; hover = `--sage-tint`; **selected = `--forest` fill, warm-white label**. **🔄 Regenerate** round ghost button beside them (tooltip *"Shuffle the spread."*, 200ms re-fill sweep). Picking a preset fills the whole valid year as a base layer (confirm if non-empty). Microcopy: *"Fills the whole year with a natural, random spread. Switch to Paint to add a name on top."*

**Contribution Grid** *(signature)* — inset well on `--warm-white`; `--parchment` empty cells = "paint on paper". 7×53, 2px-radius tiles, 2px gaps; month labels (top) + day labels (left) in `--taupe` mono caption.
| Cell state | Treatment |
|---|---|
| empty (L0) | `--parchment`, 6% inner border |
| painted (L1–L4) | paint-scale fill + faint inset |
| hover | 1px `--forest` outline + tooltip |
| disabled (out-of-year/future) | `--parchment` @40%, diagonal hairline, no pointer |
| painting (drag) | fills continuously under cursor at active level |
Tooltip (mono): `Mar 15, 2025 · level 4 · 10 commits`. Mouse-down paints, drag continues, right-click erases; touch = tap/drag.

**Preview Stats** — one mono line like a terminal status: `▸ 1,240 commits across 87 days · 2025`. Live. Totals > 2,000 → number turns `--forest` + note *"Large painting — the script will run a few minutes."* Future/overflow warnings attach here in warm amber.

**Repo Input** — parchment field, mono value, label *"Your repository URL"*, helper *"Paste the repo you want to paint into."* Download stays disabled (stone) until a valid `github.com/owner/repo` URL exists; disabled tooltip explains why.

**Pre-flight Checklist** *(do not skip — highest-leverage UX for success)* — `--sage-tint` card above export, three reveals:
- *Commit email* — *"Your git email must match a verified GitHub email."* → copyable mono chip `git config user.email`.
- *Default branch* — *"Commits must land on the default branch."* (script auto-detects).
- *Visibility* — *"Public repo, or turn on 'Include private contributions'."*

**Export Bar** — primary **Download script** (`--forest` fill, warm-white label, mono); ghost **.bat/.ps1**; ghost **Copy share link** (label swaps to *"Link copied"* 2s); ghost **Export PNG**. All disabled until repo URL + ≥1 painted cell.

**Help Panel** — right slide-over (`--cream`). Numbered run steps (a real sequence), email/branch/visibility detail, relative-shading explainer, and a **cleanup/revert** section reassuring the user they can undo by deleting the throwaway repo.

### Motion
| Moment | Behavior |
|---|---|
| Paint a cell | instant fill + 120ms inset ease-in |
| Shade change | swatch lift 120ms |
| Text render | letters paint left→right, 30ms/column stagger (on type only) |
| Template / spread apply | 200ms fill sweep |
| Script ready | Download button one 1.0→1.02 pulse; readout flips `--forest` |
| Copy link | label cross-fade to "Link copied" |

All motion respects `prefers-reduced-motion` (reveals become instant).

### States & microcopy (voice: plain, active, specific; errors state what + the fix, never apologize)
- *Empty canvas (first load):* faint heart ghost @12% + *"Paint here, or type a word above."*
- *No repo yet:* Download tooltip *"Add your repository URL to download."*
- *Text overflow:* *"That's longer than the canvas. About 8 characters fit."*
- *Future dates painted:* *"Days in the future won't count yet — they'll fill once that date arrives."*
- *Script downloaded:* sage-tint toast *"Script ready. Run it in your terminal — steps are in Help."*

### Accessibility / quality floor
Body text `--charcoal`/`--taupe` only. Full keyboard: `a/s/d/f` shades, arrow keys move a cell cursor, space/enter paints, Esc clears/confirms. Visible `--forest` focus ring. Per-cell screen-reader label (`Mar 15 2025, level 4`). Touch ≥ 44px; horizontal grid scroll never traps the page. Reduced motion honored.

---

## 15. Build order

**Phase 1 — Core painter**
1. Grid component + Zustand store + `dates.ts` (F1)
2. Shade picker + intensity model (F2)
3. Script generator `.sh` + repo input + download (F7)
4. Live preview + commit counter (F5)
5. Pre-flight / Help panel (F8) ← do not skip
6. Windows `.bat/.ps1` output (F7)

**Phase 1.5 — Stickiness**
7. Text-to-graph + font map (F3)
8. Templates (F4)
9. Shareable URL codec (F6)
10. PNG export (F9)
11. Year-Spread mode + presets + regenerate (F10)

**Phase 2 — Delight**
Image → graph, organic commit times/messages, advanced tools, undo/redo, dark mode, shortcuts.

---

## 16. Acceptance criteria

- [ ] No backend, no DB, no auth anywhere. App is a static build deployable to Vercel.
- [ ] Grid is exactly 7×53, cells map to correct dates per §3; out-of-year/future cells disabled.
- [ ] Five shades render the paint scale in §11.2 exactly; `a/s/d/f` select levels.
- [ ] Painting (mouse drag + touch) and erasing work; Clear confirms when non-empty.
- [ ] Text mode renders A–Z/0–9 centered in rows 1–5; overflow clips + warns.
- [ ] Templates load; confirm before overwriting.
- [ ] Spread mode: all five presets fill the whole valid year with weekday-biased randomness; 🔄 produces a different but reproducible spread; counter shows commit estimate.
- [ ] Spread + Paint compose (name stamps on top of a spread).
- [ ] Download produces a valid `.sh` that clones the given repo, auto-detects the default branch, creates the correct backdated empty commits, and pushes. `.bat/.ps1` equivalent also downloads.
- [ ] In Spread mode, generated commit times are randomized (not all 12:00) with varied messages.
- [ ] Share link encodes design+year (and spread seed/preset); opening it restores the exact grid.
- [ ] PNG export downloads an image of the current design.
- [ ] Pre-flight checklist shows the email/branch/visibility guidance with the `git config user.email` chip.
- [ ] Download disabled until a valid repo URL + ≥1 painted cell; disabled reason shown.
- [ ] Design tokens (§11–13) applied exactly; typography triad loaded; focus rings + reduced-motion honored; usable on mobile.

---

## 17. Summary
A deliberately serverless, DB-free design tool. Its restraint is the point: by emitting a **script the user runs themselves**, it sidesteps auth, security, and infra entirely, while four small client-side engines (text→graph, script generation, URL codec, year-spread) deliver everything an OAuth competitor offers — including save/share — at zero backend cost. Build the core painter + safety first; then text, templates, share, and spread to make it spread. Wear a warm paper studio outside, a terminal's precision inside; spend all visual boldness on the canvas and its `#2D5A3D` paint scale, and keep everything else quiet.