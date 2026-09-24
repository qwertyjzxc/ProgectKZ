"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, User, Handshake, Building2, ListTodo } from "lucide-react";

interface Hit {
  kind: string;
  title: string;
  subtitle: string;
  href: string;
}

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Клиент": User,
  "Сделка": Handshake,
  "Объект": Building2,
  "Задача": ListTodo,
};

export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const run = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setHits([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/search?q=" + encodeURIComponent(value.trim()));
        const json = await res.json();
        if (Array.isArray(json)) {
          setHits(json);
          setOpen(true);
        }
      } catch {
        // тихо: поиск не должен мешать
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const go = (h: Hit) => {
    setOpen(false);
    setQ("");
    setHits([]);
    router.push(h.href);
  };

  return (
    <div ref={boxRef} className="relative flex-1 max-w-md hidden sm:block">
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white focus-within:border focus-within:border-blue-200">
        {loading ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" /> : <Search className="w-4 h-4 text-gray-400 shrink-0" />}
        <input
          value={q}
          onChange={e => run(e.target.value)}
          onFocus={() => { if (hits.length > 0) setOpen(true); }}
          onKeyDown={e => { if (e.key === "Enter" && hits.length > 0) go(hits[0]); if (e.key === "Escape") setOpen(false); }}
          placeholder="Поиск: клиент, сделка, объект, телефон…"
          className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-11 bg-white rounded-xl shadow-xl border z-40 max-h-96 overflow-y-auto p-2">
          {hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400">Ничего не найдено</p>
          ) : (
            hits.map((h, i) => {
              const Icon = KIND_ICONS[h.kind] || Search;
              return (
                <button
                  key={h.kind + i}
                  type="button"
                  onClick={() => go(h)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">{h.title}</span>
                    {h.subtitle && <span className="block text-xs text-gray-400 truncate">{h.subtitle}</span>}
                  </span>
                  <span className="text-[11px] text-gray-400 shrink-0">{h.kind}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
