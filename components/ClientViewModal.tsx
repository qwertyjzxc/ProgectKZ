"use client";

import { useState, useEffect, useCallback } from "react";
import { useEscapeKey } from "@/lib/use-escape";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatBudgetRange } from "@/lib/budget-range";
import { formatDateOnly } from "@/lib/format";
import { formatPhone, phoneToWa } from "@/components/PhoneInput";
import { parseTags } from "@/lib/client-status";
import { fileViewHref } from "@/lib/file-links";
import { type Client, completedColors, getInitials } from "@/lib/client-types";
import type { ActivityEntry } from "@/lib/activity";
import { type LucideIcon, CalendarDays, CheckCircle2, ListTodo, Edit3, X, History, Loader2, Trash2, Home, MapPin, Building, Ruler, FileText, Banknote, Briefcase, Phone, User, Users, Paperclip, Send, Eye, ListChecks, PawPrint, ArrowRightCircle } from "lucide-react";

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

// Короткий формат для строк журнала: «14.10, 11:25»
function formatShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// «15.10, 12:00» из datetime-local / ISO строки задачи
function formatDue(due: string): string {
  const d = new Date(due);
  if (isNaN(d.getTime())) return due || "";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// Площадь: приоритет — числовой диапазон, легаси-текст — фолбэк
function formatArea(c: Client): string | null {
  const min = c.area_min ?? null;
  const max = c.area_max ?? null;
  const unit = c.type === "Земля" ? " " + (c.area_unit || "сот") : " м²";
  if (min != null && max != null && (min > 0 || max > 0)) return `${min} — ${max}${unit}`;
  if (max != null && max > 0) return `${max}${unit}`;
  if (min != null && min > 0) return `от ${min}${unit}`;
  return c.area ? c.area + unit : null;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ViewClientModal({ client, category, isAdmin, onClose, onEdit, onAssign, onComplete }: { client: Client; category: string; isAdmin: boolean; onClose: () => void; onEdit: () => void; onAssign: () => void; onComplete: () => void }) {
  useEscapeKey(onClose);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ActivityEntry | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [eventDraft, setEventDraft] = useState<{ template: string; text: string } | null>(null);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState("");
  const clientTable = "clients_" + category;
  const isArenda = category !== "prodaja";
  const phoneVisible = !client.phone_masked && !!client.phone;

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

  const toggleExpanded = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Быстрые события ТЗ §10: «Отправлены объекты …» / «Назначен просмотр …»
  const openEventDraft = (template: string) => {
    setEventError("");
    setEventDraft({ template, text: template });
  };

  const saveEvent = async () => {
    if (!eventDraft || !eventDraft.text.trim()) return;
    setEventSaving(true);
    setEventError("");
    try {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_table: clientTable,
          client_id: client.id,
          client_name: client.name || "",
          message: eventDraft.text.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Не удалось сохранить событие");
      }
      setEventDraft(null);
      loadActivity();
    } catch (e) {
      setEventError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setEventSaving(false);
    }
  };

  // Строка журнала по ТЗ §10: «кто — что — когда», детали — за «Подробнее»
  const journalLine = (a: ActivityEntry): { head: string; details: boolean } => {
    const actor = a.actor_name || "Сотрудник";
    if (a.action === "create") return { head: `${actor} добавил клиента`, details: false };
    if (a.action === "task" || a.action === "event") return { head: a.message, details: false };
    const statusChange = (a.changes || []).find(ch => ch.field === "completed");
    const rest = (a.changes || []).filter(ch => ch.field !== "completed");
    if (statusChange && (a.changes || []).length === 1) {
      return { head: `Статус изменён: ${statusChange.oldValue || "—"} → ${statusChange.newValue || "—"}`, details: false };
    }
    if (statusChange) {
      return { head: `Статус изменён: ${statusChange.oldValue || "—"} → ${statusChange.newValue || "—"}`, details: true };
    }
    const labels = (a.changes || []).map(ch => ch.label).join(", ");
    return { head: `${actor} изменил${labels ? ": " + labels : " данные"}`, details: (a.changes || []).length > 0 };
  };

  const contractFileObj = (() => {
    try {
      const p = JSON.parse(client.contract_file || "null");
      return p && typeof p === "object" && p.name && p.url ? p as { name: string; url: string } : null;
    } catch {
      return null;
    }
  })();

  const hasContract = !!(client.contract || client.contract_status || client.contract_type || client.contract_date || client.contract_valid_until || contractFileObj);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border" onClick={e => e.stopPropagation()}>
        {/* Шапка: ФИО + статус + дата обращения с подписью (ТЗ §9) */}
        <div className="px-6 py-4 border-b shrink-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{client.name || "Без имени"}</h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge className={"text-sm px-3 py-1 " + (completedColors[client.completed] || "bg-gray-100 text-gray-700")}>
                  {client.completed || "Без статуса"}
                </Badge>
                {client.client_category && (
                  <Badge className="text-sm px-3 py-1 bg-violet-100 text-violet-800">{client.client_category}</Badge>
                )}
                {client.date && (
                  <span className="text-sm text-gray-500 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    <span className="text-xs text-gray-400">Дата обращения:</span> {client.date}
                  </span>
                )}
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
          {/* Слева: журнал действий (ТЗ §10) */}
          <div className="w-[320px] shrink-0 border-r bg-gray-50/80 flex flex-col">
            <div className="px-4 py-3 border-b shrink-0">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Журнал действий</h3>
              <div className="flex gap-1.5 mt-2">
                <button type="button" onClick={() => openEventDraft("Отправлены объекты: ")} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 hover:border-blue-300 hover:text-blue-700">
                  <Send className="w-3 h-3" />Объекты отправлены
                </button>
                <button type="button" onClick={() => openEventDraft("Назначен просмотр: ")} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 hover:border-blue-300 hover:text-blue-700">
                  <Eye className="w-3 h-3" />Назначить просмотр
                </button>
              </div>
              {eventDraft && (
                <div className="mt-2 rounded-lg border border-blue-200 bg-white p-2 space-y-1.5">
                  <textarea
                    value={eventDraft.text}
                    onChange={e => setEventDraft({ ...eventDraft, text: e.target.value })}
                    rows={2}
                    placeholder={eventDraft.template}
                    className="w-full rounded border px-2 py-1.5 text-xs resize-y"
                    autoFocus
                  />
                  {eventError && <p className="text-[11px] text-red-600">{eventError}</p>}
                  <div className="flex gap-1.5">
                    <button type="button" disabled={eventSaving} onClick={saveEvent} className="px-2 py-1 rounded bg-blue-600 text-white text-[11px] disabled:opacity-50">
                      {eventSaving ? "Сохранение…" : "Сохранить"}
                    </button>
                    <button type="button" onClick={() => setEventDraft(null)} className="px-2 py-1 rounded border text-[11px] text-gray-500">Отмена</button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {activityLoading ? (
                <div className="text-sm text-gray-400 flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin" />Загрузка...</div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Действий пока нет</p>
              ) : (
                activity.map(a => {
                  const line = journalLine(a);
                  return (
                    <div key={a.id} className="flex items-start gap-2.5 group">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">{getInitials(a.actor_name)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-800 leading-relaxed">
                          {line.head}
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
                        {line.details && a.changes && a.changes.length > 0 && (
                          <>
                            <button type="button" onClick={() => toggleExpanded(a.id)} className="text-[11px] text-blue-600 hover:underline mt-0.5">
                              {expanded.has(a.id) ? "Скрыть подробнее" : "Подробнее"}
                            </button>
                            {expanded.has(a.id) && (
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
                          </>
                        )}
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {a.action === "create" ? formatDateTime(a.created_at) : `${a.actor_name || "Сотрудник"} · ${formatShort(a.created_at)}`}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Справа: Запрос клиента → Условия → Контакт → Следующее действие (ТЗ) */}
          <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
            <CardSection title="Запрос клиента">
              <DetailItem icon={Home} label="Тип недвижимости" value={client.type === "Земля" ? client.type : client.type === "Дома" ? "Дом" : client.type === "Помещения" ? "Помещение" : client.type} />
              <DetailItem icon={MapPin} label="Район" value={client.district} />
              <DetailItem icon={Building} label="Жилой комплекс" value={client.jk} />
              <DetailItem icon={Home} label="Кол-во комнат" value={client.rooms} />
              <DetailItem icon={Ruler} label="Площадь" value={formatArea(client)} />
              <DetailItem icon={MapPin} label="Предпочтительный адрес / улица" value={client.address} />
              {client.type === "Земля" && <DetailItem icon={Home} label="Участок под" value={client.plot_type} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Назначение" value={client.purpose} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Коммуникации" value={client.communications} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Подъездные пути" value={client.access} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Форма участка" value={client.plot_shape} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Рельеф" value={client.relief} />}
              {client.type === "Земля" && <DetailItem icon={Home} label="Ограничения" value={client.restrictions} />}
              {client.premise_type && <DetailItem icon={Building} label="Тип помещения" value={client.premise_type} />}
              {client.finishing && <DetailItem icon={Home} label="Отделка" value={client.finishing} />}
            </CardSection>

            <CardSection title={isArenda ? "Условия аренды" : "Условия покупки"}>
              <DetailItem icon={Banknote} label={isArenda ? "Бюджет, ₸/мес" : "Бюджет, ₸"} value={formatBudgetRange(client.amount_min ?? null, client.amount ?? null) || null} />
              <DetailItem icon={Briefcase} label="Меблировка" value={client.furniture} />
              {isArenda && <DetailItem icon={CalendarDays} label="Срок аренды" value={client.rental_period} />}
              <DetailItem icon={CalendarDays} label="Дата обращения" value={client.date} />
              <DetailItem icon={CalendarDays} label="Дата заезда" value={client.move_in_date ? formatDateOnly(client.move_in_date) : null} />
            </CardSection>

            <CardSection title="Контакт">
              {phoneVisible ? (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Phone className="w-4 h-4 text-blue-600" /></div>
                  <div>
                    <p className="text-xs text-gray-500">Телефон</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{formatPhone(client.phone)}</p>
                      <a
                        href={`https://wa.me/${phoneToWa(client.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Открыть переписку в WhatsApp"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      >
                        <WhatsAppIcon />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <DetailItem icon={Phone} label="Телефон" value={client.phone_masked ? "Скрыт" : null} />
              )}
              <DetailItem icon={User} label="Кто будет проживать" value={client.who_lives} />
              <DetailItem icon={Users} label="Количество человек" value={client.people_count} />
              <DetailItem icon={PawPrint} label="Животные" value={client.pets} />
              <DetailItem icon={User} label="Ответственный брокер" value={client.broker} />
            </CardSection>

            {/* Следующее действие: ближайшая открытая задача, без ручного ввода (ТЗ §9) */}
            <div className="border border-blue-100 bg-blue-50/60 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ArrowRightCircle className="w-3.5 h-3.5" />Следующее действие</p>
              {client.next_action ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{client.next_action.title}</p>
                  {client.next_action.due_date && (
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDue(client.next_action.due_date)}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Следующее действие не назначено</p>
              )}
            </div>

            {/* Договор с клиентом (ТЗ §11) */}
            {hasContract && (
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" />Договор с клиентом</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {client.contract_status && (
                    <div>
                      <Badge className={client.contract_status === "Подписан" ? "bg-green-100 text-green-800" : client.contract_status === "Расторгнут" || client.contract_status === "Истёк" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"}>
                        {client.contract_status}
                      </Badge>
                    </div>
                  )}
                  <DetailItem icon={FileText} label="Вид договора" value={client.contract_type || client.contract_kind} />
                  <DetailItem icon={FileText} label="Номер договора" value={client.contract} />
                  <DetailItem icon={CalendarDays} label="Дата подписания" value={client.contract_date ? formatDateOnly(client.contract_date) : null} />
                  <DetailItem icon={CalendarDays} label="Срок действия" value={client.contract_valid_until ? formatDateOnly(client.contract_valid_until) : null} />
                </div>
                {contractFileObj && (
                  <a href={fileViewHref(contractFileObj.url)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                    <Paperclip className="w-3.5 h-3.5" />{contractFileObj.name}
                  </a>
                )}
              </div>
            )}

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
                          <a href={fileViewHref(d.url)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1.5 truncate"><FileText className="w-3.5 h-3.5 shrink-0" />{d.name}</a>
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
