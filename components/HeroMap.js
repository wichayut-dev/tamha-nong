"use client";
// แผนที่ภูเก็ตเล็กบนหน้าแรก: โทนเทาอ่อนสบายตา หมุดสีตามสถานะ อัปเดตสด
import "leaflet/dist/leaflet.css";
import Tr from "./Tr";
import L from "leaflet";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { PHUKET_BOUNDS, STATUS, areaName, petTitle } from "@/lib/data";

const icon = (status, fresh) =>
  L.divIcon({
    className: "",
    html: `<span class="hm-pin ${status}${fresh ? " fresh" : ""}"><i></i></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

export default function HeroMap({ posts }) {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(m.matches);
    const on = (e) => setDark(e.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const day = Date.now() - 24 * 3600 * 1000;
  const pins = (posts ?? []).filter((p) => p.status !== "home" && p.lat && p.lng);

  return (
    <MapContainer bounds={[[7.74, 98.26], [8.12, 98.43]]} className="hm-map" zoomControl={false} attributionControl
      scrollWheelZoom={false} dragging={false} doubleClickZoom={false} touchZoom={false} keyboard={false} maxBounds={PHUKET_BOUNDS}>
      <TileLayer key={dark ? "d" : "l"}
        className="hm-tiles"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pins.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon(p.status, new Date(p.created_at).getTime() > day)}
          eventHandlers={{ click: () => router.push(`/p/${p.id}`) }}>
          <Tooltip direction="top" offset={[0, -10]} className="hm-tip">
            <b><Tr>{petTitle(p)}</Tr></b> · {STATUS[p.status]}<br /><small>{areaName(p.area)}</small>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
