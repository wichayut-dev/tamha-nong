"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PetPhoto } from "@/components/PetAvatar";
import ImagePicker from "@/components/ImagePicker";
import WhenPicker, { toLocalInput } from "@/components/WhenPicker";
import SetupNotice from "@/components/SetupNotice";
import { useToast } from "@/components/Toast";
import { addSighting, deletePost, getPost, isConfigured, markHome, reportPost, subscribePosts, uploadPhoto } from "@/lib/supabase";
import { AREAS, FUR, STATUS, areaName, eventAt, eventVerb, fullDateTime, seenAt, getToken, gmapsAreaUrl, gmapsUrl, nearestArea, petTitle, safePhoto, speciesName, timeAgo } from "@/lib/data";
import TimeAgo from "@/components/TimeAgo";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });
const PostMiniMap = dynamic(() => import("@/components/PostMiniMap"), { ssr: false, loading: () => <div className="mini-map skeleton" /> });

export default function PostPage() {
  const { id } = useParams();
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [post, setPost] = useState(undefined);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [panel, setPanel] = useState(null); // "sight" | "report" | "delete"
  // มาจากปุ่ม "ฉันเห็นตัวนี้" ในหน้าแรก (#seen) ให้เปิดฟอร์มแจ้งว่าเห็นทันที
  useEffect(() => { if (window.location.hash === "#seen") setPanel("sight"); }, []);
  const [sArea, setSArea] = useState("town");
  const [sNote, setSNote] = useState("");
  const [sPhoto, setSPhoto] = useState(null);
  const [sLoc, setSLoc] = useState(null);
  const [sWhen, setSWhen] = useState(() => toLocalInput(new Date()));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getPost(id).then(setPost).catch((e) => setError(e.message)), [id]);

  useEffect(() => {
    if (!isConfigured) return;
    setToken(getToken(id));
    setIsNew(new URLSearchParams(window.location.search).get("new") === "1");
    load();
    return subscribePosts(load);
  }, [id, load]);

  if (!isConfigured) return <SetupNotice />;
  if (error) return <div className="notice error">โหลดประกาศไม่สำเร็จ: {error}</div>;
  if (post === undefined) return <div className="detail"><div className="skeleton" /><div className="skeleton" /></div>;
  if (post === null) return <div className="empty">ไม่พบประกาศนี้ อาจถูกลบหรือซ่อนไปแล้ว<br /><Link href="/" className="btn" style={{ marginTop: 12 }}>กลับหน้าประกาศ</Link></div>;

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) showToast(okMsg); } catch (e) { showToast(e.message); }
    setBusy(false);
  };

  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); showToast(msg); }
    catch { showToast("คัดลอกไม่ได้ กดค้างที่ข้อความเพื่อคัดลอก"); }
  }

  async function share() {
    const url = `${window.location.origin}/p/${post.id}`;
    const text = `${STATUS[post.status]}: ${petTitle(post)} (${areaName(post.area)}) ช่วยแชร์ด้วยนะครับ`;
    try {
      if (navigator.share) await navigator.share({ title: "ตามหาน้อง ภูเก็ต", text, url });
      else await copy(`${text}\n${url}`, "คัดลอกลิงก์แล้ว นำไปวางใน LINE หรือ Facebook ได้เลย");
    } catch {}
  }

  const submitSighting = (e) => {
    e.preventDefault();
    run(async () => {
      const url = sPhoto ? await uploadPhoto(sPhoto.blob) : null;
      await addSighting(post.id, sArea, sNote.trim(), url, sLoc, new Date(sWhen).toISOString());
      setPanel(null); setSNote(""); setSPhoto(null); setSLoc(null); setSWhen(toLocalInput(new Date()));
      await load();
    }, "ส่งข้อมูลแล้ว ขอบคุณที่ช่วยตามหา");
  };

  const submitReport = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    run(async () => { await reportPost(post.id, reason.trim()); setPanel(null); setReason(""); }, "ส่งรายงานให้ผู้ดูแลแล้ว");
  };

  const onHome = () => run(async () => {
    if (!(await markHome(post.id, token))) throw new Error("รหัสแก้ไขไม่ถูกต้อง");
    await load();
  }, "ยินดีด้วย! น้องได้กลับบ้านแล้ว");

  const onDelete = () => run(async () => {
    if (!(await deletePost(post.id, token))) throw new Error("รหัสแก้ไขไม่ถูกต้อง");
    router.push("/");
  });

  const sightings = post.sightings ?? [];
  const tel = post.phone.replace(/[^0-9+]/g, "");

  return (
    <>
      <button className="back" onClick={() => (history.length > 1 ? router.back() : router.push("/"))}>← กลับ</button>
      <div className="detail">
        <div className="media">
          <div className="photo">
            <PetPhoto post={post} size={190} />
            <span className={`pill ${post.status}`}>{STATUS[post.status]}</span>
          </div>
          <div className="mini-wrap">
            <PostMiniMap post={post} />
            {safePhoto(post.place_photo_url) && (
              <figure className="place-photo">
                <img src={safePhoto(post.place_photo_url)} alt={`สถานที่ที่${eventVerb(post) || "เกิดเหตุ"}`} loading="lazy" />
                <figcaption>📍 สถานที่ที่{eventVerb(post) || "เกิดเหตุ"} · {areaName(post.area)}</figcaption>
              </figure>
            )}
            <div className="mini-legend">
              <span><i style={{ background: post.status === "found" ? "var(--found)" : "var(--lost)" }} />จุดที่{post.status === "found" ? "พบ" : "หาย"}</span>
              <span><i style={{ background: "#f08c2e" }} />จุดที่มีคนเห็น</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <div>
            <h2 className="dname">{petTitle(post)}</h2>
            {/^\s*\[ตัวอย่าง\]/.test(post.description || "") && <p className="sample-note">นี่คือประกาศตัวอย่าง ไว้ให้ดูว่าเว็บทำงานอย่างไร เบอร์โทรในประกาศนี้ใช้ติดต่อไม่ได้</p>}
            <div className={`when-line big ${post.status}`}>{eventVerb(post)} <TimeAgo iso={eventAt(post)} clock /> · {areaName(post.area)}</div>
          </div>

          <div className="action-row">
            <a className="btn primary big" href={`tel:${tel}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
              โทร{post.status === "found" ? "หาผู้พบ" : "หาเจ้าของ"}
            </a>
            {post.status !== "home" && (
              <button className="btn warm big" onClick={() => setPanel(panel === "sight" ? null : "sight")}>ฉันเห็นตัวนี้</button>
            )}
            <button className="btn big" onClick={share} aria-label="แชร์ประกาศ">แชร์</button>
          </div>
          {post.status !== "home" && (
            <Link href={`/p/${post.id}/poster`} className="poster-cta">
              <span className="pc-ico" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z"/></svg></span>
              <span><b>พิมพ์โปสเตอร์{post.status === "lost" ? "ตามหา" : "พบน้อง"} + QR Code</b><small>ขนาด A4 ไว้ติดเสาไฟ ร้านค้า ป้ายรถเมล์ สแกนแล้วเข้าประกาศนี้</small></span>
              <span aria-hidden="true">→</span>
            </Link>
          )}

          {panel === "sight" && (
            <form className="inline-form" onSubmit={submitSighting}>
              <div className="f-group">
                <span className="f-label">ปักหมุดจุดที่เห็น <span className="hint">แนะนำ เจ้าของจะนำทางไปได้ทันที</span></span>
                <LocationPicker value={sLoc} color="#f08c2e" height={240}
                  onChange={(v) => { setSLoc(v); if (v) setSArea(nearestArea(v.lat, v.lng)); }} />
              </div>
              <div className="f-group">
                <span className="f-label">เห็นเมื่อไหร่</span>
                <WhenPicker id="sWhen" value={sWhen} onChange={setSWhen} presets={[["ตอนนี้", 0], ["30 นาทีก่อน", 30], ["1 ชม.ก่อน", 60], ["3 ชม.ก่อน", 180]]} />
              </div>
              <label className="f">เห็นที่ไหน
                <select id="sArea" value={sArea} onChange={(e) => setSArea(e.target.value)}>
                  {Object.entries(AREAS).map(([k, a]) => <option key={k} value={k}>{a.n}</option>)}
                </select>
              </label>
              <label className="f">รายละเอียด <span className="hint">จุดสังเกต เวลา ทิศทางที่ไป</span>
                <input id="sNote" type="text" maxLength={120} value={sNote} onChange={(e) => setSNote(e.target.value)} />
              </label>
              <ImagePicker id="sPhoto" value={sPhoto} onChange={setSPhoto} label="แนบรูปที่ถ่ายได้ (ไม่บังคับ)" compact />
              <button className="btn primary small" type="submit" disabled={busy}>{busy ? "กำลังส่ง…" : "ส่งข้อมูล"}</button>
            </form>
          )}

          {isNew && token && (
            <div className="token-box">
              <strong>ลงประกาศเรียบร้อย!</strong> เบราว์เซอร์นี้จำสิทธิ์แก้ไขประกาศไว้แล้ว
              ถ้าเปลี่ยนเครื่อง ให้เก็บรหัสนี้ไว้: <code>{token}</code>
            </div>
          )}

          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{post.description}</p>

          <section className="panel">
            <dl className="facts">
              <dt>ชนิด</dt><dd>{speciesName(post)}</dd>
              <dt>สี</dt><dd>{FUR[post.fur]?.[0] ?? "-"}</dd>
              <dt>พื้นที่</dt><dd>{areaName(post.area)}</dd>
              {eventVerb(post) && <><dt>{eventVerb(post)}เมื่อ</dt><dd>{fullDateTime(eventAt(post))}</dd></>}
              <dt>ลงประกาศ</dt><dd>{fullDateTime(post.created_at)}</dd>
              {post.reward && <><dt>ค่าตอบแทน</dt><dd style={{ color: "var(--lost)" }}>{post.reward}</dd></>}
            </dl>
            <a className="btn gmaps" href={gmapsUrl(post.lat, post.lng)} target="_blank" rel="noopener noreferrer">
              <GmapsIcon /> นำทางไปจุดที่{post.status === "found" ? "พบ" : "หาย"}ด้วย Google Maps
            </a>
          </section>

          <section className="panel contact-card">
            <h3>ติดต่อ{post.status === "found" ? "ผู้พบ" : "เจ้าของ"}{post.contact_name ? ` · ${post.contact_name}` : ""}</h3>
            <div className="contact-line">
              <a className="phone" href={`tel:${tel}`}>{post.phone}</a>
              <div style={{ display: "flex", gap: 8 }}>
                <a className="btn small primary" href={`tel:${tel}`}>โทร</a>
                <button className="btn small" onClick={() => copy(post.phone, "คัดลอกเบอร์แล้ว")}>คัดลอก</button>
              </div>
            </div>
            {post.line_id && (
              <div className="contact-line">
                <span>LINE: <strong>{post.line_id}</strong></span>
                <button className="btn small" onClick={() => copy(post.line_id, "คัดลอก LINE ID แล้ว")}>คัดลอก</button>
              </div>
            )}
          </section>

          <div className="btns">
            {token && post.status !== "home" && (
              <button className="btn homebtn" onClick={onHome} disabled={busy}>ทำเครื่องหมายว่ากลับบ้านแล้ว</button>
            )}
            {token && panel !== "delete" && (
              <button className="btn danger small" onClick={() => setPanel("delete")}>ลบประกาศของฉัน</button>
            )}
            {token && panel === "delete" && (
              <div className="inline-form">
                ลบประกาศนี้ถาวร? ข้อมูลคนที่แจ้งว่าเห็นจะหายไปด้วย
                <div className="seg">
                  <button type="button" onClick={() => setPanel(null)}>ยกเลิก</button>
                  <button type="button" onClick={onDelete} disabled={busy} style={{ color: "var(--lost)" }}>ลบเลย</button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="section-h">มีคนเห็น ({sightings.length})</div>
            <div className="sightings">
              {sightings.length ? sightings.map((s) => (
                <div className="sight" key={s.id}>
                  <div>
                    {s.note || "แจ้งว่าเห็น"}
                    <div className="meta">
                      เห็น <TimeAgo iso={seenAt(s)} clock /> · {areaName(s.area)} ·{" "}
                      <a href={s.lat ? gmapsUrl(s.lat, s.lng) : gmapsAreaUrl(s.area)} target="_blank" rel="noopener noreferrer" className="inline-link">{s.lat ? "นำทางไปจุดที่เห็น" : "นำทาง"}</a>
                    </div>
                  </div>
                  {safePhoto(s.photo_url) && (
                    <a href={safePhoto(s.photo_url)} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={safePhoto(s.photo_url)} alt="รูปจากคนที่เห็น" loading="lazy" />
                    </a>
                  )}
                </div>
              )) : <div className="meta">ยังไม่มีใครแจ้ง ถ้าเห็นน้องตัวนี้ กดปุ่ม "ฉันเห็นตัวนี้"</div>}
            </div>
          </div>

          {panel !== "report" ? (
            <button className="report-link" onClick={() => setPanel("report")}>แจ้งโพสต์ไม่เหมาะสม</button>
          ) : (
            <form className="inline-form" onSubmit={submitReport}>
              <label className="f">เหตุผล
                <input id="reason" type="text" maxLength={200} placeholder="เช่น สแปม, ข้อมูลปลอม, ขายสัตว์" value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <div className="seg">
                <button type="button" onClick={() => setPanel(null)}>ยกเลิก</button>
                <button type="submit" disabled={busy || !reason.trim()}>ส่งรายงาน</button>
              </div>
            </form>
          )}
        </div>
      </div>
      {toast}
    </>
  );
}

function GmapsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7Z" fill="#ea4335" />
      <circle cx="12" cy="9" r="2.6" fill="#fff" />
    </svg>
  );
}
