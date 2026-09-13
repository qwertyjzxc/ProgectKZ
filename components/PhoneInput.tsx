"use client";

import { useRef } from "react";
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

// Полный международный номер для ссылки на WhatsApp (7XXXXXXXXXX)
export function phoneToWa(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  else if (d.length === 10) d = "7" + d;
  return d;
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function PhoneInput({ value, onChange, className }: PhoneInputProps) {
  const prevExt = useRef(value);

  // Синхронизация при внешнем изменении value (например, при смене клиента для редактирования)
  if (value !== prevExt.current) {
    prevExt.current = value;
  }

  return (
    <Input
      value={value ? maskKzPhone(value) : ""}
      onChange={e => onChange(maskKzPhone(e.target.value))}
      placeholder="+7 777 123 45 67"
      inputMode="tel"
      autoComplete="tel"
      className={"text-sm " + (className || "")}
    />
  );
}