# Interactive Spreadsheet

A React + Vite + TypeScript spreadsheet assignment with a custom calculation engine, virtualized rendering, formula support, dependency tracking, keyboard editing, and focused documentation.

## Features

- 26 x 100 spreadsheet grid with `A` through `Z` column headers and numbered row headers.
- `react-window` virtualization so only visible cells render.
- Cell selection by click, edit mode by double-click or `Enter`.
- Commit edits with `Enter`, `Tab`, or blur.
- Discard edits with `Escape`.
- Keyboard movement with arrows, `Tab`, `Shift+Tab`, `Enter`, and `Shift+Enter`.
- Formula evaluation for references, arithmetic, parentheses, ranges, `SUM`, `AVERAGE`, `MIN`, `MAX`, and `COUNT`.
- Dependency tracking with selective recalculation and keyed cell subscriptions.
- Circular references display `CIRCULAR REF`; other formula errors display `#ERROR!`.
- Formula bar shows the selected cell and raw formula.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Verification

```bash
npm run test
npm run build
```

## Documentation

- [Architecture](docs/architecture.md)
- [Formula Parsing and Evaluation](docs/formulas.md)
- [Dependency Graph and Cycle Detection](docs/dependency-graph.md)
- [Performance](docs/performance.md)
- [Testing](docs/testing.md)
