import { type KeyboardEvent, useEffect, useState } from "react";
import { EVAL_ERROR_DISPLAY } from "../engine/types";
import { useSelectionView, useSpreadsheetStore } from "../store/SpreadsheetContext";
import styles from "./FormulaBar.module.css";

export function FormulaBar() {
  const store = useSpreadsheetStore();
  const { activeCell, snapshot } = useSelectionView();
  const [draft, setDraft] = useState(snapshot.raw);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const isFocused = focusedCell === activeCell;
  const displayValue = isFocused ? draft : snapshot.kind === "error" ? EVAL_ERROR_DISPLAY : snapshot.raw;

  useEffect(() => {
    if (!isFocused) {
      setDraft(snapshot.raw);
    }
  }, [activeCell, isFocused, snapshot.raw]);

  const commit = () => {
    store.setCellRaw(activeCell, draft);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(snapshot.raw);
      event.currentTarget.blur();
    }
  };

  return (
    <section className={styles.bar} aria-label="Formula bar">
      <div className={styles.address} data-testid="active-cell-address">
        {activeCell}
      </div>
      <input
        aria-label="Formula input"
        className={styles.input}
        data-testid="formula-input"
        value={displayValue}
        onBlur={() => {
          if (isFocused) {
            commit();
          }
          setFocusedCell(null);
        }}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onFocus={() => {
          setFocusedCell(activeCell);
          setDraft(snapshot.raw);
        }}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.valueLabel}>Value</div>
      <div className={styles.value}>{snapshot.display}</div>
    </section>
  );
}
