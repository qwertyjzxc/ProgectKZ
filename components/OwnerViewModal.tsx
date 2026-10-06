"use client";

import { useState, useEffect, useCallback } from "react";
import { useEscapeKey } from "@/lib/use-escape";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { formatPhone } from "@/components/PhoneInput";
import { type Owner, completedColors } from "@/lib/owner-types";
import { getInitials } from "@/lib/client-types";
import type { ActivityEntry } from "@/lib/activity";
import { useProfile } from "@/lib/profile-context";
import { OWNER_CATEGORY_LABELS, type OwnerCategory } from "@/components/dashboard/OwnerCategorySelector";
import { type LucideIcon, CalendarDays, CheckCircle2, Edit3, X, History, Loader2, Trash2, Home, MapPin, Building, Ruler, Building2, Banknote, FileText, Phone, User, Paperclip } from "lucide-react";

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
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

export default function ViewOwnerModal({ owner, category, onClose, onEdit, onComplete }: { owner: Owner; category: OwnerCategory; onClose: () => void; onEdit: () => void; onComplete: () => void }) {
  useEscapeKey(onClose);
  const { currentProfile } = useProfile();
  const isAdmin = currentProfile?.role === "admin";
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ActivityEntry | null>(null);
  const clientTable = "owners_" + category;

  const loadActivity = useCallback(() => {
    fetch("/api/activity?client_table=" + clientTable + "&client_id=" + owner.id)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setActivity(data); })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [clientTable, owner.id]);

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
              <h2 className="text-xl font-bold text-gray-900 truncate">{owner.name || "Без имени"}</h2>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={"text-sm px-3 py-1 " + (completedColors[owner.status || ""] || "bg-gray-100 text-gray-700")}>
                  {owner.status || "Без статуса"}
                </Badge>
                <span className="text-sm text-gray-500 flex items-center gap-1"><CalendarDays className="w-4 h-4" />{owner.date ? formatDateOnly(owner.date) : formatDateOnly(owner.created_at)}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {owner.status !== "Сделка" && (
                <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={onComplete}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />Завершить сделку
                </Button>
              )}
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
            <DetailItem icon={Home} label="Тип недвижимости" value={OWNER_CATEGORY_LABELS[category]} />
            <DetailItem icon={MapPin} label="Район" value={owner.district} />
            <DetailItem icon={MapPin} label="Адрес" value={owner.address} />
            {category === "kvartiry" && <DetailItem icon={Building} label="Жилой комплекс" value={owner.jk} />}
            {(category === "kvartiry" || category === "doma") && <DetailItem icon={Home} label="Кол-во комнат" value={owner.rooms} />}
            {category === "kvartiry" && <DetailItem icon={Ruler} label="Площадь" value={owner.area ? owner.area + " м²" : null} />}
            {category === "pomescheniya" && (
              <>
                <DetailItem icon={Ruler} label="Площадь" value={owner.area ? owner.area + " м²" : null} />
                <DetailItem icon={Building2} label="Тип помещения" value={owner.premise_type} />
                <DetailItem icon={MapPin} label="Расположение коммерции" value={owner.location_line} />
                <DetailItem icon={Home} label="Отделка" value={owner.finishing} />
              </>
            )}
            {category === "doma" && (
              <>
                <DetailItem icon={Ruler} label="Площадь дома" value={owner.house_area ? owner.house_area + " м²" : null} />
                <DetailItem icon={Ruler} label="Площадь участка" value={owner.land_area ? owner.land_area + " сот" : null} />
              </>
            )}
            {category === "zemlya" && <DetailItem icon={Ruler} label="Площадь" value={owner.area ? owner.area + " " + (owner.area_unit || "сот") : null} />}
            {owner.condition && <DetailItem icon={Home} label="Состояние" value={owner.condition} />}
          </CardSection>
          <CardSection title="Договор и цена">
            <DetailItem icon={Banknote} label="Цена" value={owner.price ? formatMoney(owner.price) : null} />
            <DetailItem icon={CalendarDays} label="Дата обращения" value={owner.date ? formatDateOnly(owner.date) : formatDateOnly(owner.created_at)} />
            <DetailItem icon={FileText} label="Тип договора" value={owner.contract_type} />
            {owner.contract_kind && <DetailItem icon={FileText} label="Вид договора" value={owner.contract_kind} />}
          </CardSection>
          <CardSection title="Контакт">
              <DetailItem icon={Phone} label="Телефон" value={owner.phone ? formatPhone(owner.phone) : null} />
            <DetailItem icon={User} label="Брокер" value={owner.broker} />
          </CardSection>
          {owner.notes && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Заметки</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{owner.notes}</p>
            </div>
          )}
          {(owner.documents || "").trim() && ((() => {
            try {
              const docs = JSON.parse(owner.documents || "[]");
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
        message={deleteTarget ? "Удалить действие из журнала для этого собственника?" : ""}
        hint="Запись будет удалена без возможности восстановления."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleDeleteActivity}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
