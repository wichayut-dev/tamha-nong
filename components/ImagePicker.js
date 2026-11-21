"use client";
import { useEffect, useState } from "react";
import { isHeic, loadViaImg, resizeImage } from "@/lib/data";
import { t } from "@/lib/i18n";

const DIRECT_OK = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

// เลือกรูป: แตะเพื่อเลือก/ถ่ายรูป หรือลากรูปมาวาง ย่อขนาดอัตโนมัติก่อนอัปโหลด
export default function ImagePicker({ id, value, onChange, label, compact = false }) {
  label = label || t("add_photo");
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
    if (!looksImage) return setErr(t("not_image"));
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
        setErr(/HEIC/.test(e?.message || "") ? e.message : t("open_fail", { ext: ext || t("this_file"), e: e?.message || t("unknown_cause") }).replace(/\s+/g, " "));
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
          <span className="hint">{t("preparing")}</span>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.preview} alt={t("chosen_alt")} />
        ) : (
          <>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: "var(--sea)" }}>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
            </svg>
            <strong>{label}</strong>
            <span className="hint">{t("tap_photo")}</span>
          </>
        )}
        <input id={id} type="file" accept="image/*,.heic,.heif" aria-label={label} onChange={(e) => take(e.target.files?.[0])} />
      </label>
      {value && <button type="button" className="btn small ghost" onClick={() => onChange(null)}>{t("change_photo")}</button>}
      {err && <div className="err" role="alert">{err}</div>}
    </div>
  );
}
