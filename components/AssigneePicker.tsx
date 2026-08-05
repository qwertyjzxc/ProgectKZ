"use client";
import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useProfile, profileName, profileInitials } from "@/lib/profile-context";

const avatarColors: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
  red: "bg-red-100 text-red-600",
  orange: "bg-orange-100 text-orange-600",
  teal: "bg-teal-100 text-teal-600",
  pink: "bg-pink-100 text-pink-600",
};

export default function AssigneePicker({
  value,
  onChange,
  placeholder = "Не назначен",
}: {
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}) {
  const { profiles } = useProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: number) => {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  };

  return (
    <div ref={ref} className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-9 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1.5 transition-colors hover:border-gray-300"
        onClick={() => setOpen(!open)}
      >
        {value.length === 0 && <span className="px-1 text-sm text-gray-400">{placeholder}</span>}
        {value.map(id => {
          const p = profiles.find(x => x.id === id);
          if (!p) return null;
          const name = profileName(p) || p.username;
          const color = avatarColors[p.avatar_color || "blue"] || avatarColors.blue;
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-0.5 pr-1.5">
              <span className={"flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold " + color}>{profileInitials(name)}</span>
              <span className="text-xs text-gray-700">{name}</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); toggle(id); }}
                className="text-gray-400 transition-colors hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <ChevronDown className={"ml-auto h-4 w-4 shrink-0 text-gray-400 transition-transform " + (open ? "rotate-180" : "")} />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border bg-white p-1 shadow-lg">
          {profiles.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Нет профилей</p>}
          {profiles.map(p => {
            const name = profileName(p) || p.username;
            const color = avatarColors[p.avatar_color || "blue"] || avatarColors.blue;
            const selected = value.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors " + (selected ? "bg-blue-50" : "hover:bg-gray-50")}
              >
                <span className={"flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold " + color}>{profileInitials(name)}</span>
                <span className={"flex-1 truncate text-left text-xs " + (selected ? "font-medium text-gray-900" : "text-gray-600")}>{name}</span>
                {selected && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
