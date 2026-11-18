-- รวมอัปเดตทั้งหมด (002 + 004 + 005) รันครั้งเดียวจบ รันซ้ำได้ไม่เสียหาย

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

-- อัปเกรด v2.2: รองรับสัตว์ชนิดอื่น (กระต่าย นก เต่า ฯลฯ)
-- วิธีใช้: SQL Editor > New query > วางทั้งไฟล์ > Run

alter table public.posts drop constraint if exists posts_species_check;
alter table public.posts add constraint posts_species_check check (species in ('dog','cat','other'));
alter table public.posts add column if not exists species_other text check (char_length(species_other) <= 30);

drop function if exists public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text);
create or replace function public.create_post(
  p_status text, p_species text, p_name text, p_fur text, p_area text,
  p_lat double precision, p_lng double precision, p_description text,
  p_phone text, p_reward text, p_photo_url text,
  p_contact_name text, p_line_id text, p_species_other text
) returns table (id uuid, edit_token text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_token text := encode(gen_random_bytes(16), 'hex');
begin
  if p_status not in ('lost','found') then
    raise exception 'status must be lost or found';
  end if;
  insert into posts (status, species, species_other, name, fur, area, lat, lng, description, phone, reward, photo_url, contact_name, line_id)
  values (p_status, p_species, case when p_species = 'other' then nullif(trim(p_species_other),'') end,
          nullif(trim(p_name),''), p_fur, p_area, p_lat, p_lng,
          trim(p_description), trim(p_phone), nullif(trim(p_reward),''), p_photo_url,
          nullif(trim(p_contact_name),''), nullif(trim(p_line_id),''))
  returning posts.id into v_id;
  insert into post_secrets (post_id, token_hash) values (v_id, crypt(v_token, gen_salt('bf')));
  return query select v_id, v_token;
end $$;
revoke all on function public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text) from public;
grant execute on function public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text) to anon, authenticated;

-- อัปเกรด v2.6: ปักหมุดตำแหน่งจริงตอนแจ้งว่าเห็นน้อง
-- วิธีใช้: SQL Editor > New query > วางทั้งไฟล์ > Run
alter table public.sightings add column if not exists lat double precision check (lat between 7.5 and 8.4);
alter table public.sightings add column if not exists lng double precision check (lng between 98.1 and 98.6);

-- อัปเกรด v2.8: เก็บเวลาที่หาย/พบ และเวลาที่เห็นน้องจริง
alter table public.posts add column if not exists happened_at timestamptz;
alter table public.sightings add column if not exists seen_at timestamptz;

drop function if exists public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text);
create or replace function public.create_post(
  p_status text, p_species text, p_name text, p_fur text, p_area text,
  p_lat double precision, p_lng double precision, p_description text,
  p_phone text, p_reward text, p_photo_url text,
  p_contact_name text, p_line_id text, p_species_other text, p_happened_at timestamptz
) returns table (id uuid, edit_token text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_token text := encode(gen_random_bytes(16), 'hex');
begin
  if p_status not in ('lost','found') then
    raise exception 'status must be lost or found';
  end if;
  insert into posts (status, species, species_other, name, fur, area, lat, lng, description, phone, reward,
                     photo_url, contact_name, line_id, happened_at)
  values (p_status, p_species, case when p_species = 'other' then nullif(trim(p_species_other),'') end,
          nullif(trim(p_name),''), p_fur, p_area, p_lat, p_lng,
          trim(p_description), trim(p_phone), nullif(trim(p_reward),''), p_photo_url,
          nullif(trim(p_contact_name),''), nullif(trim(p_line_id),''),
          least(coalesce(p_happened_at, now()), now()))
  returning posts.id into v_id;
  insert into post_secrets (post_id, token_hash) values (v_id, crypt(v_token, gen_salt('bf')));
  return query select v_id, v_token;
end $$;
revoke all on function public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text,timestamptz) from public;
grant execute on function public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text,timestamptz) to anon, authenticated;

