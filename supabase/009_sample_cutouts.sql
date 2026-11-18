-- เปลี่ยนรูปประกาศตัวอย่างเป็นรูปตัดพื้นหลัง (ไฟล์อยู่ใน public/samples)
-- วิธีใช้: SQL Editor > New query > วางทั้งไฟล์ > Run (แตะเฉพาะประกาศตัวอย่าง)
update public.posts set photo_url = '/samples/husky-cut.jpg'      where description like '[ตัวอย่าง]%' and name = 'เปา';
update public.posts set photo_url = '/samples/beagle-cut.jpg'     where description like '[ตัวอย่าง]%' and name = 'ข้าวตู';
update public.posts set photo_url = '/samples/orange-cat-cut.jpg' where description like '[ตัวอย่าง]%' and name = 'แมวสีส้ม';
update public.posts set photo_url = '/samples/grey-cat-cut.jpg'   where description like '[ตัวอย่าง]%' and name = 'มิ้นท์';
update public.posts set photo_url = '/samples/labrador-cut.jpg'   where description like '[ตัวอย่าง]%' and area = 'rawai' and fur = 'black';
update public.posts set photo_url = '/samples/pomeranian-cut.jpg' where description like '[ตัวอย่าง]%' and name = 'Lucky';
select name, area, photo_url from public.posts where description like '[ตัวอย่าง]%';
