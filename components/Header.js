"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "./Notifications";

// โลโก้: ป้ายชื่อห้อยปลอกคอ (สิ่งที่ช่วยให้น้องได้กลับบ้าน)
// ข้างในเป็นหน้า "ครึ่งแมวครึ่งหมา" หูซ้ายตั้งแบบแมว หูขวาพับแบบหมา
export function Logo({ size = 38 }) {
  return (
    <svg className="logo-mark" width={size} height={size * 1.1} viewBox="0 0 40 44" aria-hidden="true">
      <circle cx="20" cy="5.5" r="3.6" className="ring" fill="none" strokeWidth="2.4" />
      <circle cx="20" cy="26" r="17" className="tag" />
      <circle cx="20" cy="26" r="13.6" className="tag-rim" fill="none" strokeWidth="1" />
      <path d="M11.2 24.5 12.4 14.6 18.4 20.6Z" className="face" strokeLinejoin="round" />
      <ellipse cx="20.4" cy="28" rx="9.6" ry="8.2" className="face" />
      <ellipse cx="29.2" cy="24.6" rx="3.3" ry="6.4" transform="rotate(-28 29.2 24.6)" className="ear" />
      <circle cx="16.6" cy="27" r="1.45" className="eye" />
      <circle cx="23.6" cy="27" r="1.45" className="eye" />
      <path d="M18.6 30.2h3.6l-1.8 2.1Z" className="eye" strokeLinejoin="round" />
    </svg>
  );
}

export default function Header() {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");
  const cur = (href) => (path === href ? "page" : undefined);
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="brand">
          <Logo />
          <div className="wordmark">
            <h1>ตามหา<em>น้อง</em></h1>
            <small>ภูเก็ต</small>
          </div>
        </Link>
        {isAdmin ? (
          <span className="admin-tag">ผู้ดูแลระบบ</span>
        ) : (
          <nav className="nav" aria-label="เมนูหลัก">
            <Link href="/" aria-current={cur("/")}>ประกาศ</Link>
            <Link href="/map" aria-current={cur("/map")}>แผนที่</Link>
            <Link href="/new" className="cta">+ ลงประกาศ</Link>
          </nav>
        )}
        {!isAdmin && <Bell />}
      </div>
    </header>
  );
}
