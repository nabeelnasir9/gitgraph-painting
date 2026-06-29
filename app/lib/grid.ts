import { CELL_COUNT, COMMITS_BY_LEVEL } from "../store/painter-store";
import type { GridDay, PaintedEntry } from "./types";

export function generateGridDays(year: number): GridDay[] {
  const firstDay = new Date(year, 0, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const today = startOfDay(new Date());

  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      monthLabel: date.getDate() <= 7 ? date.toLocaleDateString("en-US", { month: "short" }) : "",
      disabled: date.getFullYear() !== year || startOfDay(date) > today,
    };
  });
}

export function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function buildPaintedEntries(levels: number[], days: GridDay[]): PaintedEntry[] {
  return levels.flatMap((level, index) => {
    if (level === 0 || days[index].disabled) return [];
    return [{ date: formatDate(days[index].date), commits: COMMITS_BY_LEVEL[level] }];
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
