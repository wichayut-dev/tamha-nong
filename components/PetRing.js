"use client";
// วงล้อน้องที่รอกลับบ้าน — แรงบันดาลใจจาก "runway carousel"
// เดสก์ท็อป: วงล้อ 3D หมุนได้ ลาก/ปัด/ลูกศร/คีย์บอร์ด และเล่นอัตโนมัติทุก 5 วินาที
// มือถือ: เรียงเป็นแถวเฉียง ปัดทีละตัว
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PetPhoto } from "./PetAvatar";
import TimeAgo from "./TimeAgo";
import { STATUS, areaName, cleanDesc, eventAt, eventVerb, isSample, petTitle, speciesName } from "@/lib/data";

const SPEED = 5000;
const K = 95, C = 2 * Math.sqrt(K);

export default function PetRing({ posts, compact = false }) {
  const looks = useMemo(() => {
    // เอาน้องที่ยังรอกลับบ้านก่อน ถ้ามีน้อยกว่า 3 ตัว เติมด้วยน้องที่กลับบ้านแล้ว (เรื่องดี ๆ ให้คนเห็น)
    const all = posts ?? [];
    const waiting = all.filter((p) => p.status !== "home");
    const list = waiting.length >= 3 ? waiting : [...waiting, ...all.filter((p) => p.status === "home")];
    const ph = list.filter((p) => p.photo_url);
    return (ph.length >= 3 ? ph : list).slice(0, 6);
  }, [posts]);
  const n = looks.length;
  const N = n ? n * Math.ceil(8 / n) : 0;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hold, setHold] = useState(false);
  const stageRef = useRef(null);
  const bodies = useRef([]);
  const st = useRef({ cur: -1.15, target: 0, vel: 0, raf: 0, last: 0, W: 0, H: 0, mobile: false, drag: null, moved: 0 });
  const reduce = useRef(false);

  // ---------- วาดตำแหน่งการ์ดทุกใบ ----------
  const render = useCallback(() => {
    const s = st.current, W = s.W, H = s.H;
    if (!W) return;
    const still = Math.abs(s.cur - s.target) < 0.0005 && Math.abs(s.vel) < 0.0005;
    for (let a = 0; a < N; a++) {
      const el = bodies.current[a];
      if (!el) continue;
      let x, bottom, scale, op, blur, z;
      if (!s.mobile) {
        const step = (Math.PI * 2) / N, R = 0.62 * W, P = 1.65 * W;
        let phi = ((a - s.cur) * step) % (Math.PI * 2);
        if (phi > Math.PI) phi -= Math.PI * 2;
        if (phi <= -Math.PI) phi += Math.PI * 2;
        const depth = R * (1 - Math.cos(phi)), persp = P / (P + depth), sl = Math.abs(phi) / step;
        scale = persp * (1 + 0.08 * Math.max(0, Math.min(1, 1 - sl)));
        x = 0.5 * W + R * Math.sin(phi) * persp;
        const floor = H - 30, horizon = 0.3 * H;
        bottom = H - (horizon + (floor - horizon) * persp);
        blur = sl <= 1 ? 1.6 * sl : Math.min(1.6 + (sl - 1) * 2, 6);
        op = Math.max(0, Math.min(1, (Math.cos(phi) + 0.55) / 0.3));
        z = Math.round(scale * 1000);
      } else {
        let k = (((a - s.cur) % N) + N) % N;
        if (k > N / 2) k -= N;
        if (k < 0) { const e = Math.min(-k, 1.4); x = W * (0.36 - 0.55 * e); bottom = 20 - 20 * e; scale = 1 + 0.12 * e; op = Math.max(0, 1 - 1.05 * e); blur = 4 * Math.min(e, 1); z = 1100; }
        else { x = W * (0.36 + 0.34 * k); bottom = 20 + 22 * k; scale = Math.pow(0.76, k); op = k <= 3 ? 1 - 0.15 * k : 0; blur = Math.min(k, 3); z = 1000 - Math.round(10 * k); }
      }
      el.style.transform = `translate3d(${x}px, ${-bottom}px, 0) translateX(-50%) scale(${scale})`;
      el.style.opacity = op.toFixed(3);
      el.style.zIndex = z;
      el.style.visibility = op < 0.01 ? "hidden" : "visible";
      el.style.pointerEvents = op < 0.5 ? "none" : "auto";
      el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : "";
      el.classList.toggle("is-front", Math.abs(((((a - s.cur) % N) + N) % N)) < 0.02 || Math.abs((((a - s.cur) % N) + N) % N - N) < 0.02);
    }
    stageRef.current?.classList.toggle("is-still", still);
  }, [N]);

  const kick = useCallback(() => {
    const s = st.current;
    if (s.raf) return;
    const tick = (t) => {
      const dt = s.last ? Math.min(0.034, (t - s.last) / 1000) : 1 / 60;
      s.last = t;
      if (reduce.current && !s.drag) { s.cur = s.target; s.vel = 0; }
      else if (!s.drag) {
        const h = dt / 3;
        for (let i = 0; i < 3; i++) { const acc = -K * (s.cur - s.target) - C * s.vel; s.vel += acc * h; s.cur += s.vel * h; }
      } else s.cur += (s.target - s.cur) * 0.5;
      const done = !s.drag && Math.abs(s.cur - s.target) <= 0.0005 && Math.abs(s.vel) <= 0.0005;
      if (done) { s.cur = s.target; s.vel = 0; }
      render();
      if (done) { s.raf = 0; s.last = 0; } else s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  }, [render]);

  const moveTo = useCallback((T) => {
    if (!n) return;
    st.current.target = T;
    setIndex((((T % n) + n) % n));
    kick();
  }, [n, kick]);
  const next = useCallback(() => moveTo(Math.round(st.current.target) + 1), [moveTo]);
  const prev = useCallback(() => moveTo(Math.round(st.current.target) - 1), [moveTo]);
  const go = (i) => { let d = (((i - index) % n) + n) % n; if (d > n / 2) d -= n; moveTo(Math.round(st.current.target) + d); };

  // ---------- วัดขนาด ----------
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce.current) { st.current.cur = 0; setPlaying(false); }
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const s = st.current;
      s.W = r.width; s.H = r.height; s.mobile = r.width < 640;
      const cardH = s.mobile ? Math.max(200, r.height - 70) : Math.max(220, (r.height - 60) / 1.08);
      el.style.setProperty("--card-h", cardH + "px");
      render(); kick();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el); measure();
    return () => { ro.disconnect(); cancelAnimationFrame(st.current.raf); st.current.raf = 0; };
  }, [render, kick, N]);

  // ---------- เล่นอัตโนมัติ ----------
  useEffect(() => {
    if (!playing || hold || n < 2) return;
    const t = setTimeout(next, SPEED);
    return () => clearTimeout(t);
  }, [playing, hold, index, n, next]);

  // ---------- ลาก / ปัด ----------
  const onDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    st.current.drag = { x: e.clientX, y: e.clientY, t: st.current.target, on: false, samples: [{ x: e.clientX, t: performance.now() }] };
  };
  const onMove = (e) => {
    const d = st.current.drag; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { st.current.drag = null; return; }
      if (Math.abs(dx) > 8) { d.on = true; e.currentTarget.setPointerCapture?.(e.pointerId); stageRef.current.classList.add("is-dragging"); setHold(true); }
      else return;
    }
    d.samples.push({ x: e.clientX, t: performance.now() }); if (d.samples.length > 6) d.samples.shift();
    const unit = st.current.mobile ? Math.max(90, st.current.W * 0.5) : Math.max(120, st.current.W * 0.3);
    st.current.target = d.t - dx / unit; kick();
  };
  const onUp = (e) => {
    const d = st.current.drag; st.current.drag = null;
    stageRef.current?.classList.remove("is-dragging");
    setHold(false);
    if (!d || !d.on) return;
    st.current.moved = performance.now();
    const dx = e.clientX - d.x, f = d.samples[0], l = d.samples[d.samples.length - 1];
    const vx = (l.x - f.x) / Math.max(1, l.t - f.t), from = Math.round(d.t);
    if (st.current.mobile) moveTo(Math.abs(dx) > 30 || Math.abs(vx) > 0.3 ? from - Math.sign(dx) : from);
    else {
      const unit = Math.max(120, st.current.W * 0.3);
      let i = Math.round(st.current.target - (vx * 160) / unit);
      if (i === from && Math.abs(vx) > 0.3) i = from - Math.sign(vx);
      moveTo(Math.max(from - 2, Math.min(from + 2, i)));
    }
  };
  const onCardClick = (e, a) => {
    if (performance.now() - st.current.moved < 80) { e.preventDefault(); return; }
    const s = st.current;
    let k = (((a - Math.round(s.target)) % N) + N) % N; if (k > N / 2) k -= N;
    if (k !== 0) { e.preventDefault(); moveTo(Math.round(s.target) + k); setPlaying(false); }
  };
  const onKey = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  };

  if (n < 1) return null;
  const p = looks[index];
  const phone = p.phone?.replace(/[^0-9+]/g, "");

  return (
    <section className={`ring-sec${playing ? " is-playing" : ""}${compact ? " is-compact" : ""}`} aria-label="น้องที่กำลังรอกลับบ้าน">
      <div className="ring-left">
        <div className="ring-head">
          <h2>น้องที่รอ<em>กลับบ้าน</em></h2>
          {!compact && <p>ปัดหรือลากเพื่อดูทีละตัว ถ้าเคยเห็นน้อง กด “ฉันเห็นตัวนี้” ได้เลย</p>}
        </div>
        <div
          className="ring-stage" ref={stageRef} tabIndex={0} role="region" aria-roledescription="carousel"
          aria-label="ประกาศล่าสุด ใช้ลูกศรซ้ายขวาเพื่อเปลี่ยน"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}
          onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}
        >
          {Array.from({ length: N }, (_, a) => {
            const q = looks[a % n];
            return (
              <Link key={a} href={`/p/${q.id}`} className="ring-card" ref={(el) => (bodies.current[a] = el)}
                aria-hidden={a % n !== index || a >= n} tabIndex={a === (Math.round(st.current.target) % N + N) % N ? 0 : -1}
                onClick={(e) => onCardClick(e, a)} draggable={false}>
                <span className="ring-photo"><PetPhoto post={q} size={160} /></span>
                <span className={`pill ${q.status}`}>{STATUS[q.status]}</span>
                {isSample(q) && <span className="sample-tag">ตัวอย่าง</span>}
                <span className="ring-cap"><b>{petTitle(q)}</b><small>{areaName(q.area)}</small></span>
              </Link>
            );
          })}
          <span className="ring-floor" aria-hidden="true" />
        </div>
        <div className="ring-ctrl">
          <button className="ring-icon" onClick={() => { prev(); }} aria-label="ตัวก่อนหน้า">
            <svg width="24" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M25 7H1M7 1L1 7l6 6" /></svg>
          </button>
          <div className="ring-ticks">
            {looks.map((q, i) => (
              <button key={q.id} className={`ring-tick${i < index ? " is-past" : ""}${i === index && playing && !hold ? " is-run" : ""}`}
                aria-current={i === index} aria-label={`${i + 1}: ${petTitle(q)}`} onClick={() => go(i)}>
                <span className="bar" key={i === index ? `r${index}-${playing}-${hold}` : "b"} />
                <span className="lbl">{String(i + 1).padStart(2, "0")}{i === index && <span className="nm">&nbsp;&nbsp;{petTitle(q)}</span>}</span>
              </button>
            ))}
          </div>
          <button className="ring-icon" onClick={() => setPlaying((v) => !v)} aria-pressed={playing} aria-label={playing ? "หยุดเล่นอัตโนมัติ" : "เล่นอัตโนมัติ"}>
            {playing
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4.5h3.5v15H6.5zM14 4.5h3.5v15H14z" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12.5-7.5z" /></svg>}
          </button>
          <button className="ring-icon" onClick={() => { next(); }} aria-label="ตัวถัดไป">
            <svg width="24" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 7h24M19 1l6 6-6 6" /></svg>
          </button>
        </div>
        {compact && (
          <div className="ring-quick" key={p.id}>
            <span className={`pill ${p.status}`}>{STATUS[p.status]}</span>
            <span className="rq-txt"><b>{petTitle(p)}</b><small>{areaName(p.area)} · <TimeAgo iso={eventAt(p)} /></small></span>
            <Link href={`/p/${p.id}#seen`} className="btn primary small">ฉันเห็นตัวนี้</Link>
          </div>
        )}
      </div>

      {!compact && <aside className="ring-panel" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} aria-live="polite">
        <div className="ring-info" key={p.id}>
          <div className="ring-kicker">
            <span className={`pill ${p.status}`}>{STATUS[p.status]}</span>
            <span>{String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
          </div>
          <h3>{petTitle(p)}</h3>
          <dl className="ring-facts">
            <div><dt>ชนิด</dt><dd>{speciesName(p)}</dd></div>
            <div><dt>พื้นที่</dt><dd>{areaName(p.area)}</dd></div>
            <div><dt>{eventVerb(p) || "เมื่อ"}</dt><dd><TimeAgo iso={eventAt(p)} clock /></dd></div>
            {p.reward && <div><dt>รางวัล</dt><dd className="reward">{p.reward}</dd></div>}
          </dl>
          {isSample(p) && <p className="sample-note">ประกาศตัวอย่าง ไว้ให้ดูว่าเว็บทำงานอย่างไร</p>}
          {p.description && <p className="ring-desc">{cleanDesc(p)}</p>}
          <div className="ring-actions">
            <Link href={`/p/${p.id}#seen`} className="btn primary">ฉันเห็นตัวนี้</Link>
            <div className="ring-row">
              {phone && <a href={`tel:${phone}`} className="btn">โทรหาเจ้าของ</a>}
              <Link href={`/p/${p.id}`} className="btn">ดูประกาศเต็ม</Link>
            </div>
          </div>
        </div>
      </aside>}
    </section>
  );
}
