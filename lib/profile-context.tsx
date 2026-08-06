"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getProfileData } from "./profile-actions";

export interface Profile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  pin: string;
  phone: string;
  email: string;
  avatar_color: string;
  is_active: boolean;
  is_linked?: boolean;
  notification_settings?: Record<string, boolean>;
}

export function profileName(p?: { first_name?: string; last_name?: string; full_name?: string } | null): string {
  if (!p) return "";
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return full || p.full_name || "";
}

export function profileInitials(name: string): string {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

interface ProfileContextType {
  currentProfile: Profile | null;
  profiles: Profile[];
  allProfiles: Profile[];
  setCurrentProfile: (p: Profile | null) => void;
  refreshProfiles: () => Promise<Profile[]>;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType>({
  currentProfile: null,
  profiles: [],
  allProfiles: [],
  setCurrentProfile: () => {},
  refreshProfiles: async () => [],
  loading: true,
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback((): Promise<Profile[]> => {
    return getProfileData()
      .then(({ profiles, allProfiles, currentProfile }) => {
        setProfiles(profiles);
        setAllProfiles(allProfiles);
        setCurrentProfile(prev => {
          if (prev && profiles.some(p => p.id === prev.id)) return prev;
          return currentProfile;
        });
        return profiles;
      })
      .catch(err => {
        console.error("Failed to fetch profiles", err);
        return [];
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const refreshProfiles = () => fetchProfiles();

  return (
    <ProfileContext.Provider value={{ currentProfile, profiles, allProfiles, setCurrentProfile, refreshProfiles, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
