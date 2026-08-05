import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

    const { data: profs } = await serviceClient.from("profiles").select("role").eq("user_id", user.id);
    const isAdmin = (profs || []).some(p => p.role === "admin");
    if (!isAdmin) return NextResponse.json({ error: "Доступ только для администратора" }, { status: 403 });

    const { error } = await serviceClient.from("client_activity").delete().eq("id", Number(id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 });
  }
}
