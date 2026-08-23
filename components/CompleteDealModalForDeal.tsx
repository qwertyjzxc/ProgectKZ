"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needContract = !deal.contract;
  const needAmount = !deal.amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needContract && !contract.trim()) return setError("Укажите номер договора");
    if (needAmount && !amount) return setError("Укажите сумму сделки");

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract: contract || deal.contract || "",
          amount: parseFloat(amount) || deal.amount || 0,
          completed: "Завершено",
          type: dealType || deal.type || "kvartiry",
          category: category || deal.category || "arenda",
          name: deal.name,
        }),
      });
      if (!res.ok) throw new Error("Не удалось обновить сделку");
      onDone();
    } catch (err: any) {
      setError(err.message || "Ошибка");
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

          {needContract && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Номер договора *</label>
              <Input value={contract} onChange={e => setContract(e.target.value)} placeholder="Например: ПК-2026-001" className="text-sm" />
            </div>
          )}
          {needAmount && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Сумма сделки, ₸ *</label>
              <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="25000000" className="text-sm" />
            </div>
          )}

          {!needContract && !needAmount && (
            <p className="text-sm text-gray-500">Договор и сумма уже указаны. Сделка будет завершена.</p>
          )}

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
