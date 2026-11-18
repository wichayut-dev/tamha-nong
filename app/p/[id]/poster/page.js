"use client";
// โปสเตอร์ A4 พร้อม QR Code สำหรับพิมพ์ไปติดตามเสาไฟ/ร้านค้า
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPost } from "@/lib/supabase";
import { areaName, eventAt, fullDateTime, petTitle, safePhoto, speciesName } from "@/lib/data";

function loadQr() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  return new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
    s.onload = () => ok(window.qrcode);
    s.onerror = () => no(new Error("โหลดตัวสร้าง QR ไม่สำเร็จ"));
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
        <Link href={`/p/${id}`} className="btn">← กลับไปหน้าประกาศ</Link>
        <button className="btn primary" onClick={() => window.print()}>พิมพ์ / บันทึกเป็น PDF</button>
      </div>
      {photo && (
        <div className="poster-fit no-print" role="group" aria-label="การจัดรูป">
          <span>รูปน้อง:</span>
          <button type="button" className={`chip`} aria-pressed={fit === "whole"} onClick={() => setFit("whole")}>เห็นทั้งตัว</button>
          <button type="button" className={`chip`} aria-pressed={fit === "fill"} onClick={() => setFit("fill")}>เต็มกรอบ</button>
          <button type="button" className="chip" onClick={() => setRot((r) => (r + 90) % 360)} aria-label="หมุนรูป 90 องศา">หมุนรูป ↻</button>
          {fit === "fill" && (
            <label className="poster-pos">เลื่อนรูปขึ้นลง
              <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(+e.target.value)} />
            </label>
          )}
        </div>
      )}
      <p className="hint no-print">เลือกกระดาษ A4 แนวตั้ง ปิด “หัวกระดาษและท้ายกระดาษ” ในหน้าต่างพิมพ์ จะได้โปสเตอร์เต็มหน้า</p>

      <article className={`poster ${lost ? "is-lost" : "is-found"}`}>
        <header className="ps-head">
          <h1>{lost ? "ตามหา" : "พบน้องหลง"}</h1>
          <p>{lost ? `${speciesName(p)}หาย · ใครพบเห็นโปรดติดต่อ` : `ใครเป็นเจ้าของ${speciesName(p)}ตัวนี้ โปรดติดต่อ`}</p>
        </header>
        <div className={`ps-photo fit-${fit}`} ref={box}>
          {photo ? (
            <>
              <img className="ps-bg" src={photo} alt="" aria-hidden="true" />
              <img className="ps-fg" src={photo} alt={petTitle(p)}
                onLoad={(e) => { nat.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight }; setRot((r) => r); }}
                style={{ ...(fit === "fill" ? { objectPosition: `50% ${pos}%` } : {}), transform: rot ? `rotate(${rot}deg) scale(${fit === "whole" ? rs : 1})` : undefined }} />
            </>
          ) : <span>ไม่มีรูป</span>}
        </div>
        <div className="ps-body">
          <h2>{petTitle(p)}</h2>
          <ul>
            <li><b>{lost ? "หายที่" : "พบที่"}</b> {areaName(p.area)}</li>
            <li><b>เมื่อ</b> {fullDateTime(eventAt(p))}</li>
            {p.description && <li className="ps-desc">{p.description}</li>}
          </ul>
          {p.reward && lost && <div className="ps-reward">รางวัลนำส่ง {p.reward}</div>}
        </div>
        <footer className="ps-foot">
          <div className="ps-call">
            <span>โทร</span>
            <strong>{p.phone}</strong>
            {p.line_id && <small>LINE: {p.line_id}</small>}
          </div>
          <div className="ps-qr">
            <div className="ps-qr-img" dangerouslySetInnerHTML={{ __html: qr }} />
            <small>สแกนดูรูปเพิ่ม<br />และแจ้งจุดที่เห็น</small>
          </div>
        </footer>
        <div className="ps-brand">ตามหาน้อง ภูเก็ต · แจ้งได้ฟรี ไม่ต้องสมัครสมาชิก</div>
      </article>
    </div>
  );
}
