"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Handshake, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/format";

interface ClientDeal {
  id: number;
  name: string;
  client: string;
  amount: number;
  completed: string;
  category: string;
  typeLabel: string;
}

export default function ClientDeals({ phone, name }: { phone: string; name: string }) {
  const [deals, setDeals] = useState<ClientDeal[] | null>(null);
  const canSearch = !!phone || name.trim().length >= 2;

  useEffect(() => {
    if (!phone && name.trim().length < 2) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (phone) params.set("phone", phone);
    if (name) params.set("name", name);
    fetch("/api/client-deals?" + params.toString())
      .then(res => res.json())
      .then(json => { if (!cancelled) setDeals(Array.isArray(json) ? json : []); })
      .catch(() => { if (!cancelled) setDeals([]); });
    return () => { cancelled = true; };
  }, [phone, name]);

  if (!canSearch) return null;

  if (deals === null) {
    return (
      <div>
        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Сделки клиента</h3>
        <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Загрузка…</p>
      </div>
    );
  }

  if (deals.length === 0) return null;

  return (
    <div>
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Сделки клиента · {deals.length}
      </h3>
      <div className="space-y-2">
        {deals.map(d => (
          <Link
            key={d.typeLabel + d.id}
            href={"/deals?category=" + (d.category || "arenda")}
            className="flex items-center gap-3 border rounded-lg px-3 py-2.5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <Handshake className="w-4 h-4 text-green-600" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-gray-900 truncate">{d.name || "Без названия"}</span>
              <span className="block text-xs text-gray-400 truncate">{d.typeLabel} · {d.completed || "—"}</span>
            </span>
            <span className="text-sm font-semibold text-gray-900 shrink-0">{d.amount ? formatMoney(d.amount) : "—"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
