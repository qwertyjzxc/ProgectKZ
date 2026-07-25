"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

const districts = [
  { value: "", label: "Все районы" },
  { value: "Абайский", label: "Абайский" },
  { value: "Аль-Фарабийский", label: "Аль-Фарабийский" },
  { value: "Енбекшинский", label: "Енбекшинский" },
  { value: "Каратауский", label: "Каратауский" },
  { value: "Туранский", label: "Туранский" },
];

const classes = [
  { value: "", label: "Все классы" },
  { value: "Эконом", label: "Эконом" },
  { value: "Комфорт", label: "Комфорт" },
  { value: "Бизнес", label: "Бизнес" },
  { value: "Премиум", label: "Премиум" },
];

const roomOptions = [
  { value: "", label: "Комнатность" },
  { value: "1", label: "1 комната" },
  { value: "2", label: "2 комнаты" },
  { value: "3", label: "3 комнаты" },
  { value: "4", label: "4+ комнаты" },
];

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = searchParams.get("district") || searchParams.get("class") || searchParams.get("rooms") || searchParams.get("price_max");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const params = new URLSearchParams();

    const q = formData.get("q") as string;
    const district = formData.get("district") as string;
    const class_type = formData.get("class") as string;
    const rooms = formData.get("rooms") as string;
    const price_max = formData.get("price_max") as string;

    if (q) params.set("q", q);
    if (district) params.set("district", district);
    if (class_type) params.set("class", class_type);
    if (rooms) params.set("rooms", rooms);
    if (price_max) params.set("price_max", price_max);

    router.push(pathname + "?" + params.toString());
  };

  const resetFilters = () => {
    router.push(pathname);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-sky-50 py-6 px-4 border-b shadow-sm">
      <form onSubmit={handleSearch} className="mx-auto max-w-6xl">
        {/* Main search row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              name="q"
              placeholder="Поиск по ЖК, улице, району..."
              defaultValue={searchParams.get("q") ?? ""}
              className="pl-10 h-11 text-sm bg-white shadow-sm border-gray-200 focus:border-blue-400"
            />
          </div>
          <Button
            type="button"
            variant={showFilters ? "default" : "outline"}
            size="lg"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 h-11"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Фильтры</span>
          </Button>
          <Button type="submit" size="lg" className="gap-2 h-11 bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Найти</span>
          </Button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-4 bg-white/80 backdrop-blur-sm rounded-xl border p-4 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Фильтры</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-gray-500 hover:text-gray-700 gap-1"
              >
                <X className="w-3 h-3" />
                Сбросить
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Район</label>
                <select
                  name="district"
                  defaultValue={searchParams.get("district") ?? ""}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  {districts.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Класс</label>
                <select
                  name="class"
                  defaultValue={searchParams.get("class") ?? ""}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  {classes.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Комнатность</label>
                <select
                  name="rooms"
                  defaultValue={searchParams.get("rooms") ?? ""}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  {roomOptions.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Цена до (₸)</label>
                <Input
                  type="number"
                  name="price_max"
                  placeholder="Любая"
                  defaultValue={searchParams.get("price_max") ?? ""}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active filters chips */}
        {hasActiveFilters && !showFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {searchParams.get("district") && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {searchParams.get("district")}
                <button type="button" onClick={resetFilters}><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchParams.get("class") && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {searchParams.get("class")}
                <button type="button" onClick={resetFilters}><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchParams.get("rooms") && (
              <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {searchParams.get("rooms")}-комн.
                <button type="button" onClick={resetFilters}><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchParams.get("price_max") && (
              <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                До {parseInt(searchParams.get("price_max")!).toLocaleString()} ₸
                <button type="button" onClick={resetFilters}><X className="w-3 h-3" /></button>
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-gray-500 h-6"
            >
              Сбросить всё
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
