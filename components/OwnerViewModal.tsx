"use client";

import { useEscapeKey } from "@/lib/use-escape";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDateOnly } from "@/lib/format";
import { maskKzPhone } from "@/components/PhoneInput";
import { type Owner, completedColors } from "@/lib/owner-types";
import { getInitials } from "@/lib/client-types";
import { OWNER_CATEGORY_LABELS, type OwnerCategory } from "@/components/dashboard/OwnerCategorySelector";
import { type LucideIcon, CalendarDays, CheckCircle2, Edit3, X, Home, MapPin, Building, Ruler, Building2, Banknote, FileText, Phone, User, Paperclip } from "lucide-react";

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50/60 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
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

export default function ViewOwnerModal({ owner, category, onClose, onEdit, onComplete }: { owner: Owner; category: OwnerCategory; onClose: () => void; onEdit: () => void; onComplete: () => void }) {
  useEscapeKey(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border" onClick={e => e.stopPropagation()}>
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
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
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
            <DetailItem icon={Phone} label="Телефон" value={owner.phone ? maskKzPhone(owner.phone) : null} />
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
  );
}
