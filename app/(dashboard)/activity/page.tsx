"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { History, Search, UserPlus, PencilLine, Trash2, Loader2 } from "lucide-react";
import { useProfile, profileName, profileInitials } from "@/lib/profile-context";
import type { ActivityEntry } from "@/lib/activity";

const TABLE_LABELS: Record<string, string> = {
  clients_arenda: "Аренда",
  clients_prodaja: "Продажа",
};

const ACTION_BADGES: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ActivityPage() {
  const { currentProfile } = useProfile();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ActivityEntry | null>(null);

  const fetchEntries = useCallback(() => {
    fetch("/api/activity")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
        else if (data.error) setError(data.error);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const isAdmin = currentProfile?.role === "admin";

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch("/api/activity/" + deleteTarget.id, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка удаления");
      }
      setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    }
  };

  const filtered = useMemo(() => {
    let result = entries;
    if (tableFilter) result = result.filter(e => e.client_table === tableFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.client_name?.toLowerCase().includes(q) ||
        e.actor_name?.toLowerCase().includes(q) ||
        e.message?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, tableFilter, searchQuery]);

  const actorName = currentProfile ? profileName(currentProfile) : "";

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="w-6 h-6 text-blue-600" />
          Журнал действий
        </h1>
        <p className="text-sm text-gray-500 mt-1">Все изменения по клиентам: кто и что изменил</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по клиенту, сотруднику, действию..."
            className="pl-10 h-9 text-sm bg-white"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <div className="flex gap-1.5">
          {[{ value: "", label: "Все" }, ...Object.entries(TABLE_LABELS).map(([value, label]) => ({ value, label }))].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTableFilter(opt.value)}
              className={
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all " +
                (tableFilter === opt.value
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-500 mt-2">Загрузка журнала...</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
          Ошибка: {error}
          <button onClick={() => { setError(null); fetchEntries(); }} className="ml-3 underline text-red-600 hover:text-red-800">Повторить</button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Записей в журнале пока нет</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border divide-y divide-gray-100">
          {filtered.map(e => {
            const initials = profileInitials(e.actor_name);
            const ActorIcon = e.action === "create" ? UserPlus : e.action === "delete" ? Trash2 : PencilLine;
            return (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">{e.actor_name || "Сотрудник"}</span>{" "}
                    <span className="text-gray-500">{e.message}</span>
                  </p>
                  {e.changes && e.changes.length > 0 && (
                    <div className="mt-1.5 space-y-1 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                      {e.changes.map(ch => (
                        <p key={ch.field} className="text-xs text-gray-600 flex flex-wrap items-baseline gap-x-1.5">
                          <span className="text-gray-400">{ch.label}:</span>
                          <span className="text-gray-400 line-through">{ch.oldValue}</span>
                          <span className="text-gray-500">→</span>
                          <span className="font-medium text-gray-900">{ch.newValue}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{formatDateTime(e.created_at)}</span>
                    <Badge className={"text-[10px] " + (ACTION_BADGES[e.action] || "bg-gray-100 text-gray-600")}>
                      <ActorIcon className="w-2.5 h-2.5 inline mr-0.5" />
                      {ACTION_LABELS[e.action] || e.action}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Клиент: <span className="font-medium text-gray-700">{e.client_name || "—"}</span>
                    </span>
                    <Badge className="text-[10px] bg-gray-100 text-gray-600">
                      {TABLE_LABELS[e.client_table] || e.client_table}
                    </Badge>
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteTarget(e)}
                        title="Удалить из журнала"
                        className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {actorName ? (
        <p className="mt-4 text-xs text-gray-400">
          Вы: {actorName}. Все действия автоматически записываются в журнал.
        </p>
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удаление записи"
        message={deleteTarget ? "Удалить действие \"" + (deleteTarget.message || "") + "\" из журнала?" : ""}
        hint="Запись будет удалена без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
