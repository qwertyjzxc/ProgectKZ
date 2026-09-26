"use client";

import { useState, useEffect, useCallback } from "react";
import { useEscapeKey } from "@/lib/use-escape";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatMoney } from "@/lib/format";
import { maskKzPhone } from "@/components/PhoneInput";
import { type Deal, completedColors, DEAL_TABLE_MAP } from "@/lib/deal-types";
import type { ActivityEntry } from "@/lib/activity";
import { CalendarDays, CheckCircle2, ListTodo, Edit3, X, History, Loader2, Trash2, Home, MapPin, Building2, Ruler, Briefcase, FileText, Banknote, Phone, User, Users } from "lucide-react";

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-blue-600" /></div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{(value || value === 0) ? (typeof value === 'number' ? value.toLocaleString("ru-RU") : value) : "—"}</p>
      </div>
    </div>
  );
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || "";
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TYPE_LABELS: Record<string, string> = {
  kvartiry: "Квартиры",
  pomescheniya: "Помещения",
  zemlya: "Земля",
};

function getDealTypeLabel(id: string, category?: string): string {
  return id === "zemlya" && category === "arenda" ? "Дома" : TYPE_LABELS[id] || id;
}

function getDealTypeCardLabel(storedType: string | undefined, dealType: string | undefined, category?: string): string {
  if (storedType === "Дома") return "Дом";
  if (storedType === "Дом") return "Дом";
  if (dealType === "zemlya" && category === "arenda") return "Дом";
  if (storedType === "Земля") return "Земля";
  if (storedType === "Участок") return "Участок";
  if (dealType === "pomescheniya") return storedType === "Помещения" ? "Помещение" : storedType || "Помещение";
  return storedType || getDealTypeLabel(dealType || "", category);
}

