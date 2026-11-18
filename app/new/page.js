"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ImagePicker from "@/components/ImagePicker";
import WhenPicker, { toLocalInput } from "@/components/WhenPicker";
import SetupNotice from "@/components/SetupNotice";
import { createPost, isConfigured, uploadPhoto } from "@/lib/supabase";
import { AREAS, FUR, jitterAround, nearestArea, saveToken } from "@/lib/data";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false, loading: () => <div className="picker-map skeleton" style={{ height: 300, aspectRatio: "auto" }} /> });

const PHONE_RE = /^[0-9+\- ]{9,15}$/;

export default function NewPostPage() {
  const router = useRouter();
  const [f, setF] = useState({
    status: "lost", species: "dog", species_other: "", name: "", fur: "golden", area: "town",
    description: "", reward: "", contact_name: "", phone: "", line_id: "", happened_at: "",
  });
  const [photo, setPhoto] = useState(null);
  const [placePhoto, setPlacePhoto] = useState(null); // รูปสถานที่
  const [loc, setLoc] = useState(null); // หมุดที่ผู้ใช้ปัก
  const [err, setErr] = useState("");
  const [step, setStep] = useState(""); // ข้อความสถานะระหว่างบันทึก

  // เลือกประเภทจากปุ่มหน้าแรก และเติมข้อมูลติดต่อที่เคยกรอกไว้
  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get("type");
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("tamha-contact") || "{}"); } catch {}
    setF((s) => ({
      ...s,
      ...(type === "lost" || type === "found" ? { status: type } : {}),
      contact_name: saved.contact_name || "", phone: saved.phone || "", line_id: saved.line_id || "",
      happened_at: toLocalInput(new Date()),
    }));
  }, []);

  if (!isConfigured) return <SetupNotice />;

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const pick = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!f.description.trim()) return setErr("กรุณาใส่ลักษณะเด่นของน้อง");
    const when = new Date(f.happened_at);
    if (isNaN(when) || when.getTime() > Date.now() + 5 * 60000) return setErr("เวลาที่" + (f.status === "lost" ? "หาย" : "พบ") + "ต้องไม่เป็นเวลาในอนาคต");
    if (f.line_id.trim() && !/^[A-Za-z0-9._@-]{1,40}$/.test(f.line_id.trim())) return setErr("LINE ID ใช้ได้เฉพาะ a-z, 0-9 และ . _ -");
    if (!PHONE_RE.test(f.phone.trim())) return setErr("กรุณาใส่เบอร์โทรให้ถูกต้อง เช่น 081-234-5678");
    try {
      let photo_url = null;
      if (photo) { setStep("กำลังอัปโหลดรูป…"); photo_url = await uploadPhoto(photo.blob); }
      let place_photo_url = null;
      if (placePhoto) { setStep("กำลังอัปโหลดรูปสถานที่…"); place_photo_url = await uploadPhoto(placePhoto.blob); }
      setStep("กำลังบันทึกประกาศ…");
      const { id, edit_token } = await createPost({ ...f, happened_at: when.toISOString(), ...(loc ?? jitterAround(f.area)), photo_url, place_photo_url });
      saveToken(id, edit_token);
      try { localStorage.setItem("tamha-contact", JSON.stringify({ contact_name: f.contact_name, phone: f.phone, line_id: f.line_id })); } catch {}
      router.push(`/p/${id}?new=1`);
    } catch (e2) {
      setErr("ลงประกาศไม่สำเร็จ: " + e2.message);
      setStep("");
    }
  }

  const seg = (k, options) => (
    <div className="seg" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([v, label]) => (
        <button type="button" key={v} aria-pressed={f[k] === v} onClick={() => pick(k, v)}>{label}</button>
      ))}
    </div>
  );

  return (
    <form className="form-page" onSubmit={onSubmit} noValidate>
      <div>
        <h2 className="page-title">ลงประกาศ</h2>
        <p className="meta" style={{ margin: "4px 0 0" }}>กรอกแค่ช่องที่มี * ก็ลงประกาศได้ ประกาศขึ้นให้ทุกคนเห็นทันที</p>
      </div>

      <section className="panel">
        {seg("status", [["lost", "น้องของฉันหาย"], ["found", "ฉันเจอน้องหลง"]])}
        {seg("species", [["dog", "สุนัข"], ["cat", "แมว"], ["other", "อื่นๆ"]])}
        {f.species === "other" && (
          <label className="f">เป็นสัตว์อะไร <span className="hint">เช่น กระต่าย นก เต่า แฮมสเตอร์</span>
            <input id="species_other" type="text" maxLength={30} value={f.species_other} onChange={set("species_other")} />
          </label>
        )}
      </section>

      <section className="panel">
        <h3>รูปถ่าย</h3>
        <ImagePicker id="photo" value={photo} onChange={setPhoto} label="เพิ่มรูปน้อง" />
        <span className="hint">รูปหน้าชัด ๆ เห็นสีขนและปลอกคอ ช่วยให้คนจำได้ง่ายที่สุด</span>
      </section>

      <section className="panel">
        <h3>ข้อมูลน้อง</h3>
        <div className="grid2">
          <label className="f">ชื่อน้อง <span className="hint">ถ้าไม่รู้ชื่อ เว้นว่างได้</span>
            <input id="name" type="text" maxLength={40} value={f.name} onChange={set("name")} />
          </label>
          <label className="f">สี
            <select id="fur" value={f.fur} onChange={set("fur")}>
              {Object.entries(FUR).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
            </select>
          </label>
        </div>
        <div className="f-group">
          <span className="f-label">{f.status === "lost" ? "หายเมื่อไหร่" : "พบเมื่อไหร่"}</span>
          <WhenPicker id="happened_at" value={f.happened_at} onChange={(v) => pick("happened_at", v)} />
        </div>
        <div className="f-group">
          <span className="f-label">ปักหมุดจุดที่{f.status === "lost" ? "หาย" : "พบ"} <span className="hint">ช่วยให้คนไปหาถูกจุด</span></span>
          <LocationPicker value={loc} color={f.status === "lost" ? "#e0475a" : "#1f9468"}
            onChange={(v) => { setLoc(v); if (v) setF((s) => ({ ...s, area: nearestArea(v.lat, v.lng) })); }} />
          {f.status === "lost" && <span className="hint">ปักจุดที่น้องหายไป ไม่จำเป็นต้องเป็นบ้านของคุณ</span>}
        </div>
        <div className="f-group">
          <span className="f-label">รูปสถานที่ที่{f.status === "lost" ? "หาย" : "พบ"} <span className="hint">ไม่บังคับ ถ่ายป้ายร้าน ซอย หรือจุดสังเกต ช่วยให้คนจำที่ได้</span></span>
          <ImagePicker id="place_photo" value={placePhoto} onChange={setPlacePhoto} label="ถ่ายรูปสถานที่" compact />
        </div>
        <label className="f">พื้นที่ที่{f.status === "lost" ? "หาย" : "พบ"} <span className="hint">{loc ? "เลือกให้อัตโนมัติจากหมุด" : "ถ้าไม่ปักหมุด จะใช้จุดกลางของพื้นที่"}</span>
          <select id="area" value={f.area} onChange={set("area")}>
            {Object.entries(AREAS).map(([k, a]) => <option key={k} value={k}>{a.n}</option>)}
          </select>
        </label>
        <label className="f">ลักษณะเด่น <span className="req">*</span> <span className="hint">ปลอกคอ แผลเป็น นิสัย จุดที่{f.status === "lost" ? "หาย" : "พบ"} เวลา</span>
          <textarea id="description" maxLength={300} value={f.description} onChange={set("description")} />
          <span className="hint" style={{ justifySelf: "end" }}>{f.description.length}/300</span>
        </label>
        {f.status === "lost" && (
          <label className="f">ค่าตอบแทน <span className="hint">ไม่บังคับ</span>
            <input id="reward" type="text" placeholder="เช่น 1,000 บาท" maxLength={20} value={f.reward} onChange={set("reward")} />
          </label>
        )}
      </section>

      <section className="panel">
        <h3>ข้อมูลติดต่อ</h3>
        <div className="grid2">
          <label className="f">ชื่อผู้ติดต่อ <span className="hint">ไม่บังคับ</span>
            <input id="contact_name" type="text" maxLength={60} autoComplete="name" value={f.contact_name} onChange={set("contact_name")} />
          </label>
          <label className="f">เบอร์โทร <span className="req">*</span>
            <input id="phone" type="tel" placeholder="08x-xxx-xxxx" maxLength={15} autoComplete="tel" value={f.phone} onChange={set("phone")} />
          </label>
        </div>
        <label className="f">LINE ID <span className="hint">ไม่บังคับ</span>
          <input id="line_id" type="text" maxLength={40} value={f.line_id} onChange={set("line_id")} />
        </label>
        <span className="hint">ข้อมูลติดต่อจะแสดงในประกาศให้คนที่เห็นน้องติดต่อคุณได้ และเว็บจะจำไว้ให้ครั้งหน้า</span>
      </section>

      <div className="submit-bar">
        {err && <div className="notice error" role="alert" style={{ margin: 0 }}>{err}</div>}
        <p className="consent">กดลงประกาศ = ยอมรับให้แสดงข้อมูลและเบอร์โทรต่อสาธารณะ ตาม<Link href="/privacy" target="_blank">นโยบายความเป็นส่วนตัว</Link> · ประกาศจะซ่อนเองหลัง 60 วัน</p>
        <button className="btn warm block big" type="submit" disabled={!!step}>{step || (f.status === "lost" ? "ลงประกาศตามหา" : "ลงประกาศว่าพบน้อง")}</button>
      </div>
    </form>
  );
}
