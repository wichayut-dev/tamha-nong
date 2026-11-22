"use client";
import "leaflet/dist/leaflet.css";
import Tr from "./Tr";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { STATUS, gmapsUrl, timeAgo } from "@/lib/data";
import TimeAgo from "./TimeAgo";
import { t } from "@/lib/i18n";

const COLORS = { lost: "#e0475a", found: "#1f9468", home: "#2f6fd6" };
const bigPin = (color) => L.divIcon({
  className: "",
  html: `<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 1C8.2 1 1 8 1 16.6 1 28 17 43 17 43s16-15 16-26.4C33 8 25.8 1 17 1Z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="17" cy="16.5" r="6" fill="#fff"/></svg>`,
  iconSize: [34, 44], iconAnchor: [17, 43], popupAnchor: [0, -40],
});
const seenDot = L.divIcon({ className: "", html: '<div class="seen-dot">👁</div>'.replace("👁", ""), iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10] });

// แผนที่เล็กในหน้าประกาศ: หมุดใหญ่ = จุดที่หาย/พบ, จุดส้มเล็ก = จุดที่มีคนเห็น
export default function PostMiniMap({ post }) {
  const seen = (post.sightings ?? []).filter((s) => s.lat && s.lng);
  const pts = [[post.lat, post.lng], ...seen.map((s) => [s.lat, s.lng])];
  const bounds = pts.length > 1 ? L.latLngBounds(pts).pad(0.3) : null;
  return (
    <MapContainer {...(bounds ? { bounds } : { center: [post.lat, post.lng], zoom: 14 })}
      className="mini-map" scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[post.lat, post.lng]} icon={bigPin(COLORS[post.status])}>
        <Popup><div className="popup"><strong>{t(post.status === "found" ? "spot_found" : "spot_lost")}</strong><span>{STATUS[post.status]}</span>
          <a href={gmapsUrl(post.lat, post.lng)} target="_blank" rel="noopener noreferrer">{t("nav_gmaps")}</a></div></Popup>
      </Marker>
      {seen.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={seenDot}>
          <Popup><div className="popup"><strong>{t("someone_saw")}</strong><span><TimeAgo iso={s.seen_at || s.created_at} clock /></span>{s.note && <span><Tr>{s.note}</Tr></span>}
            <a href={gmapsUrl(s.lat, s.lng)} target="_blank" rel="noopener noreferrer">{t("nav_gmaps")}</a></div></Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
