"use client";
// แปลข้อความที่ผู้ใช้พิมพ์เอง (ชื่อน้อง คำอธิบาย ค่าตอบแทน ข้อความแจ้งเห็น) ตามภาษาที่เลือก
// ใช้บริการแปลฟรี MyMemory (ไม่ต้องใช้ API key) แปลเฉพาะข้อความที่มีตัวอักษรไทย
// เก็บผลแปลไว้ในเบราว์เซอร์ ข้อความเดิมจะไม่ถูกแปลซ้ำ ถ้าแปลไม่ได้จะแสดงข้อความเดิม
import { useEffect, useState } from "react";
import { getLang } from "@/lib/i18n";

const TARGET = { en: "en", zh: "zh-CN", ru: "ru" };
const THAI = /[฀-๿]/;
const CACHE_KEY = "tamha-tr-v1";
const API = "https://api.mymemory.translated.net/get";

let cache = null;
function loadCache() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }
  return cache;
}
let saveTimer = null;
function saveCache() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const keys = Object.keys(cache);
      if (keys.length > 800) keys.slice(0, keys.length - 800).forEach((k) => delete cache[k]);
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {}
  }, 500);
}

// คิวคำขอ: ส่งพร้อมกันได้ไม่เกิน 3 รายการ และไม่ขอข้อความเดิมซ้ำ
const inflight = new Map();
let active = 0;
const queue = [];
function pump() {
  while (active < 3 && queue.length) {
    const job = queue.shift();
    active++;
    job().finally(() => { active--; pump(); });
  }
}
let blockedUntil = 0; // ถ้าโควตาหมด หยุดขอไปพักหนึ่ง

export function translate(text, lang) {
  const to = TARGET[lang];
  if (!to || !text || !THAI.test(text)) return Promise.resolve(text);
  const key = `${lang}|${text}`;
  const c = loadCache();
  if (c[key]) return Promise.resolve(c[key]);
  if (Date.now() < blockedUntil) return Promise.resolve(text);
  if (inflight.has(key)) return inflight.get(key);
  const p = new Promise((resolve) => {
    queue.push(async () => {
      try {
        const r = await fetch(`${API}?q=${encodeURIComponent(text.slice(0, 480))}&langpair=th|${to}`);
        const j = await r.json();
        const out = j?.responseData?.translatedText;
        if (r.ok && j.responseStatus == 200 && out && !/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) {
          const clean = decodeEntities(out);
          c[key] = clean; saveCache();
          resolve(clean);
        } else {
          if (j?.quotaFinished || j?.responseStatus == 429) blockedUntil = Date.now() + 10 * 60000;
          resolve(text);
        }
      } catch { resolve(text); }
      inflight.delete(key);
    });
    pump();
  });
  inflight.set(key, p);
  return p;
}

function decodeEntities(s) {
  return s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export function useTr(text) {
  const lang = getLang();
  const need = !!TARGET[lang] && !!text && THAI.test(text);
  const [out, setOut] = useState(() => (need ? loadCache()[`${lang}|${text}`] || text : text));
  useEffect(() => {
    if (!need) { setOut(text); return; }
    let alive = true;
    translate(text, lang).then((v) => { if (alive) setOut(v); });
    return () => { alive = false; };
  }, [text, lang, need]);
  return out;
}

// <Tr>ข้อความ</Tr> แสดงข้อความที่แปลแล้ว (ระหว่างรอแสดงข้อความเดิม)
export default function Tr({ children }) {
  const text = typeof children === "string" ? children : children == null ? "" : String(children);
  const out = useTr(text);
  return out === text ? text : <span title={text}>{out}</span>;
}
