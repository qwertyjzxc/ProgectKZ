import OwnersTab from "@/components/dashboard/OwnersTab";

export default function OwnersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Собственники</h1>
        <p className="text-sm text-gray-500 mt-1">Собственники объектов по категориям</p>
      </div>
      <OwnersTab />
    </div>
  );
}