"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Maximize, BedDouble, Building2 } from "lucide-react";

interface PropertyCardProps {
  title: string;
  price: string;
  rooms?: number;
  area?: number;
  floor?: number;
  address?: string;
  description?: string;
  district?: string;
  class_type?: string;
}

export default function PropertyCard({
  title,
  price,
  rooms,
  area,
  floor,
  address,
  description,
  district,
  class_type,
}: PropertyCardProps) {
  return (
    <Card className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Image placeholder with gradient */}
      <div className="relative h-52 bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        <Building2 className="w-16 h-16 text-blue-300 group-hover:scale-110 transition-transform duration-300" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-full shadow-sm"
        >
          <Heart className="w-4 h-4 text-gray-500 hover:text-red-500 transition-colors" />
        </Button>
        {class_type && (
          <Badge variant="secondary" className="absolute top-3 left-3 bg-white/90 hover:bg-white shadow-sm text-xs">
            {class_type}
          </Badge>
        )}
      </div>

      <CardContent className="flex-1 flex flex-col gap-3 p-5">
        <h3 className="text-lg font-semibold text-gray-800 leading-tight line-clamp-1">{title}</h3>

        <div className="text-2xl font-bold text-blue-600">
          {price}
        </div>

        <div className="flex flex-wrap gap-2">
          {rooms != null && (
            <Badge variant="outline" className="gap-1 text-xs">
              <BedDouble className="w-3 h-3" />
              {rooms}-комн.
            </Badge>
          )}
          {area != null && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Maximize className="w-3 h-3" />
              {area} м²
            </Badge>
          )}
          {floor != null && (
            <Badge variant="outline" className="gap-1 text-xs">
              этаж {floor}
            </Badge>
          )}
        </div>

        {address && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500 mt-1">
            <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </div>
        )}

        {description && (
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mt-auto">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
