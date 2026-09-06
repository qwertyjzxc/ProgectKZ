"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function toISOInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DatePicker({ value, onChange, placeholder = "" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const base = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const selected = value ? new Date(value + "T00:00:00") : null;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: Date) => {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  };
  const isSelected = (d: Date) =>
    selected && d.getFullYear() === selected.getFullYear() && d.getMonth() === selected.getMonth() && d.getDate() === selected.getDate();

  const display = value ? new Date(value + "T00:00:00").toLocaleDateString("ru-RU") : "";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-700 outline-none transition-colors hover:border-gray-300 focus:ring-2 focus:ring-blue-500"
      >
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={value ? "text-gray-800" : "text-gray-400"}>{display || placeholder}</span>
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between mb-1 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-medium text-gray-800">
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-[11px] font-medium text-gray-400 py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) =>
              d ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(toISOInput(d));
                    setOpen(false);
                  }}
                  className={
                    "h-8 rounded-md text-sm transition-colors " +
                    (isSelected(d)
                      ? "bg-blue-600 text-white font-medium"
                      : isToday(d)
                      ? "bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
                      : "text-gray-700 hover:bg-gray-100")
                  }
                >
                  {d.getDate()}
                </button>
              ) : (
                <div key={i} />
              )
            )}
          </div>
          {value && (
            <div className="mt-2 flex justify-end border-t border-gray-100 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Очистить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
