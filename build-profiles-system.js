const fs = require('fs');
function w(file, content) { fs.writeFileSync(file, content, 'utf-8'); console.log('OK:', file); }

// ===== 1. API /api/profiles =====
const profilesDir = 'app/api/profiles';
if (!fs.existsSync(profilesDir)) fs.mkdirSync(profilesDir, { recursive: true });

w(profilesDir + '/route.ts', `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase.from("profiles").insert({
    full_name: body.full_name || "",
    role: body.role || "user",
    pin: body.pin || "",
    phone: body.phone || "",
    email: body.email || "",
    avatar_color: body.avatar_color || "blue",
    is_active: body.is_active ?? true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
`);

// ===== 2. API /api/profiles/[id] =====
const profilesIdDir = profilesDir + '/[id]';
if (!fs.existsSync(profilesIdDir)) fs.mkdirSync(profilesIdDir, { recursive: true });

w(profilesIdDir + '/route.ts', `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();
  const { data, error } = await supabase.from("profiles").update({
    full_name: body.full_name,
    role: body.role,
    pin: body.pin,
    phone: body.phone,
    email: body.email,
    avatar_color: body.avatar_color,
    is_active: body.is_active,
  }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
`);

// ===== 3. React Context для профилей =====
w('lib/profile-context.tsx', `"use client";
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
        // Если текущего нет — берём первого
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
`);

console.log('Profiles system: API + Context created');
