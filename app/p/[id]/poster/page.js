"use client";
// โปสเตอร์ A4 พร้อม QR Code สำหรับพิมพ์ไปติดตามเสาไฟ/ร้านค้า
import { useEffect, useRef, useState } from "react";
import Tr from "@/components/Tr";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPost } from "@/lib/supabase";
import { areaName, cleanDesc, eventAt, fullDateTime, petTitle, safePhoto, speciesName } from "@/lib/data";
import { t } from "@/lib/i18n";

function loadQr() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  return new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
    s.onload = () => ok(window.qrcode);
    s.onerror = () => no(new Error(t("qr_fail")));
    document.head.appendChild(s);
  });
}

export default function Poster() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [qr, setQr] = useState("");
  const [err, setErr] = useState("");
  const [fit, setFit] = useState("whole"); // whole = เห็นทั้งตัว, fill = เต็มกรอบ
  const [pos, setPos] = useState(50);      // ตำแหน่งแนวตั้งเมื่อเลือกเต็มกรอบ
  const [rot, setRot] = useState(0);       // หมุนรูปทีละ 90 องศา (รูปที่ถ่ายมาตะแคง)
  const [rs, setRs] = useState(1);         // ย่อรูปให้พอดีกรอบหลังหมุน
  const box = useRef(null);
  const nat = useRef(null);
  useEffect(() => {
    const b = box.current, n = nat.current;
    if (!b || !n || rot % 180 === 0) return setRs(1);
    const bw = b.clientWidth, bh = b.clientHeight, iw = n.w, ih = n.h;
    const before = Math.min(bw / iw, bh / ih), after = Math.min(bw / ih, bh / iw);
    setRs(after / before);
  }, [rot, fit]);

  useEffect(() => {
    getPost(id).then(setP).catch((e) => setErr(e.message));
    loadQr().then((qrcode) => {
      const q = qrcode(0, "M");
      q.addData(`${location.origin}/p/${id}`);
      q.make();
      setQr(q.createSvgTag({ cellSize: 6, margin: 0, scalable: true }));
    }).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="notice error">{err}</div>;
  if (!p) return <div className="skeleton" style={{ height: 600 }} />;
  const lost = p.status !== "found";
  const photo = safePhoto(p.photo_url);

  return (
    <div className="poster-page">
      <div className="poster-tools no-print">
        <Link href={`/p/${id}`} className="btn">{t("back_post")}</Link>
        <button className="btn primary" onClick={() => window.print()}>{t("print")}</button>
      </div>
      {photo && (
        <div className="poster-fit no-print" role="group" aria-label={t("fit_aria")}>
          <span>{t("pet_photo")}</span>
          <button type="button" className={`chip`} aria-pressed={fit === "whole"} onClick={() => setFit("whole")}>{t("fit_whole")}</button>
          <button type="button" className={`chip`} aria-pressed={fit === "fill"} onClick={() => setFit("fill")}>{t("fit_fill")}</button>
          <button type="button" className="chip" onClick={() => setRot((r) => (r + 90) % 360)} aria-label={t("rotate_aria")}>{t("rotate")}</button>
          {fit === "fill" && (
            <label className="poster-pos">{t("move_photo")}
              <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(+e.target.value)} />
            </label>
          )}
        </div>
      )}
      <p className="hint no-print">{t("print_hint")}</p>

      <article className={`poster ${lost ? "is-lost" : "is-found"}`}>
        <header className="ps-head">
          <h1>{t(lost ? "ps_lost" : "ps_found")}</h1>
          <p>{t(lost ? "ps_lost_sub" : "ps_found_sub", { species: speciesName(p), species_lc: speciesName(p).toLocaleLowerCase() })}</p>
        </header>
        <div className={`ps-photo fit-${fit}`} ref={box}>
          {photo ? (
            <>
              <img className="ps-bg" src={photo} alt="" aria-hidden="true" />
              <img className="ps-fg" src={photo} alt={petTitle(p)}
                onLoad={(e) => { nat.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }; setRot((r) => r); }}
                style={{ ...(fit === "fill" ? { objectPosition: `50% ${pos}%` } : {}), transform: rot ? `rotate(${rot}deg) scale(${fit === "whole" ? rs : 1})` : undefined }} />
            </>
          ) : <span>{t("no_photo")}</span>}
        </div>
        <div className="ps-body">
          <h2><Tr>{petTitle(p)}</Tr></h2>
          <ul>
            <li><b>{t(lost ? "ps_where_lost" : "ps_where_found")}</b> {areaName(p.area)}</li>
            <li><b>{t("ps_when")}</b> {fullDateTime(eventAt(p))}</li>
            {p.description && <li className="ps-desc"><Tr>{cleanDesc(p)}</Tr></li>}
          </ul>
          {p.reward && lost && <div className="ps-reward">{t("ps_reward", { r: "" }).trim()} <Tr>{p.reward}</Tr></div>}
        </div>
        <footer className="ps-foot">
          <div className="ps-call">
            <span>{t("ps_call")}</span>
            <strong>{p.phone}</strong>
            {p.line_id && <small>LINE: {p.line_id}</small>}
          </div>
          <div className="ps-qr">
            <div className="ps-qr-img" dangerouslySetInnerHTML={{ __html: qr }} />
            <small>{t("ps_scan1")}<br />{t("ps_scan2")}</small>
          </div>
        </footer>
        <div className="ps-brand">{t("ps_brand")}</div>
      </article>
    </div>
  );
}
