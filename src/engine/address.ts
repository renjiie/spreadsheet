import { DEFAULT_GRID, type CellId, type GridDimensions } from "./types";

const CELL_ID_PATTERN = /^([A-Z]+)([1-9]\d*)$/i;

export function columnIndexToLabel(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid column index: ${index}`);
  }

  let label = "";
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

export function columnLabelToIndex(label: string): number {
  if (!/^[A-Z]+$/i.test(label)) {
    throw new Error(`Invalid column label: ${label}`);
  }

  return label
    .toUpperCase()
    .split("")
    .reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

export function toCellId(row: number, col: number): CellId {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0) {
    throw new Error(`Invalid cell coordinates: ${row}, ${col}`);
  }

  return `${columnIndexToLabel(col)}${row + 1}`;
}

export function parseCellId(cellId: CellId): { row: number; col: number } {
  const match = CELL_ID_PATTERN.exec(cellId.trim());

  if (!match) {
    throw new Error(`Invalid cell id: ${cellId}`);
  }

  return {
    col: columnLabelToIndex(match[1]),
    row: Number(match[2]) - 1
  };
}

export function isCellWithinGrid(
  cellId: CellId,
  dimensions: GridDimensions = DEFAULT_GRID
): boolean {
  try {
    const { row, col } = parseCellId(cellId);
    return row >= 0 && row < dimensions.rows && col >= 0 && col < dimensions.cols;
  } catch {
    return false;
  }
}

export function normalizeCellId(cellId: CellId): CellId {
  const { row, col } = parseCellId(cellId);
  return toCellId(row, col);
}

export function assertCellInGrid(
  cellId: CellId,
  dimensions: GridDimensions = DEFAULT_GRID
): CellId {
  const normalized = normalizeCellId(cellId);

  if (!isCellWithinGrid(normalized, dimensions)) {
    throw new Error(`Cell ${cellId} is outside the configured grid`);
  }

  return normalized;
}

export function expandRange(
  range: string,
  dimensions: GridDimensions = DEFAULT_GRID
): CellId[] {
  const [start, end] = range.split(":");

  if (!start || !end) {
    throw new Error(`Invalid range: ${range}`);
  }

  const startCell = assertCellInGrid(start, dimensions);
  const endCell = assertCellInGrid(end, dimensions);
  const a = parseCellId(startCell);
  const b = parseCellId(endCell);
  const minRow = Math.min(a.row, b.row);
  const maxRow = Math.max(a.row, b.row);
  const minCol = Math.min(a.col, b.col);
  const maxCol = Math.max(a.col, b.col);
  const cells: CellId[] = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      cells.push(toCellId(row, col));
    }
  }

  return cells;
}
