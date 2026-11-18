"use client";
// แบนเนอร์สไลด์โชว์: รูปน้องใหญ่ตรงกลาง เปลี่ยนเองทุก 5 วินาที มีแถบเวลา ปุ่มหยุด และรูปตัวถัดไปด้านขวา
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PetPhoto } from "./PetAvatar";
import TimeAgo from "./TimeAgo";
import { STATUS, areaName, eventAt, eventVerb, isSample, petTitle } from "@/lib/data";

const SPEED = 5000;

export default function HeroShow({ posts }) {
  const slides = useMemo(() => {
    const all = posts ?? [];
    const waiting = all.filter((p) => p.status !== "home");
    const list = waiting.length >= 3 ? waiting : [...waiting, ...all.filter((p) => p.status === "home")];
    const ph = list.filter((p) => p.photo_url);
    return (ph.length >= 2 ? ph : list).slice(0, 6);
  }, [posts]);
  const n = slides.length;
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState(false);
  const touch = useRef(null);
  const secRef = useRef(null);
  // ขยับตามเมาส์ (parallax): ส่งตำแหน่งเมาส์เป็นตัวแปร CSS -1..1
  const onMove = (e) => {
    const el = secRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);
  useEffect(() => { if (i >= n) setI(0); }, [n, i]);

  const go = (k) => setI(((k % n) + n) % n);
  const next = () => go(i + 1);
  const running = playing && n > 1;

  const p = slides[i];
  const thumbs = n > 1 ? [1, 2].map((d) => (i + d) % n).filter((k, idx, a) => k !== i && a.indexOf(k) === idx) : [];

  return (
    <section className={`hs${running ? " is-run" : ""}`} aria-roledescription="carousel" aria-label="น้องที่รอกลับบ้าน"
      ref={secRef} onMouseMove={onMove}
      onMouseEnter={() => setHover(true)} onMouseLeave={(e) => { setHover(false); e.currentTarget.style.setProperty("--mx", 0); e.currentTarget.style.setProperty("--my", 0); }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { const s = touch.current; touch.current = null; if (s == null) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); }}>

      <div className="hs-copy">
        <h1><span style={{ whiteSpace: "nowrap" }}>หมาแมวหาย</span><br /><span style={{ whiteSpace: "nowrap" }}>ในภูเก็ต?</span></h1>
        <p className="hs-lead">ลงประกาศครั้งเดียว<br />ให้คนทั้งภูเก็ตช่วยกันตามหา</p>
        {p && (
          <Link href={`/p/${p.id}`} className="hs-now" key={p.id}>
            <span className={`pill ${p.status}`}>{STATUS[p.status]}</span>
            <span className="hs-now-t">
              <b>{petTitle(p)}{isSample(p) && <small> · ตัวอย่าง</small>}</b>
              <small>{areaName(p.area)} · {eventVerb(p)} <TimeAgo iso={eventAt(p)} /></small>
            </span>
            <span className="hs-arrow" aria-hidden="true">↗</span>
          </Link>
        )}
      </div>

      <div className="hs-stage" aria-live="polite">
        {slides.map((s, k) => (
          <Link key={s.id} href={`/p/${s.id}`} className={`hs-slide${k === i ? " on" : ""}${/-cut\./.test(s.photo_url || "") ? " is-cut" : ""}`} aria-hidden={k !== i} tabIndex={k === i ? 0 : -1}
            aria-label={`${petTitle(s)} ${STATUS[s.status]} ${areaName(s.area)}`}>
            <span className="hs-kb"><PetPhoto post={s} size={260} /></span>
          </Link>
        ))}
      </div>

      <div className="hs-side">
        {thumbs.map((k) => (
          <button key={slides[k].id} type="button" className="hs-thumb" onClick={() => { go(k); }} aria-label={`ดู ${petTitle(slides[k])}`}>
            <PetPhoto post={slides[k]} size={120} />
            <span className="hs-thumb-l">ดู</span>
            <span className="hs-thumb-n">{petTitle(slides[k])}</span>
            <span className="hs-thumb-a" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>

      <div className="hs-bar">
        <button type="button" className="hs-pause" onClick={() => setPlaying((v) => !v)} aria-pressed={!playing} aria-label={playing ? "หยุดชั่วคราว" : "เล่นต่อ"}>
          {playing
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.5 4.5h3.5v15H6.5zM14 4.5h3.5v15H14z" /></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" /></svg>}
        </button>
        <div className="hs-track" role="tablist" aria-label="เลือกตัว">
          {slides.map((s, k) => (
            <button key={s.id} type="button" role="tab" aria-selected={k === i} aria-label={petTitle(s)} onClick={() => go(k)}
              className={`hs-seg${k < i ? " past" : ""}${k === i ? " cur" : ""}`}>
              <span key={k === i ? `r${i}-${running}` : "x"} onAnimationEnd={k === i ? (e) => { if (e.animationName === "hs-tick" && !e.pseudoElement) next(); } : undefined} />
            </button>
          ))}
        </div>
        <div className="hs-cta">
          <Link href="/new?type=lost" className="hs-cta-main">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="12" cy="15.5" rx="5" ry="4.2" /><ellipse cx="5.6" cy="10" rx="2.1" ry="2.6" /><ellipse cx="9.4" cy="5.9" rx="2.1" ry="2.7" /><ellipse cx="14.6" cy="5.9" rx="2.1" ry="2.7" /><ellipse cx="18.4" cy="10" rx="2.1" ry="2.6" /></svg>
            น้องของฉันหาย
          </Link>
          <Link href="/new?type=found" className="hs-cta-alt" aria-label="ฉันเจอน้องหลง">ฉันเจอน้องหลง <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
  );
}
