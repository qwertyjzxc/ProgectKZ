import { describe, expect, it } from "vitest";
import { formatMoney, formatNumber, formatDateOnly } from "../format";

describe("formatMoney", () => {
  it("пустые значения дают пустую строку", () => {
    expect(formatMoney("")).toBe("");
    expect(formatMoney(null as unknown as string)).toBe("");
    expect(formatMoney(undefined as unknown as string)).toBe("");
  });
  it("число форматируется с ₸", () => {
    expect(formatMoney(25000000)).toContain("₸");
    expect(formatMoney(25000000)).toContain("25");
  });
  it("мусор даёт пустую строку", () => {
    expect(formatMoney("abc")).toBe("");
  });
});

describe("formatNumber", () => {
  it("NaN даёт пустую строку", () => {
    expect(formatNumber("abc")).toBe("");
  });
  it("число форматируется", () => {
    expect(formatNumber(1000)).not.toBe("");
  });
});

describe("formatDateOnly", () => {
  it("валидная дата в ru-RU", () => {
    expect(formatDateOnly("2026-09-26")).toBe("26.09.2026");
  });
  it("невалидная возвращается как есть", () => {
    expect(formatDateOnly("xxx")).toBe("xxx");
    expect(formatDateOnly("")).toBe("");
  });
});
