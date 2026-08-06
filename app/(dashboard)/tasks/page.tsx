"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Calendar, CheckCircle2, AlertCircle, MoreHorizontal, Trash2, Edit3, Filter, X, Loader2, Check, Clock, Square, CheckSquare } from "lucide-react";
import AddTaskModal, { type NewTaskData } from "@/components/AddTaskModal";
import AssigneePicker from "@/components/AssigneePicker";
import { useProfile, profileName, profileInitials, type Profile } from "@/lib/profile-context";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Task {
  id: number;
  title: string;
  client: string;
  description: string;
  created_date: string;
  due_date: string;
  priority: string;
  status: string;
  assignee_ids: number[];
  completed_at: string | null;
  created_at: string;
}

type EditableTask = Pick<Task, "id" | "title" | "client" | "description" | "created_date" | "due_date" | "priority" | "status" | "assignee_ids">;
type TaskFormData = NewTaskData;

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

const avatarColors: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
  red: "bg-red-100 text-red-600",
  orange: "bg-orange-100 text-orange-600",
  teal: "bg-teal-100 text-teal-600",
  pink: "bg-pink-100 text-pink-600",
};

function parseFlexibleDate(s: string): number {
  const iso = (s || "").match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(iso[4]), Number(iso[5])).getTime();
  const ru = (s || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[, ]+(\d{1,2}):(\d{2}))?/);
  if (ru) return new Date(Number(ru[3]), Number(ru[2]) - 1, Number(ru[1]), Number(ru[4] || 0), Number(ru[5] || 0)).getTime();
  const d = new Date(s || "");
  return isNaN(d.getTime()) ? NaN : d.getTime();
}

function formatDisplay(s: string): string {
  const iso = (s || "").match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/);
  if (iso) return iso[3] + "." + iso[2] + "." + iso[1] + " " + iso[4] + ":" + iso[5];
  return s || "";
}

function toDateTimeLocal(s: string): string {
  const ru = (s || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[, ]+(\d{1,2}):(\d{2}))?/);
  if (ru) return ru[3] + "-" + ru[2].padStart(2, "0") + "-" + ru[1].padStart(2, "0") + "T" + (ru[4] || "00").padStart(2, "0") + ":" + (ru[5] || "00");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s || "")) return s;
  return "";
}

function isTaskOverdue(t: Task): boolean {
  if (t.status === "Завершено" || !t.due_date) return false;
  const due = parseFlexibleDate(t.due_date);
  return !isNaN(due) && due < Date.now();
}

function AvatarCircle({ profile }: { profile: Profile }) {
  const name = profileName(profile);
  const color = avatarColors[profile.avatar_color || "blue"] || avatarColors.blue;
  return (
    <span className={"flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-white " + color}>
      {profileInitials(name)}
    </span>
  );
}