-- ============================================================
-- อัปเกรดความปลอดภัย v3 — ปิดช่องโหว่ที่ตรวจพบ
--  1) จำกัดจำนวนครั้ง (rate limit) กันสแปม/บอท: ลงประกาศ, แจ้งว่าเห็น, รายงาน, อัปโหลดรูป, เดารหัสแก้ไข
--  2) จำกัดคอลัมน์ที่คนทั่วไปเขียนได้ (กันปลอมเวลา/ปลอม id)
--  3) บังคับลิงก์รูปต้องมาจากที่เก็บรูปของเราเท่านั้น (กัน XSS ผ่านลิงก์ javascript:)
--  4) ตรวจค่า พื้นที่/สี/LINE ID ให้อยู่ในรูปแบบที่ถูกต้อง
--  5) ข้อมูลการพบเห็นของประกาศที่ถูกซ่อน ไม่ให้คนทั่วไปเห็น
--  6) ห้ามดูรายชื่อไฟล์ทั้งหมดในที่เก็บรูป
-- วิธีใช้: SQL Editor > New query > วางทั้งไฟล์ > Run (รันซ้ำได้)
-- ============================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- ---------- 1) Rate limit ----------
create table if not exists private.rate_events (
  id     bigserial primary key,
  ip     text not null,
  action text not null,
  at     timestamptz not null default now()
);
create index if not exists rate_events_idx on private.rate_events (action, ip, at);
create index if not exists rate_events_at_idx on private.rate_events (at);
revoke all on private.rate_events from public, anon, authenticated;

create or replace function private.req_ip() returns text
language plpgsql stable as $$
declare h json; v text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then h := null;
  end;
  v := coalesce(h->>'cf-connecting-ip', h->>'x-real-ip', split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1));
  return coalesce(nullif(trim(v), ''), 'unknown');
end $$;

-- p_limit ครั้งต่อ IP ภายใน p_window และ p_global ครั้งรวมทุกคน
create or replace function private.hit(p_action text, p_limit int, p_global int, p_window interval)
returns boolean
language plpgsql security definer set search_path = private, public as $$
declare v_ip text := private.req_ip();
begin
  -- คำสั่งจาก SQL Editor ของเจ้าของระบบ (ไม่ได้มาจากหน้าเว็บ) ไม่ถูกจำกัด
  if session_user not in ('authenticator', 'supabase_storage_admin') then return true; end if;
  if random() < 0.02 then delete from private.rate_events where at < now() - interval '2 days'; end if;
  if v_ip <> 'unknown' and (select count(*) from private.rate_events
      where action = p_action and ip = v_ip and at > now() - p_window) >= p_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from private.rate_events where action = p_action and at > now() - p_window) >= p_global then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into private.rate_events (ip, action) values (v_ip, p_action);
  return true;
end $$;
revoke all on function private.hit(text,int,int,interval) from public;
grant execute on function private.hit(text,int,int,interval) to anon, authenticated;

-- ---------- 2) สิทธิ์ระดับคอลัมน์ ----------
revoke insert, update, delete, truncate, references, trigger on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant update (status, species, species_other, name, fur, area, description, reward, contact_name, phone, line_id, hidden, photo_url)
  on public.posts to authenticated;           -- ยังต้องผ่าน policy "admin เท่านั้น"
grant delete on public.posts to authenticated; -- admin เท่านั้น (policy)

revoke all on public.sightings from anon, authenticated;
grant select on public.sightings to anon, authenticated;
grant insert (post_id, area, note, photo_url, lat, lng, seen_at) on public.sightings to anon, authenticated;
grant delete on public.sightings to authenticated; -- admin เท่านั้น (policy)

revoke all on public.reports from anon, authenticated;
grant insert (post_id, reason) on public.reports to anon, authenticated;
grant select, delete on public.reports to authenticated; -- admin เท่านั้น (policy)

revoke all on public.post_secrets from anon, authenticated;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

