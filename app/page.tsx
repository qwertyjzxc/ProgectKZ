import { createClient } from "@/lib/supabase/server";
import PropertyCard from "@/components/PropertyCard";
import SearchBar from "@/components/SearchBar";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("properties").select("*");

  if (resolvedParams.district) {
    query = query.eq("district", resolvedParams.district);
  }
  if (resolvedParams.class) {
    query = query.eq("class", resolvedParams.class);
  }
  if (resolvedParams.rooms) {
    query = query.eq("rooms", parseInt(resolvedParams.rooms));
  }
  if (resolvedParams.price_max) {
    query = query.lte("price", parseInt(resolvedParams.price_max));
  }
  if (resolvedParams.q) {
    query = query.or(`title.ilike.%${resolvedParams.q}%,address.ilike.%${resolvedParams.q}%`);
  }

  const { data: properties, error } = await query.order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50">
      <SearchBar />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Новостройки Шымкента
        </h1>
        {error && (
          <p className="text-red-500 mb-4">
            Ошибка загрузки: {error.message}
          </p>
        )}
        {!properties || properties.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            Объектов не найдено. Попробуйте изменить фильтры.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p: any) => (
              <PropertyCard
                key={p.id}
                title={p.title}
                price={p.price?.toLocaleString() + " ₸"}
                rooms={p.rooms}
                area={p.area}
                floor={p.floor}
                address={p.address}
                description={p.description}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
