"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import SetupNotice from "@/components/SetupNotice";
import { isConfigured, listPosts, subscribePosts } from "@/lib/supabase";

// Leaflet ใช้ window จึงต้องโหลดเฉพาะฝั่งเบราว์เซอร์
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="map empty">กำลังโหลดแผนที่…</div>,
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
      <h2 className="page-title" style={{ marginBottom: 12 }}>แผนที่ประกาศ</h2>
      {error && <div className="notice error">โหลดประกาศไม่สำเร็จ: {error}</div>}
      <MapView posts={posts} />
      <div className="legend">
        <span><i style={{ background: "var(--lost)" }} />ตามหา</span>
        <span><i style={{ background: "var(--found)" }} />มีคนพบ</span>
        <span><i style={{ background: "var(--home)" }} />กลับบ้านแล้ว</span>
      </div>
      <p className="meta">หมุดแสดงตำแหน่งโดยประมาณของพื้นที่ ไม่ใช่บ้านจริง เพื่อความเป็นส่วนตัว</p>
    </>
  );
}
