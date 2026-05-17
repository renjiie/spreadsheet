import { assertCellInGrid, expandRange } from "./address";
import { parseFormula, type FormulaAst, type ParsedFormula } from "./formula";
import {
  CIRCULAR_REF_DISPLAY,
  DEFAULT_GRID,
  EMPTY_DISPLAY,
  EVAL_ERROR_DISPLAY,
  type CellError,
  type CellId,
  type CellKind,
  type CellSnapshot,
  type GridDimensions
} from "./types";

type EvaluationResult =
  | { ok: true; value: number | string | null; display: string; kind: CellKind }
  | { ok: false; error: CellError; display: string };

export class SpreadsheetEngine {
  private readonly dimensions: GridDimensions;
  private readonly rawCells = new Map<CellId, string>();
  private readonly snapshots = new Map<CellId, CellSnapshot>();
  private readonly parsedFormulas = new Map<CellId, ParsedFormula | null>();
  private readonly dependencies = new Map<CellId, Set<CellId>>();
  private readonly dependents = new Map<CellId, Set<CellId>>();

  constructor(dimensions: GridDimensions = DEFAULT_GRID) {
    this.dimensions = dimensions;
  }

  getDimensions(): GridDimensions {
    return this.dimensions;
  }

  getCellSnapshot(cellId: CellId): CellSnapshot {
    const id = assertCellInGrid(cellId, this.dimensions);
    const existing = this.snapshots.get(id);
    if (existing) {
      return existing;
    }

    const empty = this.createEmptySnapshot(id);
    this.snapshots.set(id, empty);
    return empty;
  }

  setCellRaw(cellId: CellId, rawValue: string): Set<CellId> {
    const id = assertCellInGrid(cellId, this.dimensions);
    const raw = rawValue.trim();
    const previousRaw = this.rawCells.get(id) ?? "";

    if (previousRaw === raw) {
      return new Set();
    }

    if (raw === "") {
      this.rawCells.delete(id);
    } else {
      this.rawCells.set(id, raw);
    }

    this.updateDependencies(id, raw);

    const recalculationSet = this.collectRecalculationSet(id);
    return this.recalculate(recalculationSet);
  }

  private updateDependencies(cellId: CellId, raw: string): void {
    const oldDependencies = this.dependencies.get(cellId) ?? new Set<CellId>();
    for (const dependency of oldDependencies) {
      this.dependents.get(dependency)?.delete(cellId);
    }

    this.dependencies.delete(cellId);
    this.parsedFormulas.delete(cellId);

    if (!this.isFormula(raw)) {
      return;
    }

    try {
      const parsed = parseFormula(raw.slice(1), this.dimensions);
      this.parsedFormulas.set(cellId, parsed);
      this.dependencies.set(cellId, parsed.dependencies);
      for (const dependency of parsed.dependencies) {
        if (!this.dependents.has(dependency)) {
          this.dependents.set(dependency, new Set());
        }
        this.dependents.get(dependency)?.add(cellId);
      }
    } catch {
      this.parsedFormulas.set(cellId, null);
      this.dependencies.set(cellId, new Set());
    }
  }

  private collectRecalculationSet(root: CellId): Set<CellId> {
    const visited = new Set<CellId>();
    const queue = [root];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      for (const dependent of this.dependents.get(current) ?? []) {
        queue.push(dependent);
      }
    }

