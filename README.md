# GitGraph Painter

Paint your GitHub contribution graph before you touch git.

GitGraph Painter is a 100% frontend web app for designing contribution graph art. You paint a 7x53 GitHub-style grid, paste a repository URL, preview the exact commit count, and download a script that you run locally. The app never asks for GitHub login, tokens, OAuth, or repo access.

## What It Does

- Paint individual contribution days with four green intensity levels.
- Render text into the graph using a pixel font.
- Apply templates like heart, arrow, invader, and wave.
- Fill a full year with natural-looking activity using Spread mode.
- Generate `.sh`, `.ps1`, and `.bat` scripts for local execution.
- Export the current design as a PNG.
- Share designs with compressed URL state, no database needed.

## Why It Is Safe

The app does not touch your GitHub account. It only creates a script file.

You run that script on your own machine, where your normal git authentication already exists. The generated script clones your repository, creates backdated empty commits, and pushes them to the default branch.

No backend. No database. No auth. No GitHub API.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- lz-string

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Build

```bash
npm run build
```

## How To Use

1. Choose a year.
2. Paint the grid, type a word, select a template, or use Spread mode.
3. Paste a GitHub repository URL.
4. Review the commit count.
5. Download the script.
6. Run the script locally from your terminal.

For macOS/Linux:

```bash
chmod +x gitgraph-painter.sh
./gitgraph-painter.sh
```

For Windows PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\gitgraph-painter.ps1
```

## GitHub Contribution Rules

For the painting to appear on your GitHub profile:

- Your commit author email must match a verified GitHub email.
- Commits must land on the default branch or `gh-pages`.
- Fork commits do not count.
- Empty commits do count.
- Private repo commits only show publicly if you enable private contributions on your profile.
- GitHub can take a few minutes, sometimes up to 24 hours, to refresh the graph.

## Project Philosophy

GitGraph Painter is deliberately serverless and low-risk. The browser is only a design studio. The actual git work happens locally through a generated script that the user can inspect before running.

That restraint is the product: a warm visual tool on the outside, terminal precision on the inside.
# gitgraph-painting
