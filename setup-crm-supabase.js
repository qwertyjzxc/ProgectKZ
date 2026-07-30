const fs = require('fs');

// ===== SQL MIGRATION =====
const sql = `-- Выполнить в SQL Editor Supabase
-- Таблица клиентов
CREATE TABLE IF NOT EXISTS clients (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT DEFAULT 'Активен',
  deals_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица задач
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL DEFAULT '',
  client TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  priority TEXT DEFAULT 'Средний',
  status TEXT DEFAULT 'В работе',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица сделок
CREATE TABLE IF NOT EXISTS deals (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL DEFAULT '',
  client TEXT DEFAULT '',
  amount BIGINT DEFAULT 0,
  stage TEXT DEFAULT 'Первичный контакт',
  date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all deals" ON deals FOR ALL USING (true) WITH CHECK (true);
`;

fs.writeFileSync('supabase-schema.sql', sql, 'utf-8');
console.log('SQL schema saved');

// ===== API: /api/tasks =====
const tasksDir = 'app/api/tasks';
if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });

fs.writeFileSync(tasksDir + '/route.ts', `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase.from("tasks").insert({
    title: body.title,
    client: body.client,
    due_date: body.dueDate || body.due_date || "",
    priority: body.priority,
    status: body.status || "В работе",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
`);

// ===== API: /api/tasks/[id] =====
const tasksIdDir = tasksDir + '/[id]';
if (!fs.existsSync(tasksIdDir)) fs.mkdirSync(tasksIdDir, { recursive: true });

fs.writeFileSync(tasksIdDir + '/route.ts', `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();
  const { data, error } = await supabase.from("tasks").update({
    title: body.title,
    client: body.client,
    due_date: body.dueDate || body.due_date,
    priority: body.priority,
    status: body.status,
  }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
`);

// ===== API: /api/deals =====
const dealsDir = 'app/api/deals';
if (!fs.existsSync(dealsDir)) fs.mkdirSync(dealsDir, { recursive: true });

fs.writeFileSync(dealsDir + '/route.ts', `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase.from("deals").insert({
    name: body.name,
    client: body.client,
    amount: body.amount,
    stage: body.stage || "Первичный контакт",
    date: body.date || new Date().toLocaleDateString("ru-RU"),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
`);

// ===== API: /api/deals/[id] =====
const dealsIdDir = dealsDir + '/[id]';
if (!fs.existsSync(dealsIdDir)) fs.mkdirSync(dealsIdDir, { recursive: true });

fs.writeFileSync(dealsIdDir + '/route.ts', `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();
  const { data, error } = await supabase.from("deals").update({
    name: body.name,
    client: body.client,
    amount: body.amount,
    stage: body.stage,
    date: body.date,
  }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
`);

// ===== Update PATCH for clients [id] =====
const clientsIdDir = 'app/api/clients/[id]';
fs.writeFileSync(clientsIdDir + '/route.ts', `import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();
  const { data, error } = await supabase.from("clients").update({
    name: body.name,
    phone: body.phone,
    email: body.email,
    status: body.status,
  }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
`);

console.log('API routes created for clients, tasks, deals (CRUD)');
console.log('Next: run this script, then execute supabase-schema.sql in Supabase SQL Editor');
