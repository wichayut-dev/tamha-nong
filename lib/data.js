// ข้อมูลคงที่ที่ใช้ทั้งแอป

export const AREAS = {
  patong:  { n: "ป่าตอง", lat: 7.896, lng: 98.297 },
  karon:   { n: "กะรน", lat: 7.848, lng: 98.298 },
  kata:    { n: "กะตะ", lat: 7.820, lng: 98.302 },
  rawai:   { n: "ราไวย์", lat: 7.778, lng: 98.326 },
  chalong: { n: "ฉลอง", lat: 7.843, lng: 98.340 },
  wichit:  { n: "วิชิต", lat: 7.862, lng: 98.378 },
  town:    { n: "เมืองภูเก็ต", lat: 7.885, lng: 98.388 },
  rassada: { n: "รัษฎา", lat: 7.905, lng: 98.405 },
  kathu:   { n: "กะทู้", lat: 7.912, lng: 98.333 },
  cherng:  { n: "เชิงทะเล", lat: 7.995, lng: 98.302 },
  thalang: { n: "ถลาง", lat: 8.030, lng: 98.338 },
  maikhao: { n: "ไม้ขาว", lat: 8.130, lng: 98.305 },
};

export const FUR = {
  golden: ["สีน้ำตาลทอง", "#d9a35b"],
  orange: ["สีส้ม", "#e8893a"],
  grey:   ["สีเทา", "#9aa4a9"],
  black:  ["สีดำ", "#2b2b2b"],
  white:  ["สีขาว", "#f1ede4"],
  brown:  ["สีน้ำตาลเข้ม", "#86573a"],
  bw:     ["ขาว-ดำ", "#f1ede4"],
};

export const SPECIES = { dog: "สุนัข", cat: "แมว", other: "อื่นๆ" };

export function speciesName(p) {
  if (p.species === "other") return p.species_other || "สัตว์อื่น";
  return SPECIES[p.species] ?? "";
}

export const STATUS = { lost: "ตามหา", found: "มีคนพบ", home: "กลับบ้านแล้ว" };

export const PHUKET_CENTER = [7.95, 98.34];
export const PHUKET_BOUNDS = [[7.70, 98.20], [8.25, 98.50]];
export function inPhuket(lat, lng) {
  return lat >= 7.5 && lat <= 8.4 && lng >= 98.1 && lng <= 98.6;
}
// หาพื้นที่ที่ใกล้หมุดที่สุด ใช้ตั้งชื่อพื้นที่ให้อัตโนมัติ
export function nearestArea(lat, lng) {
  let best = "town", d = Infinity;
  for (const [k, a] of Object.entries(AREAS)) {
    const dd = (a.lat - lat) ** 2 + (a.lng - lng) ** 2;
    if (dd < d) { d = dd; best = k; }
  }
  return best;
}

export function areaName(key) {
  return AREAS[key]?.n ?? key;
}

export function petTitle(p) {
  if (p.name) return p.name;
  return speciesName(p) + (FUR[p.fur]?.[0] ?? "");
}

export function timeAgo(iso) {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "เมื่อสักครู่";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

// เวลาแบบนาฬิกา: "วันนี้ 14:32 น.", "เมื่อวาน 09:10 น.", "9 พ.ย. 18:05 น."
export function clockTime(iso) {
  const d = new Date(iso), now = new Date();
  const t = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5);
  if (diff === 0) return `วันนี้ ${t}`;
  if (diff === 1) return `เมื่อวาน ${t}`;
  return `${d.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} ${t}`;
}
export function fullDateTime(iso) {
  return new Date(iso).toLocaleString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " น.";
}
export const eventAt = (p) => p.happened_at || p.created_at;
export const seenAt = (s) => s.seen_at || s.created_at;
export const eventVerb = (p) => (p.status === "found" ? "พบ" : p.status === "lost" ? "หาย" : "");

// ขยับหมุดเล็กน้อยรอบจุดกลางของพื้นที่ เพื่อไม่ให้ทับกัน และไม่เปิดเผยบ้านจริง
export function jitterAround(areaKey) {
  const a = AREAS[areaKey];
  const r = () => (Math.random() - 0.5) * 0.012;
  return { lat: a.lat + r(), lng: a.lng + r() };
}

