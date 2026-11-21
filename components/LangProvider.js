"use client";
// เก็บภาษาที่เลือก (จำไว้ในเบราว์เซอร์) และวาดหน้าใหม่ทั้งหน้าเมื่อเปลี่ยนภาษา
// หน้าผู้ดูแล (/admin) ใช้ภาษาไทยเสมอ
import { Fragment, createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LANGS, LANG_KEY, detectLang, setCurrentLang, t } from "@/lib/i18n";

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
    const l = LANGS.some((x) => x.code === saved) ? saved : detectLang();
    if (l !== "th") setChosen(l);
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

// ปุ่มเลือกภาษาบนแถบด้านบน
export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <label className="lang-sel" title={t("lang_label")}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18" />
      </svg>
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t("lang_label")}>
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
