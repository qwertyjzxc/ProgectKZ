"use client";

import { useState } from "react";
import { useEscapeKey } from "@/lib/use-escape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MoneyInput from "@/components/MoneyInput";
import DatePicker from "@/components/DatePicker";
import { OWNER_CATEGORY_LABELS, type OwnerCategory } from "@/components/dashboard/OwnerCategorySelector";
import type { Owner } from "@/lib/owner-types";
import { CheckCircle2, Loader2, X } from "lucide-react";

export default function OwnerCompleteDealModal({ owner, category, onClose, onDone }: { owner: Owner; category: OwnerCategory; onClose: () => void; onDone: (data: { contract: string; amount: number; completion_date: string }) => void }) {
  const [contract, setContract] = useState("");
  useEscapeKey(onClose);
  const [amount, setAmount] = useState(owner.price ? String(owner.price) : "");  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract.trim()) return setError("Укажите номер договора");
    if (!amount) return setError("Укажите сумму сделки");
    setLoading(true);
    setError("");
    onDone({
      contract: contract.trim(),
      amount: parseFloat(amount) || 0,
      completion_date: completionDate,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Завершить сделку</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="text-sm text-gray-500 space-y-1">
            <p>Собственник: <span className="font-medium text-gray-800">{owner.name || "Без имени"}</span></p>
            <p>Категория: <span className="font-medium text-gray-800">{OWNER_CATEGORY_LABELS[category]}</span></p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Номер договора *</label>
            <Input value={contract} onChange={e => setContract(e.target.value)} placeholder="Например: ПК-2026-001" className="text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Сумма сделки, ₸ *</label>
            <MoneyInput value={amount} onChange={setAmount} placeholder="25 000 000" />
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