    return visited;
  }

  private recalculate(cellIds: Set<CellId>): Set<CellId> {
    const changed = new Set<CellId>();
    const memo = new Map<CellId, EvaluationResult>();
    const circularCells = this.findCircularCells(cellIds);

    for (const cellId of cellIds) {
      const previous = this.getCellSnapshot(cellId);
      const next = this.snapshotFromEvaluation(
        cellId,
        circularCells.has(cellId)
          ? { ok: false, error: "CIRCULAR_REF", display: CIRCULAR_REF_DISPLAY }
          : this.evaluateCell(cellId, memo, circularCells)
      );

      if (!snapshotsEqual(previous, next)) {
        this.snapshots.set(cellId, { ...next, version: previous.version + 1 });
        changed.add(cellId);
      }
    }

    return changed;
  }

  private findCircularCells(cellIds: Set<CellId>): Set<CellId> {
    const circular = new Set<CellId>();
    const visited = new Set<CellId>();
    const visiting = new Set<CellId>();
    const path: CellId[] = [];

    const visit = (cellId: CellId): void => {
      if (visiting.has(cellId)) {
        const cycleStart = path.indexOf(cellId);
        for (const cycleCell of path.slice(cycleStart)) {
          circular.add(cycleCell);
        }
        circular.add(cellId);
        return;
      }

      if (visited.has(cellId)) {
        return;
      }

      visiting.add(cellId);
      path.push(cellId);

      for (const dependency of this.dependencies.get(cellId) ?? []) {
        visit(dependency);
      }

      path.pop();
      visiting.delete(cellId);
      visited.add(cellId);
    };

    for (const cellId of cellIds) {
      visit(cellId);
    }

    return circular;
  }

  private evaluateCell(
    cellId: CellId,
    memo: Map<CellId, EvaluationResult>,
    circularCells: Set<CellId>
  ): EvaluationResult {
    if (memo.has(cellId)) {
      return memo.get(cellId)!;
    }

    if (circularCells.has(cellId)) {
      const result: EvaluationResult = {
        ok: false,
        error: "CIRCULAR_REF",
        display: CIRCULAR_REF_DISPLAY
      };
      memo.set(cellId, result);
      return result;
    }

    const raw = this.rawCells.get(cellId) ?? "";
    const result = this.evaluateRaw(cellId, raw, memo, circularCells);
    memo.set(cellId, result);
    return result;
  }

  private evaluateRaw(
    cellId: CellId,
    raw: string,
    memo: Map<CellId, EvaluationResult>,
    circularCells: Set<CellId>
  ): EvaluationResult {
    if (raw === "") {
      return { ok: true, value: null, display: EMPTY_DISPLAY, kind: "empty" };
    }

    if (!this.isFormula(raw)) {
      const numericValue = Number(raw);
      if (raw.trim() !== "" && Number.isFinite(numericValue)) {
        return {
          ok: true,
          value: numericValue,
          display: formatNumber(numericValue),
          kind: "number"
        };
      }
      return { ok: true, value: raw, display: raw, kind: "text" };
    }

    const parsed = this.parsedFormulas.get(cellId);
    if (!parsed) {
      return { ok: false, error: "EVAL_ERROR", display: EVAL_ERROR_DISPLAY };
    }

    try {
      const value = this.evaluateAst(parsed.ast, memo, circularCells);
      return {
        ok: true,
        value,
        display: formatNumber(value),
        kind: "formula"
      };
    } catch {
      return { ok: false, error: "EVAL_ERROR", display: EVAL_ERROR_DISPLAY };
    }
  }

  private evaluateAst(
    ast: FormulaAst,
    memo: Map<CellId, EvaluationResult>,
    circularCells: Set<CellId>
  ): number {
    switch (ast.type) {
      case "number":
        return ast.value;
      case "ref":
        return this.numericValueForReference(ast.cellId, memo, circularCells);
      case "range":
        throw new Error("Ranges can only be used as function arguments");
      case "unary":
        return -this.evaluateAst(ast.expression, memo, circularCells);
      case "binary":
        return this.evaluateBinary(ast, memo, circularCells);
      case "function":
        return this.evaluateFunction(ast, memo, circularCells);
    }
  }

  private evaluateBinary(
    ast: Extract<FormulaAst, { type: "binary" }>,
    memo: Map<CellId, EvaluationResult>,
    circularCells: Set<CellId>
  ): number {
    const left = this.evaluateAst(ast.left, memo, circularCells);
    const right = this.evaluateAst(ast.right, memo, circularCells);

    if (ast.operator === "/" && right === 0) {
      throw new Error("Division by zero");
    }

    switch (ast.operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
    }
  }

  private evaluateFunction(
    ast: Extract<FormulaAst, { type: "function" }>,
    memo: Map<CellId, EvaluationResult>,
    circularCells: Set<CellId>
  ): number {
    const values = ast.args.flatMap((arg) => this.valuesForFunctionArg(arg, memo, circularCells));

    switch (ast.name) {
      case "SUM":
        return values.reduce((total, value) => total + value, 0);
      case "AVERAGE":
        return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
      case "MIN":
        return values.length === 0 ? 0 : Math.min(...values);
      case "MAX":
        return values.length === 0 ? 0 : Math.max(...values);
      case "COUNT":
        return values.length;
      default:
        throw new Error(`Unsupported function: ${ast.name}`);
    }
  }

  private valuesForFunctionArg(
    ast: FormulaAst,
    memo: Map<CellId, EvaluationResult>,
    circularCells: Set<CellId>
  ): number[] {
    if (ast.type === "range") {
      return expandRange(`${ast.from}:${ast.to}`, this.dimensions).flatMap((cellId) => {
        const result = this.evaluateCell(cellId, memo, circularCells);
        if (!result.ok) {
          throw new Error(result.display);
        }
        return typeof result.value === "number" ? [result.value] : [];
      });
    }

    return [this.evaluateAst(ast, memo, circularCells)];
  }

  private numericValueForReference(
    cellId: CellId,
    memo: Map<CellId, EvaluationResult>,
    circularCells: Set<CellId>
  ): number {
    const id = assertCellInGrid(cellId, this.dimensions);
    const result = this.evaluateCell(id, memo, circularCells);

    if (!result.ok) {
      throw new Error(result.display);
    }

    return typeof result.value === "number" ? result.value : 0;
  }

  private snapshotFromEvaluation(cellId: CellId, result: EvaluationResult): CellSnapshot {
    const raw = this.rawCells.get(cellId) ?? "";
    const base = this.getCellSnapshot(cellId);

    if (!result.ok) {
      return {
        id: cellId,
        raw,
        display: result.display,
        kind: "error",
        error: result.error,
        computed: null,
        version: base.version
      };
    }

    return {
      id: cellId,
      raw,
      display: result.display,
      kind: result.kind,
      computed: result.value,
      version: base.version
    };
  }

  private createEmptySnapshot(cellId: CellId): CellSnapshot {
    return {
      id: cellId,
      raw: "",
      display: EMPTY_DISPLAY,
      kind: "empty",
      computed: null,
      version: 0
    };
  }

  private isFormula(raw: string): boolean {
    return raw.startsWith("=");
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(8)));
}

function snapshotsEqual(a: CellSnapshot, b: CellSnapshot): boolean {
  return (
    a.raw === b.raw &&
    a.display === b.display &&
    a.kind === b.kind &&
    a.error === b.error &&
    a.computed === b.computed
  );
}
