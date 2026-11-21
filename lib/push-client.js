// ฝั่งเบราว์เซอร์: สมัครรับแจ้งเตือนเข้ามือถือ (Web Push) สำหรับประกาศของเรา
import { supabase } from "./supabase";

// กุญแจสาธารณะ VAPID (เปิดเผยได้) คู่กับ VAPID_PRIVATE_KEY ที่เก็บไว้ใน Vercel
export const VAPID_PUBLIC_KEY = "BIYZrYA95MU_KCNfEaxhXLSn0v8NlrTwCdWGN2aE2ScwgMuEYtpl7y489D1_yh1vCgAkO-XlIswRThvrZs4vhJU";
const DONE_KEY = "tamha-push-posts";

export const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
export const pushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function b64uToBytes(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function donePosts() {
  try { return JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch { return []; }
}
function markDone(postId) {
  try { localStorage.setItem(DONE_KEY, JSON.stringify([...new Set([postId, ...donePosts()])].slice(0, 50))); } catch {}
}

// เครื่องนี้รับแจ้งเตือนของประกาศนี้อยู่แล้วหรือยัง
export async function pushStatus(postId) {
  if (!pushSupported()) return isIos() && !isStandalone() ? "ios" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = reg && (await reg.pushManager.getSubscription());
  return sub && Notification.permission === "granted" && donePosts().includes(postId) ? "on" : "off";
}

// ต้องเรียกจากการกดปุ่มเท่านั้น (เบราว์เซอร์บังคับ)
export async function enablePush(postId, token) {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(VAPID_PUBLIC_KEY) });
  const j = sub.toJSON();
  const { data, error } = await supabase.rpc("subscribe_push", {
    p_post_id: postId, p_token: token, p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
  });
  if (error || !data) throw new Error(error?.message || "subscribe_failed");
  markDone(postId);
  return "on";
}
