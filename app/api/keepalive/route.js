// ยิงฐานข้อมูลเบา ๆ วันละครั้ง (Vercel Cron) ไม่ให้โปรเจกต์ Supabase ฟรีถูกพักเมื่อไม่มีคนเข้าเว็บ
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ ok: false }, { status: 200 });
  const supabase = createClient(url, key);
  const { error } = await supabase.from("posts").select("id").limit(1);
  return Response.json({ ok: !error }, { headers: { "Cache-Control": "no-store" } });
}
