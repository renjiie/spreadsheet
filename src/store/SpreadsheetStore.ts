import { assertCellInGrid } from "../engine/address";
import { SpreadsheetEngine } from "../engine/SpreadsheetEngine";
import type { CellId, CellSnapshot } from "../engine/types";

type Listener = () => void;

export class SpreadsheetStore {
  private readonly engine: SpreadsheetEngine;
  private readonly cellListeners = new Map<CellId, Set<Listener>>();
  private readonly selectionListeners = new Set<Listener>();
  private activeCell: CellId = "A1";
  private selectionVersion = 0;

  constructor(engine = new SpreadsheetEngine()) {
    this.engine = engine;
  }

  getDimensions() {
    return this.engine.getDimensions();
  }

  getCellSnapshot(cellId: CellId): CellSnapshot {
    return this.engine.getCellSnapshot(cellId);
  }

  getActiveCell(): CellId {
    return this.activeCell;
  }

  getActiveCellSnapshot(): CellSnapshot {
    return this.getCellSnapshot(this.activeCell);
  }

  getSelectionVersion(): number {
    return this.selectionVersion;
  }

  setCellRaw(cellId: CellId, raw: string): Set<CellId> {
    const affected = this.engine.setCellRaw(cellId, raw);
    this.notifyCells(affected);
    this.notifySelection();
    return affected;
  }

  setActiveCell(cellId: CellId): void {
    const next = assertCellInGrid(cellId, this.engine.getDimensions());
    const previous = this.activeCell;

    if (previous === next) {
      return;
    }

    this.activeCell = next;
    this.notifyCells(new Set([previous, next]));
    this.notifySelection();
  }

  subscribeCell(cellId: CellId, listener: Listener): () => void {
    const id = assertCellInGrid(cellId, this.engine.getDimensions());
    if (!this.cellListeners.has(id)) {
      this.cellListeners.set(id, new Set());
    }

    this.cellListeners.get(id)?.add(listener);
    return () => {
      this.cellListeners.get(id)?.delete(listener);
    };
  }

  subscribeSelection(listener: Listener): () => void {
    this.selectionListeners.add(listener);
    return () => {
      this.selectionListeners.delete(listener);
    };
  }

  notifyCells(cellIds: Set<CellId>): void {
    for (const cellId of cellIds) {
      for (const listener of this.cellListeners.get(cellId) ?? []) {
        listener();
      }
    }
  }

  private notifySelection(): void {
    this.selectionVersion += 1;
    for (const listener of this.selectionListeners) {
      listener();
    }
  }
}
