// หน้าผู้ดูแล: ห้าม Google/เครื่องมือค้นหาเก็บ ห้ามแชร์ตัวอย่างลิงก์
export const metadata = {
  title: "เข้าสู่ระบบ",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};
export default function AdminLayout({ children }) { return children; }
