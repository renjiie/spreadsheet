import { describe, expect, it } from "vitest";
import { SpreadsheetStore } from "./SpreadsheetStore";

describe("SpreadsheetStore", () => {
  it("notifies only the edited cell and dependent cell listeners", () => {
    const store = new SpreadsheetStore();
    const notifications: string[] = [];

    store.setCellRaw("A1", "1");
    store.setCellRaw("B1", "=A1+1");
    store.setCellRaw("C1", "unrelated");

    store.subscribeCell("A1", () => notifications.push("A1"));
    store.subscribeCell("B1", () => notifications.push("B1"));
    store.subscribeCell("C1", () => notifications.push("C1"));

    const affected = store.setCellRaw("A1", "2");

    expect([...affected].sort()).toEqual(["A1", "B1"]);
    expect(notifications.sort()).toEqual(["A1", "B1"]);
  });

  it("notifies a full dependency chain when a source cell changes", () => {
    const store = new SpreadsheetStore();
    const notifications: string[] = [];

    store.setCellRaw("A1", "2");
    store.setCellRaw("B1", "=A1+1");
    store.setCellRaw("C1", "=B1+1");
    store.setCellRaw("D1", "static");

    for (const cellId of ["A1", "B1", "C1", "D1"]) {
      store.subscribeCell(cellId, () => notifications.push(cellId));
    }

    const affected = store.setCellRaw("A1", "5");

    expect([...affected].sort()).toEqual(["A1", "B1", "C1"]);
    expect(notifications.sort()).toEqual(["A1", "B1", "C1"]);
    expect(store.getCellSnapshot("C1").display).toBe("7");
  });

  it("notifies only previous and next active cells when selection changes", () => {
    const store = new SpreadsheetStore();
    const notifications: string[] = [];

    store.subscribeCell("A1", () => notifications.push("A1"));
    store.subscribeCell("B1", () => notifications.push("B1"));
    store.subscribeCell("C1", () => notifications.push("C1"));

    store.setActiveCell("A1");
    store.setActiveCell("B1");

    expect(notifications).toEqual(["A1", "B1"]);
  });
});
