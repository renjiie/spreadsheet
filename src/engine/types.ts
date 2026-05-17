export type CellId = string;

export type CellKind = "empty" | "text" | "number" | "formula" | "error";

export type CellError = "CIRCULAR_REF" | "EVAL_ERROR";

export type CellSnapshot = {
  id: CellId;
  raw: string;
  display: string;
  kind: CellKind;
  error?: CellError;
  version: number;
  computed: number | string | null;
};

export type GridDimensions = {
  rows: number;
  cols: number;
};

export const DEFAULT_GRID: GridDimensions = {
  rows: 100,
  cols: 26
};

export const EMPTY_DISPLAY = "";
export const EVAL_ERROR_DISPLAY = "#ERROR!";
export const CIRCULAR_REF_DISPLAY = "CIRCULAR REF";
