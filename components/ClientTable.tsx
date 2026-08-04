"use client";

import { ClientData } from "@/types/client";
import ClientModal from "@/components/ClientModal";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const columnHeaders = [
  "Дата обращения",
  "Имя клиента",
  "Кол-во комнат/Помеще",
  "Район",
  "Сумма",
  "Мебель",
  "Срок аренды",
  "Телефон",
  "Кто будет жить/Под что",
  "Кол-во человек",
  "Показы/Заметки",
  "Завершены",
  "Брокер",
];

function getStatusBadge(value: string) {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.includes("да") || v.includes("сделка") || v.includes("завершен")) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">{value}</Badge>;
  }
  if (v.includes("в процессе") || v.includes("думает") || v.includes("показ")) {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">{value}</Badge>;
  }
  if (v.includes("нет") || v.includes("отказ")) {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">{value}</Badge>;
  }
  return <Badge variant="outline" className="text-xs">{value}</Badge>;
}

interface ClientTableProps {
  clients: ClientData[];
  onDeleteClient: (id: string) => void;
}

export default function ClientTable({ clients, onDeleteClient }: ClientTableProps) {
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

  return (
    <>
      {/* Table container with horizontal scroll */}
                  <div className="bg-white rounded-xl shadow-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b-2 border-gray-200">
              <tr>
                {columnHeaders.map((header, i) => (
                  <th
                    key={i}
                    className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table body */}
            <tbody className="divide-y divide-gray-100">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="hover:bg-blue-50/60 cursor-pointer transition-colors duration-150"
                >
                  <td className="px-3 py-2.5 text-sm text-gray-600 whitespace-nowrap">{client.date}</td>
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-800 whitespace-nowrap">
                    {client.name}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-center whitespace-nowrap">{client.rooms}</td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {client.district}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-right font-medium whitespace-nowrap">
                    {client.amount?.toLocaleString()} ₸
                  </td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">{client.furniture}</td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">{client.rentalPeriod}</td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">{client.phone}</td>
                  <td className="px-3 py-2.5 text-sm max-w-xs truncate">{client.whoLives}</td>
                  <td className="px-3 py-2.5 text-sm text-center whitespace-nowrap">{client.peopleCount}</td>
                  <td className="px-3 py-2.5 text-sm max-w-xs truncate text-gray-500">{client.notes}</td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                    {getStatusBadge(client.completed)}
                  </td>
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">{client.broker}</td>
                </tr>
              ))}

              {/* Empty state */}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center text-gray-400">
                    <p className="text-lg">Нет данных</p>
                    <p className="text-sm mt-1">Добавьте клиентов через кнопку «Добавить клиента»</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="border-t bg-gray-50/50 px-4 py-2 text-xs text-gray-400">
          Всего клиентов: {clients.length}
        </div>
      </div>

      {/* Client detail modal with delete */}
      <ClientModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onDelete={onDeleteClient}
      />
    </>
  );
}
