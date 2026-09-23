"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/DatePicker";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import MoneyInput from "@/components/MoneyInput";

const DEAL_TYPE_MAP: Record<string, string> = {
  "Квартира": "kvartiry",
  "Помещения": "pomescheniya",
  "Земля": "zemlya",
  "Дома": "zemlya",
  "Дом": "zemlya",
  "Участок": "zemlya",
};

const DEAL_OBJECTS = ["Квартира", "Помещения", "Дом", "Участок"];
const DEAL_KINDS = [
  { id: "arenda", label: "Аренда" },
  { id: "pokupka", label: "Продажа" },
];
const PAYMENT_METHODS = ["Наличные", "Перечисление", "QR", "Удалённо"];

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
  const [amount, setAmount] = useState(client.amount ? String(client.amount) : "");
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [commission, setCommission] = useState("");
  const [payment, setPayment] = useState("");
  const [dealObject, setDealObject] = useState(client.type || "");
  const [dealKind, setDealKind] = useState(category === "prodaja" ? "pokupka" : "arenda");
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needContract = !client.contract;
  const needAmount = !client.amount;

  const dealType = DEAL_TYPE_MAP[dealObject || client.type || propertyType || ""] || "kvartiry";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract.trim()) return setError("Укажите номер договора");
    if (!amount) return setError("Укажите сумму сделки");
    if (!commission) return setError("Укажите комиссию агентства");
    if (!dealObject) return setError("Выберите объект сделки");
    if (!payment) return setError("Выберите способ оплаты");

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
          amount: parseFloat(amount) || 0,
          completed: "Сделка завершена",
        }),
      });
      if (!updRes.ok) {
        const updErr = await updRes.json().catch(() => ({}));
        throw new Error(updErr.error || "Не удалось обновить клиента");
      }

// 2. Create deal with client data (dealType/dealCategory рассчитаны выше)
      const dealRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealType,
          category: dealKind,
          type: dealObject || client.type || "",
          name: client.name || "Сделка",
          client: client.name || "",
          amount: parseFloat(amount) || client.amount || 0,
          commission: parseFloat(commission) || 0,
          payment,
          owner_name: ownerName,
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
          completion_date: new Date().toISOString().slice(0, 10),
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

{needContract && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Номер договора *</label>
              <Input value={contract} onChange={e => setContract(e.target.value)} placeholder="Например: АР-2026-001" className="text-sm" />
            </div>
          )}
          {needAmount && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Сумма сделки, ₸ *</label>
              <MoneyInput value={amount} onChange={setAmount} placeholder="25 000 000" />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Комиссия агентства, ₸ *</label>
            <MoneyInput value={commission} onChange={setCommission} placeholder="500 000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Объект сделки *</label>
              <select value={dealObject} onChange={e => setDealObject(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
                <option value="">Выберите</option>
                {DEAL_OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Тип сделки *</label>
              <select value={dealKind} onChange={e => setDealKind(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
                {DEAL_KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Способ оплаты *</label>
            <select value={payment} onChange={e => setPayment(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
              <option value="">Выберите</option>
              {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Собственник объекта</label>
            <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="ФИО собственника" className="text-sm" />
          </div>

          {!needContract && !needAmount && (
            <p className="text-sm text-gray-500">Договор и сумма уже указаны. Сделка будет закрыта.</p>
          )}

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