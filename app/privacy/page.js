import PrivacyBody from "@/components/PrivacyBody";

export const metadata = { title: "นโยบายความเป็นส่วนตัว", description: "ตามหาน้อง ภูเก็ต เก็บข้อมูลอะไร ใช้ทำอะไร และขอลบได้อย่างไร" };

// เนื้อหาอยู่ใน PrivacyBody เพื่อให้เปลี่ยนภาษาได้
export default function Privacy() {
  return <PrivacyBody />;
}
