import { blankGrid, CELL_COUNT, COLS, ROWS } from "../store/painter-store";

export const TEMPLATES = [
  { name: "Heart", cells: [[1, 12], [1, 13], [1, 15], [1, 16], [2, 11], [2, 14], [2, 17], [3, 11], [3, 17], [4, 12], [4, 16], [5, 13], [5, 15], [6, 14]] },
  { name: "Arrow", cells: [[3, 12], [3, 13], [3, 14], [3, 15], [3, 16], [3, 17], [2, 16], [1, 15], [4, 16], [5, 15]] },
  { name: "Invader", cells: [[1, 12], [1, 16], [2, 13], [2, 15], [3, 12], [3, 13], [3, 14], [3, 15], [3, 16], [4, 11], [4, 13], [4, 14], [4, 15], [4, 17], [5, 11], [5, 17], [6, 12], [6, 16]] },
  { name: "Wave", cells: [[3, 5], [2, 6], [1, 7], [1, 8], [2, 9], [3, 10], [4, 11], [5, 12], [5, 13], [4, 14], [3, 15], [2, 16], [1, 17], [1, 18], [2, 19], [3, 20]] },
] as const;

export function drawTemplateToGrid(templateName: string, level: number) {
  const next = blankGrid();
  const template = TEMPLATES.find((item) => item.name === templateName);
  if (!template) return next;
  const colOffset = Math.floor((COLS - 24) / 2);

  template.cells.forEach(([row, col]) => {
    const gridIndex = (col + colOffset) * ROWS + row;
    if (gridIndex >= 0 && gridIndex < CELL_COUNT) next[gridIndex] = level;
  });

  return next;
}

export function stampTemplateOnGrid(base: number[], templateName: string, level: number) {
  const next = [...base];
  const stamp = drawTemplateToGrid(templateName, level);
  stamp.forEach((cellLevel, index) => {
    if (cellLevel > 0) next[index] = cellLevel;
  });
  return next;
}
