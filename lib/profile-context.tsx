"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getMyProfiles, getCurrentProfile } from "./profile-actions";

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
      const [profilesData, current] = await Promise.all([
        getMyProfiles(),
        getCurrentProfile(),
      ]);
      if (Array.isArray(profilesData)) {
        setProfiles(profilesData);
      }
      if (current) {
        setCurrentProfile(current);
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
