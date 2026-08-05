"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save, CheckCircle2, ChevronDown } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import AssigneePicker from "@/components/AssigneePicker";

export default function AssignTaskModal({ clientName, onClose }: { clientName: string; onClose: () => void }) {
  const { currentProfile } = useProfile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("Средний");
  const [assigneeIds, setAssigneeIds] = useState<number[]>(currentProfile ? [currentProfile.id] : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          client: clientName,
          description,
          due_date: due,
          priority,
          status: "В работе",
          assignee_ids: assigneeIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка создания задачи");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания задачи");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Назначить задачу</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        {saved ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-900">Задача создана</p>
            <p className="text-sm text-gray-500 mt-1">Задача по клиенту «{clientName}» добавлена</p>
            <Button className="mt-5 bg-blue-600" onClick={onClose}>Готово</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Клиент</label>
              <Input value={clientName} readOnly className="text-sm bg-gray-50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Название задачи</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: показать объект" required className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Описание</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Дополнительные детали задачи..." rows={2} className="w-full rounded-lg border px-3 py-2 text-sm resize-y outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Выполнить до</label>
                <Input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Срочность</label>
                <div className="relative">
                  <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-9 appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500">
                    <option>Высокий</option><option>Средний</option><option>Низкий</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ответственные</label>
              <AssigneePicker value={assigneeIds} onChange={setAssigneeIds} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
              <Button type="submit" size="sm" className="bg-blue-600" disabled={loading}>
                <Save className="w-3.5 h-3.5 mr-1" />{loading ? "Сохранение..." : "Добавить"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
