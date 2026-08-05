import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;
    const clientTable = searchParams.get("client_table");
    const clientId = searchParams.get("client_id");

    let query = supabase.from("client_activity").select("*");

    if (clientTable && clientId) {
      query = query.eq("client_table", clientTable).eq("client_id", Number(clientId));
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}
