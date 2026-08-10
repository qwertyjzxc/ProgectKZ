"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";

export function maskKzPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("8")) d = d.slice(1);
  else if (d.length === 11 && d.startsWith("7")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length === 0) return "";
  let out = "+7 ";
  if (d.length > 0) out += "(" + d.slice(0, 3);
  if (d.length >= 3) out += ") ";
  if (d.length > 3) out += d.slice(3, 6);
  if (d.length > 6) out += "-" + d.slice(6, 8);
  if (d.length > 8) out += "-" + d.slice(8, 10);
  return out.trim();
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function PhoneInput({ value, onChange, className }: PhoneInputProps) {
  const [display, setDisplay] = useState(value);
  const prevExt = useRef(value);

  // Синхронизация при внешнем изменении value (например, при смене клиента для редактирования)
  if (value !== prevExt.current) {
    prevExt.current = value;
    if (value !== display) setDisplay(value);
  }

  return (
    <Input
      value={display}
      onChange={e => setDisplay(e.target.value)}
      onBlur={() => {
        const masked = maskKzPhone(display);
        setDisplay(masked);
        onChange(masked);
      }}
      placeholder="+7 (777) 123-45-67"
      inputMode="tel"
      autoComplete="tel"
      className={"text-sm " + (className || "")}
    />
  );
}

