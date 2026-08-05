"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PhoneInput from "@/components/PhoneInput";
import { useProfile, profileName, profileInitials, type Profile } from "@/lib/profile-context";
import { updateMyProfile, changeMyPassword } from "./actions";
import { CheckCircle2, Loader2, Shield, UserRound, Phone, Mail, AtSign, Lock, KeyRound } from "lucide-react";

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

  const isAdmin = currentProfile.role === "admin";

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

  const typedName = (firstName.trim() + " " + lastName.trim()).trim();
  const initials = profileInitials(typedName || profileName(currentProfile));

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Настройки профиля</h1>
        <p className="text-sm text-gray-500 mt-1">Ваши контактные данные в системе</p>
      </div>

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
