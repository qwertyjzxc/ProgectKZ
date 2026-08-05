import OurObjectsTab from "@/components/dashboard/OurObjectsTab";

export default function OurObjectsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Наши объекты</h1>
        <p className="text-sm text-gray-500 mt-1">Объекты, сохранённые в базу</p>
      </div>
      <OurObjectsTab />
    </div>
  );
}
