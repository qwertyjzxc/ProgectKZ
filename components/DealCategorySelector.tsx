"use client";

import { Home, Banknote, type LucideIcon } from "lucide-react";

const DEAL_CATEGORIES: { id: string; label: string; subtitle: string; icon: LucideIcon }[] = [
  { id: "arenda", label: "Аренда", subtitle: "Сделки по аренде недвижимости", icon: Home },
  { id: "pokupka", label: "Покупка", subtitle: "Сделки по покупке недвижимости", icon: Banknote },
];

export default function DealCategorySelector({ onSelect }: { onSelect: (category: string) => void }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Сделки</h1>
        <p className="text-sm text-gray-500 mt-1">Выберите категорию сделки</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
        {DEAL_CATEGORIES.map(({ id, label, subtitle, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="group flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1.5 hover:border-blue-500 transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
              <Icon className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{label}</h2>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
