"use client";

import { ArrowLeft, Building, Building2, Home, type LucideIcon } from "lucide-react";

const DEAL_TYPES: { id: string; label: string; subtitle: string; icon: LucideIcon }[] = [
  { id: "kvartiry", label: "Квартиры", subtitle: "Квартиры в жилых комплексах", icon: Building },
  { id: "pomescheniya", label: "Помещения", subtitle: "Коммерческие площади, офисы", icon: Building2 },
  { id: "zemlya", label: "Земля", subtitle: "Коммерческие участки, участки", icon: Home },
];

export const DEAL_CATEGORY_LABELS: Record<string, string> = {
  arenda: "Аренда",
  pokupka: "Покупка",
};

export default function DealTypeSelector({
  category,
  onSelect,
  onBack,
}: {
  category: string;
  onSelect: (type: string) => void;
  onBack: () => void;
}) {
  const categoryLabel = DEAL_CATEGORY_LABELS[category] || category;

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />Назад к категориям
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Сделки · {categoryLabel}</h1>
        <p className="text-sm text-gray-500 mt-1">Выберите тип недвижимости</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {DEAL_TYPES.map(({ id, label, subtitle, icon: Icon }) => (
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
