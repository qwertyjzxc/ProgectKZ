"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, UserPlus, X, SlidersHorizontal, Download, RefreshCw } from "lucide-react";
import { useState } from "react";

const districts = ["", "Абайский", "Аль-Фарабийский", "Енбекшинский", "Каратауский", "Туранский"];
const statuses = ["", "В процессе", "Думает", "Сделка", "Отказ"];
const brokers = ["", "Сериков А.", "Каримова Д.", "Алимжанов Н."];

interface SearchBarProps {
  onAddClick: () => void;
}

export default function SearchBar({ onAddClick }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = searchParams.get("district") || searchParams.get("status") || searchParams.get("broker") || searchParams.get("price_max") || searchParams.get("price_min");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const params = new URLSearchParams(searchParams.toString());

    const q = formData.get("q") as string;
    const district = formData.get("district") as string;
    const status = formData.get("status") as string;
    const broker = formData.get("broker") as string;
    const price_min = formData.get("price_min") as string;
    const price_max = formData.get("price_max") as string;

    if (q) params.set("q", q); else params.delete("q");
    if (district) params.set("district", district); else params.delete("district");
    if (status) params.set("status", status); else params.delete("status");
    if (broker) params.set("broker", broker); else params.delete("broker");
    if (price_min) params.set("price_min", price_min); else params.delete("price_min");
    if (price_max) params.set("price_max", price_max); else params.delete("price_max");

    router.push(pathname + "?" + params.toString());
  };

  const resetFilters = () => {
    router.push(pathname + "?" + (searchParams.get("q") ? "q=" + searchParams.get("q") : ""));
  };

  return (
    <div className="bg-white border-b">
      <form onSubmit={handleSearch}>
        {/* Top row */}
        <div className="flex items-center gap-3 px-6 py-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              name="q"
              placeholder="Поиск по имени, телефону, району..."
              defaultValue={searchParams.get("q") ?? ""}
              className="pl-10 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>
          <Button type="submit" size="sm" className="gap-1">
            <Search className="w-3.5 h-3.5" />
            Найти
          </Button>

          <Button
            type="button"
            variant={showFilters || hasActiveFilters ? "default" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Фильтры
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              Синхронизировать
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs">
              <Download className="w-3.5 h-3.5" />
              Экспорт
            </Button>
            <Button type="button" size="sm" onClick={onAddClick} className="gap-1 bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-3.5 h-3.5" />
              Добавить клиента
            </Button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="px-6 pb-4 border-t bg-gray-50/50">
            <div className="flex items-center justify-between pt-3 mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Фильтры</h3>
              {hasActiveFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-gray-500 gap-1">
                  <X className="w-3 h-3" />
                  Сбросить
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Район</label>
                <select
                  name="district"
                  defaultValue={searchParams.get("district") ?? ""}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Все районы</option>
                  {districts.slice(1).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Статус</label>
                <select
                  name="status"
                  defaultValue={searchParams.get("status") ?? ""}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Все статусы</option>
                  {statuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Брокер</label>
                <select
                  name="broker"
                  defaultValue={searchParams.get("broker") ?? ""}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="">Все брокеры</option>
                  {brokers.slice(1).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Сумма от (₸)</label>
                <Input
                  type="number"
                  name="price_min"
                  placeholder="От"
                  defaultValue={searchParams.get("price_min") ?? ""}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Сумма до (₸)</label>
                <Input
                  type="number"
                  name="price_max"
                  placeholder="До"
                  defaultValue={searchParams.get("price_max") ?? ""}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="mt-3">
              <Button type="submit" size="sm" className="gap-1">
                <Filter className="w-3.5 h-3.5" />
                Применить фильтры
              </Button>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && !showFilters && (
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            {searchParams.get("district") && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {searchParams.get("district")}
                <button type="button" onClick={resetFilters}><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchParams.get("status") && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {searchParams.get("status")}
                <button type="button" onClick={resetFilters}><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchParams.get("broker") && (
              <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {searchParams.get("broker")}
                <button type="button" onClick={resetFilters}><X className="w-3 h-3" /></button>
              </span>
            )}
            {(searchParams.get("price_min") || searchParams.get("price_max")) && (
              <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                {searchParams.get("price_min") ? "От " + parseInt(searchParams.get("price_min")!).toLocaleString() : ""}
                {searchParams.get("price_min") && searchParams.get("price_max") ? " — " : ""}
                {searchParams.get("price_max") ? "До " + parseInt(searchParams.get("price_max")!).toLocaleString() : ""} ₸
                <button type="button" onClick={resetFilters}><X className="w-3 h-3" /></button>
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-gray-500 h-6">
              Сбросить всё
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
