"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "./Notifications";
import { LangSwitch } from "./LangProvider";
import { t } from "@/lib/i18n";

// โลโก้ "บ้านหูแมว": บ้านที่หลังคาเป็นหูแมว หน้าต่างเปิดไฟรอน้องกลับบ้าน
export function Logo({ size = 38 }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path className="lm-house" d="M8.5 41V20.5L11 6.5 19.5 13.5h9L37 6.5l2.5 14V41Z" strokeWidth="3" strokeLinejoin="round" />
      <rect className="lm-win" x="13.6" y="19.6" width="7.4" height="7.4" rx="1.6" />
      <rect className="lm-win" x="27" y="19.6" width="7.4" height="7.4" rx="1.6" />
      <path className="lm-bar" d="M17.3 19.6v7.4M13.6 23.3h7.4M30.7 19.6v7.4M27 23.3h7.4" strokeWidth="1.1" />
      <path className="lm-door" d="M22.3 29.6h3.4L24 31.6Z" strokeWidth="1" strokeLinejoin="round" />
      <path className="lm-door" d="M19.2 42.5V37.4a4.8 4.8 0 0 1 9.6 0v5.1Z" />
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
            <small>{t("brand_sub")}</small>
          </div>
        </Link>
        {isAdmin ? (
          <span className="admin-tag">{t("admin_tag")}</span>
        ) : (
          <nav className="nav" aria-label={t("nav_main")}>
            <Link href="/" aria-current={cur("/")}>{t("nav_posts")}</Link>
            <Link href="/map" aria-current={cur("/map")}>{t("nav_map")}</Link>
            <Link href="/new" className="cta">{t("nav_new")}</Link>
          </nav>
        )}
        {!isAdmin && <LangSwitch />}
        {!isAdmin && <Bell />}
      </div>
    </header>
  );
}
