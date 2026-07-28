"use client";

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
    const res = await fetch(`/api/clients/${id}`, {
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
