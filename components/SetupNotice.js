export default function SetupNotice() {
  return (
    <div className="notice error">
      ยังไม่ได้เชื่อมฐานข้อมูล: สร้างไฟล์ <code>.env.local</code> แล้วใส่ค่า Supabase ตามไฟล์ README ข้อ 3
      จากนั้นรีสตาร์ท <code>npm run dev</code>
    </div>
  );
}
