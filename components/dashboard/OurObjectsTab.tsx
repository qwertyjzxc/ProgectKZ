"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, Trash2, Plus, X, Edit3 } from "lucide-react";
import AddPropertyForm from "@/components/AddPropertyForm";

interface Property {
  id: string; title: string; price: number; rooms: number | null;
  address: string; description: string; image_url: string; image_urls?: string[];
}

export default function OurObjectsTab() {
  const [props, setProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editProp, setEditProp] = useState<Property | null>(null);

  const load = async () => {setLoading(true);const r=await window.fetch("/api/properties");const d=await r.json();if(Array.isArray(d))setProps(d);setLoading(false);};
  useEffect(()=>{load();},[]);

  const del=async(id:string)=>{if(!confirm("Удалить?"))return;await window.fetch("/api/properties/"+id,{method:"DELETE"});setProps(p=>p.filter(x=>x.id!==id));};
  const copyLink=async(id:string)=>{await navigator.clipboard.writeText(`${location.origin}/p/${id}`);setCopiedId(id);setTimeout(()=>setCopiedId(null),2000);};

  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><div/><Button className="gap-2 bg-blue-600" onClick={()=>setShowAdd(true)}><Plus className="w-4 h-4"/>Добавить</Button></div>
      {loading&&<div className="bg-white rounded-xl shadow-sm border p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400"/></div>}
      {!loading&&(
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {props.map(p=>(
            <div key={p.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md">
              <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center overflow-hidden">{p.image_url?<img src={p.image_url} alt={p.title} className="w-full h-full object-cover"/>:<span className="text-gray-400 text-sm">Нет фото</span>}</div>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{p.title}</h3>
                <p className="text-xl font-bold text-blue-600">{Number(p.price).toLocaleString()} ₸</p>
                <div className="flex gap-2 text-xs text-gray-500">{p.rooms!=null&&<span>{p.rooms}-комн.</span>}{p.address&&<span className="line-clamp-1">{p.address}</span>}</div>
                <div className="flex gap-1 pt-2">
                  <Button variant="outline" size="icon-sm" className="h-7 w-7" onClick={()=>copyLink(p.id)}>{copiedId===p.id?<Check className="w-3 h-3 text-green-500"/>:<Copy className="w-3 h-3"/>}</Button>
                  <Button variant="outline" size="icon-sm" className="h-7 w-7" onClick={()=>setEditProp(p)}><Edit3 className="w-3 h-3"/></Button>
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-red-500" onClick={()=>del(p.id)}><Trash2 className="w-3 h-3"/></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={()=>setShowAdd(false)}><div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex justify-end mb-2"><Button variant="ghost" size="icon" onClick={()=>setShowAdd(false)} className="text-white"><X className="w-5 h-5"/></Button></div><AddPropertyForm onSuccess={()=>{load();setShowAdd(false);}}/></div></div>)}
      {editProp&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={()=>setEditProp(null)}><div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="flex justify-end mb-2"><Button variant="ghost" size="icon" onClick={()=>setEditProp(null)} className="text-white"><X className="w-5 h-5"/></Button></div><AddPropertyForm property={editProp} onSuccess={()=>{load();setEditProp(null);}}/></div></div>)}
    </div>
  );
}
