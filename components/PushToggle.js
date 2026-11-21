"use client";
// การ์ด "รับแจ้งเตือนเข้ามือถือ" แสดงเฉพาะคนที่ลงประกาศนี้ (มีรหัสแก้ไขในเครื่อง)
import { useEffect, useState } from "react";
import { enablePush, pushStatus } from "@/lib/push-client";
import { t } from "@/lib/i18n";

const SUB = {
  off: "push_sub", on: "push_on_sub", ios: "push_ios", denied: "push_denied",
  unsupported: "push_unsupported", err: "push_err",
};

export default function PushToggle({ postId, token }) {
  const [state, setState] = useState("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    pushStatus(postId)
      .then((s) => { if (alive) setState(s); })
      .catch(() => { if (alive) setState("unsupported"); });
    return () => { alive = false; };
  }, [postId]);

  async function onEnable() {
    setBusy(true);
    try {
      setState(await enablePush(postId, token));
    } catch (e) {
      console.error("[tamha-nong] push:", e);
      setState("err");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  return (
    <div className={`push-card ${state}`}>
      <svg className="push-ico" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      <div className="push-text">
        <strong>{t(state === "on" ? "push_on" : "push_title")}</strong>
        <span>{t(SUB[state] || "push_sub")}</span>
      </div>
      {(state === "off" || state === "err") && (
        <button type="button" className="btn small primary" onClick={onEnable} disabled={busy}>
          {busy ? t("sending") : t("push_btn")}
        </button>
      )}
    </div>
  );
}
