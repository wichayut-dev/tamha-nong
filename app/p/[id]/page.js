"use client";
import { useCallback, useEffect, useState } from "react";
import Tr from "@/components/Tr";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PetPhoto } from "@/components/PetAvatar";
import ImagePicker from "@/components/ImagePicker";
import WhenPicker, { toLocalInput } from "@/components/WhenPicker";
import SetupNotice from "@/components/SetupNotice";
import { useToast } from "@/components/Toast";
import { addSighting, deletePost, getPost, isConfigured, markHome, reportPost, subscribePosts, uploadPhoto } from "@/lib/supabase";
import { AREAS, STATUS, areaName, eventAt, eventVerb, furName, fullDateTime, isSample, cleanDesc, seenAt, getToken, gmapsAreaUrl, gmapsUrl, nearestArea, petTitle, safePhoto, speciesName } from "@/lib/data";
import { t } from "@/lib/i18n";
import TimeAgo from "@/components/TimeAgo";
import PushToggle from "@/components/PushToggle";

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
  if (error) return <div className="notice error">{t("load_fail", { e: error })}</div>;
  if (post === undefined) return <div className="detail"><div className="skeleton" /><div className="skeleton" /></div>;
  if (post === null) return <div className="empty">{t("not_found")}<br /><Link href="/" className="btn" style={{ marginTop: 12 }}>{t("back_feed")}</Link></div>;

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) showToast(okMsg); } catch (e) { showToast(e.message); }
    setBusy(false);
  };

  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); showToast(msg); }
    catch { showToast(t("copy_fail")); }
  }

  async function share() {
    const url = `${window.location.origin}/p/${post.id}`;
    const text = t("share_text", { status: STATUS[post.status], name: petTitle(post), area: areaName(post.area) });
    try {
      if (navigator.share) await navigator.share({ title: "ตามหาน้อง ภูเก็ต", text, url });
      else await copy(`${text}\n${url}`, t("share_copied"));
    } catch {}
  }

  const submitSighting = (e) => {
    e.preventDefault();
    run(async () => {
      const url = sPhoto ? await uploadPhoto(sPhoto.blob) : null;
      await addSighting(post.id, sArea, sNote.trim(), url, sLoc, new Date(sWhen).toISOString());
      setPanel(null); setSNote(""); setSPhoto(null); setSLoc(null); setSWhen(toLocalInput(new Date()));
      await load();
    }, t("sight_sent"));
  };

  const submitReport = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    run(async () => { await reportPost(post.id, reason.trim()); setPanel(null); setReason(""); }, t("report_sent"));
  };

  const onHome = () => run(async () => {
    if (!(await markHome(post.id, token))) throw new Error(t("bad_token"));
    await load();
  }, t("home_ok"));

  const onDelete = () => run(async () => {
    if (!(await deletePost(post.id, token))) throw new Error(t("bad_token"));
    router.push("/");
  });

  const sightings = post.sightings ?? [];
  const placeLabel = t(post.status === "found" ? "place_found" : post.status === "lost" ? "place_lost" : "place_event");
  const tel = post.phone.replace(/[^0-9+]/g, "");

  return (
    <>
      <button className="back" onClick={() => (history.length > 1 ? router.back() : router.push("/"))}>{t("back")}</button>
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
                <img src={safePhoto(post.place_photo_url)} alt={placeLabel} loading="lazy" />
                <figcaption>📍 {placeLabel} · {areaName(post.area)}</figcaption>
              </figure>
            )}
            <div className="mini-legend">
              <span><i style={{ background: post.status === "found" ? "var(--found)" : "var(--lost)" }} />{t(post.status === "found" ? "spot_found" : "spot_lost")}</span>
              <span><i style={{ background: "#f08c2e" }} />{t("spot_seen")}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          <div>
            <h2 className="dname"><Tr>{petTitle(post)}</Tr></h2>
            {isSample(post) && <p className="sample-note">{t("sample_note")}</p>}
            <div className={`when-line big ${post.status}`}>{eventVerb(post)} <TimeAgo iso={eventAt(post)} clock /> · {areaName(post.area)}</div>
          </div>

          <div className="action-row">
            <a className="btn primary big" href={`tel:${tel}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
              {t(post.status === "found" ? "call_finder" : "call_owner")}
            </a>
            {post.status !== "home" && (
              <button className="btn warm big" onClick={() => setPanel(panel === "sight" ? null : "sight")}>{t("i_saw")}</button>
            )}
            <button className="btn big" onClick={share} aria-label={t("share_aria")}>{t("share")}</button>
          </div>
          {post.status !== "home" && (
            <Link href={`/p/${post.id}/poster`} className="poster-cta">
              <span className="pc-ico" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z"/></svg></span>
              <span><b>{t(post.status === "lost" ? "poster_lost" : "poster_found")}</b><small>{t("poster_sub")}</small></span>
              <span aria-hidden="true">→</span>
            </Link>
          )}

          {panel === "sight" && (
            <form className="inline-form" onSubmit={submitSighting}>
              <div className="f-group">
                <span className="f-label">{t("pin_seen")} <span className="hint">{t("pin_seen_hint")}</span></span>
                <LocationPicker value={sLoc} color="#f08c2e" height={240}
                  onChange={(v) => { setSLoc(v); if (v) setSArea(nearestArea(v.lat, v.lng)); }} />
              </div>
              <div className="f-group">
                <span className="f-label">{t("when_seen")}</span>
                <WhenPicker id="sWhen" value={sWhen} onChange={setSWhen} presets={[[t("when_now"), 0], [t("when_30m"), 30], [t("when_1h"), 60], [t("when_3h"), 180]]} />
              </div>
              <label className="f">{t("where_seen")}
                <select id="sArea" value={sArea} onChange={(e) => setSArea(e.target.value)}>
                  {Object.keys(AREAS).map((k) => <option key={k} value={k}>{areaName(k)}</option>)}
                </select>
              </label>
              <label className="f">{t("details")} <span className="hint">{t("details_hint")}</span>
                <input id="sNote" type="text" maxLength={120} value={sNote} onChange={(e) => setSNote(e.target.value)} />
              </label>
              <ImagePicker id="sPhoto" value={sPhoto} onChange={setSPhoto} label={t("attach_photo")} compact />
              <button className="btn primary small" type="submit" disabled={busy}>{busy ? t("sending") : t("send")}</button>
            </form>
          )}

          {isNew && token && (
            <div className="token-box">
              <strong>{t("posted_ok")}</strong> {t("token_note")} <code>{token}</code>
            </div>
          )}

          {token && post.status !== "home" && <PushToggle postId={post.id} token={token} />}

          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}><Tr>{cleanDesc(post)}</Tr></p>

          <section className="panel">
            <dl className="facts">
              <dt>{t("f_species")}</dt><dd>{speciesName(post)}</dd>
              <dt>{t("f_color")}</dt><dd>{furName(post.fur) || "-"}</dd>
              <dt>{t("f_area")}</dt><dd>{areaName(post.area)}</dd>
              {eventVerb(post) && <><dt>{t(post.status === "found" ? "f_when_found" : "f_when_lost")}</dt><dd>{fullDateTime(eventAt(post))}</dd></>}
              <dt>{t("f_posted")}</dt><dd>{fullDateTime(post.created_at)}</dd>
              {post.reward && <><dt>{t("f_reward")}</dt><dd style={{ color: "var(--lost)" }}><Tr>{post.reward}</Tr></dd></>}
            </dl>
            <a className="btn gmaps" href={gmapsUrl(post.lat, post.lng)} target="_blank" rel="noopener noreferrer">
              <GmapsIcon /> {t(post.status === "found" ? "nav_to_found" : "nav_to_lost")}
            </a>
          </section>

          <section className="panel contact-card">
            <h3>{t(post.status === "found" ? "contact_finder" : "contact_owner")}{post.contact_name ? ` · ${post.contact_name}` : ""}</h3>
            <div className="contact-line">
              <a className="phone" href={`tel:${tel}`}>{post.phone}</a>
              <div style={{ display: "flex", gap: 8 }}>
                <a className="btn small primary" href={`tel:${tel}`}>{t("call")}</a>
                <button className="btn small" onClick={() => copy(post.phone, t("phone_copied"))}>{t("copy")}</button>
              </div>
            </div>
            {post.line_id && (
              <div className="contact-line">
                <span>LINE: <strong>{post.line_id}</strong></span>
                <button className="btn small" onClick={() => copy(post.line_id, t("line_copied"))}>{t("copy")}</button>
              </div>
            )}
          </section>

          <div className="btns">
            {token && post.status !== "home" && (
              <button className="btn homebtn" onClick={onHome} disabled={busy}>{t("mark_home")}</button>
            )}
            {token && panel !== "delete" && (
              <button className="btn danger small" onClick={() => setPanel("delete")}>{t("delete_mine")}</button>
            )}
            {token && panel === "delete" && (
              <div className="inline-form">
                {t("delete_confirm")}
                <div className="seg">
                  <button type="button" onClick={() => setPanel(null)}>{t("cancel")}</button>
                  <button type="button" onClick={onDelete} disabled={busy} style={{ color: "var(--lost)" }}>{t("delete_now")}</button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="section-h">{t("seen_count", { n: sightings.length })}</div>
            <div className="sightings">
              {sightings.length ? sightings.map((s) => (
                <div className="sight" key={s.id}>
                  <div>
                    {s.note ? <Tr>{s.note}</Tr> : t("reported_seen")}
                    <div className="meta">
                      {t("seen_prefix")} <TimeAgo iso={seenAt(s)} clock /> · {areaName(s.area)} ·{" "}
                      <a href={s.lat ? gmapsUrl(s.lat, s.lng) : gmapsAreaUrl(s.area)} target="_blank" rel="noopener noreferrer" className="inline-link">{s.lat ? t("nav_to_seen") : t("navigate")}</a>
                    </div>
                  </div>
                  {safePhoto(s.photo_url) && (
                    <a href={safePhoto(s.photo_url)} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={safePhoto(s.photo_url)} alt={t("seen_photo_alt")} loading="lazy" />
                    </a>
                  )}
                </div>
              )) : <div className="meta">{t("none_seen")}</div>}
            </div>
          </div>

          {panel !== "report" ? (
            <button className="report-link" onClick={() => setPanel("report")}>{t("report_post")}</button>
          ) : (
            <form className="inline-form" onSubmit={submitReport}>
              <label className="f">{t("reason")}
                <input id="reason" type="text" maxLength={200} placeholder={t("reason_ph")} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <div className="seg">
                <button type="button" onClick={() => setPanel(null)}>{t("cancel")}</button>
                <button type="submit" disabled={busy || !reason.trim()}>{t("send_report")}</button>
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
