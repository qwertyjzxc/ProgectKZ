"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import MoneyInput from "@/components/MoneyInput";
import { useEscapeKey } from "@/lib/use-escape";

const PAYMENT_OPTIONS = ["Наличные", "Перечисление", "QR", "Удаленка"];

function normalizeObjectType(type?: string, propertyType?: string): string {
  if (propertyType === "houses") return "Дом";
  if (propertyType === "premises") return "Помещение";
  if (propertyType === "apartments") return "Квартира";
  if (type === "Дома" || type === "Дом") return "Дом";
  if (type === "Земля" || type === "Участок") return "Участок";
  if (type === "Помещения" || type === "Помещение") return "Помещение";
  if (type === "Квартиры" || type === "Квартира") return "Квартира";
  return "Квартира";
}

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
  useEscapeKey(onClose);
  const [objectType, setObjectType] = useState<string>(() => normalizeObjectType(client.type, propertyType));  const [dealKind, setDealKind] = useState<string>(() => (category === "prodaja" ? "Продажа" : "Аренда"));
  const [amount, setAmount] = useState(client.amount ? String(client.amount) : "");
  const [commission, setCommission] = useState("");
  const [contract, setContract] = useState(client.contract || "");
  const [payment, setPayment] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionDate) return setError("Укажите дату завершения сделки");
    if (!amount) return setError("Укажите сумму сделки");
    if (!contract.trim()) return setError("Укажите номер договора");
    if (!payment) return setError("Укажите способ оплаты");
    if (!commission && commission.trim() === "") return setError("Укажите сумму комиссии агентства");

    setLoading(true);
    setError("");

    const dealTypeMap: Record<string, string> = { "Квартира": "kvartiry", "Помещение": "pomescheniya", "Дом": "zemlya", "Участок": "zemlya" };
    const dealType = dealTypeMap[objectType] || "kvartiry";
    const dealCategory = dealKind === "Продажа" ? "pokupka" : "arenda";

    try {
      // 1. Update client (тип, договор, сумма, статус «Сделка завершена»)
      const updRes = await fetch(`/api/clients/${category}/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: objectType,
          contract: contract,
          amount: parseFloat(amount) || 0,
          completed: "Сделка завершена",
        }),
      });
      if (!updRes.ok) {
        const updErr = await updRes.json().catch(() => ({}));
        throw new Error(updErr.error || "Не удалось обновить клиента");
      }

      // 2. Create deal with client data
      const dealRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealType,
          category: dealCategory,
          type: objectType,
          name: client.name || "Сделка",
          client: client.name || "",
          amount: parseFloat(amount) || 0,
          commission: parseFloat(commission) || 0,
          owner_name: ownerName,
          stage: "Сделка закрыта",
          completed: "Сделка",
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
          payment,
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Завершить сделку</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-gray-500">
            Клиент: <span className="font-medium text-gray-800">{client.name || "Без имени"}</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Объект сделки *</label>
              <select value={objectType} onChange={e => setObjectType(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
                <option>Квартира</option>
                <option>Помещение</option>
                <option>Дом</option>
                <option>Участок</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Тип сделки *</label>
              <select value={dealKind} onChange={e => setDealKind(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
                <option>Аренда</option>
                <option>Продажа</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Сумма сделки, ₸ *</label>
              <MoneyInput value={amount} onChange={setAmount} placeholder="25 000 000" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Комиссия агентства, ₸ *</label>
              <MoneyInput value={commission} onChange={setCommission} placeholder="500 000" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Номер договора *</label>
              <Input value={contract} onChange={e => setContract(e.target.value)} placeholder="Например: АР-2026-001" className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Способ оплаты *</label>
              <select value={payment} onChange={e => setPayment(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
                <option value="">— Не указано —</option>
                {PAYMENT_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата завершения *</label>
              <Input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Собственник</label>
              <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Имя собственника" className="text-sm" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {loading ? "Завершение..." : "Подтвердить"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}