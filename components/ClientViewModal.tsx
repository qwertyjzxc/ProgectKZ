"use client";

import { useState, useEffect, useCallback } from "react";
import { useEscapeKey } from "@/lib/use-escape";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import ClientDeals from "@/components/ClientDeals";
import { formatMoney } from "@/lib/format";
import { maskKzPhone } from "@/components/PhoneInput";
import { parseTags } from "@/lib/client-status";
import { type Client, completedColors, getInitials } from "@/lib/client-types";
import type { ActivityEntry } from "@/lib/activity";
import { type LucideIcon, CalendarDays, CheckCircle2, ListTodo, Edit3, X, History, Loader2, Trash2, Home, MapPin, Building, Ruler, FileText, Banknote, Briefcase, Phone, User, Users, Paperclip } from "lucide-react";

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  // ТЗ: незаполненные поля не показываем вообще (без прочерков)
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-blue-600" /></div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{typeof value === 'number' ? value.toLocaleString("ru-RU") : value}</p>
      </div>
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ViewClientModal({ client, category, isAdmin, onClose, onEdit, onAssign, onComplete }: { client: Client; category: string; isAdmin: boolean; onClose: () => void; onEdit: () => void; onAssign: () => void; onComplete: () => void }) {
  useEscapeKey(onClose);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ActivityEntry | null>(null);
  const clientTable = "clients_" + category;

  const loadActivity = useCallback(() => {
    fetch("/api/activity?client_table=" + clientTable + "&client_id=" + client.id)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setActivity(data); })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [clientTable, client.id]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const handleDeleteActivity = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch("/api/activity/" + deleteTarget.id, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка удаления");
      setActivity(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b shrink-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{client.name || "Без имени"}</h2>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={"text-sm px-3 py-1 " + (completedColors[client.completed] || "bg-gray-100 text-gray-700")}>
                  {client.completed || "Без статуса"}
                </Badge>
                {client.client_category && (
                  <Badge className="text-sm px-3 py-1 bg-violet-100 text-violet-800">{client.client_category}</Badge>
                )}
                <span className="text-sm text-gray-500 flex items-center gap-1"><CalendarDays className="w-4 h-4" />{client.date}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {isAdmin && (
                <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={onComplete}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />Завершить сделку
                </Button>
              )}
              <Button className="bg-blue-600 hover:bg-blue-700" size="sm" onClick={onAssign}>
                <ListTodo className="w-4 h-4 mr-1" />Назначить задачу
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}><Edit3 className="w-4 h-4 mr-1" />Редактировать</Button>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className="w-[320px] shrink-0 border-r bg-gray-50/80 flex flex-col">
            <div className="px-4 py-3 border-b shrink-0">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Журнал действий</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {activityLoading ? (
                <div className="text-sm text-gray-400 flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin" />Загрузка...</div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Действий пока нет</p>
              ) : (
                activity.map(a => (
                  <div key={a.id} className="flex items-start gap-2.5 group">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">{getInitials(a.actor_name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-800 leading-relaxed">
                        <span className="font-medium">{a.actor_name || "Сотрудник"}</span>{" "}{a.message}
                        {isAdmin && (
                          <button
                            onClick={() => setDeleteTarget(a)}
                            title="Удалить"
                            className="ml-1 p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors align-middle opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </p>
                      {a.changes && a.changes.length > 0 && (
                        <div className="mt-1 space-y-0.5 rounded bg-white border border-gray-100 px-2 py-1.5">
                          {a.changes.map(ch => (
                            <p key={ch.field} className="text-[11px] text-gray-500 flex flex-wrap items-baseline gap-x-1">
                              <span className="text-gray-400">{ch.label}:</span>
                              <span className="text-gray-400 line-through">{ch.oldValue}</span>
                              <span>→</span>
                              <span className="font-medium text-gray-700">{ch.newValue}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatDateTime(a.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
            <CardSection title="Объект">
              <DetailItem icon={Home} label="Тип недвижимости" value={client.type === "Земля" ? client.type : client.type === "Дома" ? "Дом" : client.type === "Помещения" ? "Помещение" : client.type} />
              <DetailItem icon={MapPin} label="Район" value={client.district} />
              <DetailItem icon={MapPin} label="Адрес" value={client.address} />
              <DetailItem icon={Building} label="Жилой комплекс" value={client.jk} />
              <DetailItem icon={Home} label="Кол-во комнат" value={client.rooms} />
              <DetailItem icon={Ruler} label="Площадь" value={client.area ? client.area + (client.type === "Земля" ? " " + (client.area_unit || "сот") : " м²") : null} />
              {client.type === "Земля" && <DetailItem icon={Home} label="Участок под" value={client.plot_type} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Назначение" value={client.purpose} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Коммуникации" value={client.communications} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Подъездные пути" value={client.access} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Форма участка" value={client.plot_shape} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Рельеф" value={client.relief} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Ограничения" value={client.restrictions} />}
            </CardSection>
            <CardSection title="Договор и бюджет">
              <DetailItem icon={FileText} label="Номер договора" value={client.contract} />
              <DetailItem icon={Banknote} label="Бюджет" value={client.amount ? formatMoney(client.amount) : null} />
              <DetailItem icon={CalendarDays} label="Дата обращения" value={client.date} />
              <DetailItem icon={Briefcase} label="Меблировка" value={client.furniture} />
              <DetailItem icon={CalendarDays} label="Срок аренды" value={client.rental_period} />
            </CardSection>
            <CardSection title="Контакт">
              <DetailItem icon={Phone} label="Телефон" value={client.phone_masked ? "Скрыт" : client.phone ? maskKzPhone(client.phone) : null} />
              <DetailItem icon={User} label="Кто будет проживать" value={client.who_lives} />
              <DetailItem icon={Users} label="Кол-во человек" value={client.people_count} />
              <DetailItem icon={User} label="Брокер" value={client.broker} />
              {client.premise_type && <DetailItem icon={Building} label="Тип помещения" value={client.premise_type} />}
              {!(category === "arenda" && (client.type === "Квартира" || client.type === "Квартиры")) && client.finishing && <DetailItem icon={Home} label="Отделка" value={client.finishing} />}
              {client.contract_kind && <DetailItem icon={FileText} label="Вид договора" value={client.contract_kind} />}
            </CardSection>
            {(client.reason || client.status_comment || client.resume_date) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-700 mb-1 font-medium">Причина закрытия / приостановки</p>
                {client.reason && <p className="text-sm text-gray-800">{client.reason}</p>}
                {client.status_comment && <p className="text-sm text-gray-600 mt-0.5">{client.status_comment}</p>}
                {client.resume_date && <p className="text-xs text-gray-500 mt-1">Повторный контакт: {client.resume_date}</p>}
              </div>
            )}
            {parseTags(client.tags).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {parseTags(client.tags).map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700">{tag}</span>
                ))}
              </div>
            )}
            {client.preferences && (
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Предпочтения</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{client.preferences}</p>
              </div>
            )}
            {client.notes && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Заметки</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
            {!client.phone_masked && <ClientDeals phone={client.phone || ""} name={client.name || ""} />}
            {(client.documents || "").trim() && ((() => {
              try {
                const docs = JSON.parse(client.documents || "[]");
                if (!Array.isArray(docs) || !docs.length) return null;
                return (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" />Документы</p>
                    <ul className="space-y-1.5">
                      {docs.map((d: { name: string; url: string }, i: number) => (
                        <li key={i}>
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1.5 truncate"><FileText className="w-3.5 h-3.5 shrink-0" />{d.name}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              } catch {
                return null;
              }
            })())}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удаление записи"
        message={deleteTarget ? "Удалить действие из журнала для этого клиента?" : ""}
        hint="Запись будет удалена без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleDeleteActivity}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
