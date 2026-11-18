# ตามหาน้อง ภูเก็ต

เว็บรวมประกาศหมาแมวหายและที่มีคนพบในภูเก็ต ลงครั้งเดียว ไม่ต้องไล่โพสต์ทีละกลุ่มเฟซบุ๊ก

## ทำอะไรได้

- ลงประกาศหายหรือพบ พร้อมรูปน้องและรูปสถานที่ (รองรับไฟล์ HEIC จาก iPhone)
- ปักหมุดบนแผนที่ ใช้ตำแหน่งปัจจุบัน หรือวางลิงก์ Google Maps
- ปุ่ม "ฉันเห็นตัวนี้" ให้คนแจ้งจุดและเวลาที่เห็น
- นำทางไปที่หมุดด้วย Google Maps
- พิมพ์โปสเตอร์ A4 พร้อม QR Code
- เจ้าของปิดหรือลบประกาศเองได้โดยไม่ต้องสมัครสมาชิก
- ประกาศใหม่ขึ้นทุกเครื่องทันที ประกาศเกิน 60 วันซ่อนอัตโนมัติ
- หน้าผู้ดูแล: แก้ ซ่อน ลบ ดูรายงาน ส่งออก CSV
- ติดตั้งเป็นแอปบนมือถือได้ (PWA)

**เทคโนโลยี:** Next.js 15 · React 19 · Supabase (PostgreSQL, Storage, Realtime, Auth) · Leaflet + OpenStreetMap · Vercel

## รันบนเครื่อง

ต้องมี Node.js 20 ขึ้นไป

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com) (Region: Singapore)
2. SQL Editor → รัน `supabase/schema.sql` แล้วตามด้วย `supabase/UPDATE_ALL.sql`
3. คัดลอก `.env.example` เป็น `.env.local` ใส่ Project URL และ anon key
4. รัน

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 บนมือถือในวง Wi-Fi เดียวกันใช้ `http://<IP ของคอม>:3000`

### ตั้งผู้ดูแล

Supabase → Authentication → Users → Add user (ติ๊ก Auto Confirm) แล้วรันใน SQL Editor:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'อีเมลของคุณ'
on conflict do nothing;
```

จากนั้นปิด "Allow new users to sign up" ในหน้า Authentication

## ขึ้นเว็บจริง

Import repo นี้ใน Vercel ใส่ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` แล้ว Deploy
จากนั้นใส่ลิงก์เว็บใน Supabase → Authentication → URL Configuration → Site URL

## โครงสร้าง

```
app/            หน้าเว็บ (หน้าแรก, แผนที่, ลงประกาศ, ประกาศ, โปสเตอร์, ผู้ดูแล)
components/     ส่วนประกอบหน้าเว็บ
lib/            ข้อมูลพื้นที่ และฟังก์ชันคุยกับฐานข้อมูล
supabase/       ไฟล์ SQL สร้างตาราง สิทธิ์ และอัปเกรด
public/         ไอคอนและรูปตัวอย่าง
```

## ความปลอดภัย

- Row Level Security ทุกตาราง หน้าเว็บอ่านได้ แต่เขียนตรงไม่ได้ ต้องผ่านฟังก์ชันในฐานข้อมูล
- รหัสแก้ไขประกาศสุ่ม 128 บิต เก็บแบบ bcrypt ตัวจริงอยู่แค่ในเบราว์เซอร์ของเจ้าของ
- จำกัดจำนวนการโพสต์ แจ้งเห็น อัปโหลด และเดารหัส ต่อ IP
- รับลิงก์รูปจากที่เก็บรูปของเว็บเท่านั้น และรับเฉพาะ JPG/PNG/WebP ไม่เกิน 5 MB
- Security headers (CSP, X-Frame-Options, nosniff, HSTS) และกัน CSV injection ในไฟล์ส่งออก
- ห้ามใส่ `service_role` key ในโค้ดหรือ `.env.local`

## ที่จะทำต่อ

- แจ้งเตือนบนมือถือ (Web Push) เมื่อมีคนเห็นน้องหรือมีน้องหายใกล้บ้าน
- ภาษาอังกฤษ
- CAPTCHA (Cloudflare Turnstile)