function AssigneeStack({ assigneeIds, profileMap }: { assigneeIds: number[]; profileMap: Map<number, Profile> }) {
  const profiles = assigneeIds.map(id => profileMap.get(id)).filter(Boolean) as Profile[];
  if (profiles.length === 0) {
    return <span className="text-xs text-gray-400">Не назначен</span>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="-mx-1 inline-flex items-center gap-1.5 rounded-md px-1 text-xs text-gray-600 transition-colors outline-none hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-400">
        {profiles.length === 1 ? (
          <>
            <AvatarCircle profile={profiles[0]} />
            <span className="font-medium">{profileName(profiles[0])}</span>
          </>
        ) : (
          <span className="flex -space-x-2">
            {profiles.slice(0, 2).map(p => <AvatarCircle key={p.id} profile={p} />)}
            {profiles.length > 2 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 ring-2 ring-white">
                +{profiles.length - 2}
              </span>
            )}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">Исполнители</p>
        {profiles.map(p => (
          <div key={p.id} className="flex items-center gap-2 px-3 py-1.5">
            <AvatarCircle profile={p} />
            <span className="text-xs font-medium text-gray-700">{profileName(p)}</span>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditTaskModal({ task, onClose, onSave }: { task: EditableTask; onClose: () => void; onSave: (t: EditableTask) => void }) {
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
              <label className="text-xs text-gray-500 mb-1 block">Дата и время создания</label>
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

function TasksContent() {
  const { allProfiles } = useProfile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<EditableTask | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignees, setFilterAssignees] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Режим удаления
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dragRef = useRef(false);

  useEffect(() => {
    const up = () => { dragRef.current = false; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRowContextMenu = (e: React.MouseEvent, id: number) => {
    if (!deleteMode) return;
    e.preventDefault();
    toggleSelect(id);
  };

  const handleRowPointerDown = (e: React.PointerEvent, id: number) => {
    if (!deleteMode || e.button !== 0) return;
    e.preventDefault();
    dragRef.current = true;
    toggleSelect(id);
  };

  const handleRowPointerEnter = (id: number) => {
    if (!deleteMode || !dragRef.current) return;
    toggleSelect(id);
  };

  const exitDeleteMode = () => {
    setDeleteMode(false);
    setSelectedIds(new Set());
  };

  const profileMap = useMemo(() => {
    const m = new Map<number, Profile>();
    allProfiles.forEach(p => m.set(p.id, p));
    return m;
  }, [allProfiles]);

  const fetchTasks = useCallback(() => {
    fetch("/api/tasks")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
        else if (data.error) setError(data.error);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Периодическое обновление: завершённые задачи удаляются на сервере через 10 минут
  useEffect(() => {
    const timer = setInterval(fetchTasks, 60000);
    return () => clearInterval(timer);
  }, [fetchTasks]);

  const filtered = useMemo(() => {
    let result = tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.client?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.assignee_ids.some(id => profileName(profileMap.get(id) ?? null)?.toLowerCase().includes(q))
      );
    }
    if (filterPriority) result = result.filter(t => t.priority === filterPriority);
    if (filterAssignees.length > 0) result = result.filter(t => t.assignee_ids.some(id => filterAssignees.includes(id)));
    if (filterStatus) {
      if (filterStatus === "Просрочено") {
        result = result.filter(isTaskOverdue);
      } else {
        result = result.filter(t => t.status === filterStatus);
      }
    }
    return result;
  }, [tasks, searchQuery, filterPriority, filterStatus, filterAssignees, profileMap]);

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "Завершено" ? "В работе" : "Завершено";
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, completed_at: newStatus === "Завершено" ? new Date().toISOString() : null } : t));
    const res = await fetch("/api/tasks/" + id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) {
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: currentStatus, completed_at: currentStatus === "Завершено" ? new Date().toISOString() : null } : t));
    }
  };

  const handleAdd = async (t: TaskFormData) => {
    setShowAdd(false);
    const temp: Task = { ...t, id: -Date.now(), status: "В работе", completed_at: null, created_at: new Date().toISOString() };
    setTasks(prev => [temp, ...prev]);
    try {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...t, status: "В работе" }) });
      if (res.ok) {
        const saved = await res.json();
        setTasks(prev => prev.map(x => x.id === temp.id ? saved : x));
      } else {
        setTasks(prev => prev.filter(x => x.id !== temp.id));
      }
    } catch {
      setTasks(prev => prev.filter(x => x.id !== temp.id));
    }
  };

  const handleEdit = async (t: EditableTask) => {
    const prev = editTask;
    setEditTask(null);
    setTasks(prevTasks => prevTasks.map(x => x.id === t.id ? { ...x, ...t } as Task : x));
    try {
      const res = await fetch("/api/tasks/" + t.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) });
      if (res.ok) {
        const updated = await res.json();
        setTasks(prevTasks => prevTasks.map(x => x.id === updated.id ? updated : x));
      } else if (prev) {
        setTasks(prevTasks => prevTasks.map(x => x.id === prev.id ? { ...x, ...prev } as Task : x));
      }
    } catch {
      if (prev) setTasks(prevTasks => prevTasks.map(x => x.id === prev.id ? { ...x, ...prev } as Task : x));
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch("/api/tasks/" + id, { method: "DELETE" });
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id));
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
  const handleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach(t => next.delete(t.id));
      else filtered.forEach(t => next.add(t.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...selectedIds] }) });
      if (res.ok) {
        setTasks(prev => prev.filter(t => !selectedIds.has(t.id)));
        exitDeleteMode();
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const overdueCount = tasks.filter(isTaskOverdue).length;

  const hasFilters = !!(searchQuery || filterPriority || filterStatus || filterAssignees.length > 0);
  const resetFilters = () => { setSearchQuery(""); setFilterPriority(""); setFilterStatus(""); setFilterAssignees([]); };

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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по названию, клиенту, описанию..." className="pl-10 h-9 text-sm bg-white" />
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <Button variant={showFilters || hasFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1"><Filter className="w-4 h-4" />Фильтры{(hasFilters && (filterPriority || filterStatus || filterAssignees.length > 0)) && <span className="ml-1 w-2 h-2 rounded-full bg-blue-500" />}</Button>
        {!deleteMode ? (
          <Button variant="outline" size="sm" onClick={() => { setDeleteMode(true); setSelectedIds(new Set()); }} className="gap-1 text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />Удалить
          </Button>
        ) : (
          <>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={selectedIds.size === 0 || deleting} className="gap-1">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Удалить ({selectedIds.size})
            </Button>
            <Button variant="ghost" size="sm" onClick={exitDeleteMode} className="gap-1 text-gray-500">
              <X className="w-4 h-4" />Отмена
            </Button>
          </>
        )}
      </div>

      {deleteMode && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-500 bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2">
          <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
          Режим удаления: правый клик — выделить строку, зажмите левую кнопку и скролльте — выделить несколько
        </div>
      )}

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
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ответственные</span>
            <div className="w-64">
              <AssigneePicker value={filterAssignees} onChange={setFilterAssignees} placeholder="Все" />
            </div>
          </div>
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X className="w-3 h-3" />Сбросить фильтры</button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Всего</p><p className="text-2xl font-bold text-gray-900 mt-0.5">{tasks.length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">В работе</p><p className="text-2xl font-bold text-green-600 mt-0.5">{tasks.filter(t => t.status === "В работе").length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Просрочено</p><p className="text-2xl font-bold text-red-500 mt-0.5">{overdueCount}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">Завершено</p><p className="text-2xl font-bold text-blue-600 mt-0.5">{tasks.filter(t => t.status === "Завершено").length}</p></div>
      </div>

      {loading && <div className="bg-white rounded-xl shadow-sm border p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /><p className="text-gray-500 mt-2">Загрузка из Supabase...</p></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">Ошибка: {error}<button onClick={() => { setLoading(true); setError(null); fetchTasks(); }} className="ml-3 underline text-red-600 hover:text-red-800">Повторить</button></div>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full table-fixed text-center">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[30%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[5%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-2 py-3 rounded-tl-xl"></th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-left">Задача</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Исполнитель</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Создана</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Срок</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Приоритет</th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Статус</th>
                <th className="px-2 py-3 rounded-tr-xl">
                  {deleteMode && (
                    <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600 transition-colors" title={allVisibleSelected ? "Снять выделение" : "Выделить все"}>
                      {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                    <p className="text-lg">Нет задач</p>
                    <p className="text-sm mt-1">{tasks.length === 0 ? "Нажмите «Новая задача»" : "Попробуйте изменить фильтры"}</p>
                    {tasks.length > 0 && <button onClick={resetFilters} className="mt-2 text-blue-500 hover:text-blue-600 text-sm">Сбросить фильтры</button>}
                  </td>
                </tr>
              )}
                  {filtered.map(t => {
                    const overdue = isTaskOverdue(t);
                    const displayStatus = t.status === "Завершено" ? "Завершено" : overdue ? "Просрочено" : t.status;
                    return (
                      <tr
                        key={t.id}
                        onContextMenu={e => handleRowContextMenu(e, t.id)}
                        onPointerDown={e => handleRowPointerDown(e, t.id)}
                        onPointerEnter={() => handleRowPointerEnter(t.id)}
                        className={
                          (deleteMode ? "cursor-pointer " : "") +
                          (selectedIds.has(t.id) ? "bg-red-50 hover:bg-red-100 " : deleteMode ? "hover:bg-red-50/50 " : "hover:bg-gray-50/60 ") +
                          "transition-colors group"
                        }
                      >
                        <td className="px-2 py-3">
                          {!deleteMode && (
                            <button
                              onClick={() => toggleStatus(t.id, t.status)}
                              title={t.status === "Завершено" ? "Вернуть в работу" : "Завершить"}
                              className={"mx-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all " + (t.status === "Завершено" ? "bg-blue-500 border-blue-500" : "border-gray-300 hover:border-blue-400")}
                            >
                              {t.status === "Завершено" && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-left min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={"text-sm font-medium " + (t.status === "Завершено" ? "text-gray-400 line-through" : "text-gray-900")}>{t.title}</p>
                            {t.status === "Завершено" && (
                              <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">удалится через 10 мин</span>
                            )}
                          </div>
                          {t.description && (
                            <p className={"text-xs mt-0.5 " + (t.status === "Завершено" ? "text-gray-300" : "text-gray-500")}>{t.description}</p>
                          )}
                          {t.client && <p className="text-xs text-gray-400 mt-0.5">Клиент: {t.client}</p>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-center">
                            <AssigneeStack assigneeIds={t.assignee_ids} profileMap={profileMap} />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">
                          {t.created_date ? <span className="flex items-center justify-center gap-1"><Clock className="w-3 h-3 text-gray-400" />{formatDisplay(t.created_date)}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {t.due_date ? (
                            <span className={"flex items-center justify-center gap-1 " + (overdue && t.status !== "Завершено" ? "text-red-500 font-medium" : "text-gray-500")}>
                              <Calendar className="w-3 h-3" />{formatDisplay(t.due_date)}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-center">
                            <Badge className={"text-xs shrink-0 " + (priorityColors[t.priority] || "")}>{t.priority}</Badge>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-center">
                            <Badge className={"text-xs shrink-0 " + (statusColors[displayStatus] || "")}>{displayStatus}</Badge>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          {deleteMode ? (
                            <button
                              onPointerDown={e => e.stopPropagation()}
                              onContextMenu={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); toggleSelect(t.id); }}
                              className="mx-auto block text-gray-500 hover:text-blue-600 transition-colors"
                            >
                              {selectedIds.has(t.id) ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4" />}
                            </button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted hover:text-foreground size-7 opacity-0 group-hover:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                                <MoreHorizontal className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => setEditTask({ id: t.id, title: t.title, client: t.client, description: t.description, created_date: t.created_date, due_date: t.due_date, priority: t.priority, status: t.status, assignee_ids: t.assignee_ids })}><Edit3 className="w-4 h-4 mr-2" />Редактировать</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(t.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50"><Trash2 className="w-4 h-4 mr-2" />Удалить</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
          </table>
          <div className="border-t bg-gray-50/50 px-4 py-2 text-xs text-gray-400">
            Показано: {filtered.length} из {tasks.length} задач
            {hasFilters && <button onClick={resetFilters} className="ml-3 text-blue-500 hover:text-blue-600">Сбросить всё</button>}
          </div>
        </div>
      )}

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
      {editTask && <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onSave={handleEdit} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Удаление задач"
        message={`Удалить ${selectedIds.size} ${selectedIds.size === 1 ? "задачу" : selectedIds.size < 5 ? "задачи" : "задач"}?`}
        hint="Действие необратимо."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />
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
