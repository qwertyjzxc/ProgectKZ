import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PropertyGallery from "@/components/PropertyGallery";

export default async function PublicPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("properties").select("*").eq("id", id).single();
  if (!p) notFound();
  const images: string[] = (p.image_urls as string[])?.length ? (p.image_urls as string[]) : p.image_url ? [p.image_url] : [];

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b"><div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center text-sm text-gray-500"><span className="text-gray-900 font-medium">Объявление</span></div></div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5 order-2 lg:order-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">{p.title}</h1>
          <p className="text-3xl font-bold text-gray-900">{Number(p.price).toLocaleString()} ₸</p>
          <div className="space-y-2 text-base text-gray-700">
            {p.rooms != null && <p><span className="text-gray-400 w-36 inline-block">Комнат:</span> {p.rooms}</p>}
            {p.address && <p><span className="text-gray-400 w-36 inline-block">Адрес:</span> {p.address}</p>}
            {(p as any).city && <p><span className="text-gray-400 w-36 inline-block">Город:</span> {(p as any).city}</p>}
            {(p as any).building_type && <p><span className="text-gray-400 w-36 inline-block">Тип дома:</span> {(p as any).building_type}</p>}
            {(p as any).complex_name && <p><span className="text-gray-400 w-36 inline-block">ЖК:</span> {(p as any).complex_name}</p>}
            {(p as any).year_built && <p><span className="text-gray-400 w-36 inline-block">Год постройки:</span> {(p as any).year_built}</p>}
            {(p as any).area && <p><span className="text-gray-400 w-36 inline-block">Площадь:</span> {(p as any).area} м²</p>}
            {(p as any).bathroom && <p><span className="text-gray-400 w-36 inline-block">Санузел:</span> {(p as any).bathroom}</p>}
            {(p as any).ceiling_height && <p><span className="text-gray-400 w-36 inline-block">Потолки:</span> {(p as any).ceiling_height} м</p>}
          </div>
          <hr className="border-gray-200" />
          {p.description && (<div><h2 className="text-base font-semibold text-gray-900 mb-2">Описание</h2><p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">{p.description}</p></div>)}
        </div>
        <div className="order-1 lg:order-2"><PropertyGallery images={images} /></div>
      </div>
      <div className="border-t mt-8"><div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-gray-400 text-center">Romanov Estate</div></div>
    </div>
  );
}
