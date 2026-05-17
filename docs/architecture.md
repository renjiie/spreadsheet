# Architecture

## Overview

The app is split into three layers:

1. `src/engine`: UI-independent spreadsheet data model, parser, evaluator, dependency graph, and snapshots.
2. `src/store`: external subscription store that bridges the engine to React.
3. `src/components`: formula bar, virtualized grid, headers, and editable cells.

This keeps formula correctness and dependency behavior testable without React.

## Engine Layer

`SpreadsheetEngine` owns raw cell values, computed snapshots, parsed formulas, dependency edges, and reverse dependent edges.

The public engine methods are intentionally small:

- `setCellRaw(cellId, raw)` updates one cell and returns the set of cells whose snapshots changed.
- `getCellSnapshot(cellId)` returns the stable display snapshot for one cell.
- `getDimensions()` exposes the configured grid size.

## Store Layer

`SpreadsheetStore` keeps the engine outside React state. Cells subscribe by cell id, and selection uses a separate subscription channel.

This prevents an edit in `A1` from replacing a whole grid object and causing broad rerenders.

## UI Layer

The UI receives cell snapshots through `useSyncExternalStore`.

`VirtualGrid` renders the spreadsheet through `react-window` `VariableSizeGrid`. `Cell` handles selection, edit mode, commit/cancel behavior, and keyboard movement. `FormulaBar` subscribes only to selection state.
