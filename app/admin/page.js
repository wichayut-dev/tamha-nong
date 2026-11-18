"use client";
import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PetPhoto } from "@/components/PetAvatar";
import SetupNotice from "@/components/SetupNotice";
import ImagePicker from "@/components/ImagePicker";
import { useToast } from "@/components/Toast";
import {
  supabase, isConfigured, subscribePosts, adminListPosts, adminUpdatePost,
  adminDeletePost, adminDeleteSighting, adminDeleteReport, uploadPhoto,
} from "@/lib/supabase";
import { AREAS, FUR, STATUS, areaName, petTitle, safePhoto, timeAgo } from "@/lib/data";
import TimeAgo from "@/components/TimeAgo";

export default function AdminPage() {
  const [session, setSession] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.rpc("is_admin").then(({ data, error }) => setIsAdmin(error ? false : !!data));
  }, [session]);

  if (!isConfigured) return <SetupNotice />;
  if (session === undefined || (session && isAdmin === null)) return <div className="empty">กำลังตรวจสอบสิทธิ์…</div>;
  if (!session) return <Login />;
  if (!isAdmin) return <NotAdmin />;
  return <Dashboard email={session.user.email} />;
}

// หน้าเข้าสู่ระบบ: ไม่บอกข้อมูลระบบหลังบ้าน ไม่บอกว่าผิดที่อีเมลหรือรหัส และพักการลองเมื่อผิดหลายครั้ง
function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fails = useRef(0);
  const lockUntil = useRef(0);
  async function onSubmit(e) {
    e.preventDefault();
    const wait = Math.ceil((lockUntil.current - Date.now()) / 1000);
    if (wait > 0) return setErr(`ลองใหม่ได้ในอีก ${wait} วินาที`);
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) {
      fails.current += 1;
      if (fails.current >= 5) { lockUntil.current = Date.now() + 60_000 * Math.min(fails.current - 4, 10); }
      setErr("เข้าสู่ระบบไม่สำเร็จ");
      setPw("");
    } else fails.current = 0;
    setBusy(false);
  }
  return (
    <form className="login panel" onSubmit={onSubmit} autoComplete="on">
      <h2 className="page-title" style={{ fontSize: 24 }}>เข้าสู่ระบบ</h2>
      <label className="f">อีเมล<input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="f">รหัสผ่าน<input id="password" type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn primary" disabled={busy}>{busy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}</button>
    </form>
  );
}

function NotAdmin() {
  return (
    <div className="login panel">
      <h2 className="page-title" style={{ fontSize: 22 }}>ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
      <button className="btn" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
    </div>
  );
}

const FILTERS = [
  ["all", "ทั้งหมด"], ["lost", "ตามหา"], ["found", "มีคนพบ"], ["home", "กลับบ้านแล้ว"],
  ["hidden", "ซ่อนอยู่"], ["reported", "ถูกรายงาน"],
];

