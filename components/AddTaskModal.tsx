"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save, ChevronDown } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import AssigneePicker from "@/components/AssigneePicker";

export interface NewTaskData {
  title: string;
  client: string;
  description: string;
  created_date: string;
  due_date: string;
  priority: string;
  assignee_ids: number[];
}

function nowLocalDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

export default function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: NewTaskData) => void }) {
  const { currentProfile } = useProfile();
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [createdDate, setCreatedDate] = useState(nowLocalDateTime());
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Средний");
  const [assigneeIds, setAssigneeIds] = useState<number[]>(currentProfile ? [currentProfile.id] : []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title,
      client,
      description,
      created_date: createdDate,
      due_date: dueDate,
      priority,
      assignee_ids: assigneeIds,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Новая задача</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Название задачи</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: показать объект" required className="text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Дополнительные детали задачи..." rows={3} className="w-full rounded-lg border px-3 py-2 text-sm resize-y outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Клиент (необязательно)</label>
            <Input value={client} onChange={e => setClient(e.target.value)} placeholder="Имя клиента" className="text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата и время создания</label>
              <Input type="datetime-local" value={createdDate} onChange={e => setCreatedDate(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Выполнить до</label>
              <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Срочность</label>
              <div className="relative">
                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-9 appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500">
                  <option>Высокий</option><option>Средний</option><option>Низкий</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ответственные</label>
              <AssigneePicker value={assigneeIds} onChange={setAssigneeIds} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" size="sm" className="bg-blue-600"><Save className="w-3.5 h-3.5 mr-1" />Добавить</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
