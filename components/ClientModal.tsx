"use client";

import { ClientData } from "@/types/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Phone, MapPin, Home, Sofa, Users, FileText, Calendar, DollarSign, User, Trash2 } from "lucide-react";
import { useState } from "react";

interface ClientModalProps {
  client: ClientData | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function ClientModal({ client, onClose, onDelete }: ClientModalProps) {
  const [confirming, setConfirming] = useState(false);

  if (!client) return null;

  const handleDelete = () => {
    if (confirming && onDelete) {
      onDelete(client.id);
      onClose();
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-50 to-white">
          <h2 className="text-xl font-bold text-gray-800">{client.name}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Key info badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="w-3 h-3" /> {client.date}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <DollarSign className="w-3 h-3" /> {client.amount?.toLocaleString()} ₸
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Home className="w-3 h-3" /> {client.rooms}
            </Badge>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Район</p>
                <p className="font-medium">{client.district}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Sofa className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Мебель</p>
                <p className="font-medium">{client.furniture || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Срок аренды</p>
                <p className="font-medium">{client.rentalPeriod || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Телефон</p>
                <p className="font-medium">{client.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Кол-во человек</p>
                <p className="font-medium">{client.peopleCount}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Брокер</p>
                <p className="font-medium">{client.broker || "—"}</p>
              </div>
            </div>
          </div>

          {/* Who lives */}
          {client.whoLives && (
            <div className="flex items-start gap-2 text-sm bg-gray-50 p-3 rounded-lg">
              <FileText className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Кто будет жить / Под что</p>
                <p>{client.whoLives}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="flex items-start gap-2 text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-100">
              <FileText className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Показы / Заметки</p>
                <p className="whitespace-pre-wrap">{client.notes}</p>
              </div>
            </div>
          )}

          {/* Completion status */}
          {client.completed && (
            <div className="text-sm">
              <Badge variant={client.completed.includes("Да") || client.completed.includes("Сделка") ? "default" : "secondary"} className="text-xs">
                {client.completed}
              </Badge>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between gap-2">
          <div>
            {onDelete && (
              <Button
                variant={confirming ? "destructive" : "outline"}
                size="sm"
                onClick={handleDelete}
                className="gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {confirming ? "Подтвердить удаление" : "Удалить"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Закрыть
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Phone className="w-3.5 h-3.5 mr-1" />
              Позвонить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