-- ---------- 3–4) ตรวจรูปแบบข้อมูล ----------
alter table public.posts drop constraint if exists posts_photo_url_safe;
alter table public.posts add constraint posts_photo_url_safe check (
  photo_url is null
  or photo_url ~ '^https://[a-z0-9]{10,40}\.supabase\.co/storage/v1/object/public/pet-photos/[0-9]{4}-[0-9]{2}-[0-9]{2}/[A-Za-z0-9-]{8,60}\.(jpg|png|webp)$'
  or photo_url ~ '^/samples/[a-z0-9-]{1,40}\.jpg$'
) not valid;
alter table public.sightings drop constraint if exists sightings_photo_url_safe;
alter table public.sightings add constraint sightings_photo_url_safe check (
  photo_url is null
  or photo_url ~ '^https://[a-z0-9]{10,40}\.supabase\.co/storage/v1/object/public/pet-photos/[0-9]{4}-[0-9]{2}-[0-9]{2}/[A-Za-z0-9-]{8,60}\.(jpg|png|webp)$'
) not valid;

alter table public.posts drop constraint if exists posts_area_valid;
alter table public.posts add constraint posts_area_valid check (area in
  ('patong','karon','kata','rawai','chalong','wichit','town','rassada','kathu','cherng','thalang','maikhao')) not valid;
alter table public.sightings drop constraint if exists sightings_area_valid;
alter table public.sightings add constraint sightings_area_valid check (area in
  ('patong','karon','kata','rawai','chalong','wichit','town','rassada','kathu','cherng','thalang','maikhao')) not valid;
alter table public.posts drop constraint if exists posts_fur_valid;
alter table public.posts add constraint posts_fur_valid check (fur in ('golden','orange','grey','black','white','brown','bw')) not valid;
alter table public.posts drop constraint if exists posts_line_valid;
alter table public.posts add constraint posts_line_valid check (line_id is null or line_id ~ '^[A-Za-z0-9._@-]{1,40}$') not valid;
alter table public.reports drop constraint if exists reports_reason_len;

-- ---------- การแจ้งว่าเห็น: rate limit + ล็อกเวลา ----------
create or replace function private.before_sighting() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.hit('sighting', 20, 600, interval '1 hour');
  if session_user = 'authenticator' then new.created_at := now(); end if;
  new.seen_at := least(greatest(coalesce(new.seen_at, now()), now() - interval '30 days'), now());
  if not exists (select 1 from posts p where p.id = new.post_id and p.hidden = false) then
    raise exception 'post not found';
  end if;
  return new;
end $$;
drop trigger if exists sightings_guard on public.sightings;
create trigger sightings_guard before insert on public.sightings for each row execute function private.before_sighting();

create or replace function private.before_report() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  perform private.hit('report', 10, 300, interval '1 hour');
  if session_user = 'authenticator' then new.created_at := now(); end if;
  return new;
end $$;
drop trigger if exists reports_guard on public.reports;
create trigger reports_guard before insert on public.reports for each row execute function private.before_report();

-- ---------- 5) ซ่อนการพบเห็นของประกาศที่ถูกซ่อน ----------
drop policy if exists "sightings readable" on public.sightings;
create policy "sightings readable" on public.sightings for select
  using (exists (select 1 from public.posts p where p.id = post_id)); -- RLS ของ posts ใช้ต่อ: ประกาศที่ซ่อนจะไม่ผ่าน

-- ---------- ลงประกาศ: rate limit ----------
create or replace function private.before_post() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if tg_op = 'INSERT' and session_user = 'authenticator' and not public.is_admin() then
    perform private.hit('post', 5, 200, interval '1 hour');
    new.created_at := now();
    new.hidden := false;
  end if;
  return new;
end $$;
drop trigger if exists posts_guard on public.posts;
create trigger posts_guard before insert on public.posts for each row execute function private.before_post();

