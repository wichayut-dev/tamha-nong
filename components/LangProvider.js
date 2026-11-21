"use client";
// เก็บภาษาที่เลือก (จำไว้ในเบราว์เซอร์) และวาดหน้าใหม่ทั้งหน้าเมื่อเปลี่ยนภาษา
// หน้าผู้ดูแล (/admin) ใช้ภาษาไทยเสมอ
import { Fragment, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LANGS, LANG_KEY, setCurrentLang, t } from "@/lib/i18n";

const Ctx = createContext({ lang: "th", setLang: () => {} });
export const useLang = () => useContext(Ctx);

export default function LangProvider({ children }) {
  const path = usePathname() || "/";
  const [chosen, setChosen] = useState("th"); // เริ่มด้วยไทยให้ตรงกับหน้าที่เซิร์ฟเวอร์ส่งมา
  const lang = path.startsWith("/admin") ? "th" : chosen;
  setCurrentLang(lang); // ตั้งก่อนวาดลูก ๆ ทุกตัว

  useEffect(() => {
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch {}
    // เริ่มต้นเป็นภาษาไทยเสมอ เปลี่ยนเฉพาะเมื่อผู้ใช้เคยกดเลือกภาษาอื่นไว้
    if (saved && saved !== "th" && LANGS.some((x) => x.code === saved)) setChosen(saved);
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l) => {
    if (!LANGS.some((x) => x.code === l)) return;
    try { localStorage.setItem(LANG_KEY, l); } catch {}
    setChosen(l);
  }, []);

  return (
    <Ctx.Provider value={{ lang, setLang }}>
      <Fragment key={lang}>{children}</Fragment>
    </Ctx.Provider>
  );
}

// ปุ่มเลือกภาษาบนแถบด้านบน: ปุ่มกด + เมนูที่ออกแบบเอง (ไม่ใช้ select ของเบราว์เซอร์)
export function LangSwitch() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cur = LANGS.find((l) => l.code === lang) || LANGS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector('[aria-selected="true"]')?.focus();
    return () => { document.removeEventListener("pointerdown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const onListKey = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...ref.current.querySelectorAll(".lang-opt")];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  return (
    <div className="lang-wrap" ref={ref}>
      <button type="button" className={`lang-btn${open ? " is-open" : ""}`} onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox" aria-expanded={open} aria-label={`${t("lang_label")}: ${cur.label}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18" />
        </svg>
        <span className="lang-cur">{cur.short}</span>
        <svg className="lang-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="lang-menu" role="listbox" aria-label={t("lang_label")} onKeyDown={onListKey}>
          {LANGS.map((l) => (
            <button type="button" key={l.code} role="option" aria-selected={l.code === lang} className="lang-opt"
              onClick={() => { setOpen(false); setLang(l.code); }}>
              <span>{l.label}</span>
              {l.code === lang && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
