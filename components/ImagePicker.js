"use client";
import { useEffect, useState } from "react";
import { isHeic, loadViaImg, resizeImage } from "@/lib/data";

const DIRECT_OK = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

// เลือกรูป: แตะเพื่อเลือก/ถ่ายรูป หรือลากรูปมาวาง ย่อขนาดอัตโนมัติก่อนอัปโหลด
export default function ImagePicker({ id, value, onChange, label = "เพิ่มรูปถ่าย", compact = false }) {
  const [over, setOver] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = value?.preview;
    return () => { if (url) setTimeout(() => URL.revokeObjectURL(url), 60000); };
  }, [value?.preview]);

  async function take(file) {
    if (!file) return;
    const looksImage = file.type.startsWith("image/") || isHeic(file) || /\.(jpe?g|png|webp|gif|avif|bmp|jfif)$/i.test(file.name);
    if (!looksImage) return setErr("ไฟล์นี้ไม่ใช่รูปภาพ กรุณาเลือกไฟล์รูป เช่น JPG, PNG หรือรูปจากกล้องมือถือ");
    setErr("");
    setBusy(true);
    try {
      const blob = await resizeImage(file);
      onChange({ blob, preview: URL.createObjectURL(blob) });
    } catch (e) {
      console.error("[tamha-nong] resizeImage:", e);
      // ย่อไม่ได้ แต่ถ้าเป็น JPG/PNG/WebP ขนาดไม่เกิน 5 MB ก็อัปโหลดไฟล์เดิมได้
      let ok = false;
      if (DIRECT_OK.includes(file.type) && file.size <= MAX_BYTES) {
        try { await loadViaImg(file); ok = true; } catch {}
      }
      if (ok) {
        onChange({ blob: file, preview: URL.createObjectURL(file) });
      } else {
        const ext = (file.name.split(".").pop() || "").toUpperCase();
        setErr(/HEIC/.test(e?.message || "") ? e.message : `เปิดไฟล์ ${ext || "นี้"} ไม่ได้ (${e?.message || "ไม่ทราบสาเหตุ"}) ลองถ่ายหน้าจอรูปนั้น แล้วเลือกรูปที่ถ่ายหน้าจอแทน`);
      }
    }
    setBusy(false);
  }


  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label
        className={`drop${over ? " over" : ""}${compact ? " compact" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
      >
        {busy ? (
          <span className="hint">กำลังเตรียมรูป…</span>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.preview} alt="รูปที่เลือก" />
        ) : (
          <>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: "var(--sea)" }}>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
            </svg>
            <strong>{label}</strong>
            <span className="hint">แตะเพื่อถ่ายรูปหรือเลือกจากเครื่อง · คอมพิวเตอร์ลากรูปมาวางได้</span>
          </>
        )}
        <input id={id} type="file" accept="image/*,.heic,.heif" aria-label={label} onChange={(e) => take(e.target.files?.[0])} />
      </label>
      {value && <button type="button" className="btn small ghost" onClick={() => onChange(null)}>เปลี่ยนรูป / เอารูปออก</button>}
      {err && <div className="err" role="alert">{err}</div>}
    </div>
  );
}
