import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PropertyGallery from "@/components/PropertyGallery";

interface PublicProperty {
  title: string;
  price: number;
  rooms: number | null;
  address: string;
  description: string;
  image_url?: string;
  image_urls?: string[];
  city?: string;
  building_type?: string;
  complex_name?: string;
  year_built?: number;
  area?: number;
  bathroom?: string;
  ceiling_height?: number;
}

export default async function PublicPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: raw } = await supabase.from("properties").select("*").eq("id", id).single();
  if (!raw) notFound();
  const p = raw as unknown as PublicProperty;
  const images: string[] = p.image_urls?.length ? p.image_urls : p.image_url ? [p.image_url] : [];

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b"><div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center text-sm text-gray-500"><span className="text-gray-900 font-medium">Объявление</span></div></div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5 order-2 lg:order-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">{p.title}</h1>
          <p className="text-3xl font-bold text-gray-900">{Number(p.price).toLocaleString()} ₸</p>
          <div className="space-y-2 text-base text-gray-700">
            {p.rooms != null && <p><span className="text-gray-400 w-36 inline-block">Кол-во комнат:</span> {p.rooms}</p>}
            {p.address && <p><span className="text-gray-400 w-36 inline-block">Адрес:</span> {p.address}</p>}
            {p.city && <p><span className="text-gray-400 w-36 inline-block">Город:</span> {p.city}</p>}
            {p.building_type && <p><span className="text-gray-400 w-36 inline-block">Тип дома:</span> {p.building_type}</p>}
            {p.complex_name && <p><span className="text-gray-400 w-36 inline-block">Жилой комплекс:</span> {p.complex_name}</p>}
            {p.year_built && <p><span className="text-gray-400 w-36 inline-block">Год постройки:</span> {p.year_built}</p>}
            {p.area && <p><span className="text-gray-400 w-36 inline-block">Площадь:</span> {p.area} м²</p>}
            {p.bathroom && <p><span className="text-gray-400 w-36 inline-block">Санузел:</span> {p.bathroom}</p>}
            {p.ceiling_height && <p><span className="text-gray-400 w-36 inline-block">Потолки:</span> {p.ceiling_height} м</p>}
          </div>
          <hr className="border-gray-200" />
          {p.description && (<div><h2 className="text-base font-semibold text-gray-900 mb-2">Описание</h2><p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">{p.description}</p></div>)}
        </div>
        <div className="order-1 lg:order-2"><PropertyGallery images={images} /></div>
      </div>
      {/* Map */}
      {(p.address || p.city) && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Расположение</h2>
          <div className="rounded-2xl overflow-hidden border h-72 sm:h-96">
            <iframe
              src={`https://yandex.ru/map-widget/v1/?text=${encodeURIComponent([p.city, p.address].filter(Boolean).join(', '))}&z=15`}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      <div className="border-t mt-8"><div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-gray-400 text-center">Romanov Estate</div></div>
    </div>
  );
}