export default function DealViewModal({ deal: viewDeal, dealType, category, onClose, onEdit, onAssign, onComplete }: {
  deal: Deal;
  dealType?: string;
  category?: string;
  onClose: () => void;
  onEdit: (d: Deal) => void;
  onAssign: () => void;
  onComplete: (d: Deal) => void;
}) {
  useEscapeKey(onClose);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityDeleteTarget, setActivityDeleteTarget] = useState<ActivityEntry | null>(null);
  const isPomescheniya = dealType === "pomescheniya";
  const isZemlya = dealType === "zemlya";

  const loadActivity = useCallback(() => {
    const table = DEAL_TABLE_MAP[dealType || "kvartiry"] || "deals_kvartiry";
    fetch("/api/activity?client_table=" + encodeURIComponent(table) + "&client_id=" + viewDeal.id)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setActivity(data); })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [dealType, viewDeal.id]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const handleDeleteActivity = async () => {
    if (!activityDeleteTarget) return;
    try {
      const res = await fetch("/api/activity/" + activityDeleteTarget.id, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка удаления");
      setActivity(prev => prev.filter(a => a.id !== activityDeleteTarget.id));
      setActivityDeleteTarget(null);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b shrink-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{viewDeal.name || "Без имени"}</h2>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={"text-sm px-3 py-1 " + (completedColors[viewDeal.completed || ""] || "bg-gray-100 text-gray-700")}>
                  {viewDeal.completed || "Без статуса"}
                </Badge>
                <span className="text-sm text-gray-500 flex items-center gap-1"><CalendarDays className="w-4 h-4" />{viewDeal.date}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {viewDeal.completed !== "Сделка" && viewDeal.completed !== "Завершено" && (
                <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={() => onComplete(viewDeal)}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />Закрыть сделку
                </Button>
              )}
              <Button className="bg-blue-600 hover:bg-blue-700" size="sm" onClick={onAssign}>
                <ListTodo className="w-4 h-4 mr-1" />Назначить задачу
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit({ ...viewDeal })}><Edit3 className="w-4 h-4 mr-1" />Редактировать</Button>
              <Button variant="ghost" size="icon" onClick={() => onClose()}><X className="w-4 h-4" /></Button>
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
                        <button
                          onClick={() => setActivityDeleteTarget(a)}
                          title="Удалить"
                          className="ml-1 p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors align-middle opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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
              <DetailItem icon={Home} label="Тип недвижимости" value={getDealTypeCardLabel(viewDeal.type, dealType, category)} />
              <DetailItem icon={MapPin} label="Район" value={viewDeal.district} />
              <DetailItem icon={MapPin} label="Адрес" value={viewDeal.address} />
              {!isZemlya && <DetailItem icon={Building2} label="Жилой комплекс" value={viewDeal.jk} />}
              {!isZemlya && <DetailItem icon={Home} label="Кол-во комнат" value={viewDeal.rooms} />}
              <DetailItem icon={Ruler} label="Площадь" value={viewDeal.area ? viewDeal.area + " " + (viewDeal.area_unit || "м²") : null} />
              {isZemlya && <DetailItem icon={Home} label="Тип участка" value={viewDeal.plot_type} />}
              {isZemlya && <DetailItem icon={Home} label="Назначение" value={viewDeal.purpose} />}
              {isZemlya && <DetailItem icon={Home} label="Форма участка" value={viewDeal.plot_shape} />}
              {isZemlya && <DetailItem icon={Home} label="Рельеф" value={viewDeal.relief} />}
              {isZemlya && <DetailItem icon={Home} label="Подъездные пути" value={viewDeal.access} />}
              {isZemlya && <DetailItem icon={Home} label="Коммуникации" value={viewDeal.communications} />}
              {isZemlya && <DetailItem icon={Home} label="Ограничения" value={viewDeal.restrictions} />}
              {isPomescheniya && <DetailItem icon={Home} label="Отделка" value={viewDeal.finishing} />}
              {isPomescheniya && <DetailItem icon={Home} label="Планировка" value={viewDeal.layout} />}
              {isPomescheniya && <DetailItem icon={Home} label="Тип арендатора" value={viewDeal.renter_type} />}
              {isPomescheniya && <DetailItem icon={Home} label="Способ оплаты" value={viewDeal.payment} />}
              {!isPomescheniya && !isZemlya && <DetailItem icon={Briefcase} label="Меблировка" value={viewDeal.furniture} />}
              {!isPomescheniya && !isZemlya && <DetailItem icon={CalendarDays} label="Срок аренды" value={viewDeal.rental_period} />}
            </CardSection>
            <CardSection title="Договор и бюджет">
              <DetailItem icon={FileText} label="Номер договора" value={viewDeal.contract} />
              <DetailItem icon={Banknote} label="Сумма сделки" value={viewDeal.amount ? formatMoney(viewDeal.amount) : null} />
              <DetailItem icon={Home} label="Стадия" value={viewDeal.stage} />
              <DetailItem icon={CalendarDays} label="Дата обращения" value={viewDeal.date} />
              <DetailItem icon={CalendarDays} label="Дата завершения" value={viewDeal.completion_date} />
              {isPomescheniya && <DetailItem icon={Briefcase} label="Меблировка" value={viewDeal.furniture} />}
            </CardSection>
            <CardSection title="Контакт">
              <DetailItem icon={Phone} label="Телефон" value={viewDeal.phone ? maskKzPhone(viewDeal.phone) : null} />
              <DetailItem icon={User} label="Кто будет проживать" value={viewDeal.who_lives} />
              <DetailItem icon={Users} label="Кол-во человек" value={viewDeal.people_count} />
              <DetailItem icon={User} label="Брокер" value={viewDeal.broker} />
            </CardSection>
            {viewDeal.notes && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Заметки</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{viewDeal.notes}</p>
              </div>
            )}
            {(() => {
              const docs = (() => { try { const p = JSON.parse(viewDeal.documents || "[]"); return Array.isArray(p) ? p : []; } catch { return viewDeal.documents ? [{ name: viewDeal.documents, url: viewDeal.documents }] : []; } })();
              return docs.length ? (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Документы</p>
                  <div className="space-y-1">
                    {docs.map((d: { name: string; url: string }, i: number) => (
                      <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><FileText className="w-3.5 h-3.5 shrink-0" />{d.name}</a>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!activityDeleteTarget}
        title="Удаление записи"
        message={activityDeleteTarget ? "Удалить действие из журнала для этой сделки?" : ""}
        hint="Запись будет удалена без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleDeleteActivity}
        onCancel={() => setActivityDeleteTarget(null)}
      />
    </div>
  );
}
