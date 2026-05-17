# Performance

## Virtualization

The grid uses `react-window` `VariableSizeGrid`, rendering only the visible row and column window. This keeps the 26 x 100 grid responsive during scroll.

## Selective Store Subscriptions

The spreadsheet data is not stored as a React grid array. Instead:

- The engine stores cell snapshots by cell id.
- `SpreadsheetStore` keeps `Map<CellId, Set<listener>>`.
- Each visible `Cell` subscribes only to its own id with `useSyncExternalStore`.
- Selection changes notify only the previous active cell, next active cell, and formula bar.
- Cell edits notify only the edited cell and changed dependents returned by the engine.

## Stable Rendering Inputs

`VirtualGrid` receives stable `itemData`, and cell ids are derived from row and column indexes. This avoids passing a changing grid object through every visible cell.

## Scroll Overscan and Width

The virtualized grid renders 10 extra rows and 10 extra columns around the visible window. That gives scrolling a small buffer so newly revealed cells are already mounted.

The grid width is measured from its container with `ResizeObserver`, so the spreadsheet occupies the available layout width instead of leaving unused space on the right.
