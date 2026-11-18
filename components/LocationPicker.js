"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { PHUKET_BOUNDS, PHUKET_CENTER, gmapsUrl, inPhuket } from "@/lib/data";

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
    if (/goo\.gl|maps\.app/.test(t)) setGps("ลิงก์แบบย่ออ่านพิกัดไม่ได้ เปิดลิงก์ใน Google Maps แล้วกดค้างที่หมุด คัดลอกพิกัด (เช่น 7.88, 98.39) มาวางแทน");
    else setGps("ไม่พบพิกัดในข้อความนี้ ลองวางลิงก์จาก Google Maps หรือพิกัดตัวเลข");
  }

  function pick(v) {
    if (!inPhuket(v.lat, v.lng)) return setGps("ตำแหน่งนี้อยู่นอกภูเก็ต กรุณาปักหมุดในเกาะภูเก็ต");
    setGps("");
    onChange(v);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setGps("อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง");
    setGps("กำลังหาตำแหน่ง…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        pick({ lat: p.coords.latitude, lng: p.coords.longitude });
        // บอกความแม่นยำ: คอมตั้งโต๊ะมักเดาจาก IP คลาดได้หลายกิโลเมตร
        const acc = p.coords.accuracy;
        if (acc > 300) setGps(`ตำแหน่งนี้อาจคลาดประมาณ ${acc >= 1000 ? (acc / 1000).toFixed(1) + " กม." : Math.round(acc) + " ม."} กรุณาลากหมุดหรือแตะแผนที่ให้ตรงจุดจริง`);
      },
      () => setGps("หาตำแหน่งไม่ได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง หรือแตะบนแผนที่แทน"),
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
          ใช้ตำแหน่งปัจจุบันของฉัน
        </button>
        {value && (
          <a className="btn small gmaps" href={gmapsUrl(value.lat, value.lng)} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg>
            เช็กจุดนี้ใน Google Maps
          </a>
        )}
        {value && <button type="button" className="btn small ghost" onClick={() => onChange(null)}>ล้างหมุด</button>}
      </div>
      <input type="text" className="picker-link" inputMode="url" value={link} placeholder="หรือวางลิงก์ Google Maps / พิกัด เช่น 7.8804, 98.3923"
        onChange={(e) => fromLink(e.target.value)} aria-label="วางลิงก์ Google Maps หรือพิกัด" />
      <span className={gps && !gps.startsWith("กำลัง") ? "err" : "hint"}>
        {gps || (value ? `ปักหมุดแล้ว (${value?.lat.toFixed(5)}, ${value?.lng.toFixed(5)}) ลากหมุดเพื่อขยับได้` : "แตะบนแผนที่ตรงจุดนั้นเพื่อปักหมุด คนที่เห็นประกาศจะกดนำทางด้วย Google Maps ไปที่หมุดได้ทันที")}
      </span>
    </div>
  );
}
