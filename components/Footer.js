"use client";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { Logo } from "./Header";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <div className="brand">
          <Logo size={28} />
          <div className="wordmark"><strong>ตามหาน้อง</strong><small>{t("brand_sub")}</small></div>
        </div>
        <p className="meta">{t("footer_about")}</p>
        <nav className="foot-links">
          <Link href="/">{t("nav_posts")}</Link>
          <Link href="/map">{t("nav_map")}</Link>
          <Link href="/new">{t("nav_new_plain")}</Link>
          <Link href="/privacy">{t("privacy")}</Link>
        </nav>
      </div>
    </footer>
  );
}
