"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PropertyGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return <div className="w-full h-72 sm:h-96 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-xl"><span className="text-gray-400 text-lg">Нет фото</span></div>;
  return (
    <div className="relative">
      <div className="relative w-full h-80 sm:h-[450px] md:h-[600px] bg-gray-900 rounded-xl overflow-hidden">
        <img src={images[active]} alt={`Фото ${active + 1}`} className="w-full h-full object-cover" />
        {images.length > 1 && (<>
          <button onClick={() => setActive(p => p === 0 ? images.length - 1 : p - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => setActive(p => p === images.length - 1 ? 0 : p + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg"><ChevronRight className="w-5 h-5" /></button>
        </>)}
        <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full">{active + 1} / {images.length}</span>
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button key={i} onClick={() => setActive(i)} className={`shrink-0 w-24 h-20 rounded-lg overflow-hidden border-2 transition-colors ${i === active ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"}`}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
