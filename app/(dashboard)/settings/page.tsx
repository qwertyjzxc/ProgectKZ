"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PhoneInput from "@/components/PhoneInput";
import { useProfile, profileName, profileInitials, type Profile } from "@/lib/profile-context";
import { updateMyProfile, changeMyPassword, updateNotificationSettings } from "./actions";
import { CheckCircle2, Loader2, Shield, UserRound, Phone, Mail, AtSign, Lock, KeyRound, Bell, Plus, Trash2, MapPin, Building } from "lucide-react";

const NOTIFICATION_ENTITIES = [
  { key: "clients", label: "Клиенты" },
  { key: "deals", label: "Сделки" },
  { key: "tasks", label: "Задачи" },
];
const NOTIFICATION_ACTIONS = [
  { suffix: "create", label: "Добавление" },
  { suffix: "update", label: "Изменение" },
  { suffix: "delete", label: "Удаление" },
];
const ALL_NOTIFICATION_KEYS = NOTIFICATION_ENTITIES.flatMap(e =>
  NOTIFICATION_ACTIONS.map(a => `${e.key}_${a.suffix}`)
);

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none " +
        (checked ? "bg-blue-600" : "bg-gray-300")
      }
    >
      <span
        className={
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform " +
          (checked ? "translate-x-5" : "translate-x-0")
        }
      />
    </button>
  );
}

