"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const TABLE_NAME = "connection_test";

export default function SupabaseTable() {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from(TABLE_NAME)
      .select("*")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data as Record<string, unknown>[]);
      });
  }, []);

  if (error) return <div>Ошибка: {error}</div>;
  if (!rows) return <div>Загрузка...</div>;
  if (rows.length === 0) return <div>Нет данных</div>;

  const columns = Object.keys(rows[0]);

  return (
    <table border={1} cellPadding={6} cellSpacing={0}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={col}>{String(row[col] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}