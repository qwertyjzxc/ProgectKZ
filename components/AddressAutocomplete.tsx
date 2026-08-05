"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, MapPin, X } from "lucide-react";

interface Suggestion {
  title: string;
  subtitle: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function AddressAutocomplete({ value, onChange, placeholder = "" }: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const runSuggest = (text: string) => {
    const id = ++reqIdRef.current;
    if (text.trim().length < 3) {
      setItems([]);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    fetch("/api/address-suggest?q=" + encodeURIComponent(text))
      .then(res => res.json())
      .then((data: { results?: Suggestion[]; error?: string }) => {
        if (reqIdRef.current !== id) return;
        if (data.error) {
          setError(true);
          setItems([]);
        } else {
          setItems(data.results || []);
        }
      })
      .catch(() => {
        if (reqIdRef.current === id) {
          setError(true);
          setItems([]);
        }
      })
      .finally(() => {
        if (reqIdRef.current === id) setLoading(false);
      });
  };

  const openDropdown = (e: { currentTarget: HTMLInputElement }) => {
    setOpen(true);
    setQuery(value);
    if (value.trim().length >= 3) runSuggest(value);
    e.currentTarget.select();
  };

  const select = (s: Suggestion) => {
    const full = s.subtitle ? s.title + ", " + s.subtitle : s.title;
    onChange(full);
    setQuery(full);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setItems([]);
    setOpen(true);
    setActive(0);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={open ? query : value}
        onChange={e => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
          runSuggest(e.target.value);
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
            setActive(a => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(a => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            if (open && items[active]) {
              e.preventDefault();
              select(items[active]);
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
          {loading ? (
            <li className="px-3 py-2 text-gray-400 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />Загрузка подсказок...
            </li>
          ) : error ? (
            <li className="px-3 py-2 text-gray-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              Не удалось загрузить подсказки. Введите адрес вручную.
            </li>
          ) : query.trim().length < 3 ? (
            <li className="px-3 py-2 text-gray-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              Введите минимум 3 символа
            </li>
          ) : items.length === 0 ? (
            <li className="px-3 py-2 text-gray-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              Ничего не найдено. Введите адрес вручную.
            </li>
          ) : (
            items.map((s, i) => (
              <li
                key={s.title + s.subtitle + i}
                onMouseDown={e => {
                  e.preventDefault();
                  select(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={
                  "px-3 py-2 cursor-pointer flex flex-col " +
                  (i === active ? "bg-blue-50" : "")
                }
              >
                <span className={i === active ? "text-blue-700" : "text-gray-800"}>{s.title}</span>
                {s.subtitle && <span className="text-xs text-gray-400">{s.subtitle}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