-- ---------- เดารหัสแก้ไข: rate limit ----------
create or replace function public.mark_home(p_id uuid, p_token text)
returns boolean language plpgsql security definer set search_path = public, extensions, private as $$
begin
  perform private.hit('token', 20, 2000, interval '1 hour');
  if not exists (select 1 from post_secrets s where s.post_id = p_id and s.token_hash = crypt(p_token, s.token_hash)) then
    return false;
  end if;
  update posts set status = 'home' where id = p_id;
  return true;
end $$;
create or replace function public.delete_post(p_id uuid, p_token text)
returns boolean language plpgsql security definer set search_path = public, extensions, private as $$
begin
  perform private.hit('token', 20, 2000, interval '1 hour');
  if not exists (select 1 from post_secrets s where s.post_id = p_id and s.token_hash = crypt(p_token, s.token_hash)) then
    return false;
  end if;
  delete from posts where id = p_id;
  return true;
end $$;

-- ---------- 6) ที่เก็บรูป ----------
create or replace function private.allow_upload() returns boolean
language plpgsql security definer set search_path = private as $$
begin
  return private.hit('upload', 15, 600, interval '1 hour');
end $$;
revoke all on function private.allow_upload() from public;
grant execute on function private.allow_upload() to anon, authenticated;

drop policy if exists "pet photos upload" on storage.objects;
create policy "pet photos upload" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'pet-photos'
    and name ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}/[A-Za-z0-9-]{8,60}\.(jpg|png|webp)$'
    and private.allow_upload()
  );
-- ไม่ต้องมี policy อ่าน: bucket เป็น public อยู่แล้ว รูปเปิดผ่านลิงก์ได้ แต่ดูรายชื่อไฟล์ทั้งหมดไม่ได้
drop policy if exists "pet photos read" on storage.objects;

-- อัปเกรด v5: รูปถ่ายสถานที่ที่หาย/พบ
-- วิธีใช้: SQL Editor > New query > วางทั้งไฟล์ > Run (รันซ้ำได้)
alter table public.posts add column if not exists place_photo_url text;
alter table public.posts drop constraint if exists posts_place_photo_url_safe;
alter table public.posts add constraint posts_place_photo_url_safe check (
  place_photo_url is null
  or place_photo_url ~ '^https://[a-z0-9]{10,40}\.supabase\.co/storage/v1/object/public/pet-photos/[0-9]{4}-[0-9]{2}-[0-9]{2}/[A-Za-z0-9-]{8,60}\.(jpg|png|webp)$'
);
grant update (place_photo_url) on public.posts to authenticated; -- admin เท่านั้น (policy)

drop function if exists public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text,timestamptz,text);
create or replace function public.create_post(
  p_status text, p_species text, p_name text, p_fur text, p_area text,
  p_lat double precision, p_lng double precision, p_description text,
  p_phone text, p_reward text, p_photo_url text,
  p_contact_name text, p_line_id text, p_species_other text, p_happened_at timestamptz,
  p_place_photo_url text
) returns table (id uuid, edit_token text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_token text := encode(gen_random_bytes(16), 'hex');
begin
  if p_status not in ('lost','found') then
    raise exception 'status must be lost or found';
  end if;
  insert into posts (status, species, species_other, name, fur, area, lat, lng, description, phone, reward,
                     photo_url, contact_name, line_id, happened_at, place_photo_url)
  values (p_status, p_species, case when p_species = 'other' then nullif(trim(p_species_other),'') end,
          nullif(trim(p_name),''), p_fur, p_area, p_lat, p_lng,
          trim(p_description), trim(p_phone), nullif(trim(p_reward),''), p_photo_url,
          nullif(trim(p_contact_name),''), nullif(trim(p_line_id),''),
          least(coalesce(p_happened_at, now()), now()), p_place_photo_url)
  returning posts.id into v_id;
  insert into post_secrets (post_id, token_hash) values (v_id, crypt(v_token, gen_salt('bf')));
  return query select v_id, v_token;
end $$;
revoke all on function public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text,timestamptz,text) from public;
grant execute on function public.create_post(text,text,text,text,text,double precision,double precision,text,text,text,text,text,text,text,timestamptz,text) to anon, authenticated;
