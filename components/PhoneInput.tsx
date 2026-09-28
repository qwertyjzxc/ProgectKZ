"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

// Маска: фиксированный префикс "+7" + введённые цифры через пробелы (+7 777 123 45 67).
// Нормализует разные форматы: "8 700...", "77001234567", "+7 (777) 123-45-67", "7771234567".
export function maskKzPhone(raw: string): string {
  const hasPrefix = raw.startsWith("+");
  let d = raw.replace(/\D/g, "");
  if (hasPrefix && d.length > 0) d = d.slice(1);
  else if (raw.startsWith("8")) d = d.slice(1);
  else if (raw.startsWith("7") && d.length >= 11) d = d.slice(1);
  d = d.slice(0, 10);

  const groups: string[] = [];
  if (d.length > 0) groups.push(d.slice(0, 3));
  if (d.length > 3) groups.push(d.slice(3, 6));
  if (d.length > 6) groups.push(d.slice(6, 8));
  if (d.length > 8) groups.push(d.slice(8, 10));
  return d ? "+7 " + groups.join(" ") : "";
}

// Полный международный номер для ссылки на WhatsApp (код страны + номер, без "+").
// Иностранные (+992...) — как есть; казахстанские без "+" — по старым правилам.
export function phoneToWa(raw: string): string {
  const d = (raw || "").replace(/\D/g, "");
  if ((raw || "").trim().startsWith("+")) return d;
  if (d.startsWith("8")) return "7" + d.slice(1);
  if (d.length === 10) return "7" + d;
  return d;
}

// Отображение везде (таблицы, карточки): KZ — маской, иностранные — как есть.
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  return isKzPhone(raw) ? maskKzPhone(raw) : raw.trim();
}

// Эвристика для начального режима: "+7..."/"8..."/"7..."/10 цифр/короткий ввод — KZ,
// "+" с другим кодом (напр. +992) — иностранный.
export function isKzPhone(raw: string): boolean {
  const v = (raw || "").trim();
  if (!v) return true;
  if (v.startsWith("+")) return /^\+7/.test(v);
  const d = v.replace(/\D/g, "");
  if (v.startsWith("8") || v.startsWith("7")) return true;
  return d.length <= 10;
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function PhoneInput({ value, onChange, className }: PhoneInputProps) {
  // Модалки монтируются заново при каждом открытии — начального режима хватает.
  const [foreign, setForeign] = useState(() => !isKzPhone(value));

  const toggleMode = () => {
    if (foreign) {
      // Иностранный -> KZ: нормализуем маской
      setForeign(false);
      onChange(maskKzPhone(value));
    } else {
      setForeign(true);
    }
  };

  const handleChange = (raw: string) => {
    // Начал вводить "+" с чужим кодом в KZ-режиме — сам переключаемся на "без маски"
    if (!foreign && raw.startsWith("+") && !/^\+7/.test(raw)) {
      setForeign(true);
      onChange(raw);
      return;
    }
    onChange(foreign ? raw : maskKzPhone(raw));
  };

  return (
    <div className="flex gap-1.5">
      <Input
        value={foreign ? (value || "") : value ? maskKzPhone(value) : ""}
        onChange={e => handleChange(e.target.value)}
        placeholder={foreign ? "+992 93 123 45 67" : "+7 777 123 45 67"}
        inputMode="tel"
        autoComplete="tel"
        className={"text-sm flex-1 " + (className || "")}
      />
      <button
        type="button"
        onClick={toggleMode}
        title={foreign ? "Иностранный номер (без маски). Нажми для казахстанского" : "Казахстанский номер (+7). Нажми для иностранного"}
        className={
          "shrink-0 h-9 px-2.5 rounded-lg border text-xs font-bold transition-colors " +
          (foreign
            ? "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
            : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100")
        }
      >
        {foreign ? "🌍" : "KZ"}
      </button>
    </div>
  );
}