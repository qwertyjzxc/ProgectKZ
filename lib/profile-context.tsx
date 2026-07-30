"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Profile {
  id: number;
  full_name: string;
  role: string;
  pin: string;
  phone: string;
  email: string;
  avatar_color: string;
  is_active: boolean;
}

interface ProfileContextType {
  currentProfile: Profile | null;
  profiles: Profile[];
  setCurrentProfile: (p: Profile) => void;
  refreshProfiles: () => void;
}

const ProfileContext = createContext<ProfileContextType>({
  currentProfile: null,
  profiles: [],
  setCurrentProfile: () => {},
  refreshProfiles: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProfiles(data);
        if (!currentProfile && data.length > 0) {
          setCurrentProfile(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch profiles", err);
    }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const refreshProfiles = () => fetchProfiles();

  return (
    <ProfileContext.Provider value={{ currentProfile, profiles, setCurrentProfile, refreshProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
