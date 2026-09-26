import { describe, expect, it } from "vitest";
import {
  needsReason,
  needsResumeDate,
  reasonsFor,
  PAUSED_STATUS,
  CLOSED_LOST_STATUS,
  DEAL_DONE_STATUS,
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
});