function Dashboard({ email }) {
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, show] = useToast();

  const load = useCallback(() => adminListPosts().then((d) => { setPosts(d); setErr(null); }).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); return subscribePosts(load); }, [load]);

  const counts = useMemo(() => {
    const c = { all: 0, lost: 0, found: 0, home: 0, hidden: 0, reported: 0 };
    (posts ?? []).forEach((p) => {
      c.all++; c[p.status]++;
      if (p.hidden) c.hidden++;
      if (p.reports?.length) c.reported++;
    });
    return c;
  }, [posts]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (posts ?? []).filter((p) => {
      if (filter === "hidden" && !p.hidden) return false;
      if (filter === "reported" && !p.reports?.length) return false;
      if (["lost", "found", "home"].includes(filter) && p.status !== filter) return false;
      return !s || [p.name, p.description, p.contact_name, p.phone, p.line_id, areaName(p.area)].join(" ").toLowerCase().includes(s);
    });
  }, [posts, filter, q]);

  async function act(fn, msg) {
    try { await fn(); await load(); if (msg) show(msg); } catch (e) { show(e.message); }
  }

  function exportCsv() {
    const cols = ["created_at", "status", "species", "name", "fur", "area", "description", "contact_name", "phone", "line_id", "reward", "hidden", "sightings", "reports", "photo_url", "id"];
    // กัน CSV injection: ช่องที่ขึ้นต้นด้วย = + - @ จะไม่ถูก Excel มองเป็นสูตร
    const esc = (v) => {
      let t = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
      return `"${t.replace(/"/g, '""')}"`;
    };
    const lines = [cols.join(",")].concat((posts ?? []).map((p) => cols.map((c) =>
      esc(c === "sightings" ? p.sightings?.length : c === "reports" ? p.reports?.length : c === "area" ? areaName(p.area) : p[c])
    ).join(",")));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tamha-nong-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const cur = posts?.find((p) => p.id === editing);

  return (
    <>
      <div className="admin-head">
        <div>
          <h2 className="page-title">จัดการประกาศ</h2>
          <span className="meta">เข้าสู่ระบบในชื่อ {email}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn small" onClick={exportCsv} disabled={!posts?.length}>ดาวน์โหลด CSV</button>
          <Link href="/" className="btn small">ดูหน้าเว็บ</Link>
          <button className="btn small" onClick={() => supabase.auth.signOut()}>ออกจากระบบ</button>
        </div>
      </div>

      <div className="kpis">
        {FILTERS.map(([k, label]) => (
          <button key={k} className={`kpi${k === "reported" && counts.reported ? " alert" : ""}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            <b>{posts ? counts[k] : "–"}</b><span>{label}</span>
          </button>
        ))}
      </div>

      <div className="search" style={{ marginBottom: 14 }}>
        <input id="admin-q" type="search" placeholder="ค้นหา: ชื่อน้อง, ชื่อผู้ติดต่อ, เบอร์, LINE, พื้นที่" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหา" />
      </div>

      {err && <div className="notice error">{err}</div>}
      {!posts && !err && <div className="empty">กำลังโหลด…</div>}
      {posts && !shown.length && <div className="empty">ไม่มีประกาศในหมวดนี้</div>}

      <div className="rows">
        {shown.map((p) => (
          <div key={p.id} className={`row${p.hidden ? " hidden-post" : ""}`}>
            <div className="th"><PetPhoto post={p} size={52} /></div>
            <div className="main">
              <strong>
                {petTitle(p)}
                {p.hidden && <span className="pill muted" style={{ marginLeft: 6 }}>ซ่อน</span>}
                {p.reports?.length > 0 && <span className="flag">รายงาน {p.reports.length}</span>}
              </strong>
              <span className="meta">{areaName(p.area)} · <TimeAgo iso={p.created_at} /> · เห็น {p.sightings?.length ?? 0} ครั้ง</span>
            </div>
            <div className="who">
              <div>{p.contact_name || <span className="meta">ไม่ระบุชื่อ</span>}</div>
              <div className="meta">{p.phone}{p.line_id ? ` · LINE ${p.line_id}` : ""}</div>
            </div>
            <div className="acts">
              <select aria-label="สถานะ" value={p.status} onChange={(e) => act(() => adminUpdatePost(p.id, { status: e.target.value }), "เปลี่ยนสถานะแล้ว")}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn small" onClick={() => setEditing(p.id)}>แก้ไข</button>
              <button className="btn small" onClick={() => act(() => adminUpdatePost(p.id, { hidden: !p.hidden }), p.hidden ? "แสดงประกาศแล้ว" : "ซ่อนประกาศแล้ว")}>{p.hidden ? "แสดง" : "ซ่อน"}</button>
              {confirmDel === p.id ? (
                <>
                  <button className="btn small danger" onClick={() => { setConfirmDel(null); act(() => adminDeletePost(p.id), "ลบประกาศแล้ว"); }}>ยืนยันลบ</button>
                  <button className="btn small ghost" onClick={() => setConfirmDel(null)}>ยกเลิก</button>
                </>
              ) : (
                <button className="btn small danger" onClick={() => setConfirmDel(p.id)}>ลบ</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {cur && (
        <Editor
          key={cur.id}
          post={cur}
          onClose={() => setEditing(null)}
          onSave={(patch) => act(() => adminUpdatePost(cur.id, patch), "บันทึกแล้ว")}
          onPhoto={(blob) => act(async () => adminUpdatePost(cur.id, { photo_url: blob ? await uploadPhoto(blob) : null }), blob ? "เปลี่ยนรูปแล้ว" : "เอารูปออกแล้ว")}
          onDeleteSighting={(sid) => act(() => adminDeleteSighting(sid), "ลบข้อมูลการพบเห็นแล้ว")}
          onDeleteReport={(rid) => act(() => adminDeleteReport(rid), "ปิดรายงานแล้ว")}
        />
      )}
      {toast}
    </>
  );
}

function Editor({ post, onClose, onSave, onPhoto, onDeleteSighting, onDeleteReport }) {
  const [newPhoto, setNewPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fields = ["name", "status", "species", "species_other", "fur", "area", "description", "reward", "contact_name", "phone", "line_id"];
  const [f, setF] = useState(() => Object.fromEntries(fields.map((k) => [k, post[k] ?? ""])));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save(e) {
    e.preventDefault();
    const patch = Object.fromEntries(fields.map((k) => [k, typeof f[k] === "string" && f[k].trim() === "" && !["description", "phone"].includes(k) ? null : f[k]]));
    onSave(patch);
  }

  return (
    <div className="drawer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet" onSubmit={save} role="dialog" aria-label="แก้ไขประกาศ">
        <div className="sheet-head">
          <h3>แก้ไขประกาศ</h3>
          <button type="button" className="btn small" onClick={onClose}>ปิด</button>
        </div>
        <section className="panel">
          <h3>รูปประกาศ</h3>
          {newPhoto ? (
            <>
              <ImagePicker id="e-photo" value={newPhoto} onChange={setNewPhoto} label="เลือกรูปใหม่" />
              <button type="button" className="btn primary" disabled={uploading}
                onClick={async () => { setUploading(true); await onPhoto(newPhoto.blob); setUploading(false); setNewPhoto(null); }}>
                {uploading ? "กำลังอัปโหลด…" : "ใช้รูปนี้"}
              </button>
            </>
          ) : (
            <>
              <div className="photo" style={{ borderRadius: 14 }}><PetPhoto post={post} size={150} /></div>
              <ImagePicker id="e-photo" value={null} onChange={setNewPhoto} label={post.photo_url ? "เปลี่ยนรูป" : "เพิ่มรูป"} compact />
              {post.photo_url && <button type="button" className="btn small danger" onClick={() => onPhoto(null)}>เอารูปออก (ใช้ภาพการ์ตูนแทน)</button>}
            </>
          )}
        </section>
        <div className="meta">ลงประกาศ {new Date(post.created_at).toLocaleString("th-TH")} · <Link href={`/p/${post.id}`} style={{ color: "var(--sea)" }}>เปิดหน้าประกาศ</Link></div>

        <section className="panel">
          <div className="grid2">
            <label className="f">สถานะ<select id="e-status" value={f.status} onChange={set("status")}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="f">ชนิด<select id="e-species" value={f.species} onChange={set("species")}><option value="dog">สุนัข</option><option value="cat">แมว</option><option value="other">อื่นๆ</option></select></label>
            {f.species === "other" && <label className="f">เป็นสัตว์อะไร<input id="e-sother" type="text" maxLength={30} value={f.species_other} onChange={set("species_other")} /></label>}
            <label className="f">ชื่อน้อง<input id="e-name" type="text" maxLength={40} value={f.name} onChange={set("name")} /></label>
            <label className="f">สี<select id="e-fur" value={f.fur} onChange={set("fur")}>{Object.entries(FUR).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></label>
          </div>
          <label className="f">พื้นที่<select id="e-area" value={f.area} onChange={set("area")}>{Object.entries(AREAS).map(([k, a]) => <option key={k} value={k}>{a.n}</option>)}</select></label>
          <label className="f">ลักษณะเด่น<textarea id="e-desc" maxLength={300} value={f.description} onChange={set("description")} /></label>
          <label className="f">ค่าตอบแทน<input id="e-reward" type="text" maxLength={20} value={f.reward} onChange={set("reward")} /></label>
        </section>

        <section className="panel">
          <h3>ข้อมูลผู้ประกาศ</h3>
          <div className="grid2">
            <label className="f">ชื่อผู้ติดต่อ<input id="e-cname" type="text" maxLength={60} value={f.contact_name} onChange={set("contact_name")} /></label>
            <label className="f">เบอร์โทร<input id="e-phone" type="tel" maxLength={15} value={f.phone} onChange={set("phone")} /></label>
          </div>
          <label className="f">LINE ID<input id="e-line" type="text" maxLength={40} value={f.line_id} onChange={set("line_id")} /></label>
        </section>

        <button className="btn primary">บันทึกการแก้ไข</button>

        {post.reports?.length > 0 && (
          <section className="panel">
            <h3>รายงานจากผู้ใช้ ({post.reports.length})</h3>
            {post.reports.map((r) => (
              <div key={r.id} className="contact-line">
                <span>{r.reason} <span className="meta">· <TimeAgo iso={r.created_at} /></span></span>
                <button type="button" className="btn small" onClick={() => onDeleteReport(r.id)}>ปิดรายงาน</button>
              </div>
            ))}
          </section>
        )}

        <section className="panel">
          <h3>การแจ้งว่าเห็น ({post.sightings?.length ?? 0})</h3>
          {post.sightings?.length ? post.sightings.map((s) => (
            <div key={s.id} className="contact-line">
              <span>{s.note || "แจ้งว่าเห็น"} <span className="meta">· {areaName(s.area)} · <TimeAgo iso={s.created_at} /></span>
                {safePhoto(s.photo_url) && <> · <a href={safePhoto(s.photo_url)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--sea)" }}>ดูรูป</a></>}
              </span>
              <button type="button" className="btn small danger" onClick={() => onDeleteSighting(s.id)}>ลบ</button>
            </div>
          )) : <span className="meta">ยังไม่มี</span>}
        </section>
      </form>
    </div>
  );
}
