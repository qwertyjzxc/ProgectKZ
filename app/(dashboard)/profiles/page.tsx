"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/lib/profile-context";
import { useRouter } from "next/navigation";
import { adminCreateUser, adminDeleteUser, getAllProfiles } from "./actions";
import { UserPlus, Trash2, Edit3, Shield, User, X, Check, Loader2, ArrowLeft } from "lucide-react";

interface Profile {
  id: number;
  user_id: string;
  full_name: string;
  role: string;
  pin: string;
  phone: string;
  email: string;
  avatar_color: string;
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

function CreateUserModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    });

    setLoading(false);
    if (result.success) {
      onSave(result);
    } else {
      setError(result.error || "Ошибка");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Новый пользователь</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div><label className="text-xs text-gray-500 mb-1 block">Имя пользователя</label><Input value={username} onChange={e => setUsername(e.target.value)} placeholder="ivan" required className="text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Пароль</label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required className="text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Роль</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full h-9 rounded-lg border px-3 text-sm">
              <option value="user">Сотрудник</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
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

export default function ProfilesPage() {
  const { currentProfile, refreshProfiles } = useProfile();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [createError, setCreateError] = useState("");

  const fetchProfiles = async () => {
    setLoading(true);
    const data = await getAllProfiles();
    setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    if (currentProfile?.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    fetchProfiles();
  }, [currentProfile?.role]);

  const handleAdd = async (data: any) => {
    const result = await adminCreateUser(data);
    if (result.error) {
      setCreateError(result.error);
    } else {
      setShowAdd(false);
      setCreateError("");
      fetchProfiles();
      refreshProfiles();
    }
  };

  const handleEdit = async (data: any) => {
    if (!editProfile) return;
    const res = await fetch("/api/profiles/" + editProfile.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
      setEditProfile(null);
      fetchProfiles();
      refreshProfiles();
    }
  };

  const handleDelete = async (profile: Profile) => {
    if (!confirm(`Удалить пользователя ${profile.full_name || profile.email}? Это удалит его из auth.users.`)) return;
    const result = await adminDeleteUser(profile.user_id);
    if (result.success) {
      fetchProfiles();
      refreshProfiles();
    } else {
      alert(result.error);
    }
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
          {profiles.map(p => {
            const initials = p.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            const avatarClass = colorMap[p.avatar_color] || colorMap.blue;
            return (
              <div key={p.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={"w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold " + avatarClass}>{initials}</div>
                    <div>
                      <p className="font-semibold text-gray-900">{p.full_name}</p>
                      <p className="text-xs text-gray-500">{p.role === "admin" ? "Администратор" : "Сотрудник"}</p>
                    </div>
                  </div>
                  {p.role === "admin" && <Shield className="w-5 h-5 text-yellow-500" />}
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  {p.phone && <p>📱 {p.phone}</p>}
                  {p.email && <p>✉️ {p.email}</p>}
                  <p>🔑 PIN: {p.pin || "—"}</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditProfile(p)}>
                    <Edit3 className="w-3.5 h-3.5 mr-1" />Редактировать
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(p)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{createError}</div>}
      {showAdd && <CreateUserModal onClose={() => { setShowAdd(false); setCreateError(""); }} onSave={handleAdd} />}
      {editProfile && <ProfileFormModal profile={editProfile} onClose={() => setEditProfile(null)} onSave={handleEdit} />}
    </div>
  );
}