// เก็บรหัสแก้ไขของประกาศที่ "เรา" ลงไว้ ในเบราว์เซอร์นี้
const TOKENS_KEY = "tamha-edit-tokens";
export function saveToken(id, token) {
  try {
    const all = JSON.parse(localStorage.getItem(TOKENS_KEY) || "{}");
    all[id] = token;
    localStorage.setItem(TOKENS_KEY, JSON.stringify(all));
  } catch {}
}
export function getToken(id) {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) || "{}")[id] ?? null;
  } catch {
    return null;
  }
}

// ไฟล์ HEIC/HEIF จาก iPhone
export function isHeic(file) {
  return /hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name || "");
}

// ตรวจจากเนื้อไฟล์จริง: HEIC ที่ถูกตั้งชื่อเป็น .jpg จะมีคำว่า ftypheic/ftypmif1 อยู่ต้นไฟล์
export async function sniffHeic(file) {
  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const tag = String.fromCharCode(...head.slice(4, 12));
    return /^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(tag);
  } catch {
    return false;
  }
}

// โหลดตัวแปลง HEIC จาก CDN เฉพาะตอนที่ต้องใช้ (ไม่ต้องติดตั้งแพ็กเกจ)
// ตัวแปลง HEIC: ใช้ heic-to (libheif รุ่นใหม่ รองรับรูป iPhone รุ่นใหม่) ถ้าโหลดไม่ได้ค่อยใช้ heic2any
let heicPromise;
const HEIC_LIBS = [
  { url: "https://cdn.jsdelivr.net/npm/heic-to@1.5.2/dist/iife/heic-to.js", pick: () => {
      const g = window.HeicTo; const fn = typeof g === "function" ? g : g?.heicTo;
      return fn ? (file) => fn({ blob: file, type: "image/jpeg", quality: 0.9 }) : null; } },
  { url: "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.js", pick: () =>
      window.heic2any ? (file) => window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 }) : null },
];
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const sc = document.createElement("script");
    sc.src = url; sc.async = true;
    sc.onload = resolve;
    sc.onerror = () => { sc.remove(); reject(new Error("load failed: " + url)); };
    document.head.appendChild(sc);
  });
}
function loadHeicConverter() {
  heicPromise ??= (async () => {
    for (const lib of HEIC_LIBS) {
      try {
        if (!lib.pick()) await loadScript(lib.url);
        const conv = lib.pick();
        if (conv) return conv;
      } catch (e) { console.warn("[tamha-nong]", e.message); }
    }
    heicPromise = null;
    throw new Error("โหลดตัวแปลงไฟล์ HEIC ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่");
  })();
  return heicPromise;
}

export function loadViaImg(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// ย่อรูปก่อนอัปโหลด (ประหยัดพื้นที่และโหลดเร็ว) รองรับ JPG, PNG, WebP, GIF, AVIF, HEIC
export async function resizeImage(file, max = 1400) {
  let src = file;
  if (isHeic(file) || (await sniffHeic(file))) {
    const convert = await loadHeicConverter();
    const out = await convert(file);
    src = Array.isArray(out) ? out[0] : out;
  }
  let img;
  try {
    img = await createImageBitmap(src, { imageOrientation: "from-image" });
  } catch {
    img = await loadViaImg(src);
  }
  const w = img.width, h = img.height;
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff"; // รูป PNG พื้นใสจะได้พื้นขาว
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if (img.close) img.close();
  return await new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), "image/jpeg", 0.85)
  );
}

// ลิงก์นำทางด้วย Google Maps (ฟรี ไม่ต้องใช้ API key) บนมือถือจะเปิดแอป Google Maps
export function gmapsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(5)},${lng.toFixed(5)}`;
}
export function gmapsAreaUrl(areaKey) {
  const a = AREAS[areaKey];
  return a ? gmapsUrl(a.lat, a.lng) : null;
}

// อนุญาตเฉพาะรูปจากที่เก็บรูปของเรา (กันลิงก์อันตราย เช่น javascript:)
const PHOTO_RE = /^https:\/\/[a-z0-9]{10,40}\.supabase\.co\/storage\/v1\/object\/public\/pet-photos\/[\w\-/.]+$/;
export function safePhoto(url) {
  if (typeof url !== "string") return null;
  if (url.startsWith("/samples/") && /^\/samples\/[a-z0-9-]+\.jpg$/.test(url)) return url;
  return PHOTO_RE.test(url) ? url : null;
}

// ประกาศตัวอย่าง: คำอธิบายขึ้นต้นด้วย [ตัวอย่าง]
export const isSample = (p) => /^\s*\[ตัวอย่าง\]/.test(p?.description || "");
export const cleanDesc = (p) => (p?.description || "").replace(/^\s*\[ตัวอย่าง\]\s*/, "");
