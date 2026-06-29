import type { SpreadPreset } from "../store/painter-store";
import { parseRepo } from "./repo";
import type { PaintedEntry, ScriptKind } from "./types";

export function generateScript(kind: ScriptKind, repoUrl: string, entries: PaintedEntry[], spreadSeed: number, spreadPreset: SpreadPreset | null) {
  const data = JSON.stringify(entries);
  const organic = Boolean(spreadPreset);
  const total = entries.reduce((sum, item) => sum + item.commits, 0);
  const { repo } = parseRepo(repoUrl);

  if (kind === "ps1") {
    return `$ErrorActionPreference = "Stop"
$repoUrl = "${repoUrl}"
$workDir = "${repo}-gitgraph-paint"
$data = '${data}' | ConvertFrom-Json
$messages = @("paint graph", "shape activity", "studio mark", "daily sketch", "graph pigment")

git clone $repoUrl $workDir
Set-Location $workDir
$defaultBranch = git remote show origin | Select-String "HEAD branch" | ForEach-Object { $_.ToString().Split(":")[1].Trim() }
git checkout $defaultBranch

foreach ($day in $data) {
  for ($i = 0; $i -lt $day.commits; $i++) {
    $hash = [Math]::Abs($day.date.GetHashCode() + ($i * 97) + ${spreadSeed})
    $hour = ${organic ? "9 + ($hash % 9)" : "12"}
    $minute = ${organic ? "($hash * 13) % 60" : "$i"}
    $stamp = "$($day.date)T$($hour.ToString("00")):$($minute.ToString("00")):00"
    $message = $messages[$hash % $messages.Length]
    $env:GIT_AUTHOR_DATE = $stamp
    $env:GIT_COMMITTER_DATE = $stamp
    git commit --allow-empty -m "$message $($day.date) #$($i + 1)"
  }
}

git push origin $defaultBranch
Write-Host "Painted ${total} commits across ${entries.length} days."
`;
  }

  if (kind === "bat") {
    return `@echo off
setlocal enabledelayedexpansion

set "REPO_URL=${repoUrl}"
set "WORK_DIR=${repo}-gitgraph-paint"

git clone "%REPO_URL%" "%WORK_DIR%"
cd /d "%WORK_DIR%"
for /f "tokens=*" %%b in ('git symbolic-ref --short HEAD') do set "BRANCH=%%b"

${entries.map((entry) => `call :commit ${entry.date} ${entry.commits}`).join("\n")}

git push origin "%BRANCH%"
echo Painted ${total} commits across ${entries.length} days.
exit /b 0

:commit
set "DAY=%~1"
set "COUNT=%~2"
for /L %%i in (1,1,%COUNT%) do (
  set /A MINUTE=%%i-1
  set "GIT_AUTHOR_DATE=%DAY%T12:!MINUTE!:00"
  set "GIT_COMMITTER_DATE=%DAY%T12:!MINUTE!:00"
  git commit --allow-empty -m "paint contribution %DAY% #%%i"
)
exit /b 0
`;
  }

  return `#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${repoUrl}"
WORK_DIR="${repo}-gitgraph-paint"

git clone "$REPO_URL" "$WORK_DIR"
cd "$WORK_DIR"
DEFAULT_BRANCH="$(git remote show origin | sed -n '/HEAD branch/s/.*: //p')"
git checkout "$DEFAULT_BRANCH"

node <<'NODE'
const { execFileSync } = require("node:child_process");
const data = ${data};
const organic = ${JSON.stringify(organic)};
const seed = ${spreadSeed};
const messages = ["paint graph", "shape activity", "studio mark", "daily sketch", "graph pigment", "canvas pass"];

function hashDay(day) {
  return [...day].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, seed);
}

for (const day of data) {
  for (let i = 0; i < day.commits; i += 1) {
    const hash = Math.abs(hashDay(day.date) + i * 97);
    const hour = organic ? 9 + (hash % 9) : 12;
    const minute = organic ? (hash * 13) % 60 : i;
    const stamp = \`\${day.date}T\${String(hour).padStart(2, "0")}:\${String(minute).padStart(2, "0")}:00\`;
    const message = organic ? messages[hash % messages.length] : "paint contribution";
    execFileSync("git", ["commit", "--allow-empty", "-m", \`\${message} \${day.date} #\${i + 1}\`], {
      stdio: "inherit",
      env: { ...process.env, GIT_AUTHOR_DATE: stamp, GIT_COMMITTER_DATE: stamp },
    });
  }
}
NODE

git push origin "$DEFAULT_BRANCH"
echo "Painted ${total} commits across ${entries.length} days."
`;
}
