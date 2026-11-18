"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isConfigured } from "@/lib/supabase";
import { areaName, getToken, petTitle } from "@/lib/data";
import TimeAgo from "./TimeAgo";
import { PetPhoto } from "./PetAvatar";

const Ctx = createContext(null);
export const useNotifications = () => useContext(Ctx);
const KEY = "tamha-notifs";

const ICON = { lost: "ตามหา", found: "พบ", seen: "เห็น", home: "กลับบ้าน" };

export default function NotificationsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [pops, setPops] = useState([]);
  const [perm, setPerm] = useState("unsupported");
  const seen = useRef(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      saved.forEach((n) => seen.current.add(n.id));
      setItems(saved);
    } catch {}
    if ("Notification" in window) setPerm(Notification.permission);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, 40))); } catch {}
  }, [items]);

  const dismiss = useCallback((id) => setPops((p) => p.filter((x) => x.id !== id)), []);

  const push = useCallback((n) => {
    if (seen.current.has(n.id)) return;
    seen.current.add(n.id);
    setItems((list) => [n, ...list].slice(0, 40));
    setPops((p) => [...p, n].slice(-3));
    setTimeout(() => dismiss(n.id), n.mine ? 12000 : 7000);
    // แจ้งเตือนบนเครื่อง เมื่อไม่ได้ดูหน้าเว็บอยู่ (หรือเป็นประกาศของเรา)
    if ((document.hidden || n.mine) && "Notification" in window && Notification.permission === "granted") {
      try {
        const no = new Notification(n.title, { body: n.body, icon: "/icons/icon-192.png", tag: n.id });
        no.onclick = () => { window.focus(); window.location.href = n.href; };
      } catch {}
    }
  }, [dismiss]);

  useEffect(() => {
    if (!isConfigured) return;
    const ch = supabase
      .channel("notif-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, ({ new: p }) => {
        const mine = !!getToken(p.id);
        push({
          id: "p-" + p.id, kind: p.status, mine, read: false, href: `/p/${p.id}`, at: p.created_at, post: p,
          title: mine ? "ประกาศของคุณขึ้นแล้ว" : p.status === "lost" ? "มีน้องหายใหม่" : "มีคนพบน้องหลง",
          body: `${petTitle(p)} · ${areaName(p.area)}`,
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sightings" }, async ({ new: s }) => {
        const { data: p } = await supabase.from("posts")
          .select("id,name,species,species_other,fur,status,photo_url").eq("id", s.post_id).maybeSingle();
        if (!p) return;
        const mine = !!getToken(p.id);
        push({
          id: "s-" + s.id, kind: "seen", mine, read: false, href: `/p/${p.id}`, at: s.created_at, post: p,
          title: mine ? "มีคนเห็นน้องของคุณ!" : "มีคนแจ้งว่าเห็นน้อง",
          body: `${petTitle(p)} · ${areaName(s.area)}${s.note ? " · " + s.note : ""}`,
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, ({ new: p }) => {
        if (p.status !== "home") return;
        push({
          id: "h-" + p.id, kind: "home", mine: !!getToken(p.id), read: false, href: `/p/${p.id}`,
          at: new Date().toISOString(), post: p,
          title: "น้องได้กลับบ้านแล้ว", body: `${petTitle(p)} · ${areaName(p.area)}`,
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [push]);

  const enableBrowser = useCallback(async () => {
    if (!("Notification" in window)) return;
    setPerm(await Notification.requestPermission());
  }, []);

  const value = useMemo(() => ({
    items,
    unread: items.filter((n) => !n.read).length,
    markAllRead: () => setItems((l) => l.map((n) => ({ ...n, read: true }))),
    clear: () => setItems([]),
    perm, enableBrowser,
  }), [items, perm, enableBrowser]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pops" aria-live="polite">
        {pops.map((n) => (
          <div key={n.id} className={`pop ${n.kind}${n.mine ? " mine" : ""}`}>
            <Link href={n.href} className="pop-body" onClick={() => dismiss(n.id)}>
              <div className="pop-th">{n.post && <PetPhoto post={n.post} size={40} />}</div>
              <div className="pop-text">
                <span className="pop-kind">{ICON[n.kind]}</span>
                <strong>{n.title}</strong>
                <span>{n.body}</span>
                <small><TimeAgo iso={n.at} /></small>
              </div>
            </Link>
            <button className="pop-x" onClick={() => dismiss(n.id)} aria-label="ปิด">×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function Bell() {
  const ctx = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);
  if (!ctx) return null;
  const { items, unread, markAllRead, clear, perm, enableBrowser } = ctx;

  return (
    <div className="bell-wrap" ref={ref}>
      <button className="bell" aria-label={`การแจ้งเตือน ${unread} รายการใหม่`} aria-expanded={open}
        onClick={() => { setOpen((o) => !o); if (!open) setTimeout(markAllRead, 1500); }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
        {unread > 0 && <span className="badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="bell-panel" role="dialog" aria-label="การแจ้งเตือน">
          <div className="bell-head">
            <strong>การแจ้งเตือน</strong>
            {items.length > 0 && <button className="report-link" onClick={clear}>ล้างทั้งหมด</button>}
          </div>
          {perm === "default" && (
            <button className="btn small primary block" onClick={enableBrowser}>เปิดแจ้งเตือนบนเครื่องนี้</button>
          )}
          {perm === "denied" && <span className="hint">การแจ้งเตือนบนเครื่องถูกปิดอยู่ เปิดได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์</span>}
          <div className="bell-list">
            {items.length ? items.map((n) => (
              <Link key={n.id} href={n.href} className={`bell-item${n.read ? "" : " unread"}${n.mine ? " mine" : ""}`} onClick={() => setOpen(false)}>
                <span className={`dot ${n.kind}`} />
                <div>
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                  <small><TimeAgo iso={n.at} /></small>
                </div>
              </Link>
            )) : <div className="empty" style={{ padding: "24px 8px" }}>ยังไม่มีการแจ้งเตือน<br />เปิดหน้านี้ทิ้งไว้ มีอะไรใหม่จะเด้งขึ้นทันที</div>}
          </div>
        </div>
      )}
    </div>
  );
}
