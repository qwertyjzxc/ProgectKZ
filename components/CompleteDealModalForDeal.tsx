"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/DatePicker";
import { X, Loader2, CheckCircle2 } from "lucide-react";

export default function CompleteDealModalForDeal({
  deal,
  dealType,
  category,
  onClose,
  onDone,
}: {
  deal: { id: number; name: string; contract?: string; amount?: number; type?: string; category?: string };
  dealType?: string;
  category?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [contract, setContract] = useState(deal.contract || "");
  const [amount, setAmount] = useState(deal.amount ? String(deal.amount) : "");
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
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract,
          amount: parseFloat(amount) || 0,
          completed: "Завершено",
          stage: "Сделка закрыта",
          date: completionDate,
          type: dealType || deal.type || "kvartiry",
          category: category || deal.category || "arenda",
          name: deal.name,
        }),
      });
      if (!res.ok) throw new Error("Не удалось обновить сделку");
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
            Сделка: <span className="font-medium text-gray-800">{deal.name || "Без имени"}</span>
          </p>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Номер договора *</label>
            <Input value={contract} onChange={e => setContract(e.target.value)} placeholder="Например: ПК-2026-001" className="text-sm" />
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
