"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile, profileName, profileInitials } from "@/lib/profile-context";
import { useRouter } from "next/navigation";
import { adminCreateUser, adminDeleteUser, adminUpdateProfile, getAllProfiles, getProfilePassword } from "./actions";
import { UserPlus, Trash2, Edit3, Shield, X, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";

interface Profile {
  id: number;
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  pin: string;
  phone: string;
  email: string;
  avatar_color: string;
  has_password: boolean;
  is_active: boolean;
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
  red: "bg-red-100 text-red-600",
  orange: "bg-orange-100 text-orange-600",
  teal: "bg-teal-100 text-teal-600",
  pink: "bg-pink-100 text-pink-600",
};

type ProfileFormData = { first_name: string; last_name: string; username: string; password: string; role: string };

function CreateUserModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await adminCreateUser({
      username,
      password,
      role,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
    });

    setLoading(false);
    if (result.success) {
      onSave();
    } else {
      setError(result.error || "Ошибка");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Новый пользователь</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div><label className="text-xs text-gray-500 mb-1 block">Логин *</label><Input value={username} onChange={e => setUsername(e.target.value)} placeholder="ivan" required className="text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Пароль *</label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required className="text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Имя</label><Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Иван" className="text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Фамилия</label><Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Иванов" className="text-sm" /></div>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Email</label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ivan@example.com" className="text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Роль</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
              <option value="user">Сотрудник</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <p className="text-[11px] text-gray-400">Обязательны только логин и пароль.</p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
            <Button type="submit" disabled={loading} size="sm" className="bg-blue-600">{loading ? "Создание..." : "Создать"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProfileFormModal({ profile, onClose, onSave }: { profile: Profile; onClose: () => void; onSave: (data: ProfileFormData) => Promise<{ success: boolean; error?: string }> }) {
  const legacyParts = (profile.full_name || "").split(" ").filter(Boolean);
  const [firstName, setFirstName] = useState(profile.first_name || legacyParts[0] || "");
  const [lastName, setLastName] = useState(profile.last_name || legacyParts.slice(1).join(" ") || "");
  const [username, setUsername] = useState(profile.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(profile.role || "user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await onSave({ first_name: firstName.trim(), last_name: lastName.trim(), username: username.trim(), password, role });
      if (!result?.success) {
        setError(result?.error || "Ошибка сохранения");
      }
    } catch (err) {
      console.error(err);
      setError("Не удалось сохранить: " + (err instanceof Error ? err.message : "неизвестная ошибка"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Редактировать профиль</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Новый пароль</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Оставьте пустым, чтобы не менять" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="user">Сотрудник</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteProfileModal({ profile, onClose, onDeleted }: { profile: Profile; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const name = profileName(profile) || profile.username || profile.email || "пользователь";

  const handleDelete = async () => {
    setError("");
    setDeleting(true);
    try {
      const result = await adminDeleteUser(profile.user_id);
      if (result?.success) {
        onDeleted();
      } else {
        setError(result?.error || "Не удалось удалить пользователя");
      }
    } catch (err) {
      console.error(err);
      setError("Не удалось удалить: " + (err instanceof Error ? err.message : "неизвестная ошибка"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Удалить пользователя</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="flex items-start gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-800">
              Удалить пользователя <span className="font-semibold">{name}</span>?
            </p>
            <p className="text-xs text-gray-500 mt-1">Профиль будет удалён из системы, и сотрудник больше не сможет войти.</p>
          </div>
        </div>
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={deleting}>Отмена</Button>
          <Button type="button" className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Удалить"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ profile, onEdit, onDelete }: { profile: Profile; onEdit: () => void; onDelete: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loadingPass, setLoadingPass] = useState(false);
  const initials = profileInitials(profileName(profile) || profile.username);
  const avatarClass = colorMap[profile.avatar_color] || colorMap.blue;

  const togglePassword = async () => {
    if (showPassword) {
      setShowPassword(false);
      return;
    }
    if (!password) {
      setLoadingPass(true);
      const res = await getProfilePassword(profile.id);
      setLoadingPass(false);
      if (res.password !== undefined) {
        setPassword(res.password);
      }
    }
    setShowPassword(true);
  };

  return (
    <div className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={"w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold " + avatarClass}>{initials}</div>
          <div>
            <p className="font-semibold text-gray-900">{profileName(profile) || profile.username}</p>
            <p className="text-xs text-gray-500">{profile.role === "admin" ? "Администратор" : "Сотрудник"}</p>
          </div>
        </div>
        {profile.role === "admin" && <Shield className="w-5 h-5 text-yellow-500" />}
      </div>

      <div className="space-y-1 text-sm text-gray-600 mb-4">
        {profile.username && <p>🔑 Логин: {profile.username}</p>}
        {profile.phone && <p>📱 {profile.phone}</p>}
        {profile.has_password && (
          <p className="flex items-center gap-1.5">
            🔒 Пароль:{" "}
            <span className="font-mono">{showPassword ? password : "••••••"}</span>
            <button
              type="button"
              onClick={togglePassword}
              className="text-gray-400 hover:text-gray-600 ml-auto"
              title={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {loadingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
          <Edit3 className="w-3.5 h-3.5 mr-1" />Редактировать
        </Button>
        <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function ProfilesPage() {
  const { currentProfile, refreshProfiles } = useProfile();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<Profile | null>(null);
  const [createError, setCreateError] = useState("");

  const fetchProfiles = useCallback(() => {
    getAllProfiles()
      .then(data => setProfiles(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!currentProfile) return;
    if (currentProfile.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    fetchProfiles();
  }, [currentProfile, fetchProfiles, router]);

  const handleAdd = async () => {
    setShowAdd(false);
    setCreateError("");
    fetchProfiles();
    refreshProfiles();
  };

  const handleEdit = async (data: ProfileFormData): Promise<{ success: boolean; error?: string }> => {
    if (!editProfile) return { success: false, error: "Нет выбранного профиля" };
    try {
      const result = await adminUpdateProfile(editProfile.id, data);
      if (result.success) {
        setEditProfile(null);
        fetchProfiles();
        refreshProfiles();
      }
      return { success: result.success === true, error: result.error };
    } catch (err) {
      console.error(err);
      return { success: false, error: err instanceof Error ? err.message : "Ошибка сохранения" };
    }
  };

  const handleDeleted = () => {
    setDeleteProfile(null);
    fetchProfiles();
    refreshProfiles();
  };

  if (currentProfile?.role !== "admin") {
    return <div className="p-12 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /><p className="mt-2">Доступ запрещён</p></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Управление профилями</h1>
            <p className="text-sm text-gray-500 mt-1">Создание и редактирование профилей сотрудников</p>
          </div>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}>
          <UserPlus className="w-4 h-4" />Создать пользователя
        </Button>
      </div>

      {loading && <div className="bg-white rounded-xl shadow-sm border p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(p => (
            <ProfileCard
              key={p.id}
              profile={p}
              onEdit={() => setEditProfile(p)}
              onDelete={() => setDeleteProfile(p)}
            />
          ))}
        </div>
      )}

      {createError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{createError}</div>}
      {showAdd && <CreateUserModal onClose={() => { setShowAdd(false); setCreateError(""); }} onSave={handleAdd} />}
      {editProfile && <ProfileFormModal profile={editProfile} onClose={() => setEditProfile(null)} onSave={handleEdit} />}
      {deleteProfile && <DeleteProfileModal profile={deleteProfile} onClose={() => setDeleteProfile(null)} onDeleted={handleDeleted} />}
    </div>
  );
}
