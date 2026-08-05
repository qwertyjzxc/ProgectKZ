import KrishaObjectsTab from "@/components/dashboard/KrishaObjectsTab";

export default function KrishaObjectsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Объекты недвижимости</h1>
        <p className="text-sm text-gray-500 mt-1">
          Живые объявления с Krisha.kz (г. Шымкент). Обновляются автоматически.
        </p>
      </div>
      <KrishaObjectsTab />
    </div>
  );
}
