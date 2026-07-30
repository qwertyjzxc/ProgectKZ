"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save } from "lucide-react";

export default function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: any) => void }) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("Средний");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Новая задача</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAdd({ title, client: client || "—", due, priority, id: Date.now() }); onClose(); }} className="p-4 space-y-3">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название задачи" required className="text-sm" />
          <Input value={client} onChange={e => setClient(e.target.value)} placeholder="Клиент" className="text-sm" />
          <Input value={due} onChange={e => setDue(e.target.value)} placeholder="ДД.ММ.ГГГГ ЧЧ:ММ" className="text-sm" />
          <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
            <option>Высокий</option><option>Средний</option><option>Низкий</option>
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
