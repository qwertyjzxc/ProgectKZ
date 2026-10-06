import { describe, expect, it } from "vitest";
import {
  needsReason,
  needsResumeDate,
  reasonsFor,
  PAUSED_STATUS,
  CLOSED_LOST_STATUS,
  DEAL_DONE_STATUS,
  PAUSE_REASONS,
  CLOSE_REASONS,
} from "../client-status";

describe("client-status", () => {
  it("причина нужна только для паузы и закрытия", () => {
    expect(needsReason(PAUSED_STATUS)).toBe(true);
    expect(needsReason(CLOSED_LOST_STATUS)).toBe(true);
    expect(needsReason(DEAL_DONE_STATUS)).toBe(false);
    expect(needsReason("Новый Клиент")).toBe(false);
  });
  it("дата возобновления — только для паузы", () => {
    expect(needsResumeDate(PAUSED_STATUS)).toBe(true);
    expect(needsResumeDate(CLOSED_LOST_STATUS)).toBe(false);
  });
  it("списки причин не пересекаются по смыслу и не пусты", () => {
    const paused = reasonsFor(PAUSED_STATUS);
    const closed = reasonsFor(CLOSED_LOST_STATUS);
    expect(paused.length).toBeGreaterThan(0);
    expect(closed.length).toBeGreaterThan(0);
    expect(reasonsFor(DEAL_DONE_STATUS)).toEqual([]);
  });
  it("причины паузы различаются для аренды и покупки", () => {
    const arenda = reasonsFor(PAUSED_STATUS, "arenda");
    const prodaja = reasonsFor(PAUSED_STATUS, "prodaja");
    expect(arenda).toEqual([
      "Отложил аренду",
      "Временно нет подходящих вариантов",
      "Уехал / временно недоступен",
      "Изменились обстоятельства",
      "Другое",
    ]);
    expect(prodaja).toEqual([
      "Отложил покупку",
      "Ждёт продажи своей недвижимости",
      "Ждёт одобрения ипотеки",
      "Не определился с бюджетом",
      "Временно нет подходящих вариантов",
      "Уехал / временно недоступен",
      "Изменились обстоятельства",
      "Другое",
    ]);
    expect(reasonsFor(PAUSED_STATUS)).toEqual(PAUSE_REASONS);
  });
  it("причины закрытия различаются для аренды и покупки", () => {
    const arenda = reasonsFor(CLOSED_LOST_STATUS, "arenda");
    const prodaja = reasonsFor(CLOSED_LOST_STATUS, "prodaja");
    expect(arenda).toEqual([
      "Арендовал самостоятельно",
      "Арендовал через другое агентство",
      "Передумал арендовать",
      "Не устроили цены",
      "Не найден подходящий объект",
      "Не выходит на связь",
      "Нет финансирования",
      "Изменились планы",
      "Другое",
    ]);
    expect(prodaja).toEqual([
      "Купил самостоятельно",
      "Купил через другое агентство",
      "Передумал покупать",
      "Не устроили цены",
      "Не найден подходящий объект",
      "Не выходит на связь",
      "Нет финансирования",
      "Отказ банка / ипотеки",
      "Изменились планы",
      "Другое",
    ]);
    expect(reasonsFor(CLOSED_LOST_STATUS)).toEqual(CLOSE_REASONS);
  });
});
