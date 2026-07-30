"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
export default function FilterPanel({ onSearch }: { onSearch?: (filters: any) => void }) {
  const [dealType, setDealType] = useState("");
  const [propType, setPropType] = useState("");
  const [district, setDistrict] = useState("");
  const [jc, setJc] = useState("");
  const [rooms, setRooms] = useState<string | null>(null);
  const [budgetFrom, setBudgetFrom] = useState("");
  const [budgetTo, setBudgetTo] = useState("");
  const [areaFrom, setAreaFrom] = useState("");
  const [areaTo, setAreaTo] = useState("");
  const handleSearch = () => { if (onSearch) onSearch({ dealType, propType, district, jc, rooms, budgetFrom, budgetTo, areaFrom, areaTo }); };
  const handleReset = () => { setDealType(""); setPropType(""); setDistrict(""); setJc(""); setRooms(null); setBudgetFrom(""); setBudgetTo(""); setAreaFrom(""); setAreaTo(""); };
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-gray-800">Параметры поиска</h2><Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">Сбросить</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
        <div><label className="text-xs text-gray-500 mb-1.5 block">Тип сделки</label><select value={dealType} onChange={e => setDealType(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 outline-none"><option value="">Все</option><option>Покупка</option><option>Продажа</option><option>Аренда</option></select></div>
        <div><label className="text-xs text-gray-500 mb-1.5 block">Тип недвижимости</label><select value={propType} onChange={e => setPropType(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 outline-none"><option value="">Все</option><option>Квартира</option><option>Помещение</option><option>Участок</option><option>Дом</option></select></div>
        <div><label className="text-xs text-gray-500 mb-1.5 block">Район</label><Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Любой" className="h-9 text-sm bg-gray-50" /></div>
        <div><label className="text-xs text-gray-500 mb-1.5 block">ЖК / БЦ</label><Input value={jc} onChange={e => setJc(e.target.value)} placeholder="Начните набирать..." className="h-9 text-sm bg-gray-50" /></div>
        <div><label className="text-xs text-gray-500 mb-1.5 block">Комнатность</label><div className="flex gap-1">{["1","2","3","4","5+"].map(v => (<button key={v} type="button" onClick={() => setRooms(rooms === v ? null : v)} className={"flex-1 h-9 rounded-lg border text-sm font-medium transition-colors " + (rooms === v ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50")}>{v}</button>))}</div></div>
        <div className="flex gap-2"><div className="flex-1"><label className="text-xs text-gray-500 mb-1.5 block">Бюджет от</label><Input value={budgetFrom} onChange={e => setBudgetFrom(e.target.value)} placeholder="От, ₸" type="number" className="h-9 text-sm bg-gray-50" /></div><div className="flex-1"><label className="text-xs text-gray-500 mb-1.5 block">до</label><Input value={budgetTo} onChange={e => setBudgetTo(e.target.value)} placeholder="До, ₸" type="number" className="h-9 text-sm bg-gray-50" /></div></div>
        <div className="flex gap-2"><div className="flex-1"><label className="text-xs text-gray-500 mb-1.5 block">Площадь, м² от</label><Input value={areaFrom} onChange={e => setAreaFrom(e.target.value)} placeholder="От" type="number" className="h-9 text-sm bg-gray-50" /></div><div className="flex-1"><label className="text-xs text-gray-500 mb-1.5 block">до</label><Input value={areaTo} onChange={e => setAreaTo(e.target.value)} placeholder="До" type="number" className="h-9 text-sm bg-gray-50" /></div></div>
      </div>
      <div className="mt-6 flex justify-end"><Button onClick={handleSearch} className="bg-green-500 hover:bg-green-600 text-white px-10 py-2.5 text-base font-semibold shadow-md shadow-green-200"><Search className="w-4 h-4 mr-2" />ПОИСК</Button></div>
    </div>
  );
}
