"use client";
import { useState } from "react";
import FilterPanel from "@/components/dashboard/FilterPanel";
export default function ObjectsPage() {
  const [activeFilters, setActiveFilters] = useState<any>(null);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Объекты недвижимости</h1>
        <p className="text-sm text-gray-500 mt-1">Поиск и управление объектами</p>
      </div>
      <FilterPanel onSearch={setActiveFilters} />
      {activeFilters && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Активные фильтры:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(activeFilters).filter(([,v]: any) => v).map(([k,v]: any) => (
              <span key={k} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{k}: {v}</span>
            ))}
            <button onClick={() => setActiveFilters(null)} className="text-xs text-red-500 hover:text-red-600">Сбросить всё</button>
          </div>
        </div>
      )}
      <div className="mt-6 bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
        <p className="text-lg">Результаты поиска</p>
        <p className="text-sm mt-1">{activeFilters ? "Найдено объектов: 0 (демо)" : "Используйте фильтры выше для поиска объектов"}</p>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5"><p className="text-xs text-gray-500 uppercase">Активных объектов</p><p className="text-2xl font-bold text-gray-900 mt-1">128</p></div>
        <div className="bg-white rounded-xl shadow-sm border p-5"><p className="text-xs text-gray-500 uppercase">Просмотров за неделю</p><p className="text-2xl font-bold text-gray-900 mt-1">1 423</p></div>
        <div className="bg-white rounded-xl shadow-sm border p-5"><p className="text-xs text-gray-500 uppercase">Средняя цена сделки</p><p className="text-2xl font-bold text-gray-900 mt-1">28.5M ₸</p></div>
      </div>
    </div>
  );
}