function ReferenceBooks() {
  const [districts, setDistricts] = useState<{ id: number; name: string }[]>([]);
  const [complexes, setComplexes] = useState<{ id: number; name: string }[]>([]);
  const [newDistrict, setNewDistrict] = useState("");
  const [newComplex, setNewComplex] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [dRes, cRes] = await Promise.all([
      fetch("/api/districts"),
      fetch("/api/residential-complexes"),
    ]);
    if (dRes.ok) setDistricts(await dRes.json());
    if (cRes.ok) setComplexes(await cRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addDistrict = async () => {
    if (!newDistrict.trim()) return;
    setError("");
    const res = await fetch("/api/districts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDistrict }),
    });
    if (res.ok) {
      setNewDistrict("");
      load();
    } else {
      const data = await res.json();
      setError(data.error || "Ошибка");
    }
  };

  const deleteDistrict = async (id: number) => {
    await fetch("/api/districts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const addComplex = async () => {
    if (!newComplex.trim()) return;
    setError("");
    const res = await fetch("/api/residential-complexes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newComplex }),
    });
    if (res.ok) {
      setNewComplex("");
      load();
    } else {
      const data = await res.json();
      setError(data.error || "Ошибка");
    }
  };

  const deleteComplex = async (id: number) => {
    await fetch("/api/residential-complexes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b bg-gray-50/50">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Справочники</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">Управление районами и жилыми комплексами</p>
        </div>
        <div className="p-6 space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden mt-6">
      <div className="p-6 border-b bg-gray-50/50">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Справочники</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">Управление районами и жилыми комплексами</p>
      </div>
      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">{error}</div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Районы ({districts.length})
            </h3>
            <div className="flex gap-2 mb-3">
              <Input value={newDistrict} onChange={e => setNewDistrict(e.target.value)} placeholder="Новый район" className="text-sm" onKeyDown={e => e.key === "Enter" && addDistrict()} />
              <Button onClick={addDistrict} disabled={!newDistrict.trim()} className="bg-blue-600 shrink-0"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border divide-y divide-gray-100">
              {districts.map(d => (
                <div key={d.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                  <span className="text-sm text-gray-700">{d.name}</span>
                  <button onClick={() => deleteDistrict(d.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {districts.length === 0 && <p className="px-3 py-4 text-sm text-gray-400 text-center">Пусто</p>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Building className="w-4 h-4" /> Жилые комплексы ({complexes.length})
            </h3>
            <div className="flex gap-2 mb-3">
              <Input value={newComplex} onChange={e => setNewComplex(e.target.value)} placeholder="Новый ЖК" className="text-sm" onKeyDown={e => e.key === "Enter" && addComplex()} />
              <Button onClick={addComplex} disabled={!newComplex.trim()} className="bg-blue-600 shrink-0"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border divide-y divide-gray-100">
              {complexes.map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                  <span className="text-sm text-gray-700">{c.name}</span>
                  <button onClick={() => deleteComplex(c.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {complexes.length === 0 && <p className="px-3 py-4 text-sm text-gray-400 text-center">Пусто</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsForm({ currentProfile }: { currentProfile: Profile }) {
  const { refreshProfiles } = useProfile();

  const [firstName, setFirstName] = useState(currentProfile.first_name || "");
  const [lastName, setLastName] = useState(currentProfile.last_name || "");
  const [username, setUsername] = useState(currentProfile.username || "");
  const [phone, setPhone] = useState(currentProfile.phone || "");
  const [email, setEmail] = useState(
    currentProfile.email && !currentProfile.email.toLowerCase().endsWith("@crm.local")
      ? currentProfile.email
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    ALL_NOTIFICATION_KEYS.forEach(k => { base[k] = false; });
    return { ...base, ...(currentProfile.notification_settings || {}) };
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState("");
  const [notifSuccess, setNotifSuccess] = useState(false);

  const isAdmin = currentProfile.role === "admin";

  const notifAllOn = ALL_NOTIFICATION_KEYS.every(k => notifSettings[k]);
  const toggleNotifAll = (v: boolean) => {
    setNotifSettings(prev => {
      const next = { ...prev };
      ALL_NOTIFICATION_KEYS.forEach(k => { next[k] = v; });
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);
    const result = await updateMyProfile({
      profileId: currentProfile.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      username: username.trim(),
      phone,
      email: email.trim(),
    });
    setSaving(false);
    if (result?.success) {
      setSuccess(true);
      refreshProfiles();
    } else {
      setError(result?.error || "Не удалось сохранить");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (newPassword.length < 6) {
      setPwdError("Пароль должен быть не короче 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Пароли не совпадают");
      return;
    }
    setPwdSaving(true);
    const result = await changeMyPassword(newPassword);
    setPwdSaving(false);
    if (result?.success) {
      setPwdSuccess("Пароль изменён");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPwdError(result?.error || "Не удалось изменить пароль");
    }
  };

  const handleNotifSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifError("");
    setNotifSuccess(false);
    setNotifSaving(true);
    const result = await updateNotificationSettings(currentProfile.id, notifSettings);
    setNotifSaving(false);
    if (result?.success) {
      setNotifSuccess(true);
      refreshProfiles();
    } else {
      setNotifError(result?.error || "Не удалось сохранить настройки");
    }
  };

  const typedName = (firstName.trim() + " " + lastName.trim()).trim();
  const initials = profileInitials(typedName || profileName(currentProfile));

  return (
    <div className="max-w-[90rem]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Настройки профиля</h1>
        <p className="text-sm text-gray-500 mt-1">Ваши контактные данные в системе</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 p-6 border-b bg-gray-50/50">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-lg font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {typedName || profileName(currentProfile) || "Без имени"}
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              {currentProfile?.role === "admin" ? "Администратор" : "Сотрудник"}
              {currentProfile?.role === "admin" && <Shield className="w-3.5 h-3.5 text-yellow-500" />}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Профиль обновлён
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Логин</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  readOnly={!isAdmin}
                  className={"pl-9 text-sm " + (isAdmin ? "" : "bg-gray-50 text-gray-500")}
                />
                {!isAdmin && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {isAdmin ? "Вы администратор — логин можно изменить" : "Логин может изменить только администратор"}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Имя</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Имя" className="pl-9 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Фамилия</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Фамилия" className="pl-9 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Телефон</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <PhoneInput value={phone} onChange={setPhone} className="pl-9" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9 text-sm" />
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Имя и фамилия будут автоматически подставляться в поле «Брокер» при добавлении клиента.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="submit" disabled={saving} className="bg-blue-600 px-8">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
            </Button>
          </div>
        </form>
      </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-full">
          <div className="p-6 border-b bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Уведомления</h2>
            </div>
          <p className="text-sm text-gray-500 mt-1">Получайте оповещения о действиях других сотрудников</p>
        </div>
        <form onSubmit={handleNotifSubmit} className="p-6 space-y-4">
          {notifSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Настройки уведомлений сохранены
            </div>
          )}
          {notifError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {notifError}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Все изменения</p>
              <p className="text-xs text-gray-400">Добавление, изменение и удаление клиентов, сделок и задач</p>
            </div>
            <Toggle checked={notifAllOn} onChange={toggleNotifAll} label="Все изменения" />
          </div>

          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
            {NOTIFICATION_ENTITIES.map(entity => (
              <div key={entity.key} className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 px-4 py-3">
                <p className="text-sm font-medium text-gray-700 sm:col-span-1">{entity.label}</p>
                <div className="sm:col-span-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                  {NOTIFICATION_ACTIONS.map(action => {
                    const k = `${entity.key}_${action.suffix}`;
                    return (
                      <label key={k} className="flex items-center gap-2 cursor-pointer">
                        <Toggle
                          checked={!!notifSettings[k]}
                          onChange={v => setNotifSettings(prev => ({ ...prev, [k]: v }))}
                          label={`${entity.label} — ${action.label}`}
                        />
                        <span className="text-sm text-gray-600">{action.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="submit" disabled={notifSaving} className="bg-blue-600 px-8">
              {notifSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
            </Button>
          </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b bg-gray-50/50">
          <h2 className="font-semibold text-gray-900">Смена пароля</h2>
          <p className="text-sm text-gray-500 mt-1">Обновление пароля для входа в систему</p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
          {pwdSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {pwdSuccess}
            </div>
          )}
          {pwdError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {pwdError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Новый пароль</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Минимум 6 символов" className="pl-9 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Повторите пароль</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Повторите пароль" className="pl-9 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="submit" disabled={pwdSaving} className="bg-blue-600 px-8">
              {pwdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сменить пароль"}
            </Button>
          </div>
        </form>
      </div>

      {isAdmin && <ReferenceBooks />}
    </div>
  );
}

export default function SettingsPage() {
  const { currentProfile, loading } = useProfile();

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <div className="w-56 h-7 bg-gray-200 rounded animate-pulse" />
          <div className="w-72 h-4 bg-gray-100 rounded mt-2 animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 p-6 border-b bg-gray-50/50">
            <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="w-40 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-24 h-3 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="max-w-2xl bg-white rounded-xl border shadow-sm p-10 text-center text-gray-500">
        Не удалось загрузить профиль. Обновите страницу.
      </div>
    );
  }

  return <SettingsForm key={currentProfile.id} currentProfile={currentProfile} />;
}
