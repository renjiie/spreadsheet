import { useEffect, useMemo, useRef, useState } from "react";
import {
  VariableSizeGrid,
  type GridChildComponentProps,
  type VariableSizeGrid as VariableSizeGridType
} from "react-window";
import { columnIndexToLabel, parseCellId, toCellId } from "../engine/address";
import { useSelectionView, useSpreadsheetStore } from "../store/SpreadsheetContext";
import { Cell } from "./Cell";
import styles from "./VirtualGrid.module.css";

export const CELL_WIDTH = 118;
export const ROW_HEADER_WIDTH = 54;
export const CELL_HEIGHT = 32;
export const HEADER_HEIGHT = 34;
const MIN_GRID_WIDTH = 720;

type GridData = {
  moveActiveCell: (rowDelta: number, colDelta: number) => void;
};

export function VirtualGrid() {
  const store = useSpreadsheetStore();
  const { activeCell } = useSelectionView();
  const dimensions = store.getDimensions();
  const gridRef = useRef<VariableSizeGridType>(null);
  const gridWrapRef = useRef<HTMLElement>(null);
  const [gridWidth, setGridWidth] = useState(980);

  const moveActiveCell = useMemo(
    () => (rowDelta: number, colDelta: number) => {
      const current = parseCellId(store.getActiveCell());
      const nextRow = clamp(current.row + rowDelta, 0, dimensions.rows - 1);
      const nextCol = clamp(current.col + colDelta, 0, dimensions.cols - 1);
      store.setActiveCell(toCellId(nextRow, nextCol));
    },
    [dimensions.cols, dimensions.rows, store]
  );

  const itemData = useMemo<GridData>(() => ({ moveActiveCell }), [moveActiveCell]);

  useEffect(() => {
    const { row, col } = parseCellId(activeCell);
    gridRef.current?.scrollToItem({
      rowIndex: row + 1,
      columnIndex: col + 1,
      align: "auto"
    });
  }, [activeCell]);

  useEffect(() => {
    const element = gridWrapRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setGridWidth(Math.max(MIN_GRID_WIDTH, Math.floor(element.clientWidth)));
    };

    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <section ref={gridWrapRef} className={styles.gridWrap} aria-label="Spreadsheet grid">
      <VariableSizeGrid
        ref={gridRef}
        className={styles.grid}
        columnCount={dimensions.cols + 1}
        columnWidth={(index) => (index === 0 ? ROW_HEADER_WIDTH : CELL_WIDTH)}
        height={560}
        itemData={itemData}
        overscanColumnCount={10}
        overscanRowCount={10}
        rowCount={dimensions.rows + 1}
        rowHeight={(index) => (index === 0 ? HEADER_HEIGHT : CELL_HEIGHT)}
        width={gridWidth}
      >
        {GridItem}
      </VariableSizeGrid>
    </section>
  );
}

function GridItem({ columnIndex, rowIndex, style, data }: GridChildComponentProps<GridData>) {
  if (rowIndex === 0 && columnIndex === 0) {
    return <div className={styles.corner} style={style} />;
  }

  if (rowIndex === 0) {
    return (
      <div className={styles.columnHeader} style={style}>
        {columnIndexToLabel(columnIndex - 1)}
      </div>
    );
  }

  if (columnIndex === 0) {
    return (
      <div className={styles.rowHeader} style={style}>
        {rowIndex}
      </div>
    );
  }

  const cellId = toCellId(rowIndex - 1, columnIndex - 1);
  return <Cell cellId={cellId} moveActiveCell={data.moveActiveCell} style={style} />;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
