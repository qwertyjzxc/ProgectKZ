"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Calendar, CheckCircle2, AlertCircle, MoreHorizontal, Trash2, Edit3, Filter, X, Loader2, Check } from "lucide-react";
import AddTaskModal from "@/components/AddTaskModal";

interface Task {
  id: number;
  title: string;
  client: string;
  due_date: string;
  priority: string;
  status: string;
  created_at: string;
}

type EditableTask = Pick<Task, 'id' | 'title' | 'client' | 'due_date' | 'priority' | 'status'>;

const priorityColors: Record<string, string> = {
  "Высокий": "bg-red-100 text-red-800",
  "Средний": "bg-yellow-100 text-yellow-800",
  "Низкий": "bg-blue-100 text-blue-800",
};

const statusColors: Record<string, string> = {
  "В работе": "bg-green-100 text-green-800",
  "Запланировано": "bg-gray-100 text-gray-700",
  "Просрочено": "bg-red-100 text-red-800",
  "Завершено": "bg-blue-50 text-blue-600",
};

function EditTaskModal({ task, onClose, onSave }: { task: EditableTask; onClose: () => void; onSave: (t: EditableTask) => void }) {
  const [title, setTitle] = useState(task.title);
  const [client, setClient] = useState(task.client);
  const [dueDate, setDueDate] = useState(task.due_date);
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: task.id, title, client, due_date: dueDate, priority, status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-bold">Редактировать задачу</h2><Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button></div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название задачи" required className="text-sm" />
          <Input value={client} onChange={e => setClient(e.target.value)} placeholder="Клиент" className="text-sm" />
          <Input value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="ДД.ММ.ГГГГ ЧЧ:ММ" className="text-sm" />
          <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option>Высокий</option><option>Средний</option><option>Низкий</option></select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm"><option>В работе</option><option>Запланировано</option><option>Завершено</option></select>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button><Button type="submit" size="sm" className="bg-blue-600">Сохранить</Button></div>
        </form>
      </div>
    </div>
  );
}

function TasksContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<EditableTask | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
      else if (data.error) setError(data.error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const filtered = useMemo(() => {
    let result = tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title?.toLowerCase().includes(q) || t.client?.toLowerCase().includes(q));
    }
    if (filterPriority) result = result.filter(t => t.priority === filterPriority);
    if (filterStatus) result = result.filter(t => t.status === filterStatus);
    return result;
  }, [tasks, searchQuery, filterPriority, filterStatus]);

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "Завершено" ? "В работе" : "Завершено";
    const res = await fetch("/api/tasks/" + id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) {
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    }
  };

  const handleAdd = async (t: any) => {
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...t, status: t.status || "В работе" }) });
    if (res.ok) {
      const newTask = await res.json();
      setTasks(prev => [newTask, ...prev]);
      setShowAdd(false);
    }
  };

  const handleEdit = async (t: EditableTask) => {
    const res = await fetch("/api/tasks/" + t.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) });
    if (res.ok) {
      const updated = await res.json();
      setTasks(prev => prev.map(x => x.id === updated.id ? updated : x));
      setEditTask(null);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/tasks/" + id, { method: "DELETE" });
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id));
  };

  const overdueCount = tasks.filter(t => t.status === "Просрочено").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Задачи</h1>
          <p className="text-sm text-gray-500 mt-1">
            {overdueCount > 0 && <><AlertCircle className="w-3.5 h-3.5 inline mr-1 text-red-500" />{overdueCount} просроченные задачи</>}
          </p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />Новая задача
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по названию, клиенту..." className="pl-10 h-9 text-sm bg-white" />
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <Button variant={showFilters || filterPriority || filterStatus ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1"><Filter className="w-4 h-4" />Фильтры{(filterPriority || filterStatus) && <span className="ml-1 w-2 h-2 rounded-full bg-blue-500" />}</Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 p-3 bg-white rounded-xl border shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Приоритет</span>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "", label: "Все" }, { value: "Высокий", label: "Высокий" }, { value: "Средний", label: "Средний" }, { value: "Низкий", label: "Низкий" }].map(opt => (
                <button key={opt.value} onClick={() => setFilterPriority(opt.value)}
                  className={"px-3 py-1.5 rounded-full text-xs font-medium border transition-all " + (filterPriority === opt.value ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50")}
                >{opt.label}{filterPriority === opt.value && <Check className="w-3 h-3 inline ml-1" />}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</span>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "", label: "Все" }, { value: "В работе", label: "В работе" }, { value: "Запланировано", label: "Запланировано" }, { value: "Завершено", label: "Завершено" }, { value: "Просрочено", label: "Просрочено" }].map(opt => (
                <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
                  className={"px-3 py-1.5 rounded-full text-xs font-medium border transition-all " + (filterStatus === opt.value ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50")}
                >{opt.label}{filterStatus === opt.value && <Check className="w-3 h-3 inline ml-1" />}</button>
              ))}
            </div>
          </div>
          {(filterPriority || filterStatus) && (
            <button onClick={() => { setFilterPriority(""); setFilterStatus(""); }} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X className="w-3 h-3" />Сбросить фильтры</button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Всего</p><p className="text-2xl font-bold text-gray-900 mt-0.5">{tasks.length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">В работе</p><p className="text-2xl font-bold text-green-600 mt-0.5">{tasks.filter(t=>t.status==="В работе").length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Просрочено</p><p className="text-2xl font-bold text-red-500 mt-0.5">{overdueCount}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Завершено</p><p className="text-2xl font-bold text-blue-600 mt-0.5">{tasks.filter(t=>t.status==="Завершено").length}</p></div>
      </div>

      {loading && <div className="bg-white rounded-xl shadow-sm border p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /><p className="text-gray-500 mt-2">Загрузка из Supabase...</p></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">Ошибка: {error}<button onClick={fetchTasks} className="ml-3 underline text-red-600 hover:text-red-800">Повторить</button></div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <div className="px-5 py-16 text-center text-gray-400">
                <p className="text-lg">Нет задач</p>
                <p className="text-sm mt-1">{tasks.length === 0 ? "Нажмите «Новая задача»" : "Попробуйте изменить фильтры"}</p>
                {tasks.length > 0 && <button onClick={() => { setSearchQuery(""); setFilterPriority(""); setFilterStatus(""); }} className="mt-2 text-blue-500 hover:text-blue-600 text-sm">Сбросить фильтры</button>}
              </div>
            )}
            {filtered.map(t => (
              <div key={t.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors group">
                <button
                  onClick={() => toggleStatus(t.id, t.status)}
                  className={"w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all " + (t.status === "Завершено" ? "bg-blue-500 border-blue-500" : "border-gray-300 hover:border-blue-400")}
                >
                  {t.status === "Завершено" && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={"text-sm font-medium " + (t.status === "Завершено" ? "text-gray-400 line-through" : "text-gray-900")}>{t.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Клиент: {t.client}</p>
                </div>
                <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 shrink-0"><Calendar className="w-3.5 h-3.5" />{t.due_date}</div>
                <Badge className={"text-xs shrink-0 " + (priorityColors[t.priority] || "")}>{t.priority}</Badge>
                <Badge className={"text-xs shrink-0 " + (statusColors[t.status] || "")}>{t.status}</Badge>
                <div className="shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted hover:text-foreground size-7 opacity-0 group-hover:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                      <MoreHorizontal className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => setEditTask({ id: t.id, title: t.title, client: t.client, due_date: t.due_date, priority: t.priority, status: t.status })}><Edit3 className="w-4 h-4 mr-2" />Редактировать</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(t.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50"><Trash2 className="w-4 h-4 mr-2" />Удалить</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t bg-gray-50/50 px-4 py-2 text-xs text-gray-400">
            Показано: {filtered.length} из {tasks.length} задач
            {(searchQuery || filterPriority || filterStatus) && <button onClick={() => { setSearchQuery(""); setFilterPriority(""); setFilterStatus(""); }} className="ml-3 text-blue-500 hover:text-blue-600">Сбросить всё</button>}
          </div>
        </div>
      )}

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {editTask && <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onSave={handleEdit} />}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <TasksContent />
    </Suspense>
  );
}
