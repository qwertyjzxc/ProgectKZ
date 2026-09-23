"use client";

import { useState, useEffect, useRef } from "react";
import { Settings2, RotateCcw } from "lucide-react";
import { useProfile } from "@/lib/profile-context";

function keyFor(entity: string, profileId: number | null): string {
  return `pillvis:${entity}:${profileId ?? "guest"}`;
}

function loadHidden(entity: string, profileId: number | null): string[] {
  try {
    const raw = localStorage.getItem(keyFor(entity, profileId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(x => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Скрытые пользователем пилюли-статусы. Хранение — localStorage,
// ключ включает id профиля, поэтому у каждого пользователя свой набор.
export function usePillVisibility(entity: string): {
  hidden: string[];
  toggle: (status: string) => void;
  reset: () => void;
} {
  const { currentProfile } = useProfile();
  const profileId = currentProfile?.id ?? null;
  const cacheKey = entity + ":" + (profileId ?? "guest");
  const [hidden, setHidden] = useState<string[]>(() => loadHidden(entity, profileId));
  const [lastKey, setLastKey] = useState(cacheKey);
  // смена профиля/раздела — перечитываем сохранённый набор (паттерн render-adjust)
  if (cacheKey !== lastKey) {
    setLastKey(cacheKey);
    setHidden(loadHidden(entity, profileId));
  }

  const save = (next: string[]) => {
    setHidden(next);
    try {
      localStorage.setItem(keyFor(entity, profileId), JSON.stringify(next));
    } catch {
      // приватный режим и т.п. — просто не сохраняем
    }
  };

  return {
    hidden,
    toggle: (status: string) =>
      save(hidden.includes(status) ? hidden.filter(s => s !== status) : [...hidden, status]),
    reset: () => save([]),
  };
}

export default function PillSettingsGear({ statuses, hidden, onToggle, onReset }: {
  statuses: string[];
  hidden: string[];
  onToggle: (status: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const placePanel = () => {
    const btn = btnRef.current;
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    // кнопка ушла из видимой зоны — прячем панель
    if (r.bottom < 0 || r.top > window.innerHeight) return null;
    const H = 340;
    const below = r.bottom + 6 + H <= window.innerHeight;
    return {
      top: below ? r.bottom + 6 : Math.max(8, r.top - 6 - H),
      left: Math.max(8, Math.min(r.left, window.innerWidth - 272)),
    };
  };

  const toggleOpen = () => {
    if (!open) {
      const p = placePanel();
      if (!p) return;
      setPos(p);
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const close = () => setOpen(false);
    const onScroll = (e: Event) => {
      // скролл внутри самой панели — не трогаем вообще
      if (panelRef.current?.contains(e.target as Node)) return;
      // скролл страницы — едем за шестерёнкой, а не закрываемся
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = placePanel();
        if (p) setPos(p);
        else close();
      });
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    document.addEventListener("mousedown", onDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open ]);

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        title="Настроить видимость статусов"
        className={
          "flex items-center justify-center w-7 h-7 rounded-full border transition-colors " +
          (hidden.length > 0
            ? "bg-blue-50 border-blue-300 text-blue-600"
            : "bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300")
        }
      >
        <Settings2 className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          ref={panelRef}
          className="fixed w-64 bg-white rounded-xl shadow-xl border z-50 p-2 max-h-80 overflow-y-auto"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b mb-1 bg-white">
            <span className="font-semibold text-sm text-gray-800">Статусы</span>
            {hidden.length > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <RotateCcw className="w-3 h-3" />Показать все
              </button>
            )}
          </div>
          {statuses.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-gray-400">Статусов пока нет</p>
          )}
          {statuses.map(s => {
            const isHidden = hidden.includes(s);
            return (
              <label
                key={s}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={!isHidden}
                  onChange={() => onToggle(s)}
                  className="accent-blue-600 w-4 h-4 shrink-0"
                />
                <span className={isHidden ? "text-gray-400" : ""}>{s}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
