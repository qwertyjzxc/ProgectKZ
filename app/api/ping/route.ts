import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";

// Keep-warm для serverless и пула Supabase: дёргается кроном,
// чтобы горячие ручки не уходили в cold start на медленном трафике CRM.
export async function GET() {
  try {
    await serviceClient.from("profiles").select("id", { count: "exact", head: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "ping failed" }, { status: 500 });
  }
}
