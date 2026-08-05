"use client";

import { Home, Building2, Building, type LucideIcon } from "lucide-react";

export type RentCategory = "houses" | "premises" | "apartments";

export const RENT_CATEGORY_LABELS: Record<RentCategory, string> = {
  houses: "Дома",
  premises: "Помещения",
  apartments: "Квартиры",
};

export const RENT_CATEGORIES: { id: RentCategory; label: string; subtitle: string; icon: LucideIcon }[] = [
  { id: "houses", label: "Дома", subtitle: "Частные дома, коттеджи", icon: Home },
  { id: "premises", label: "Помещения", subtitle: "Коммерческие площади, офисы", icon: Building2 },
  { id: "apartments", label: "Квартиры", subtitle: "Квартиры в жилых комплексах", icon: Building },
];

export default function RentCategorySelector({ onSelect }: { onSelect: (category: RentCategory) => void }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Клиенты · Аренда</h1>
        <p className="text-sm text-gray-500 mt-1">Выберите категорию недвижимости</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {RENT_CATEGORIES.map(({ id, label, subtitle, icon: Icon }) => (
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
