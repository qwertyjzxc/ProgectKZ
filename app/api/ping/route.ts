import { NextRequest, NextResponse } from "next/server";
import { isCronRequest, requireUser } from "@/lib/route-auth";
import { serviceClient } from "@/lib/supabase/service";

// Keep-warm для serverless и пула Supabase: дёргается кроном или
// мониторингом (UptimeRobot) по ключу ?key=CRON_SECRET,
// чтобы горячие ручки не уходили в cold start на медленном трафике CRM.
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    const key = request.nextUrl.searchParams.get("key");
    const secret = process.env.CRON_SECRET;
    if (!secret || key !== secret) {
      const { denied } = await requireUser();
      if (denied) return denied;
    }
  }
  try {
    await serviceClient.from("profiles").select("id", { count: "exact", head: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "ping failed" }, { status: 500 });
  }
}
