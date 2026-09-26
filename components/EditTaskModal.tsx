"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/use-escape";
import AssigneePicker from "@/components/AssigneePicker";

export interface EditableTask {
  id: number;
  title: string;
  client: string;
  description: string;
  created_date: string;
  due_date: string;
  priority: string;
  status: string;
  assignee_ids: number[];
}

function toDateTimeLocal(s: string): string {
  const ru = (s || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[, ]+(\d{1,2}):(\d{2}))?/);
  if (ru) return ru[3] + "-" + ru[2].padStart(2, "0") + "-" + ru[1].padStart(2, "0") + "T" + (ru[4] || "00").padStart(2, "0") + ":" + (ru[5] || "00");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s || "")) return s;
  return "";
}

export default function EditTaskModal({ task, onClose, onSave }: { task: EditableTask; onClose: () => void; onSave: (t: EditableTask) => void }) {
  useEscapeKey(onClose);
  const [title, setTitle] = useState(task.title);
  const [client, setClient] = useState(task.client);
  const [description, setDescription] = useState(task.description);
  const [createdDate, setCreatedDate] = useState(toDateTimeLocal(task.created_date));
  const [dueDate, setDueDate] = useState(toDateTimeLocal(task.due_date));
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [assigneeIds, setAssigneeIds] = useState<number[]>(task.assignee_ids || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: task.id, title, client, description, created_date: createdDate, due_date: dueDate, priority, status, assignee_ids: assigneeIds });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-bold">Редактировать задачу</h2><Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Название задачи</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required className="text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm resize-y outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Клиент</label>
            <Input value={client} onChange={e => setClient(e.target.value)} className="text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата обращения</label>
              <Input type="datetime-local" value={createdDate} onChange={e => setCreatedDate(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Выполнить до</label>
              <Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Срочность</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-9 appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500">
                <option>Высокий</option><option>Средний</option><option>Низкий</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-9 appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500">
                <option>В работе</option><option>Запланировано</option><option>Завершено</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ответственные</label>
              <AssigneePicker value={assigneeIds} onChange={setAssigneeIds} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" size="sm" className="bg-blue-600">Сохранить</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
