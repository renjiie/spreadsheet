import {
  memo,
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState
} from "react";
import type { CellId } from "../engine/types";
import { useCellView, useSpreadsheetStore } from "../store/SpreadsheetContext";
import styles from "./Cell.module.css";

type CellProps = {
  cellId: CellId;
  style: CSSProperties;
  moveActiveCell: (rowDelta: number, colDelta: number) => void;
};

export const Cell = memo(function Cell({ cellId, style, moveActiveCell }: CellProps) {
  const store = useSpreadsheetStore();
  const { snapshot, isActive } = useCellView(cellId);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isActive && !isEditing) {
      rootRef.current?.focus();
    }
  }, [isActive, isEditing]);

  const startEditing = () => {
    store.setActiveCell(cellId);
    setDraft(snapshot.raw);
    skipBlurCommitRef.current = false;
    setIsEditing(true);
  };

  const commit = (rowDelta: number, colDelta: number) => {
    store.setCellRaw(cellId, draft);
    setIsEditing(false);
    moveActiveCell(rowDelta, colDelta);
  };

  const cancel = () => {
    skipBlurCommitRef.current = true;
    setDraft(snapshot.raw);
    setIsEditing(false);
    rootRef.current?.focus();
  };

  const handleCellKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        moveActiveCell(-1, 0);
        return;
      }
      startEditing();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      moveActiveCell(0, event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveCell(-1, 0);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveCell(1, 0);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveActiveCell(0, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveActiveCell(0, 1);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      commit(event.shiftKey ? -1 : 1, 0);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      commit(0, event.shiftKey ? -1 : 1);
    }
  };

  return (
    <div
      ref={rootRef}
      aria-label={`${cellId} ${snapshot.display}`}
      className={[
        styles.cell,
        styles[snapshot.kind],
        isActive ? styles.active : "",
        isEditing ? styles.editing : ""
      ].join(" ")}
      data-testid={`cell-${cellId}`}
      onClick={() => store.setActiveCell(cellId)}
      onDoubleClick={startEditing}
      onKeyDown={handleCellKeyDown}
      role="gridcell"
      style={style}
      tabIndex={isActive && !isEditing ? 0 : -1}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          aria-label={`Edit ${cellId}`}
          autoFocus
          className={styles.editor}
          data-testid={`editor-${cellId}`}
          value={draft}
          onBlur={() => {
            if (skipBlurCommitRef.current) {
              skipBlurCommitRef.current = false;
              return;
            }
            commit(0, 0);
          }}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={handleInputKeyDown}
        />
      ) : (
        <span className={styles.value}>{snapshot.display}</span>
      )}
    </div>
  );
});
