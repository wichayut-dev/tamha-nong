import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);
export const supabase = isConfigured ? createClient(url, key) : null;

// แปลง error จาก Supabase ให้อ่านง่ายขึ้น
function fail(error, what) {
  console.error(`[tamha-nong] ${what}:`, error);
  const msg = error?.message || String(error);
  if (/rate_limited/i.test(msg)) throw new Error("ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
  if (/photo_url_safe|area_valid|fur_valid|line_valid|check constraint/i.test(msg)) throw new Error("ข้อมูลบางช่องไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่ (LINE ID ใช้ได้เฉพาะ a-z 0-9 . _ -)");
  if (/post not found/i.test(msg)) throw new Error("ไม่พบประกาศนี้แล้ว");
  if (/Failed to fetch|NetworkError/i.test(msg)) throw new Error("เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง");
  if (/column .*(lat|lng).* sightings|sightings.*(lat|lng)/i.test(msg)) throw new Error("ฐานข้อมูลยังไม่อัปเดต: รันไฟล์ supabase/005_sighting_pins.sql ก่อน");
  if (/create_post|function .* does not exist|species_other|happened_at|seen_at/i.test(msg)) throw new Error("ฐานข้อมูลยังไม่อัปเดต: รันไฟล์ supabase/UPDATE_ALL.sql ใน Supabase ก่อน");
  if (/row-level security|permission denied/i.test(msg)) throw new Error("ไม่มีสิทธิ์ทำรายการนี้");
  if (/mime type|Payload too large|exceeded the maximum/i.test(msg)) throw new Error("รูปใหญ่เกินไปหรือไม่ใช่ไฟล์รูป");
  throw new Error(msg);
}

// ---------- สำหรับทุกคน ----------
export const EXPIRE_DAYS = 60; // ประกาศเก่ากว่านี้ไม่แสดงในหน้าเว็บ (admin ยังเห็น)
export async function listPosts() {
  const cutoff = new Date(Date.now() - EXPIRE_DAYS * 864e5).toISOString();
  const { data, error } = await supabase
    .from("posts")
    .select("*, sightings(count)")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) fail(error, "listPosts");
  return data;
}

export async function getPost(id) {
  const { data, error } = await supabase.from("posts").select("*, sightings(*)").eq("id", id).maybeSingle();
  if (error) fail(error, "getPost");
  if (data?.sightings) data.sightings.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return data;
}

export function subscribePosts(onChange) {
  let t;
  const fire = () => { clearTimeout(t); t = setTimeout(onChange, 300); };
  const ch = supabase
    .channel("live-" + Math.random().toString(36).slice(2))
    .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, fire)
    .on("postgres_changes", { event: "*", schema: "public", table: "sightings" }, fire)
    .subscribe();
  return () => { clearTimeout(t); supabase.removeChannel(ch); };
}

export async function uploadPhoto(blob) {
  const type = ["image/png", "image/webp"].includes(blob.type) ? blob.type : "image/jpeg";
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
  const path = `${new Date().toISOString().slice(0, 10)}/${id}.${ext}`;
  const { error } = await supabase.storage.from("pet-photos").upload(path, blob, { contentType: type });
  if (error) fail(error, "uploadPhoto");
  return supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;
}

export async function createPost(p) {
  const args = {
    p_status: p.status, p_species: p.species, p_name: p.name, p_fur: p.fur, p_area: p.area,
    p_lat: p.lat, p_lng: p.lng, p_description: p.description, p_phone: p.phone,
    p_reward: p.reward, p_photo_url: p.photo_url, p_contact_name: p.contact_name, p_line_id: p.line_id, p_species_other: p.species_other ?? "", p_happened_at: p.happened_at ?? null,
  };
  // ส่งรูปสถานที่เฉพาะตอนมีรูป เพื่อให้ฐานข้อมูลเวอร์ชันเก่ายังลงประกาศได้
  if (p.place_photo_url) args.p_place_photo_url = p.place_photo_url;
  const { data, error } = await supabase.rpc("create_post", args);
  if (error) fail(error, "createPost");
  if (!data?.[0]?.id) throw new Error("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
  return data[0]; // { id, edit_token }
}

export async function addSighting(postId, area, note, photo_url, loc, seen_at) {
  const row = { post_id: postId, area, note: note || null, photo_url: photo_url || null };
  if (seen_at) row.seen_at = seen_at;
  if (loc) { row.lat = loc.lat; row.lng = loc.lng; }
  const { error } = await supabase.from("sightings").insert(row);
  if (error) fail(error, "addSighting");
}

export async function reportPost(postId, reason) {
  const { error } = await supabase.from("reports").insert({ post_id: postId, reason });
  if (error) fail(error, "reportPost");
}

export async function markHome(id, token) {
  const { data, error } = await supabase.rpc("mark_home", { p_id: id, p_token: token });
  if (error) fail(error, "markHome");
  return data;
}

export async function deletePost(id, token) {
  const { data, error } = await supabase.rpc("delete_post", { p_id: id, p_token: token });
  if (error) fail(error, "deletePost");
  return data;
}

// ---------- สำหรับ admin ----------
export async function adminListPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("*, sightings(*), reports(*)")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) fail(error, "adminListPosts");
  return data;
}

export async function adminUpdatePost(id, patch) {
  const { data, error } = await supabase.from("posts").update(patch).eq("id", id).select("id");
  if (error) fail(error, "adminUpdatePost");
  if (!data?.length) throw new Error("ไม่มีสิทธิ์แก้ไข (บัญชีนี้ยังไม่ใช่ admin)");
}

export async function adminDeletePost(id) {
  const { data, error } = await supabase.from("posts").delete().eq("id", id).select("id");
  if (error) fail(error, "adminDeletePost");
  if (!data?.length) throw new Error("ไม่มีสิทธิ์ลบ");
}

export async function adminDeleteSighting(id) {
  const { data, error } = await supabase.from("sightings").delete().eq("id", id).select("id");
  if (error) fail(error, "adminDeleteSighting");
  if (!data?.length) throw new Error("ไม่มีสิทธิ์ลบ");
}

export async function adminDeleteReport(id) {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) fail(error, "adminDeleteReport");
}
