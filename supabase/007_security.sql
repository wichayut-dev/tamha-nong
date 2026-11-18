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
