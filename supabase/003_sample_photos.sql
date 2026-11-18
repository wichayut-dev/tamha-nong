-- ข้อมูลตัวอย่างพร้อมรูป (รูปอยู่ในโฟลเดอร์ public/samples)
-- ลบตัวอย่างชุดเก่าก่อน แล้วใส่ชุดใหม่ 10 ตัว
delete from public.posts where phone like '000-%';

insert into public.posts (status, species, name, fur, area, lat, lng, description, contact_name, phone, line_id, reward, photo_url, created_at) values
('lost' ,'dog','โกลเด้น'   ,'golden','patong' ,7.8972,98.2961,'[ตัวอย่าง] โกลเด้นเพศผู้ 3 ขวบ ใส่ปลอกคอสีแดง ขี้เล่น เป็นมิตรกับคน หายแถวซอยบางลา','คุณต้น','000-000-0001','ton.pk','2,000 บาท','/samples/golden.jpg'    , now() - interval '3 hours'),
('found','dog','ลาบราดอร์' ,'black' ,'kathu'  ,7.9128,98.3345,'[ตัวอย่าง] เจอลาบราดอร์สีดำ เพศผู้ ประมาณ 2 ขวบ เชื่องมาก ตอนนี้ดูแลไว้ที่บ้าน','คุณมายด์','000-000-0002',null,null,'/samples/labrador.jpg'  , now() - interval '6 hours'),
('found','cat','แมวส้ม'    ,'orange','kata'   ,7.8211,98.3029,'[ตัวอย่าง] แมวส้มเพศเมีย ขี้อ้อน มานั่งหน้าร้านกาแฟ น่าจะมีเจ้าของ','ร้านกาแฟริมหาด','000-000-0003',null,null,'/samples/orange-cat.jpg', now() - interval '20 hours'),
('lost' ,'cat','มิ้นท์'     ,'grey'  ,'town'   ,7.8846,98.3871,'[ตัวอย่าง] แมวสีเทา ตาสีเหลืองอำพัน ทำหมันแล้ว ขี้อ้อน หายแถวถนนถลาง ย่านเมืองเก่า','คุณแพร','000-000-0004','prae.m',null,'/samples/grey-cat.jpg'  , now() - interval '2 days'),
('home' ,'dog','บีเกิ้ล'    ,'brown' ,'cherng' ,7.9962,98.3027,'[ตัวอย่าง] ได้กลับบ้านแล้ว เพื่อนบ้านเห็นประกาศแล้วโทรมาบอก ขอบคุณทุกคนที่ช่วยแชร์','คุณบอส','000-000-0005',null,null,'/samples/beagle.jpg'    , now() - interval '4 days'),
('home' ,'dog','ปอมเมอเรเนียน','white','rassada',7.9041,98.4062,'[ตัวอย่าง] น้องปอมขาว กลับบ้านได้ภายใน 1 วัน มีคนเห็นที่ตลาดแล้วแจ้งมา','คุณนุ่น','000-000-0006',null,null,'/samples/pomeranian.jpg', now() - interval '5 days'),
('lost' ,'dog','ฮัสกี้'     ,'grey'  ,'chalong',7.8437,98.3389,'[ตัวอย่าง] ไซบีเรียนฮัสกี้ ตาสีฟ้า เพศผู้ 2 ขวบ ชอบวิ่ง หลุดจากสายจูงแถวห้าแยกฉลอง','Mr. Alex','000-000-0007','alex.hky','3,000 บาท','/samples/husky.jpg'     , now() - interval '9 hours'),
('lost' ,'cat','โมจิ'      ,'bw'    ,'wichit' ,7.8615,98.3794,'[ตัวอย่าง] แมวสามสี เพศเมีย ใส่ปลอกคอสีชมพู ขี้กลัวคนแปลกหน้า','คุณฝน','000-000-0008',null,'500 บาท','/samples/calico.jpg'    , now() - interval '1 day'),
('found','cat','คิตตี้'     ,'bw'    ,'rawai'  ,7.7792,98.3270,'[ตัวอย่าง] เจอแมวขาวดำ สุขภาพดี ตัวสะอาด อยู่แถวท่าเรือราไวย์','คุณเจ','000-000-0009',null,null,'/samples/tuxedo.jpg'    , now() - interval '12 hours'),
('home' ,'cat','ปิงปิง'     ,'orange','thalang',8.0312,98.3366,'[ตัวอย่าง] แมวส้มขาว ได้กลับบ้านแล้ว ตอนนี้นอนหลับสบายอยู่ที่บ้าน','คุณปิง','000-000-0010',null,null,'/samples/ginger.jpg'    , now() - interval '6 days');
