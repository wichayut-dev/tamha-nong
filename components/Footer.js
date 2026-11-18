import Link from "next/link";
import { Logo } from "./Header";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <div className="brand">
          <Logo size={28} />
          <div className="wordmark"><strong>ตามหาน้อง</strong><small>ภูเก็ต</small></div>
        </div>
        <p className="meta">โปรเจกต์ชุมชนเพื่อช่วยสัตว์เลี้ยงในภูเก็ตได้กลับบ้าน ใช้ฟรี ไม่มีโฆษณา</p>
        <nav className="foot-links">
          <Link href="/">ประกาศ</Link>
          <Link href="/map">แผนที่</Link>
          <Link href="/new">ลงประกาศ</Link>
          <Link href="/privacy">ความเป็นส่วนตัว</Link>
        </nav>
      </div>
    </footer>
  );
}
