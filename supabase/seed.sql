-- (ไม่บังคับ) ข้อมูลตัวอย่างสำหรับทดสอบ — รันหลัง schema.sql
-- ลบทิ้งได้ภายหลังด้วย: delete from posts where phone like '000-%';
insert into public.posts (status, species, name, fur, area, lat, lng, description, phone, reward, created_at) values
('lost','dog','ข้าวตู','golden','patong',7.8965,98.2975,'[ตัวอย่าง] ปลอกคอสีแดงมีกระดิ่ง ขี้กลัวเสียงพลุ','000-000-0001','2,000 บาท', now() - interval '5 hours'),
('found','cat',null,'orange','kata',7.8205,98.3018,'[ตัวอย่าง] เจอหน้าร้านสะดวกซื้อ ดูเชื่อง น่าจะมีเจ้าของ','000-000-0002',null, now() - interval '1 day'),
('lost','cat','มิ้นท์','grey','town',7.8853,98.3889,'[ตัวอย่าง] แมวสีเทา ตาเขียว ทำหมันแล้ว','000-000-0003',null, now() - interval '2 days'),
('found','dog',null,'black','rawai',7.7785,98.3262,'[ตัวอย่าง] เจอใกล้หาดราไวย์ ขาหลังบาดเจ็บเล็กน้อย','000-000-0004',null, now() - interval '8 hours'),
('home','dog','Lucky','white','cherng',7.9950,98.3015,'[ตัวอย่าง] ได้กลับบ้านแล้ว ขอบคุณทุกคนที่ช่วยแชร์','000-000-0005',null, now() - interval '4 days');
