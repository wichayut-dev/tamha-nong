"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import SetupNotice from "@/components/SetupNotice";
import { isConfigured, listPosts, subscribePosts } from "@/lib/supabase";
import { t } from "@/lib/i18n";

// Leaflet ใช้ window จึงต้องโหลดเฉพาะฝั่งเบราว์เซอร์
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="map empty">{t("map_loading")}</div>,
});

export default function MapPage() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isConfigured) return;
    const load = () => listPosts().then(setPosts).catch((e) => setError(e.message));
    load();
    return subscribePosts(load);
  }, []);

  if (!isConfigured) return <SetupNotice />;

  return (
    <>
      <h2 className="page-title" style={{ marginBottom: 12 }}>{t("map_title")}</h2>
      {error && <div className="notice error">{t("load_fail", { e: error })}</div>}
      <MapView posts={posts} />
      <div className="legend">
        <span><i style={{ background: "var(--lost)" }} />{t("status.lost")}</span>
        <span><i style={{ background: "var(--found)" }} />{t("status.found")}</span>
        <span><i style={{ background: "var(--home)" }} />{t("status.home")}</span>
      </div>
      <p className="meta">{t("map_note")}</p>
    </>
  );
}
