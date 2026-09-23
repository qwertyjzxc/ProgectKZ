"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import MoneyInput from "@/components/MoneyInput";

const DEAL_TYPE_MAP: Record<string, string> = {
  "Квартира": "kvartiry",
  "Квартиры": "kvartiry",
  "Помещения": "pomescheniya",
  "Земля": "zemlya",
  "Дома": "zemlya",
  "Дом": "zemlya",
  "Участок": "zemlya",
};

const PROPERTY_TYPE_TO_DEAL: Record<string, string> = {
  houses: "zemlya",
  premises: "pomescheniya",
  apartments: "kvartiry",
};

export default function CompleteDealModal({
  client,
  category,
  propertyType,
  onClose,
  onDone,
}: {
  client: {
    id: number;
    name: string;
    contract: string;
    amount: number;
    type?: string;
    phone?: string;
    district?: string;
    address?: string;
    jk?: string;
    rooms?: string;
    area?: string;
    area_unit?: string;
    furniture?: string;
    rental_period?: string;
    who_lives?: string;
    people_count?: number;
    notes?: string;
    completed?: string;
    broker?: string;
    date?: string;
    plot_type?: string;
    purpose?: string;
    communications?: string;
    access?: string;
    plot_shape?: string;
    relief?: string;
    restrictions?: string;
  };
  category: string;
  propertyType?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [contract, setContract] = useState(client.contract || "");
  const [budget, setBudget] = useState(client.amount ? String(client.amount) : "");
  const [completionDate] = useState(new Date().toISOString().slice(0, 10));
  const dealKind = category === "prodaja" ? "pokupka" : "arenda";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Клиент попадает в свою категорию: из id вкладки (houses/premises/apartments) или типа клиента
  const dealType = PROPERTY_TYPE_TO_DEAL[propertyType || ""] || DEAL_TYPE_MAP[client.type || ""] || "kvartiry";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Проверяем только наличие договора и бюджета клиента
    if (!contract.trim()) return setError("Укажите номер договора");
    if (!budget) return setError("Укажите бюджет");

    setLoading(true);
    setError("");

    try {
      // 1. Update client (contract, amount, completed)
      const updRes = await fetch(`/api/clients/${category}/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: client.type || "",
          contract: contract,
          amount: parseFloat(budget) || 0,
          completed: "Сделка завершена",
        }),
      });
      if (!updRes.ok) {
        const updErr = await updRes.json().catch(() => ({}));
        throw new Error(updErr.error || "Не удалось обновить клиента");
      }

      // 2. Create deal with client data (dealType рассчитан выше)
      const dealRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealType,
          category: dealKind,
          type: client.type || "",
          name: client.name || "Сделка",
          client: client.name || "",
          amount: parseFloat(budget) || 0,
          stage: "Сделка закрыта",
          completed: "Завершено",
          date: completionDate,
          contract: contract,
          phone: client.phone || "",
          district: client.district || "",
          rooms: client.rooms || "",
          area: client.area || "",
          address: client.address || "",
          jk: client.jk || "",
          broker: client.broker || "",
          area_unit: client.area_unit || "сот",
          furniture: client.furniture || "",
          rental_period: client.rental_period || "",
          who_lives: client.who_lives || "",
          people_count: client.people_count || 1,
          notes: client.notes || "",
          plot_type: client.plot_type || "",
          purpose: client.purpose || "",
          communications: client.communications || "",
          access: client.access || "",
          plot_shape: client.plot_shape || "",
          relief: client.relief || "",
          restrictions: client.restrictions || "",
          completion_date: completionDate,
        }),
      });
      if (!dealRes.ok) {
        const errData = await dealRes.json().catch(() => ({}));
        throw new Error(errData.error || "Не удалось создать сделку");
      }

      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Завершить сделку</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-gray-500">
            Клиент: <span className="font-medium text-gray-800">{client.name || "Без имени"}</span>
          </p>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Номер договора *</label>
            <Input value={contract} onChange={e => setContract(e.target.value)} placeholder="Например: АР-2026-001" className="text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Бюджет, ₸ *</label>
            <MoneyInput value={budget} onChange={setBudget} placeholder="25 000 000" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Дата завершения</label>
            <div className="h-9 rounded-lg border px-3 flex items-center text-sm text-gray-700 bg-gray-50">
              {new Date(completionDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {loading ? "Завершение..." : "Завершить"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
