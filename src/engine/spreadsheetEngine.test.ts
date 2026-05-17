import { describe, expect, it } from "vitest";
import { SpreadsheetEngine } from "./SpreadsheetEngine";

describe("SpreadsheetEngine", () => {
  it("evaluates numbers, text, arithmetic, references, and functions", () => {
    const engine = new SpreadsheetEngine();

    engine.setCellRaw("A1", "10");
    engine.setCellRaw("A2", "20");
    engine.setCellRaw("A3", "hello");
    engine.setCellRaw("B1", "=A1+A2*2");
    engine.setCellRaw("B2", "=SUM(A1:A2)");
    engine.setCellRaw("B3", "=AVERAGE(A1:A2)");
    engine.setCellRaw("B4", "=MIN(A1:A2)");
    engine.setCellRaw("B5", "=MAX(A1:A2)");
    engine.setCellRaw("B6", "=COUNT(A1:A3)");

    expect(engine.getCellSnapshot("A1").display).toBe("10");
    expect(engine.getCellSnapshot("A3").kind).toBe("text");
    expect(engine.getCellSnapshot("B1").display).toBe("50");
    expect(engine.getCellSnapshot("B2").display).toBe("30");
    expect(engine.getCellSnapshot("B3").display).toBe("15");
    expect(engine.getCellSnapshot("B4").display).toBe("10");
    expect(engine.getCellSnapshot("B5").display).toBe("20");
    expect(engine.getCellSnapshot("B6").display).toBe("2");
  });

  it("recalculates only the edited cell and dependent cells", () => {
    const engine = new SpreadsheetEngine();

    engine.setCellRaw("A1", "10");
    engine.setCellRaw("B1", "=A1*2");
    engine.setCellRaw("C1", "unrelated");

    const affected = engine.setCellRaw("A1", "7");

    expect([...affected].sort()).toEqual(["A1", "B1"]);
    expect(engine.getCellSnapshot("B1").display).toBe("14");
    expect(engine.getCellSnapshot("C1").version).toBe(1);

    const formulaRemoval = engine.setCellRaw("B1", "plain");
    expect([...formulaRemoval].sort()).toEqual(["B1"]);

    const secondEdit = engine.setCellRaw("A1", "3");
    expect([...secondEdit]).toEqual(["A1"]);
    expect(engine.getCellSnapshot("B1").display).toBe("plain");
  });

  it("updates dependency graph edges when a formula changes references", () => {
    const engine = new SpreadsheetEngine();

    engine.setCellRaw("A1", "1");
    engine.setCellRaw("B1", "10");
    engine.setCellRaw("C1", "=A1+1");

    expect(engine.getCellSnapshot("C1").display).toBe("2");

    const retargeted = engine.setCellRaw("C1", "=B1+1");
    expect([...retargeted]).toEqual(["C1"]);
    expect(engine.getCellSnapshot("C1").display).toBe("11");

    const oldSourceEdit = engine.setCellRaw("A1", "2");
    expect([...oldSourceEdit]).toEqual(["A1"]);
    expect(engine.getCellSnapshot("C1").display).toBe("11");

    const newSourceEdit = engine.setCellRaw("B1", "20");
    expect([...newSourceEdit].sort()).toEqual(["B1", "C1"]);
    expect(engine.getCellSnapshot("C1").display).toBe("21");
  });

  it("propagates recalculation through multiple dependent levels", () => {
    const engine = new SpreadsheetEngine();

    engine.setCellRaw("A1", "2");
    engine.setCellRaw("B1", "=A1*3");
    engine.setCellRaw("C1", "=B1+4");
    engine.setCellRaw("D1", "=C1/2");

    const affected = engine.setCellRaw("A1", "6");

    expect([...affected].sort()).toEqual(["A1", "B1", "C1", "D1"]);
    expect(engine.getCellSnapshot("B1").display).toBe("18");
    expect(engine.getCellSnapshot("C1").display).toBe("22");
    expect(engine.getCellSnapshot("D1").display).toBe("11");
  });

  it("marks circular dependencies without crashing dependents", () => {
    const engine = new SpreadsheetEngine();

    engine.setCellRaw("A1", "=B1");
    engine.setCellRaw("B1", "=A1");
    engine.setCellRaw("C1", "=A1+1");

    expect(engine.getCellSnapshot("A1").display).toBe("CIRCULAR REF");
    expect(engine.getCellSnapshot("B1").display).toBe("CIRCULAR REF");
    expect(engine.getCellSnapshot("C1").display).toBe("#ERROR!");
    expect(engine.getCellSnapshot("A1").kind).toBe("error");
  });

  it("clears circular errors and propagates values after a cycle is broken", () => {
    const engine = new SpreadsheetEngine();

    engine.setCellRaw("A1", "=B1");
    engine.setCellRaw("B1", "=A1");
    engine.setCellRaw("C1", "=A1+1");

    const affected = engine.setCellRaw("B1", "4");

    expect([...affected].sort()).toEqual(["A1", "B1", "C1"]);
    expect(engine.getCellSnapshot("A1").display).toBe("4");
    expect(engine.getCellSnapshot("B1").display).toBe("4");
    expect(engine.getCellSnapshot("C1").display).toBe("5");
  });

  it("renders invalid formulas, invalid references, and division by zero as errors", () => {
    const engine = new SpreadsheetEngine();

    engine.setCellRaw("A1", "=1/");
    engine.setCellRaw("A2", "=AA1");
    engine.setCellRaw("A3", "=1/0");

    expect(engine.getCellSnapshot("A1").display).toBe("#ERROR!");
    expect(engine.getCellSnapshot("A2").display).toBe("#ERROR!");
    expect(engine.getCellSnapshot("A3").display).toBe("#ERROR!");
  });
});
