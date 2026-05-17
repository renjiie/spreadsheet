import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SpreadsheetApp } from "./SpreadsheetApp";

describe("SpreadsheetApp", () => {
  it("selects, edits, commits, navigates, and displays formulas", async () => {
    const user = userEvent.setup();
    render(<SpreadsheetApp />);

    await user.click(screen.getByTestId("cell-A1"));
    expect(screen.getByTestId("active-cell-address")).toHaveTextContent("A1");

    await user.dblClick(screen.getByTestId("cell-A1"));
    await user.type(screen.getByTestId("editor-A1"), "5{Enter}");
    expect(screen.getByTestId("cell-A1")).toHaveTextContent("5");
    expect(screen.getByTestId("active-cell-address")).toHaveTextContent("A2");

    await user.click(screen.getByTestId("cell-B1"));
    await user.keyboard("{Enter}");
    await user.type(screen.getByTestId("editor-B1"), "=A1*2{Tab}");
    expect(screen.getByTestId("cell-B1")).toHaveTextContent("10");
    expect(screen.getByTestId("formula-input")).toHaveValue("");

    await user.click(screen.getByTestId("cell-B1"));
    expect(screen.getByTestId("formula-input")).toHaveValue("=A1*2");

    await user.click(screen.getByTestId("cell-A1"));
    await user.keyboard("{Enter}");
    await user.type(screen.getByTestId("editor-A1"), "7{Tab}");
    expect(screen.getByTestId("cell-B1")).toHaveTextContent("14");
  });

  it("discards edits with Escape and supports reverse navigation", async () => {
    const user = userEvent.setup();
    render(<SpreadsheetApp />);

    await user.click(screen.getByTestId("cell-C2"));
    await user.keyboard("{Enter}");
    await user.type(screen.getByTestId("editor-C2"), "draft{Escape}");
    expect(screen.getByTestId("cell-C2")).not.toHaveTextContent("draft");

    await user.click(screen.getByTestId("cell-C2"));
    await user.keyboard("{Enter}");
    await user.type(screen.getByTestId("editor-C2"), "8{Shift>}{Tab}{/Shift}");
    expect(screen.getByTestId("cell-C2")).toHaveTextContent("8");
    expect(screen.getByTestId("active-cell-address")).toHaveTextContent("B2");

    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(screen.getByTestId("active-cell-address")).toHaveTextContent("B1");
  });

  it("keeps partial formula-bar edits visible while typing", async () => {
    const user = userEvent.setup();
    render(<SpreadsheetApp />);

    await user.click(screen.getByTestId("cell-A1"));
    const formulaInput = screen.getByTestId("formula-input");

    await user.click(formulaInput);
    await user.type(formulaInput, "=");

    expect(formulaInput).toHaveValue("=");
    expect(formulaInput).not.toHaveValue("#ERROR!");
  });

  it("applies different display classes for text, numbers, formulas, and errors", async () => {
    const user = userEvent.setup();
    render(<SpreadsheetApp />);

    await user.click(screen.getByTestId("cell-A1"));
    await user.keyboard("{Enter}");
    await user.type(screen.getByTestId("editor-A1"), "hello{Tab}");

    await user.click(screen.getByTestId("cell-B1"));
    await user.keyboard("{Enter}");
    await user.type(screen.getByTestId("editor-B1"), "123{Tab}");

    await user.click(screen.getByTestId("cell-C1"));
    await user.keyboard("{Enter}");
    await user.type(screen.getByTestId("editor-C1"), "=B1*2{Tab}");

    await user.click(screen.getByTestId("cell-D1"));
    await user.keyboard("{Enter}");
    await user.type(screen.getByTestId("editor-D1"), "=1/0{Tab}");

    expect(screen.getByTestId("cell-A1").className).toContain("text");
    expect(screen.getByTestId("cell-B1").className).toContain("number");
    expect(screen.getByTestId("cell-C1").className).toContain("formula");
    expect(screen.getByTestId("cell-D1").className).toContain("error");
    expect(screen.getByTestId("cell-C1")).toHaveTextContent("246");
    expect(screen.getByTestId("cell-D1")).toHaveTextContent("#ERROR!");
  });
});
