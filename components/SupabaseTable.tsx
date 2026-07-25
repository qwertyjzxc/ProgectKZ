"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

const TABLE_NAME = "rentals";

const DEFAULT_COLUMNS = [
  "id",
  "rooms",
  "amount",
  "final_price",
  "rental_period",
  "address",
  "broker",
  "start_date",
  "end_date",
  "completed",
  "created_at",
];

function getColumns(rows: Record<string, unknown>[] | null): string[] {
  if (rows && rows.length > 0) {
    return Object.keys(rows[0]);
  }
  return DEFAULT_COLUMNS;
}

export default function SupabaseTable() {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Существующие состояния фильтров
  const [roomFilter, setRoomFilter] = useState<string>("");
  const [amountFrom, setAmountFrom] = useState<string>("");
  const [amountTo, setAmountTo] = useState<string>("");
  const [periodFilter, setPeriodFilter] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Новые состояния фильтров
  const [brokerFilter, setBrokerFilter] = useState<string>("");
  const [finalPriceFrom, setFinalPriceFrom] = useState<string>("");
  const [finalPriceTo, setFinalPriceTo] = useState<string>("");
  const [endDateFrom, setEndDateFrom] = useState<string>("");
  const [endDateTo, setEndDateTo] = useState<string>("");
  const [completedFilter, setCompletedFilter] = useState<string>(""); // "" | "true" | "false"

  useEffect(() => {
    supabase
      .from(TABLE_NAME)
      .select("*")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data as Record<string, unknown>[]);
      });
  }, []);

  // Клиентская фильтрация
  const filtered = useMemo(() => {
    if (!rows) return null;
    return rows.filter((row) => {
      // 1. Поиск по Брокеру (broker)
      if (brokerFilter.trim() !== "") {
        const broker = String(row.broker ?? "").toLowerCase();
        if (!broker.includes(brokerFilter.toLowerCase().trim())) return false;
      }

      // 2. Количество комнат
      if (roomFilter !== "") {
        const rooms = String(row.rooms ?? "");
        if (rooms !== roomFilter) return false;
      }

      // 3. Цена (amount)
      const amount = Number(row.amount ?? 0);
      if (amountFrom !== "" && amount < Number(amountFrom)) return false;
      if (amountTo !== "" && amount > Number(amountTo)) return false;

      // 4. Финальная цена (final_price)
      const finalPrice = Number(row.final_price ?? 0);
      if (finalPriceFrom !== "" && finalPrice < Number(finalPriceFrom)) return false;
      if (finalPriceTo !== "" && finalPrice > Number(finalPriceTo)) return false;

      // 5. Срок аренды
      if (periodFilter.size > 0) {
        const period = String(row.rental_period ?? "").toLowerCase();
        if (!periodFilter.has(period)) return false;
      }

      // 6. Статус завершения (completed - boolean)
      if (completedFilter !== "") {
        const isCompleted = Boolean(row.completed);
        if (completedFilter === "true" && !isCompleted) return false;
        if (completedFilter === "false" && isCompleted) return false;
      }

      // 7. Дата начала (start_date)
      if (dateFrom !== "" || dateTo !== "") {
        const dateStr = String(row.start_date ?? "");
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        if (dateFrom !== "") {
          const from = new Date(dateFrom);
          if (d < from) return false;
        }
        if (dateTo !== "") {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
      }

      // 8. Дата окончания (end_date)
      if (endDateFrom !== "" || endDateTo !== "") {
        const dateStr = String(row.end_date ?? "");
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        if (endDateFrom !== "") {
          const from = new Date(endDateFrom);
          if (d < from) return false;
        }
        if (endDateTo !== "") {
          const to = new Date(endDateTo);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
      }

      return true;
    });
  }, [
    rows,
    brokerFilter,
    roomFilter,
    amountFrom,
    amountTo,
    finalPriceFrom,
    finalPriceTo,
    periodFilter,
    completedFilter,
    dateFrom,
    dateTo,
    endDateFrom,
    endDateTo,
  ]);

  const resetFilters = () => {
    setBrokerFilter("");
    setRoomFilter("");
    setAmountFrom("");
    setAmountTo("");
    setFinalPriceFrom("");
    setFinalPriceTo("");
    setPeriodFilter(new Set());
    setCompletedFilter("");
    setDateFrom("");
    setDateTo("");
    setEndDateFrom("");
    setEndDateTo("");
  };

  const togglePeriod = (value: string) => {
    setPeriodFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const columns = getColumns(rows);
  const displayData = filtered ?? rows;

  const filterPanel = (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-4">
      <div className="flex items-center justify-between border-b pb-3 border-gray-100">
        <h3 className="font-semibold text-gray-800 text-lg">Фильтры поиска</h3>
        <button
          onClick={resetFilters}
          className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors"
        >
          Сбросить фильтры
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Поиск по Брокеру */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1.5">Брокер</label>
          <input
            type="text"
            placeholder="Имя или фамилия..."
            value={brokerFilter}
            onChange={(e) => setBrokerFilter(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>

        {/* Комнаты */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1.5">Комнат</label>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          >
            <option value="">Все варианты</option>
            <option value="1">1 комната</option>
            <option value="2">2 комнаты</option>
            <option value="3">3 комнаты</option>
            <option value="4">4+ комнаты</option>
          </select>
        </div>

        {/* Статус завершения (completed) */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1.5">Статус сделки</label>
          <select
            value={completedFilter}
            onChange={(e) => setCompletedFilter(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          >
            <option value="">Все статусы</option>
            <option value="true">Завершено</option>
            <option value="false">В процессе</option>
          </select>
        </div>

        {/* Начальная цена (amount) */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1.5">Цена (Amount)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="От"
              value={amountFrom}
              onChange={(e) => setAmountFrom(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <span className="text-gray-400">—</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="До"
              value={amountTo}
              onChange={(e) => setAmountTo(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
        </div>

        {/* Итоговая цена (final_price) */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1.5">Итоговая цена (Final Price)</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="От"
              value={finalPriceFrom}
              onChange={(e) => setFinalPriceFrom(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <span className="text-gray-400">—</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="До"
              value={finalPriceTo}
              onChange={(e) => setFinalPriceTo(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
        </div>

        {/* Дата начала (start_date) */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1.5">Дата начала</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
        </div>

        {/* Дата окончания (end_date) */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1.5">Дата окончания</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDateFrom}
              onChange={(e) => setEndDateFrom(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={endDateTo}
              onChange={(e) => setEndDateTo(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
        </div>

        {/* Срок аренды (Кнопки-чипсы) */}
        <div className="flex flex-col col-span-1 md:col-span-2 lg:col-span-4">
          <label className="text-xs font-semibold text-gray-600 mb-1.5">Срок аренды</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "daily", label: "Посуточно" },
              { id: "monthly", label: "Помесячно" },
              { id: "longterm", label: "Долгосрочно" },
            ].map((item) => {
              const active = periodFilter.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => togglePeriod(item.id)}
                  className={`text-xs font-medium px-4 py-2 rounded-lg border transition-all ${
                    active
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  let body: React.ReactNode;
  if (error) {
    body = (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
        ❌ Ошибка загрузки: {error}
      </div>
    );
  } else if (!rows) {
    body = (
      <div className="flex items-center justify-center p-8 text-gray-500 text-sm">
        <span className="animate-pulse">Загрузка данных из Supabase...</span>
      </div>
    );
  } else if (displayData && displayData.length === 0) {
    body = (
      <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm">
        Записи не найдены по выбранным фильтрам.
      </div>
    );
  } else {
    body = (
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-5 py-3 font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {displayData!.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-5 py-3 whitespace-nowrap">
                    {typeof row[col] === "boolean" ? (
                      row[col] ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Завершено
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          В процессе
                        </span>
                      )
                    ) : (
                      String(row[col] ?? "")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 font-sans">
      {filterPanel}
      {body}
    </div>
  );
}