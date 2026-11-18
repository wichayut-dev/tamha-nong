"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabBar() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  const cur = (href) => (path === href ? "page" : undefined);
  return (
    <nav className="tabs" aria-label="เมนูหลัก">
      <Link href="/" className="tab" aria-current={cur("/")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>
        ประกาศ
      </Link>
      <Link href="/new" className="tab" aria-current={cur("/new")}>
        <span className="plus"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6"><path d="M12 6v12M6 12h12" /></svg></span>
        ลงประกาศ
      </Link>
      <Link href="/map" className="tab" aria-current={cur("/map")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>
        แผนที่
      </Link>
    </nav>
  );
}
