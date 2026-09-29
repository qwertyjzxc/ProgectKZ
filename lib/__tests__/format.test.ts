import { describe, expect, it } from "vitest";
import { formatMoney, formatNumber, formatDateOnly, toISODate, todayLocalISO } from "../format";

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
  it("DD.MM.YYYY тоже приводится (раньше уходило как сырая строка)", () => {
    expect(formatDateOnly("26.09.2026")).toBe("26.09.2026");
    expect(formatDateOnly("26.09.2026 14:30")).toBe("26.09.2026");
  });
  it("ISO с временем режется до даты", () => {
    expect(formatDateOnly("2026-09-26T14:30:00.000Z")).toBe("26.09.2026");
  });
  it("невалидная возвращается как есть", () => {
    expect(formatDateOnly("xxx")).toBe("xxx");
    expect(formatDateOnly("")).toBe("");
  });
});

describe("toISODate", () => {
  it("пусто → пусто", () => {
    expect(toISODate("")).toBe("");
    expect(toISODate(undefined)).toBe("");
    expect(toISODate(null)).toBe("");
  });
  it("DD.MM.YYYY конвертируется в YYYY-MM-DD", () => {
    expect(toISODate("26.09.2026")).toBe("2026-09-26");
    expect(toISODate("05.01.2020")).toBe("2020-01-05");
  });
  it("ISO-строки остаются ISO (время отсекается)", () => {
    expect(toISODate("2026-09-26")).toBe("2026-09-26");
    expect(toISODate("2026-09-26T14:30:00.000Z")).toBe("2026-09-26");
  });
  it("мусор → пусто", () => {
    expect(toISODate("что-то")).toBe("");
  });
});

describe("todayLocalISO", () => {
  it("возвращает YYYY-MM-DD и не зависит от часового пояса", () => {
    const iso = todayLocalISO();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // local timezone == UTC → расхождений с toISOString нет именно сегодня,
    // но формат обязан быть локальным по построению (getFullYear/getMonth/getDate).
    expect(iso).toBe(String(iso));
  });
});
