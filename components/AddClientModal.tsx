"use client";

import { useState } from "react";
import { ClientData } from "@/types/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save, UserPlus } from "lucide-react";

interface AddClientModalProps {
  onClose: () => void;
  onAdd: (client: ClientData) => void;
}

const emptyClient: Omit<ClientData, 'id'> = {
  date: new Date().toLocaleDateString('ru-RU'),
  name: '',
  rooms: '',
  district: '',
  amount: 0,
  furniture: '',
  rentalPeriod: '',
  phone: '',
  whoLives: '',
  peopleCount: 1,
  notes: '',
  completed: '',
  broker: '',
};

export default function AddClientModal({ onClose, onAdd }: AddClientModalProps) {
  const [form, setForm] = useState(emptyClient);

  const handleChange = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: ClientData = {
      ...form,
      id: Date.now().toString(),
      amount: Number(form.amount) || 0,
      peopleCount: Number(form.peopleCount) || 1,
    };
    onAdd(newClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Добавить клиента</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Дата обращения</label>
              <Input
                value={form.date}
                onChange={e => handleChange('date', e.target.value)}
                className="h-9 text-sm"
                placeholder="ДД.ММ.ГГГГ"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Имя клиента *</label>
              <Input
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                className="h-9 text-sm"
                placeholder="Фамилия Имя"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Кол-во комнат / Помещение</label>
              <Input
                value={form.rooms}
                onChange={e => handleChange('rooms', e.target.value)}
                className="h-9 text-sm"
                placeholder="2-комн. / Офис 50м²"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Район</label>
              <select
                value={form.district}
                onChange={e => handleChange('district', e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="">Выберите район</option>
                <option value="Абайский">Абайский</option>
                <option value="Аль-Фарабийский">Аль-Фарабийский</option>
                <option value="Енбекшинский">Енбекшинский</option>
                <option value="Каратауский">Каратауский</option>
                <option value="Туранский">Туранский</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Сумма (₸)</label>
              <Input
                type="number"
                value={form.amount}
                onChange={e => handleChange('amount', e.target.value)}
                className="h-9 text-sm"
                placeholder="250000"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Мебель</label>
              <select
                value={form.furniture}
                onChange={e => handleChange('furniture', e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="">Выберите</option>
                <option value="С мебелью">С мебелью</option>
                <option value="Без мебели">Без мебели</option>
                <option value="Частично">Частично</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Срок аренды</label>
              <select
                value={form.rentalPeriod}
                onChange={e => handleChange('rentalPeriod', e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="">Выберите</option>
                <option value="Долгосрочно">Долгосрочно</option>
                <option value="Посуточно">Посуточно</option>
                <option value="На месяц">На месяц</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Телефон *</label>
              <Input
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="h-9 text-sm"
                placeholder="+7 777 123 45 67"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Кто будет жить / Под что</label>
              <Input
                value={form.whoLives}
                onChange={e => handleChange('whoLives', e.target.value)}
                className="h-9 text-sm"
                placeholder="Семья с детьми / Офис"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Кол-во человек</label>
              <Input
                type="number"
                value={form.peopleCount}
                onChange={e => handleChange('peopleCount', e.target.value)}
                className="h-9 text-sm"
                min={1}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Статус</label>
              <select
                value={form.completed}
                onChange={e => handleChange('completed', e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="">Выберите статус</option>
                <option value="В процессе">В процессе</option>
                <option value="Думает">Думает</option>
                <option value="Сделка">Сделка</option>
                <option value="Отказ">Отказ</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Брокер</label>
              <select
                value={form.broker}
                onChange={e => handleChange('broker', e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="">Выберите брокера</option>
                <option value="Сериков А.">Сериков А.</option>
                <option value="Каримова Д.">Каримова Д.</option>
                <option value="Алимжанов Н.">Алимжанов Н.</option>
              </select>
            </div>

            {/* Notes — full width */}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Показы / Заметки</label>
              <textarea
                value={form.notes}
                onChange={e => handleChange('notes', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                rows={3}
                placeholder="Комментарии по клиенту..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button size="sm" onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 gap-1">
            <Save className="w-3.5 h-3.5" />
            Добавить
          </Button>
        </div>
      </div>
    </div>
  );
}
