import { createClient } from "@/lib/supabaseServer";

export default async function ServerPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select();

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}