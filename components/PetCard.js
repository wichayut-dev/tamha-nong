import Link from "next/link";
import Tr from "./Tr";
import { PetPhoto } from "./PetAvatar";
import { STATUS, areaName, cleanDesc, eventAt, eventVerb, isSample, petTitle } from "@/lib/data";
import TimeAgo from "./TimeAgo";
import { t } from "@/lib/i18n";

// เอียงการ์ดนิดหน่อยให้เหมือนใบประกาศที่แปะบนบอร์ด (ค่าคงที่ตาม id ไม่สุ่มใหม่ทุกครั้ง)
function tilt(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 7) - 3) * 0.3; // -0.9 ถึง 0.9 องศา
}

// การ์ดประกาศแบบใบปลิวติดเสาไฟ: แถบสถานะด้านบน เทปกาว รอยปรุด้านล่าง
export default function PetCard({ post }) {
  const seen = post.sightings?.[0]?.count ?? 0;
  return (
    <Link href={`/p/${post.id}`} className={`flyer ${post.status}`} style={{ "--tilt": `${tilt(post.id)}deg` }}>
      <span className="fl-tape" aria-hidden="true" />
      <div className="fl-band">
        <span>{STATUS[post.status]}</span>
        {isSample(post) && <span className="fl-sample">{t("sample")}</span>}
      </div>
      <div className="fl-photo">
        <PetPhoto post={post} size={110} />
        {seen > 0 && post.status !== "home" && <span className="fl-seen">{t("card_seen", { n: seen })}</span>}
      </div>
      <div className="fl-body">
        <h3><Tr>{petTitle(post)}</Tr></h3>
        <div className="fl-meta">
          <b>{areaName(post.area)}</b>
          {eventVerb(post) && <span>{eventVerb(post)} <TimeAgo iso={eventAt(post)} /></span>}
        </div>
        <p className="fl-desc"><Tr>{cleanDesc(post)}</Tr></p>
        {post.reward && post.status === "lost" && <div className="fl-reward">{t("card_reward", { r: "" }).trim()} <Tr>{post.reward}</Tr></div>}
      </div>
      <div className="fl-tear" aria-hidden="true">
        <span>{post.phone}</span><span>{post.phone}</span><span>{post.phone}</span>
      </div>
    </Link>
  );
}
