// สร้างรูปตัวอย่างและข้อความตอนแชร์ลิงก์ประกาศ (LINE / Facebook / X)
import { AREAS, STATUS } from "@/lib/data";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SPECIES = { dog: "สุนัข", cat: "แมว", other: "สัตว์เลี้ยง" };

async function fetchPost(id) {
  if (!URL_ || !KEY || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/posts?id=eq.${id}&select=name,status,species,species_other,area,description,photo_url,reward`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    return (await r.json())[0] ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = await fetchPost(id);
  if (!p) return { title: "ประกาศ" };
  const kind = p.species === "other" ? (p.species_other || "สัตว์เลี้ยง") : SPECIES[p.species];
  const name = p.name || kind;
  const area = AREAS[p.area]?.n ?? "";
  const head = p.status === "lost" ? `ตามหา${name}` : p.status === "found" ? `พบ${kind}หลง` : `${name} กลับบ้านแล้ว`;
  const title = `${head}, ${area}`;
  const desc = `${STATUS[p.status]}, ${kind}, ${area}${p.reward ? `, รางวัล ${p.reward}` : ""} — ${(p.description || "").slice(0, 140)}`;
  const img = p.photo_url && /^https:\/\//.test(p.photo_url) ? p.photo_url : p.photo_url?.startsWith("/samples/") ? p.photo_url : "/icons/icon-512.png";
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, type: "article", siteName: "ตามหาน้อง ภูเก็ต", locale: "th_TH", images: [{ url: img, alt: name }] },
    twitter: { card: "summary_large_image", title, description: desc, images: [img] },
  };
}

export default function PostLayout({ children }) {
  return children;
}
