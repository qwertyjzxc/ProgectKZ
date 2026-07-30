"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save } from "lucide-react";

export default function AddDealModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: any) => void }) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("Первичный контакт");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Новая сделка</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAdd({ name, client: client || "Новый лид", amount: parseInt(amount) || 0, stage, id: Date.now(), date: new Date().toLocaleDateString("ru-RU") }); onClose(); }} className="p-4 space-y-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Название сделки" required className="text-sm" />
          <Input value={client} onChange={e => setClient(e.target.value)} placeholder="Клиент" className="text-sm" />
          <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Сумма, ₸" className="text-sm" />
          <select value={stage} onChange={e => setStage(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
            <option>Первичный контакт</option><option>Переговоры</option><option>Показ</option><option>Ожидание</option><option>Сделка закрыта</option>
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" size="sm" className="bg-blue-600"><Save className="w-3.5 h-3.5 mr-1" />Добавить</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
