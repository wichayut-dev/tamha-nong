"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { t } from "@/lib/i18n";
import { PHUKET_CENTER, STATUS, areaName, gmapsUrl, petTitle, safePhoto } from "@/lib/data";

const COLORS = { lost: "#e0475a", found: "#1f9468", home: "#2f6fd6" };
const icon = (status) =>
  L.divIcon({
    className: "",
    html: `<div class="pin-dot" style="background:${COLORS[status]}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });

export default function MapView({ posts }) {
  return (
    <MapContainer center={PHUKET_CENTER} zoom={11} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {posts.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon(p.status)}>
          <Popup>
            <div className="popup">
              {safePhoto(p.photo_url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safePhoto(p.photo_url)} alt="" />
              )}
              <strong>{petTitle(p)} · {STATUS[p.status]}</strong>
              <span>{areaName(p.area)}</span>
              <Link href={`/p/${p.id}`}>{t("view_post")}</Link>
              <a href={gmapsUrl(p.lat, p.lng)} target="_blank" rel="noopener noreferrer">{t("nav_gmaps")}</a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
