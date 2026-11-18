"use client";
import { useEffect, useState } from "react";
import { clockTime, fullDateTime, timeAgo } from "@/lib/data";

// นาฬิกากลางตัวเดียว ทุก TimeAgo บนหน้าเว็บอัปเดตพร้อมกันทุก 20 วินาที
const subs = new Set();
let timer = null;
function subscribe(fn) {
  subs.add(fn);
  if (!timer) timer = setInterval(() => subs.forEach((f) => f()), 20000);
  return () => {
    subs.delete(fn);
    if (!subs.size) { clearInterval(timer); timer = null; }
  };
}

export default function TimeAgo({ iso, clock = false }) {
  const [, tick] = useState(0);
  useEffect(() => subscribe(() => tick((x) => x + 1)), []);
  return (
    <time dateTime={iso} title={fullDateTime(iso)} suppressHydrationWarning>
      {clock ? <><b className="clock">{clockTime(iso)}</b> · {timeAgo(iso)}</> : timeAgo(iso)}
    </time>
  );
}
