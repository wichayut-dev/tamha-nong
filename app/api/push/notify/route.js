// ฐานข้อมูล (Supabase) เรียกที่นี่ทุกครั้งที่มีคนกด "ฉันเห็นตัวนี้" แล้วเราส่งแจ้งเตือนไปที่มือถือคนลงประกาศ
import crypto from "node:crypto";
import { sendPush } from "@/lib/push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameSecret(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function POST(req) {
  const secret = process.env.PUSH_SECRET;
  if (!secret || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY) {
    return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  if (!sameSecret(req.headers.get("x-push-secret") || "", secret)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }

  const url = typeof b.url === "string" && /^\/p\/[0-9a-f-]{36}$/.test(b.url) ? b.url : "/";
  const payload = JSON.stringify({
    title: String(b.title || "ตามหาน้อง ภูเก็ต").slice(0, 80),
    body: String(b.body || "").slice(0, 160),
    url,
    tag: url,
  });
  const subs = (Array.isArray(b.subs) ? b.subs : []).slice(0, 20)
    .filter((s) => s && typeof s.endpoint === "string" && typeof s.p256dh === "string" && typeof s.auth === "string");

  const results = await Promise.allSettled(subs.map((s) => sendPush(s, payload)));
  const out = results.map((r) => (r.status === "fulfilled" ? r.value.status : -1));
  console.log("[push] sent", out.join(","));
  return Response.json({ ok: true, sent: out.filter((s) => s >= 200 && s < 300).length, statuses: out });
}
