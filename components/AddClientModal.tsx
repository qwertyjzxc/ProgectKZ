"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save } from "lucide-react";

export default function AddClientModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: any) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Новый клиент</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAdd({ name, phone: phone || "—", email: email || "—", id: Date.now(), date: new Date().toLocaleDateString("ru-RU"), status: "Активен", deals: 0 }); onClose(); }} className="p-4 space-y-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Фамилия Имя" required className="text-sm" />
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 777 123 45 67" className="text-sm" />
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@mail.ru" className="text-sm" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" size="sm" className="bg-blue-600"><Save className="w-3.5 h-3.5 mr-1" />Добавить</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
