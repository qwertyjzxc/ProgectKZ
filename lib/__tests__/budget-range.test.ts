import { describe, expect, it } from "vitest";
import { parseBudgetRange, parseBudgetCard, budgetToInput, formatBudgetRange, formatBudgetInput } from "../budget-range";

describe("parseBudgetRange", () => {
  it("одно число — ровно значение (мин и макс равны)", () => {
    expect(parseBudgetRange("1500")).toEqual({ min: "1500", max: "1500" });
    expect(parseBudgetRange("1500-")).toEqual({ min: "", max: "" });
    expect(parseBudgetRange("-1500")).toEqual({ min: "", max: "" });
  });
  it("диапазон от и до", () => {
    expect(parseBudgetRange("1500-2000")).toEqual({ min: "1500", max: "2000" });
    expect(parseBudgetRange("1000-1500")).toEqual({ min: "1000", max: "1500" });
  });
  it("пусто и мусор — без фильтра", () => {
    expect(parseBudgetRange("")).toEqual({ min: "", max: "" });
    expect(parseBudgetRange("abc")).toEqual({ min: "", max: "" });
    expect(parseBudgetRange("--")).toEqual({ min: "", max: "" });
  });
  it("пробелы и лишние символы отсекаются", () => {
    expect(parseBudgetRange("1 500 - 2 000")).toEqual({ min: "1500", max: "2000" });
  });
});

describe("parseBudgetCard", () => {
  it("одно число — только «до» (макс), без минимума", () => {
    expect(parseBudgetCard("1500")).toEqual({ min: null, max: 1500 });
    expect(parseBudgetCard("0")).toEqual({ min: null, max: 0 });
  });
  it("диапазон — мин и макс в нужном порядке", () => {
    expect(parseBudgetCard("1500-2000")).toEqual({ min: 1500, max: 2000 });
    expect(parseBudgetCard("2000-1500")).toEqual({ min: 1500, max: 2000 });
    expect(parseBudgetCard("1 500 - 2 000")).toEqual({ min: 1500, max: 2000 });
    expect(parseBudgetCard("1000–2000")).toEqual({ min: 1000, max: 2000 });
    expect(parseBudgetCard("1000—2000")).toEqual({ min: 1000, max: 2000 });
  });
  it("пусто и мусор — бюджет не задан", () => {
    expect(parseBudgetCard("")).toEqual({ min: null, max: null });
    expect(parseBudgetCard("abc")).toEqual({ min: null, max: null });
    expect(parseBudgetCard("1500-")).toEqual({ min: null, max: null });
    expect(parseBudgetCard("-")).toEqual({ min: null, max: null });
  });
});

describe("budgetToInput", () => {
  it("обратно в текст поля", () => {
    expect(budgetToInput(null, 1500)).toBe("1500");
    expect(budgetToInput(1500, 2000)).toBe("1500-2000");
    expect(budgetToInput(null, 0)).toBe("");
    expect(budgetToInput(null, null)).toBe("");
  });
});

describe("formatBudgetRange", () => {
  it("отображение диапазона и одиночного", () => {
    const nbsp = "\u00a0";
    expect(formatBudgetRange(null, 1500)).toBe(`1${nbsp}500 ₸`);
    expect(formatBudgetRange(1500, 2000)).toBe(`1${nbsp}500 ₸ — 2${nbsp}000 ₸`);
    expect(formatBudgetRange(null, null)).toBe("");
    expect(formatBudgetRange(null, 0)).toBe("");
  });
});

describe("formatBudgetInput", () => {
  it("разделяет тысячи, сохраняя диапазон", () => {
    const nbsp = "\u00a0";
    expect(formatBudgetInput("1500")).toBe(`1${nbsp}500`);
    expect(formatBudgetInput("1500-2000")).toBe(`1${nbsp}500-2${nbsp}000`);
    expect(formatBudgetInput("")).toBe("");
    expect(formatBudgetInput("-")).toBe("-");
  });
  it("маска не блокирует ввод тире", () => {
    expect(formatBudgetInput("1500-")).toBe(`1\u00a0500-`);
  });
});