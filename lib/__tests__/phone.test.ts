import { describe, expect, it } from "vitest";
import { isKzPhone, formatPhone, phoneToWa } from "../../components/PhoneInput";

describe("isKzPhone", () => {
  it("пусто и KZ-форматы — true", () => {
    expect(isKzPhone("")).toBe(true);
    expect(isKzPhone("+7 777 123 45 67")).toBe(true);
    expect(isKzPhone("87001234567")).toBe(true);
    expect(isKzPhone("7771234567")).toBe(true);
  });
  it("+ с чужим кодом — false", () => {
    expect(isKzPhone("+992 93 123 45 67")).toBe(false);
    expect(isKzPhone("+7")).toBe(true);
  });
});

describe("formatPhone", () => {
  it("KZ маскирует, иностранный не трогает", () => {
    expect(formatPhone("87001234567")).toBe("+7 700 123 45 67");
    expect(formatPhone("+992 93 123 45 67")).toBe("+992 93 123 45 67");
    expect(formatPhone("")).toBe("");
  });
});

describe("phoneToWa", () => {
  it("иностранный — цифры после +", () => {
    expect(phoneToWa("+992 93 123-45-67")).toBe("992931234567");
  });
  it("KZ без плюса — как раньше", () => {
    expect(phoneToWa("87001234567")).toBe("77001234567");
    expect(formatPhone("")).toBe("");
  });
});
