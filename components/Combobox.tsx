"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export default function Combobox({ value, onChange, options, placeholder = "" }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query || query === value) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, query, value]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const openDropdown = (e: { currentTarget: HTMLInputElement }) => {
    setOpen(true);
    setQuery(value);
    e.currentTarget.select();
  };

  const select = (v: string) => {
    onChange(v);
    setQuery(v);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setOpen(true);
    setActive(0);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={open ? query : value}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={openDropdown}
        onClick={e => {
          if (!open) openDropdown(e);
        }}
        onBlur={() => {
          setOpen(false);
          if (query !== value) onChange(query);
        }}
        onKeyDown={e => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery(value);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(a => Math.min(a + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(a => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            if (open && filtered[active]) {
              e.preventDefault();
              select(filtered[active]);
            } else {
              setOpen(false);
            }
          }
        }}
        placeholder={placeholder}
        className="w-full h-9 rounded-lg border px-3 pr-9 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500"
      />
      {value && (
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={e => e.preventDefault()}
          onClick={e => {
            e.stopPropagation();
            clear();
          }}
          className="absolute right-7 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      {open && (
        <ul className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-400 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 shrink-0" />
              Ничего не найдено. Можно ввести свой вариант.
            </li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt}
                onMouseDown={e => {
                  e.preventDefault();
                  select(opt);
                }}
                onMouseEnter={() => setActive(i)}
                className={
                  "px-3 py-2 cursor-pointer flex items-center justify-between gap-2 " +
                  (i === active ? "bg-blue-50 text-blue-700" : "text-gray-800")
                }
              >
                {opt}
                {opt === value && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
