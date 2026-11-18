-- ============================================================
-- อัปเกรด v2: ข้อมูลผู้ประกาศ, รูปตอนแจ้งว่าเห็น, รายงานโพสต์,
-- ระบบผู้ดูแล (admin) และอัปเดตแบบเรียลไทม์
-- วิธีใช้: SQL Editor > New query > วางทั้งไฟล์ > Run (รันซ้ำได้ ไม่เสียหาย)
-- ============================================================

-- ---------- คอลัมน์ใหม่ ----------
alter table public.posts add column if not exists contact_name text check (char_length(contact_name) <= 60);
alter table public.posts add column if not exists line_id     text check (char_length(line_id) <= 40);
alter table public.posts add column if not exists hidden      boolean not null default false;
alter table public.sightings add column if not exists photo_url text;

-- ---------- ผู้ดูแลระบบ ----------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- รายงานโพสต์ไม่เหมาะสม ----------
create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  reason     text not null check (char_length(reason) between 1 and 200)
);
create index if not exists reports_post_idx on public.reports (post_id);
alter table public.reports enable row level security;

-- ---------- สิทธิ์ (Row Level Security) ----------
-- ประกาศ: คนทั่วไปเห็นเฉพาะที่ไม่ถูกซ่อน, admin เห็นทั้งหมดและแก้/ลบได้
drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts for select using (hidden = false or public.is_admin());
drop policy if exists "posts admin update" on public.posts;
create policy "posts admin update" on public.posts for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "posts admin delete" on public.posts;
create policy "posts admin delete" on public.posts for delete using (public.is_admin());

-- แจ้งว่าเห็น: ทุกคนอ่านและเพิ่มได้, admin ลบได้
drop policy if exists "sightings insertable" on public.sightings;
create policy "sightings insertable" on public.sightings for insert
  with check (char_length(coalesce(note, '')) <= 120);
drop policy if exists "sightings admin delete" on public.sightings;
create policy "sightings admin delete" on public.sightings for delete using (public.is_admin());

-- รายงาน: ทุกคนส่งได้, เฉพาะ admin อ่าน/ลบได้
drop policy if exists "reports insertable" on public.reports;
create policy "reports insertable" on public.reports for insert with check (true);
drop policy if exists "reports admin read" on public.reports;
create policy "reports admin read" on public.reports for select using (public.is_admin());
drop policy if exists "reports admin delete" on public.reports;
create policy "reports admin delete" on public.reports for delete using (public.is_admin());

grant select on public.posts to anon, authenticated;
grant update, delete on public.posts to authenticated;
grant select, insert on public.sightings to anon, authenticated;
grant delete on public.sightings to authenticated;
grant insert on public.reports to anon, authenticated;
grant select, delete on public.reports to authenticated;
grant select on public.admins to authenticated;

-- ---------- ฟังก์ชันลงประกาศ (เวอร์ชันใหม่ เพิ่มชื่อผู้ติดต่อ/LINE) ----------
drop function if exists public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text);
create or replace function public.create_post(
  p_status text, p_species text, p_name text, p_fur text, p_area text,
  p_lat double precision, p_lng double precision, p_description text,
  p_phone text, p_reward text, p_photo_url text,
  p_contact_name text, p_line_id text
) returns table (id uuid, edit_token text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_token text := encode(gen_random_bytes(16), 'hex');
begin
  if p_status not in ('lost','found') then
    raise exception 'status must be lost or found';
  end if;
  insert into posts (status, species, name, fur, area, lat, lng, description, phone, reward, photo_url, contact_name, line_id)
  values (p_status, p_species, nullif(trim(p_name),''), p_fur, p_area, p_lat, p_lng,
          trim(p_description), trim(p_phone), nullif(trim(p_reward),''), p_photo_url,
          nullif(trim(p_contact_name),''), nullif(trim(p_line_id),''))
  returning posts.id into v_id;
  insert into post_secrets (post_id, token_hash) values (v_id, crypt(v_token, gen_salt('bf')));
  return query select v_id, v_token;
end $$;
revoke all on function public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text) from public;
grant execute on function public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text) to anon, authenticated;

-- ---------- ที่เก็บรูป: จำกัดขนาด/ชนิดไฟล์ และให้ admin ลบรูปได้ ----------
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp']
 where id = 'pet-photos';
drop policy if exists "pet photos admin delete" on storage.objects;
create policy "pet photos admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'pet-photos' and public.is_admin());

-- ---------- อัปเดตหน้าเว็บแบบเรียลไทม์ ----------
do $$ begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.sightings;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ============================================================
-- ตั้งตัวเองเป็น admin (ทำหลังสร้างผู้ใช้ใน Authentication > Users แล้ว)
-- เปลี่ยนอีเมลด้านล่างเป็นของคุณ แล้วรันเฉพาะบรรทัดนี้:
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
-- ============================================================
