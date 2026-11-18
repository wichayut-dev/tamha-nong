import { FUR, safePhoto } from "@/lib/data";

// ภาพการ์ตูนหมา/แมว ใช้แทนเมื่อไม่มีรูปถ่าย
export default function PetAvatar({ species, fur, size = 80 }) {
  const c = FUR[fur]?.[1] ?? "#c9a27a";
  const dark = fur === "black";
  const eye = dark ? "#f2d36b" : "#1d1d1d";
  const shade = "rgba(0,0,0,.18)";

  if (species === "other") {
    return (
      <svg width={size * 0.8} height={size * 0.8} viewBox="0 0 24 24" fill={c} stroke={shade} strokeWidth="0.4" aria-hidden="true">
        <ellipse cx="12" cy="16" rx="5" ry="4" /><circle cx="6" cy="10" r="2.2" /><circle cx="18" cy="10" r="2.2" />
        <circle cx="9.5" cy="6" r="2.2" /><circle cx="14.5" cy="6" r="2.2" />
      </svg>
    );
  }
  if (species === "cat") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <path d="M24 44 L28 14 L46 32 Z" fill={c} stroke={shade} />
        <path d="M76 44 L72 14 L54 32 Z" fill={fur === "bw" ? "#2b2b2b" : c} stroke={shade} />
        <ellipse cx="50" cy="56" rx="30" ry="27" fill={c} stroke={shade} />
        {fur === "bw" && <path d="M50 30 C70 30 80 44 79 56 C66 52 58 42 50 30Z" fill="#2b2b2b" />}
        <ellipse cx="39" cy="52" rx="4" ry="5.5" fill={eye} />
        <ellipse cx="61" cy="52" rx="4" ry="5.5" fill={eye} />
        <path d="M46 63 L54 63 L50 68Z" fill="#e58a9a" />
        <path d="M30 64 H16 M30 68 L17 72 M70 64 H84 M70 68 L83 72" stroke={dark ? "#bbb" : "#555"} strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="22" cy="48" rx="11" ry="22" fill={c} stroke={shade} transform="rotate(18 22 48)" />
      <ellipse cx="78" cy="48" rx="11" ry="22" fill={c} stroke={shade} transform="rotate(-18 78 48)" />
      <ellipse cx="22" cy="50" rx="8" ry="18" fill={shade} transform="rotate(18 22 50)" />
      <ellipse cx="78" cy="50" rx="8" ry="18" fill={shade} transform="rotate(-18 78 50)" />
      <ellipse cx="50" cy="52" rx="28" ry="30" fill={c} stroke={shade} />
      <ellipse cx="50" cy="68" rx="15" ry="11" fill={dark ? "#4a4a4a" : "rgba(255,255,255,.55)"} />
      <circle cx="39" cy="48" r="4.5" fill={eye} />
      <circle cx="61" cy="48" r="4.5" fill={eye} />
      <ellipse cx="50" cy="62" rx="6" ry="4.5" fill="#1d1d1d" />
      <path d="M50 66 V72" stroke="#1d1d1d" strokeWidth="1.5" />
    </svg>
  );
}

export function PetPhoto({ post, size }) {
  const src = safePhoto(post.photo_url);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className={/-cut\.(jpg|png|webp)$/.test(src) ? "cut" : undefined} />;
  }
  return <PetAvatar species={post.species} fur={post.fur} size={size} />;
}
