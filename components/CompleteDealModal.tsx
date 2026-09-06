"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/DatePicker";
import { X, Loader2, CheckCircle2 } from "lucide-react";

const TYPE_TO_DEAL_TYPE: Record<string, string> = {
  "Квартира": "kvartiry",
  "Помещения": "pomescheniya",
  "Дома": "zemlya",
};

const CATEGORY_TO_DEAL_CATEGORY: Record<string, string> = {
  arenda: "arenda",
  prodaja: "pokupka",
};

export default function CompleteDealModal({
  client,
  category,
  propertyType,
  onClose,
  onDone,
}: {
  client: { id: number; name: string; contract: string; amount: number; phone?: string; district?: string; rooms?: string; area?: string; address?: string; jk?: string; broker?: string; type?: string; furniture?: string; rental_period?: string; who_lives?: string; people_count?: number; notes?: string; };
  category: string;
  propertyType?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [contract, setContract] = useState(client.contract || "");
  const [amount, setAmount] = useState(client.amount ? String(client.amount) : "");
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract.trim()) return setError("Укажите номер договора");
    if (!amount) return setError("Укажите сумму сделки");

    setLoading(true);
    setError("");

    try {
      // 1. Update client (contract, amount, completed)
      const updRes = await fetch(`/api/clients/${category}/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract: contract,
          amount: parseFloat(amount) || 0,
          completed: "Завершено",
        }),
      });
      if (!updRes.ok) throw new Error("Не удалось обновить клиента");

      // 2. Create deal with all client data in the correct table
      const dealType = TYPE_TO_DEAL_TYPE[client.type || propertyType || ""] || "kvartiry";
      const dealCategory = CATEGORY_TO_DEAL_CATEGORY[category] || "arenda";
      const dealRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealType: dealType,
          name: client.name || "Сделка",
          client: client.name || "",
          amount: parseFloat(amount) || client.amount || 0,
          stage: "Сделка закрыта",
          completed: "Завершено",
          date: completionDate,
          category: dealCategory,
          contract: contract,
          phone: client.phone || "",
          district: client.district || "",
          rooms: client.rooms || "",
          area: client.area || "",
          address: client.address || "",
          jk: client.jk || "",
          broker: client.broker || "",
          furniture: client.furniture || "",
          rental_period: client.rental_period || "",
          who_lives: client.who_lives || "",
          people_count: client.people_count || 1,
          notes: client.notes || "",
          type: client.type || "",
        }),
      });
      if (!dealRes.ok) throw new Error("Не удалось создать сделку");

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
            <label className="text-xs text-gray-500 mb-1 block">Сумма сделки, ₸ *</label>
            <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="25000000" className="text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Дата завершения</label>
            <DatePicker value={completionDate} onChange={setCompletionDate} placeholder="Выберите дату" />
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
