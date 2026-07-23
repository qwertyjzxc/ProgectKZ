import SupabaseTable from "@/components/SupabaseTable";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Данные из Supabase</h1>
      <SupabaseTable />
    </div>
  );
}