import Link from "next/link";
import { PetPhoto } from "./PetAvatar";
import { STATUS, areaName, cleanDesc, eventAt, eventVerb, isSample, petTitle } from "@/lib/data";
import TimeAgo from "./TimeAgo";

export default function PetCard({ post }) {
  const seen = post.sightings?.[0]?.count ?? 0;
  return (
    <Link href={`/p/${post.id}`} className="pcard">
      <div className="ph">
        <PetPhoto post={post} size={110} />
        <span className={`pill ${post.status}`}>{STATUS[post.status]}</span>
        {isSample(post) && <span className="sample-tag">ตัวอย่าง</span>}
        {seen > 0 && post.status !== "home" && <span className="seen">มีคนเห็น {seen} ครั้ง</span>}
      </div>
      <div className="bd">
        <h3>{petTitle(post)}</h3>
        <div className="meta">{areaName(post.area)}</div>
        <div className={`when-line ${post.status}`}>{eventVerb(post)} <TimeAgo iso={eventAt(post)} clock /></div>
        <p className="desc">{cleanDesc(post)}</p>
        {post.reward && post.status === "lost" && <div className="reward">ค่าตอบแทน {post.reward}</div>}
      </div>
    </Link>
  );
}
