# Dependency Graph and Cycle Detection

## Graph Structure

The engine keeps two maps:

- `dependencies`: cell id to the cells it reads.
- `dependents`: cell id to the formulas that read it.

When a formula is edited, old dependency edges are removed before new edges are added. When a formula is replaced by plain text or cleared, its old graph edges are removed.

## Recalculation

`setCellRaw` collects the edited cell plus every downstream dependent through the `dependents` graph. It recalculates that closure and returns only the cell ids whose snapshots changed.

That returned set is what the store uses for targeted notifications.

## Cycle Detection

Before evaluating a recalculation set, the engine walks dependencies with a visiting stack. If a cell appears while already being visited, every cell in that cycle is marked as circular.

Cells in the cycle display `CIRCULAR REF`.
