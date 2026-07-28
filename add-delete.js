const fs = require('fs');

// 1. API route for DELETE /api/clients/[id]
const dir = 'app/api/clients';
const idDir = dir + '/[id]';
if (!fs.existsSync(idDir)) fs.mkdirSync(idDir, { recursive: true });

const deleteRoute = `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
`;

fs.writeFileSync(idDir + '/route.ts', deleteRoute, 'utf-8');
console.log('DELETE route created');

// 2. Updated ClientModal with delete button
const clientModal = `"use client";

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
`;

fs.writeFileSync('components/ClientModal.tsx', clientModal, 'utf-8');
console.log('ClientModal updated with delete');

// 3. Update ClientTable to pass onDelete
const clientTable = `"use client";

import { ClientData } from "@/types/client";
import ClientModal from "@/components/ClientModal";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const columnHeaders = [
  "Дата обращения",
  "Имя клиента",
  "Кол-во комнат/Помеще",
  "Район",
  "Сумма",
  "Мебель",
  "Срок аренды",
  "Телефон",
  "Кто будет жить/Под что",
  "Кол-во человек",
  "Показы/Заметки",
  "Завершены",
  "Брокер",
];

function getStatusBadge(value: string) {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.includes("да") || v.includes("сделка") || v.includes("завершен")) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">{value}</Badge>;
  }
  if (v.includes("в процессе") || v.includes("думает") || v.includes("показ")) {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">{value}</Badge>;
  }
  if (v.includes("нет") || v.includes("отказ")) {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">{value}</Badge>;
  }
  return <Badge variant="outline" className="text-xs">{value}</Badge>;
}

interface ClientTableProps {
  clients: ClientData[];
  onDeleteClient: (id: string) => void;
}

export default function ClientTable({ clients, onDeleteClient }: ClientTableProps) {
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  return (
    <>
      {/* Table container with horizontal scroll */}
      <div className="bg-white rounded-xl shadow-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b-2 border-gray-200">
              <tr>
                {columnHeaders.map((header, i) => (
                  <th
                    key={i}
                    className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table body */}
            <tbody className="divide-y divide-gray-100">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="hover:bg-blue-50/60 cursor-pointer transition-colors duration-150"
                >
                  <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{client.date}</td>
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-800 whitespace-nowrap">
                    {client.name}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-center whitespace-nowrap">{client.rooms}</td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {client.district}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-right font-medium whitespace-nowrap">
                    {client.amount?.toLocaleString()} ₸
                  </td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">{client.furniture}</td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">{client.rentalPeriod}</td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">{client.phone}</td>
                  <td className="px-3 py-2.5 text-sm max-w-xs truncate">{client.whoLives}</td>
                  <td className="px-3 py-2.5 text-sm text-center whitespace-nowrap">{client.peopleCount}</td>
                  <td className="px-3 py-2.5 text-sm max-w-xs truncate text-gray-500">{client.notes}</td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                    {getStatusBadge(client.completed)}
                  </td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">{client.broker}</td>
                </tr>
              ))}

              {/* Empty state */}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center text-gray-400">
                    <p className="text-lg">Нет данных</p>
                    <p className="text-sm mt-1">Добавьте клиентов через кнопку «Добавить клиента»</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="border-t bg-gray-50/50 px-4 py-2 text-xs text-gray-400">
          Всего клиентов: {clients.length}
        </div>
      </div>

      {/* Client detail modal with delete */}
      <ClientModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onDelete={onDeleteClient}
      />
    </>
  );
}
`;

fs.writeFileSync('components/ClientTable.tsx', clientTable, 'utf-8');
console.log('ClientTable updated');

// 4. Update page.tsx to add delete logic
const pageContent = `"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ClientTable from "@/components/ClientTable";
import SearchBar from "@/components/SearchBar";
import AddClientModal from "@/components/AddClientModal";
import { ClientData } from "@/types/client";
import { Suspense } from "react";

function mapRowToClient(row: any): ClientData {
  return {
    id: String(row.id),
    date: row.date || "",
    name: row.name || "",
    rooms: row.rooms || "",
    district: row.district || "",
    amount: row.amount || 0,
    furniture: row.furniture || "",
    rentalPeriod: row.rental_period || "",
    phone: row.phone || "",
    whoLives: row.who_lives || "",
    peopleCount: row.people_count || 1,
    notes: row.notes || "",
    completed: row.completed || "",
    broker: row.broker || "",
  };
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load clients from Supabase on mount
  useEffect(() => {
    fetch("/api/clients")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClients(data.map(mapRowToClient));
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAddClient = useCallback(async (client: ClientData) => {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client),
    });

    if (res.ok) {
      const newRow = await res.json();
      setClients(prev => [mapRowToClient(newRow), ...prev]);
    }
  }, []);

  const handleDeleteClient = useCallback(async (id: string) => {
    const res = await fetch(\`/api/clients/\${id}\`, {
      method: "DELETE",
    });

    if (res.ok) {
      setClients(prev => prev.filter(c => c.id !== id));
    }
  }, []);

  // Filter based on query params
  const filteredClients = useMemo(() => {
    let result = clients;

    const q = searchParams.get("q");
    const district = searchParams.get("district");
    const status = searchParams.get("status");
    const broker = searchParams.get("broker");
    const priceMin = searchParams.get("price_min");
    const priceMax = searchParams.get("price_max");

    if (q) {
      const ql = q.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(ql) ||
        c.phone.includes(ql) ||
        c.district.toLowerCase().includes(ql) ||
        c.broker.toLowerCase().includes(ql) ||
        c.notes.toLowerCase().includes(ql)
      );
    }
    if (district) result = result.filter(c => c.district === district);
    if (status) result = result.filter(c => c.completed === status);
    if (broker) result = result.filter(c => c.broker === broker);
    if (priceMin) result = result.filter(c => c.amount >= parseInt(priceMin));
    if (priceMax) result = result.filter(c => c.amount <= parseInt(priceMax));

    return result;
  }, [clients, searchParams]);

  return (
    <main className="min-h-screen bg-gray-50">
      <SearchBar onAddClick={() => setShowAddModal(true)} />
      <div className="p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Клиенты</h1>
          <p className="text-sm text-gray-500 mt-1">
            Хранилище: Supabase • Всего: {clients.length}
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-md border p-12 text-center">
            <div className="animate-pulse text-gray-400">Загрузка данных из Supabase...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
            Ошибка: {error}. Проверьте, что выполнена SQL-миграция (supabase-clients-schema.sql).
          </div>
        )}

        {!loading && !error && <ClientTable clients={filteredClients} onDeleteClient={handleDeleteClient} />}
      </div>

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddClient}
        />
      )}
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Загрузка...</div>}>
      <HomeContent />
    </Suspense>
  );
}
`;

fs.writeFileSync('app/page.tsx', pageContent, 'utf-8');
console.log('Page updated with delete logic');
