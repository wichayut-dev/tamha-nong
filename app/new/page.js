"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ImagePicker from "@/components/ImagePicker";
import WhenPicker, { toLocalInput } from "@/components/WhenPicker";
import SetupNotice from "@/components/SetupNotice";
import { createPost, isConfigured, uploadPhoto } from "@/lib/supabase";
import { AREAS, FUR, areaName, furName, jitterAround, nearestArea, saveToken } from "@/lib/data";
import { t } from "@/lib/i18n";

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
    if (!f.description.trim()) return setErr(t("err_desc"));
    const when = new Date(f.happened_at);
    if (isNaN(when) || when.getTime() > Date.now() + 5 * 60000) return setErr(t(f.status === "lost" ? "err_future_lost" : "err_future_found"));
    if (f.line_id.trim() && !/^[A-Za-z0-9._@-]{1,40}$/.test(f.line_id.trim())) return setErr(t("err_line"));
    if (!PHONE_RE.test(f.phone.trim())) return setErr(t("err_phone"));
    try {
      let photo_url = null;
      if (photo) { setStep(t("step_upload")); photo_url = await uploadPhoto(photo.blob); }
      let place_photo_url = null;
      if (placePhoto) { setStep(t("step_upload_place")); place_photo_url = await uploadPhoto(placePhoto.blob); }
      setStep(t("step_save"));
      const { id, edit_token } = await createPost({ ...f, happened_at: when.toISOString(), ...(loc ?? jitterAround(f.area)), photo_url, place_photo_url });
      saveToken(id, edit_token);
      try { localStorage.setItem("tamha-contact", JSON.stringify({ contact_name: f.contact_name, phone: f.phone, line_id: f.line_id })); } catch {}
      router.push(`/p/${id}?new=1`);
    } catch (e2) {
      setErr(t("post_fail", { e: e2.message }));
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
        <h2 className="page-title">{t("new_title")}</h2>
        <p className="meta" style={{ margin: "4px 0 0" }}>{t("new_sub")}</p>
      </div>

      <section className="panel">
        {seg("status", [["lost", t("cta_lost")], ["found", t("cta_found")]])}
        {seg("species", [["dog", t("species.dog")], ["cat", t("species.cat")], ["other", t("species.other")]])}
        {f.species === "other" && (
          <label className="f">{t("what_animal")} <span className="hint">{t("what_animal_hint")}</span>
            <input id="species_other" type="text" maxLength={30} value={f.species_other} onChange={set("species_other")} />
          </label>
        )}
      </section>

      <section className="panel">
        <h3>{t("photos")}</h3>
        <ImagePicker id="photo" value={photo} onChange={setPhoto} label={t("add_pet_photo")} />
        <span className="hint">{t("photo_hint")}</span>
      </section>

      <section className="panel">
        <h3>{t("pet_info")}</h3>
        <div className="grid2">
          <label className="f">{t("pet_name")} <span className="hint">{t("pet_name_hint")}</span>
            <input id="name" type="text" maxLength={40} value={f.name} onChange={set("name")} />
          </label>
          <label className="f">{t("color")}
            <select id="fur" value={f.fur} onChange={set("fur")}>
              {Object.entries(FUR).map(([k, v]) => <option key={k} value={k}>{furName(k)}</option>)}
            </select>
          </label>
        </div>
        <div className="f-group">
          <span className="f-label">{t(f.status === "lost" ? "when_lost" : "when_found")}</span>
          <WhenPicker id="happened_at" value={f.happened_at} onChange={(v) => pick("happened_at", v)} />
        </div>
        <div className="f-group">
          <span className="f-label">{t(f.status === "lost" ? "pin_lost" : "pin_found")} <span className="hint">{t("pin_hint")}</span></span>
          <LocationPicker value={loc} color={f.status === "lost" ? "#e0475a" : "#1f9468"}
            onChange={(v) => { setLoc(v); if (v) setF((s) => ({ ...s, area: nearestArea(v.lat, v.lng) })); }} />
          {f.status === "lost" && <span className="hint">{t("pin_lost_note")}</span>}
        </div>
        <div className="f-group">
          <span className="f-label">{t(f.status === "lost" ? "place_photo_lost" : "place_photo_found")} <span className="hint">{t("place_photo_hint")}</span></span>
          <ImagePicker id="place_photo" value={placePhoto} onChange={setPlacePhoto} label={t("take_place_photo")} compact />
        </div>
        <label className="f">{t(f.status === "lost" ? "area_lost" : "area_found")} <span className="hint">{loc ? t("area_auto") : t("area_center")}</span>
          <select id="area" value={f.area} onChange={set("area")}>
            {Object.keys(AREAS).map((k) => <option key={k} value={k}>{areaName(k)}</option>)}
          </select>
        </label>
        <label className="f">{t("features")} <span className="req">*</span> <span className="hint">{t(f.status === "lost" ? "features_hint_lost" : "features_hint_found")}</span>
          <textarea id="description" maxLength={300} value={f.description} onChange={set("description")} />
          <span className="hint" style={{ justifySelf: "end" }}>{f.description.length}/300</span>
        </label>
        {f.status === "lost" && (
          <label className="f">{t("reward")} <span className="hint">{t("optional")}</span>
            <input id="reward" type="text" placeholder={t("reward_ph")} maxLength={20} value={f.reward} onChange={set("reward")} />
          </label>
        )}
      </section>

      <section className="panel">
        <h3>{t("contact")}</h3>
        <div className="grid2">
          <label className="f">{t("contact_name")} <span className="hint">{t("optional")}</span>
            <input id="contact_name" type="text" maxLength={60} autoComplete="name" value={f.contact_name} onChange={set("contact_name")} />
          </label>
          <label className="f">{t("phone")} <span className="req">*</span>
            <input id="phone" type="tel" placeholder="08x-xxx-xxxx" maxLength={15} autoComplete="tel" value={f.phone} onChange={set("phone")} />
          </label>
        </div>
        <label className="f">LINE ID <span className="hint">{t("optional")}</span>
          <input id="line_id" type="text" maxLength={40} value={f.line_id} onChange={set("line_id")} />
        </label>
        <span className="hint">{t("contact_hint")}</span>
      </section>

      <div className="submit-bar">
        {err && <div className="notice error" role="alert" style={{ margin: 0 }}>{err}</div>}
        <p className="consent">{t("consent_a")}<Link href="/privacy" target="_blank">{t("privacy_policy")}</Link>{t("consent_b")}</p>
        <button className="btn warm block big" type="submit" disabled={!!step}>{step || t(f.status === "lost" ? "submit_lost" : "submit_found")}</button>
      </div>
    </form>
  );
}
