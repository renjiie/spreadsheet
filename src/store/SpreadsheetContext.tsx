import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useSyncExternalStore
} from "react";
import type { CellId } from "../engine/types";
import { SpreadsheetStore } from "./SpreadsheetStore";

const SpreadsheetContext = createContext<SpreadsheetStore | null>(null);

export function SpreadsheetProvider({
  children,
  store
}: PropsWithChildren<{ store?: SpreadsheetStore }>) {
  const stableStore = useMemo(() => store ?? new SpreadsheetStore(), [store]);

  return (
    <SpreadsheetContext.Provider value={stableStore}>
      {children}
    </SpreadsheetContext.Provider>
  );
}

export function useSpreadsheetStore(): SpreadsheetStore {
  const store = useContext(SpreadsheetContext);
  if (!store) {
    throw new Error("useSpreadsheetStore must be used inside SpreadsheetProvider");
  }
  return store;
}

export function useCellView(cellId: CellId) {
  const store = useSpreadsheetStore();
  const snapshot = useSyncExternalStore(
    (listener) => store.subscribeCell(cellId, listener),
    () => store.getCellSnapshot(cellId),
    () => store.getCellSnapshot(cellId)
  );
  const isActive = useSyncExternalStore(
    (listener) => store.subscribeCell(cellId, listener),
    () => store.getActiveCell() === cellId,
    () => store.getActiveCell() === cellId
  );

  return { snapshot, isActive };
}

export function useSelectionView() {
  const store = useSpreadsheetStore();
  useSyncExternalStore(
    (listener) => store.subscribeSelection(listener),
    () => store.getSelectionVersion(),
    () => store.getSelectionVersion()
  );

  return {
    activeCell: store.getActiveCell(),
    snapshot: store.getActiveCellSnapshot()
  };
}
