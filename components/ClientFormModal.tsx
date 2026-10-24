"use client";

import { useState, useEffect, useMemo } from "react";
import { useEscapeKey } from "@/lib/use-escape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Combobox from "@/components/Combobox";
import DatePicker from "@/components/DatePicker";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import PhoneInput, { formatPhone } from "@/components/PhoneInput";
import FileUploader, { type AttachmentFile } from "@/components/FileUploader";
import { getReference } from "@/lib/ref-cache";
import {
  CLIENT_FUNNEL_STATUSES, DEAL_DONE_STATUS, reasonsFor, needsReason, needsResumeDate,
  CLIENT_CATEGORIES, CLIENT_TAGS, PREMISE_TYPES, FINISHING_TYPES,
  parseTags,
} from "@/lib/client-status";
import { SHYMKENT_DISTRICTS, SHYMKENT_JK } from "@/lib/shymkent";
import { useProfile, profileName } from "@/lib/profile-context";
import { type Client, type ClientFormData } from "@/lib/client-types";
import { todayLocalISO, formatNumber } from "@/lib/format";
import { ChevronDown, X } from "lucide-react";

function toDateInputValue(v: string): string {
  const m = (v || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v || "")) return v;
  return "";
}

function fromDateInputValue(v: string): string {
  const m = (v || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return v;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-9 appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{label}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ТЗ: Район и ЖК — множественный выбор. Значения хранятся строкой через
// запятую (совместимо со старыми данными и поиском), в UI — чипы.
function MultiCombobox({ value, onChange, options, placeholder }: { value: string[]; onChange: (v: string[]) => void; options: string[]; placeholder: string }) {
  const add = (v: string) => {
    const t = v.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
  };
  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
              {v}
              <button type="button" onClick={() => onChange(value.filter(x => x !== v))} className="text-blue-400 hover:text-blue-700">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Combobox value="" onChange={add} options={options.filter(o => !value.includes(o))} placeholder={placeholder} />
    </div>
  );
}

function FormBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 rounded-xl p-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

// ТЗ: списки значений; сохранённое легаси-значение остаётся в списке,
// чтобы селект не «пустел» при редактировании старых карточек
function withLegacy(options: string[], current?: string): string[] {
  return current && !options.includes(current) ? [...options, current] : options;
}

const FURNITURE_OPTIONS = ["Любая", "Полная", "Частичная", "Без мебели"];
const RENTAL_PERIOD_OPTIONS = ["Долгосрочно", "Краткосрочно", "Не определено"];
const WHO_LIVES_OPTIONS = ["Один", "Пара", "Семья", "Сотрудники компании", "Другое"];
const PETS_OPTIONS = ["Нет", "Есть", "Не указано"];
const CONTRACT_STATUS_OPTIONS = ["Не подписан", "Подписан", "Истёк", "Расторгнут"];
const CONTRACT_TYPE_OPTIONS = ["Подбор", "Аренда", "Покупка", "Иное"];

function splitMulti(v?: string): string[] {
  return (v || "").split(",").map(s => s.trim()).filter(Boolean);
}

export default function ClientFormModal({ client, onClose, onSave, defaultType, category }: { client?: Client; onClose: () => void; onSave: (data: ClientFormData) => void; defaultType?: string; category?: "arenda" | "prodaja" }) {
  const { currentProfile, allProfiles } = useProfile();
  useEscapeKey(onClose);
  const brokerNames = useMemo(() => allProfiles.map(p => profileName(p)).filter(Boolean).sort(), [allProfiles]);
  const [districtOptions, setDistrictOptions] = useState<string[]>(SHYMKENT_DISTRICTS);
  const [jkOptions, setJkOptions] = useState<string[]>(SHYMKENT_JK);
  const isArenda = category !== "prodaja";

  // --- Основное ---
  const [type, setType] = useState(client?.type || defaultType || "");
  const [date, setDate] = useState(client?.date ? toDateInputValue(client.date) : todayLocalISO());
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone ? formatPhone(client.phone) : "");
  const [broker, setBroker] = useState(client ? client.broker : profileName(currentProfile));
  const [completed, setCompleted] = useState(client?.completed || "");
  const [reason, setReason] = useState(client?.reason || "");
  const [statusComment, setStatusComment] = useState(client?.status_comment || "");
  const [resumeDate, setResumeDate] = useState(client?.resume_date || "");

  // --- Что ищет клиент ---
  const [districts, setDistricts] = useState<string[]>(() => splitMulti(client?.district));
  const [jks, setJks] = useState<string[]>(() => splitMulti(client?.jk));
  const [address, setAddress] = useState(client?.address || "");
  const [rooms, setRooms] = useState(client?.rooms || "");
  // Площадь: у земли — одно поле с единицами (легаси), у остальных — от/до
  const [area, setArea] = useState(client?.area || "");
  const [areaMin, setAreaMin] = useState(client?.area_min != null ? String(client.area_min) : "");
  const [areaMax, setAreaMax] = useState(client?.area_max != null ? String(client.area_max) : "");
  const [areaUnit, setAreaUnit] = useState(client?.area_unit || "сот");
  // ТЗ: «Бюджет от» + «Бюджет до»; одно число — только «до»
  const [amountFrom, setAmountFrom] = useState(client?.amount_min != null && client.amount_min > 0 ? formatNumber(client.amount_min) : "");
  const [amountTo, setAmountTo] = useState(client?.amount && client.amount > 0 ? formatNumber(client.amount) : "");
  const [furniture, setFurniture] = useState(client?.furniture || "");
  // Земля-специфика
  const [plotType, setPlotType] = useState(client?.plot_type || "");
  const [purpose, setPurpose] = useState(client?.purpose || "");
  const [communications, setCommunications] = useState(client?.communications || "");
  const [access, setAccess] = useState(client?.access || "");
  const [plotShape, setPlotShape] = useState(client?.plot_shape || "");
  const [relief, setRelief] = useState(client?.relief || "");
  const [restrictions, setRestrictions] = useState(client?.restrictions || "");
  // Помещение-специфика
  const [premiseType, setPremiseType] = useState(client?.premise_type || "");
  const [finishing, setFinishing] = useState(client?.finishing || "");

  // --- Условия аренды / покупки ---
  const [rentalPeriod, setRentalPeriod] = useState(client?.rental_period || "");
  const [moveInDate, setMoveInDate] = useState(client?.move_in_date ? toDateInputValue(client.move_in_date) : "");
  const [whoLives, setWhoLives] = useState(client?.who_lives || "");
  const [peopleCount, setPeopleCount] = useState(client?.people_count ? String(client.people_count) : "1");
  const [pets, setPets] = useState(client?.pets || "");

  // --- Договор с клиентом ---
  const [contract, setContract] = useState(client?.contract || "");
  const [contractStatus, setContractStatus] = useState(client?.contract_status || "");
  const [contractType, setContractType] = useState(client?.contract_type || "");
  const [contractDate, setContractDate] = useState(client?.contract_date ? toDateInputValue(client.contract_date) : "");
  const [contractValidUntil, setContractValidUntil] = useState(client?.contract_valid_until ? toDateInputValue(client.contract_valid_until) : "");
  const [contractFile, setContractFile] = useState<AttachmentFile[]>(() => {
    try {
      const p = JSON.parse(client?.contract_file || "null");
      return p && typeof p === "object" && p.name && p.url ? [p] : [];
    } catch {
      return [];
    }
  });

  // --- Дополнительно ---
  const [preferences, setPreferences] = useState(client?.preferences || "");
  const [notes, setNotes] = useState(client?.notes || "");
  const [clientCategory, setClientCategory] = useState(client?.client_category || "");
  const [tags, setTags] = useState<string[]>(() => parseTags(client?.tags));
  const [documents, setDocuments] = useState<AttachmentFile[]>(() => {
    try {
      const p = JSON.parse(client?.documents || "[]");
      return Array.isArray(p) ? p : [];
    } catch {
      return client?.documents ? [{ name: client.documents, url: client.documents }] : [];
    }
  });
  const [formError, setFormError] = useState("");

  const reasonOptions = useMemo(() => {
    const opts = reasonsFor(completed, category);
    if (reason && !opts.includes(reason)) return [...opts, reason];
    return opts;
  }, [completed, category, reason]);

  // ТЗ: в аренде тега «Ипотека» нет
  const tagOptions = useMemo(
    () => (isArenda ? CLIENT_TAGS.filter(t => t !== "Ипотека") : [...CLIENT_TAGS]),
    [isArenda]
  );

  const toggleTag = (tag: string) => {
    setTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const toggleCommunicationsClient = (opt: string) => {
    setCommunications(prev => {
      const list = prev ? prev.split(", ") : [];
      return (list.includes(opt) ? list.filter(x => x !== opt) : [...list, opt]).join(", ");
    });
  };

  useEffect(() => {
    getReference("districts").then(d => { if (d.length) setDistrictOptions(d); });
    getReference("residential_complexes").then(c => { if (c.length) setJkOptions(c); });
  }, []);

  const digits = (v: string) => parseInt(v.replace(/[^\d]/g, ""), 10) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ТЗ §5: причина обязательна для Приостановлен / Закрыт без сделки
    if (needsReason(completed) && !reason) {
      setFormError("Укажите причину: без неё сохранить статус «" + completed + "» нельзя");
      return;
    }
    if (needsReason(completed) && reason === "Другое" && !statusComment.trim()) {
      setFormError("Для причины «Другое» заполните комментарий");
      return;
    }
    if (needsResumeDate(completed) && !resumeDate) {
      setFormError("Укажите дату повторного контакта");
      return;
    }
    setFormError("");
    const amountMin = amountFrom.trim() ? digits(amountFrom) : null;
    const amount = amountTo.trim() ? digits(amountTo) : (amountMin ?? 0);
    const aMin = areaMin.trim() ? digits(areaMin) : null;
    const aMax = areaMax.trim() ? digits(areaMax) : null;
    const payload: ClientFormData = {
      // Основное
      type, date: fromDateInputValue(date), name, phone, broker, completed,
      // Что ищет клиент
      district: districts.join(", "),
      jk: jks.join(", "),
      address, rooms,
      area: type === "Земля" ? area : (areaMin || areaMax ? String(areaMin || areaMax) : area),
      area_min: type === "Земля" ? null : aMin,
      area_max: type === "Земля" ? null : aMax,
      amount, amount_min: amountMin,
      furniture,
      // Условия
      rental_period: rentalPeriod,
      move_in_date: fromDateInputValue(moveInDate),
      who_lives: whoLives,
      people_count: parseInt(peopleCount) || 1,
      pets,
      // Договор
      contract,
      contract_status: contractStatus,
      contract_type: contractType,
      contract_date: fromDateInputValue(contractDate),
      contract_valid_until: fromDateInputValue(contractValidUntil),
      contract_file: contractFile.length ? JSON.stringify(contractFile[0]) : "",
      // Дополнительно
      notes,
      documents: JSON.stringify(documents),
      preferences, client_category: clientCategory, tags: JSON.stringify(tags),
      premise_type: premiseType, finishing,
      reason: needsReason(completed) ? reason : "",
      status_comment: needsReason(completed) ? statusComment : "",
      resume_date: needsResumeDate(completed) ? resumeDate : "",
    };
    if (type === "Земля") {
      payload.area_unit = areaUnit;
      payload.plot_type = plotType;
      payload.purpose = purpose;
      payload.communications = communications;
      payload.access = access;
      payload.plot_shape = plotShape;
      payload.relief = relief;
      payload.restrictions = restrictions;
    }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">{client ? "Редактировать клиента" : "Новый клиент"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form id="client-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <FormBlock title="Основное">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Тип недвижимости</label>
              <Select label="Не указано" value={type} onChange={setType} options={["Земля", "Дом", "Помещение", "Квартира"]} />
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Дата обращения</label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Имя</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Фамилия Имя" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Телефон</label><PhoneInput value={phone} onChange={setPhone} /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Брокер</label>
              <Combobox value={broker} onChange={setBroker} options={brokerNames} placeholder={brokerNames.length ? "Выберите сотрудника" : "Нет сотрудников — введите имя"} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <Select label="Без статуса" value={completed} onChange={v => { setCompleted(v); setReason(""); setStatusComment(""); }} options={
                // «Сделка завершена» вручную не ставится — только через «Завершить сделку».
                // У уже завершённых показываем текущий статус, чтобы селект не пустел.
                [...CLIENT_FUNNEL_STATUSES.filter(s => s !== DEAL_DONE_STATUS), ...(completed === DEAL_DONE_STATUS ? [DEAL_DONE_STATUS] : [])]
              } />
            </div>
            {needsReason(completed) && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Причина *</label>
                <Select label="Выберите причину" value={reason} onChange={setReason} options={reasonOptions} />
              </div>
            )}
            {needsReason(completed) && reason === "Другое" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Комментарий *</label>
                <Input value={statusComment} onChange={e => setStatusComment(e.target.value)} placeholder="Уточните причину" className="text-sm" />
              </div>
            )}
            {needsResumeDate(completed) && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Дата повторного контакта *</label>
                <DatePicker value={resumeDate} onChange={setResumeDate} placeholder="Выберите дату" />
                <p className="text-[11px] text-gray-400 mt-1">CRM создаст задачу на эту дату автоматически</p>
              </div>
            )}
          </FormBlock>

          <FormBlock title="Что ищет клиент">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Район (можно несколько)</label>
              <MultiCombobox value={districts} onChange={setDistricts} options={districtOptions} placeholder="Добавить район" />
            </div>
            {type !== "Земля" && (
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Жилой комплекс (можно несколько)</label>
                <MultiCombobox value={jks} onChange={setJks} options={jkOptions} placeholder="Добавить жилой комплекс" />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Предпочтительный адрес / улица</label>
              <AddressAutocomplete value={address} onChange={setAddress} placeholder="г. Шымкент, ул., дом, кв." />
            </div>
            {type !== "Земля" && <div><label className="text-xs text-gray-500 mb-1 block">Кол-во комнат</label><Input value={rooms} onChange={e => setRooms(e.target.value)} placeholder="Кол-во комнат" className="text-sm" /></div>}
            {type === "Земля" ? (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Площадь</label>
                <div className="flex gap-2">
                  <Input value={area} onChange={e => setArea(e.target.value)} type="number" placeholder="10" className="text-sm" />
                  <select value={areaUnit} onChange={e => setAreaUnit(e.target.value)} className="h-9 rounded-lg border px-2 text-sm shrink-0">
                    <option value="сот">Сотки</option>
                    <option value="га">Гектары</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Площадь, м² (от — до)</label>
                <div className="flex items-center gap-2">
                  <Input value={areaMin} onChange={e => setAreaMin(e.target.value)} type="number" placeholder="от" className="text-sm" />
                  <span className="text-xs text-gray-400">—</span>
                  <Input value={areaMax} onChange={e => setAreaMax(e.target.value)} type="number" placeholder="до" className="text-sm" />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Бюджет, ₸{isArenda ? "/мес" : ""} (от — до)</label>
              <div className="flex items-center gap-2">
                <Input value={amountFrom} onChange={e => setAmountFrom(formatNumber(e.target.value.replace(/[^\d]/g, "")))} placeholder="от" className="text-sm" />
                <span className="text-xs text-gray-400">—</span>
                <Input value={amountTo} onChange={e => setAmountTo(formatNumber(e.target.value.replace(/[^\d]/g, "")))} placeholder="до" className="text-sm" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Если названа одна максимальная сумма — заполните только «до»</p>
            </div>
            {type !== "Земля" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Меблировка</label>
                <Select label="Не указано" value={furniture} onChange={setFurniture} options={withLegacy(FURNITURE_OPTIONS, furniture)} />
              </div>
            )}
            {type === "Помещение" || type === "Помещения" ? (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Тип помещения</label>
                <Select label="Не указано" value={premiseType} onChange={setPremiseType} options={[...PREMISE_TYPES]} />
              </div>
            ) : null}
            {!(category === "arenda" && (type === "Квартира" || type === "Квартиры")) && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Отделка</label>
                <Select label="Не указано" value={finishing} onChange={setFinishing} options={[...FINISHING_TYPES]} />
              </div>
            )}
            {type === "Земля" && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Участок под</label>
                  <Select label="Не указано" value={plotType} onChange={setPlotType} options={["Бизнес", "ИЖС"]} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Назначение</label>
                  <Select label="Не указано" value={purpose} onChange={setPurpose} options={["ИЖС", "Коммерция", "Производство"]} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Коммуникации</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Свет", "Вода", "Газ", "Интернет"].map(opt => {
                      const checked = (communications || "").split(", ").includes(opt);
                      return (
                        <label key={opt} className={"flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors " + (checked ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600")}>
                          <input type="checkbox" checked={checked} onChange={() => toggleCommunicationsClient(opt)} className="accent-blue-600 w-3.5 h-3.5" />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Подъездные пути</label>
                  <Select label="Не указано" value={access} onChange={setAccess} options={["Вдоль дороги", "Внутри"]} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Форма участка</label>
                  <Select label="Не указано" value={plotShape} onChange={setPlotShape} options={["Ровный", "Прямоугольный", "Нестандартная форма"]} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Рельеф</label>
                  <Select label="Не указано" value={relief} onChange={setRelief} options={["Ровный", "Есть холмы"]} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ограничения</label>
                  <Select label="Не указано" value={restrictions} onChange={setRestrictions} options={["Делимый", "Неделимый"]} />
                </div>
              </>
            )}
          </FormBlock>

          <FormBlock title={isArenda ? "Условия аренды" : "Условия покупки"}>
            {isArenda && type !== "Земля" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Срок аренды</label>
                <Select label="Не указано" value={rentalPeriod} onChange={setRentalPeriod} options={withLegacy(RENTAL_PERIOD_OPTIONS, rentalPeriod)} />
              </div>
            )}
            <div><label className="text-xs text-gray-500 mb-1 block">Дата заезда</label><Input type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)} className="text-sm" /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Кто будет проживать</label>
              <Select label="Не указано" value={whoLives} onChange={setWhoLives} options={withLegacy(WHO_LIVES_OPTIONS, whoLives)} />
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Количество человек</label><Input value={peopleCount} onChange={e => setPeopleCount(e.target.value)} type="number" placeholder="1" className="text-sm" /></div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Животные</label>
              <Select label="Не указано" value={pets} onChange={setPets} options={withLegacy(PETS_OPTIONS, pets)} />
            </div>
          </FormBlock>

          <FormBlock title="Договор с клиентом">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус договора</label>
              <Select label="Не указано" value={contractStatus} onChange={setContractStatus} options={withLegacy(CONTRACT_STATUS_OPTIONS, contractStatus)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Вид договора</label>
              <Select label="Не указано" value={contractType} onChange={setContractType} options={withLegacy(CONTRACT_TYPE_OPTIONS, contractType)} />
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Номер договора</label><Input value={contract} onChange={e => setContract(e.target.value)} placeholder="№ договора" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Дата подписания</label><Input type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Срок действия (до)</label><Input type="date" value={contractValidUntil} onChange={e => setContractValidUntil(e.target.value)} className="text-sm" /></div>
            <div className="md:col-span-2">
              <FileUploader title="Файл договора" files={contractFile} onChange={setContractFile} multiple={false} />
            </div>
          </FormBlock>

          <FormBlock title="Дополнительно">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Категория клиента</label>
              <Select label="Не указано" value={clientCategory} onChange={setClientCategory} options={[...CLIENT_CATEGORIES]} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Теги</label>
              <div className="flex flex-wrap gap-1.5">
                {tagOptions.map(tag => {
                  const checked = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={"px-2.5 py-1.5 rounded-lg border text-xs transition-colors " + (checked ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-blue-300")}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Предпочтения — что важно при подборе</label>
              <textarea value={preferences} onChange={e => setPreferences(e.target.value)} placeholder="Этаж, вид из окна, школа рядом..." rows={2} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Заметки — внутренняя информация брокера</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дополнительная информация..." rows={2} className="w-full rounded-lg border px-3 py-2 text-sm resize-y" />
            </div>
            <div className="md:col-span-2">
              <FileUploader title="Документы" files={documents} onChange={setDocuments} />
            </div>
          </FormBlock>

          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </form>
        <div className="shrink-0 flex items-center justify-end gap-2 p-4 border-t bg-white">
          <Button variant="outline" type="button" onClick={onClose} className="px-6">Отмена</Button>
          <Button type="submit" form="client-form" className="bg-blue-600 px-8">{client ? "Сохранить" : "Добавить"}</Button>
        </div>
      </div>
    </div>
  );
}
