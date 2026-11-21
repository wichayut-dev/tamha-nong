"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { PHUKET_BOUNDS, PHUKET_CENTER, gmapsUrl, inPhuket } from "@/lib/data";
import { t } from "@/lib/i18n";

const pinIcon = (color) =>
  L.divIcon({
    className: "",
    html: `<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 1C8.2 1 1 8 1 16.6 1 28 17 43 17 43s16-15 16-26.4C33 8 25.8 1 17 1Z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="17" cy="16.5" r="6" fill="#fff"/></svg>`,
    iconSize: [34, 44],
    iconAnchor: [17, 43],
  });

function ClickToPin({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FlyTo({ value }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// แผนที่ให้แตะเพื่อปักหมุด ลากหมุดเพื่อขยับ หรือใช้ตำแหน่งปัจจุบัน
export default function LocationPicker({ value, onChange, color = "#e0475a", height = 300 }) {
  const [gps, setGps] = useState("");
  const [link, setLink] = useState("");

  // อ่านพิกัดจากลิงก์ Google Maps หรือพิกัดที่วางมา เช่น "7.8804, 98.3923"
  function fromLink(text) {
    setLink(text);
    const t = decodeURIComponent(text || "");
    if (!t.trim()) return;
    const pats = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/];
    for (const re of pats) {
      const m = t.match(re);
      if (m) { pick({ lat: +m[1], lng: +m[2] }); setLink(""); return; }
    }
    if (/goo\.gl|maps\.app/.test(t)) setGps(t("loc_short_link"));
    else setGps(t("loc_no_coords"));
  }

  function pick(v) {
    if (!inPhuket(v.lat, v.lng)) return setGps(t("loc_outside"));
    setGps("");
    onChange(v);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setGps(t("loc_unsupported"));
    setGps(t("loc_finding"));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        pick({ lat: p.coords.latitude, lng: p.coords.longitude });
        // บอกความแม่นยำ: คอมตั้งโต๊ะมักเดาจาก IP คลาดได้หลายกิโลเมตร
        const acc = p.coords.accuracy;
        if (acc > 300) setGps(t("loc_inaccurate", { d: acc >= 1000 ? t("km", { n: (acc / 1000).toFixed(1) }) : t("m", { n: Math.round(acc) }) }));
      },
      () => setGps(t("loc_denied")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <div className="picker">
      <MapContainer center={value ? [value.lat, value.lng] : PHUKET_CENTER} zoom={value ? 15 : 11}
        maxBounds={PHUKET_BOUNDS} maxBoundsViscosity={0.8} minZoom={10}
        style={{ height }} className="picker-map" scrollWheelZoom={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToPin onPick={pick} />
        <FlyTo value={value} />
        {value && (
          <Marker position={[value.lat, value.lng]} icon={pinIcon(color)} draggable
            eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); pick({ lat: ll.lat, lng: ll.lng }); } }} />
        )}
      </MapContainer>
      <div className="picker-bar">
        <button type="button" className="btn small primary" onClick={useMyLocation}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          {t("use_my_loc")}
        </button>
        {value && (
          <a className="btn small gmaps" href={gmapsUrl(value.lat, value.lng)} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg>
            {t("check_gmaps")}
          </a>
        )}
        {value && <button type="button" className="btn small ghost" onClick={() => onChange(null)}>{t("clear_pin")}</button>}
      </div>
      <input type="text" className="picker-link" inputMode="url" value={link} placeholder={t("paste_ph")}
        onChange={(e) => fromLink(e.target.value)} aria-label={t("paste_aria")} />
      <span className={gps && gps !== t("loc_finding") ? "err" : "hint"}>
        {gps || (value ? t("pinned", { lat: value.lat.toFixed(5), lng: value.lng.toFixed(5) }) : t("tap_to_pin"))}
      </span>
    </div>
  );
}
