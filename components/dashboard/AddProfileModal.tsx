"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2, UserPlus, Shield } from "lucide-react";
import { listProfilesForAttach, attachProfile, attachProfileByCredentials } from "@/lib/profile-actions";
import { profileName } from "@/lib/profile-context";

interface AttachTarget {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  avatar_color: string;
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

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export default function AddProfileModal({
  isAdmin,
  onClose,
  onAttached,
}: {
  isAdmin: boolean;
  onClose: () => void;
  onAttached: (profileId: number) => void | Promise<void>;
}) {
  const [targets, setTargets] = useState<AttachTarget[]>([]);
  const [loadingList, setLoadingList] = useState(isAdmin);
  const [listError, setListError] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attachingId, setAttachingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    listProfilesForAttach()
      .then(res => {
        if (Array.isArray(res)) {
          setTargets(res);
        } else {
          setListError((res as { error?: string }).error || "Не удалось загрузить список");
        }
      })
      .finally(() => setLoadingList(false));
  }, [isAdmin]);

  const handleAttach = async (profileId: number) => {
    setAttachingId(profileId);
    setError("");
    const result = await attachProfile(profileId);
    setAttachingId(null);
    if (result?.success) {
      onAttached(profileId);
    } else {
      setError(result?.error || "Не удалось добавить профиль");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await attachProfileByCredentials(username, password);
    setSubmitting(false);
    if (result?.success) {
      onAttached(result.profileId || 0);
    } else {
      setError(result?.error || "Не удалось добавить профиль");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Добавить профиль</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {isAdmin ? (
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-3">
              Выберите профиль из списка. Он будет привязан к вашему аккаунту и появится в меню у аватара.
            </p>
            {listError && <p className="text-red-500 text-sm mb-3">{listError}</p>}
            {loadingList && (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            )}
            {!loadingList && targets.length === 0 && !listError && (
              <p className="text-sm text-gray-400 text-center py-6">Все профили уже добавлены</p>
            )}
            <div className="max-h-72 overflow-y-auto space-y-1">
              {targets.map(p => (
                <button
                  key={p.id}
                  disabled={attachingId !== null}
                  onClick={() => handleAttach(p.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 text-left disabled:opacity-60"
                >
                  <div className={"w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 " + (colorMap[p.avatar_color] || colorMap.blue)}>
                    {initials(profileName(p) || p.username)}
                  </div>
                  <span className="font-medium truncate">{profileName(p) || p.username}</span>
                  {p.role === "admin" && <Shield className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                  {attachingId === p.id
                    ? <Loader2 className="w-4 h-4 animate-spin text-blue-500 ml-auto shrink-0" />
                    : <UserPlus className="w-4 h-4 text-blue-500 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <p className="text-sm text-gray-500">Введите логин и пароль профиля, который хотите добавить.</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Логин</label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="ivan" required className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Пароль</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required className="text-sm" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" type="button" onClick={onClose} size="sm">Отмена</Button>
              <Button type="submit" disabled={submitting} size="sm" className="bg-blue-600">
                {submitting ? "Добавление..." : "Добавить"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
