import { describe, expect, it } from "vitest";
import { normalizeDealCategory, DEAL_CATEGORIES } from "../deal-types";
import { dealListLink, clientListLink, activityTarget } from "../notify-links";

describe("normalizeDealCategory", () => {
  it("канон: arenda и pokupka проходят как есть", () => {
    expect(normalizeDealCategory("arenda")).toBe("arenda");
    expect(normalizeDealCategory("pokupka")).toBe("pokupka");
  });
  it("legacy prodaja нормализуется в pokupka", () => {
    expect(normalizeDealCategory("prodaja")).toBe("pokupka");
  });
  it("мусор и пусто падают в arenda", () => {
    expect(normalizeDealCategory("")).toBe("arenda");
    expect(normalizeDealCategory(undefined)).toBe("arenda");
    expect(normalizeDealCategory("xxx")).toBe("arenda");
  });
  it("в каноне ровно две категории", () => {
    expect([...DEAL_CATEGORIES]).toEqual(["arenda", "pokupka"]);
  });
});

describe("dealListLink", () => {
  it("строит ссылку с нормализованной категорией", () => {
    expect(dealListLink("kvartiry", "pokupka", 5)).toBe("/deals?category=pokupka&type=kvartiry&view=5");
  });
  it("legacy prodaja в ссылке превращается в pokupka", () => {
    expect(dealListLink("zemlya", "prodaja", 7)).toBe("/deals?category=pokupka&type=zemlya&view=7");
  });
  it("неизвестный тип падает в kvartiry", () => {
    expect(dealListLink("xxx", "arenda")).toBe("/deals?category=arenda&type=kvartiry");
  });
});

describe("clientListLink", () => {
  it("продажа ведёт в /clients/sell с cat по типу", () => {
    expect(clientListLink("prodaja", "Квартира", 3)).toBe("/clients/sell?cat=apartments&view=3");
  });
  it("аренда ведёт в /clients", () => {
    expect(clientListLink("arenda", "Дом", 4)).toBe("/clients?cat=houses&view=4");
  });
});

describe("activityTarget", () => {
  it("сделка раскрывается в ветку журнала", () => {
    expect(activityTarget("/deals?category=pokupka&type=zemlya", 9)).toBe("/activity?table=deals_zemlya&client=9");
  });
  it("без relatedId возвращает null", () => {
    expect(activityTarget("/deals?category=arenda&type=kvartiry", null)).toBeNull();
  });
});
