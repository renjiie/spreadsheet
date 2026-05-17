# Testing

## Test Stack

Tests use Vitest, React Testing Library, `@testing-library/user-event`, and jsdom.

Run:

```bash
npm run test
```

Coverage report:

```bash
npm run coverage
```

## Engine Coverage

Engine tests cover:

- Address conversion and range expansion.
- Numbers, text, arithmetic, references, and functions.
- Dependency recalculation after edits.
- Dependency edge removal when formulas become text.
- Circular dependency display.
- Invalid formulas, invalid references, and division by zero.

## Store Coverage

Store tests verify that cell listeners are called only for edited or dependent cells, and that selection movement notifies only previous and next active cells.

## UI Coverage

UI integration tests cover:

- Click selection.
- Double-click editing.
- `Enter`, `Tab`, `Shift+Tab`, and `Shift+Enter` flows.
- `Escape` discarding drafts.
- Formula bar showing raw formulas.
- Dependent cell updates after a source cell edit.
