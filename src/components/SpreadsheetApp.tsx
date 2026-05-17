import { SpreadsheetProvider } from "../store/SpreadsheetContext";
import { SpreadsheetStore } from "../store/SpreadsheetStore";
import { FormulaBar } from "./FormulaBar";
import styles from "./SpreadsheetApp.module.css";
import { VirtualGrid } from "./VirtualGrid";

type SpreadsheetAppProps = {
  store?: SpreadsheetStore;
};

export function SpreadsheetApp({ store }: SpreadsheetAppProps) {
  return (
    <SpreadsheetProvider store={store}>
      <main className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1>Interactive Spreadsheet</h1>
            <p>Virtualized grid with formulas, dependency tracking, and selective updates.</p>
          </div>
        </header>
        <FormulaBar />
        <VirtualGrid />
      </main>
    </SpreadsheetProvider>
  );
}
