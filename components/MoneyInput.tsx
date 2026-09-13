"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function MoneyInput({ value, onChange, placeholder, className }: MoneyInputProps) {
  const [display, setDisplay] = useState(value ? formatNumber(value) : "");
  const prevExt = useRef(value);

  if (value !== prevExt.current) {
    prevExt.current = value;
    if (value !== display) setDisplay(value ? formatNumber(value) : "");
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={e => {
        const raw = e.target.value.replace(/[^\d]/g, "");
        setDisplay(raw ? formatNumber(raw) : "");
        onChange(raw);
      }}
      placeholder={placeholder || "0"}
      className={"text-sm " + (className || "")}
    />
  );
}