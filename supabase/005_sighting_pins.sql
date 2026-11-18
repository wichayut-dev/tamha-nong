-- อัปเกรด v2.6: ปักหมุดตำแหน่งจริงตอนแจ้งว่าเห็นน้อง
-- วิธีใช้: SQL Editor > New query > วางทั้งไฟล์ > Run
alter table public.sightings add column if not exists lat double precision check (lat between 7.5 and 8.4);
alter table public.sightings add column if not exists lng double precision check (lng between 98.1 and 98.6);
