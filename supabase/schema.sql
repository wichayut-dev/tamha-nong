-- ============================================================
-- ตามหาน้อง ภูเก็ต — โครงสร้างฐานข้อมูล
-- วิธีใช้: Supabase > SQL Editor > New query > วางทั้งไฟล์ > Run
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- ตารางประกาศ ----------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  status      text not null check (status in ('lost','found','home')),
  species     text not null check (species in ('dog','cat')),
  name        text check (char_length(name) <= 40),
  fur         text not null,
  area        text not null,
  lat         double precision not null check (lat between 7.5 and 8.4),
  lng         double precision not null check (lng between 98.1 and 98.6),
  description text not null check (char_length(description) between 1 and 300),
  phone       text not null check (phone ~ '^[0-9+\- ]{9,15}$'),
  reward      text check (char_length(reward) <= 20),
  photo_url   text
);

-- ---------- รหัสลับสำหรับแก้ไขประกาศ (ไม่มีใครอ่านได้จากหน้าเว็บ) ----------
create table if not exists public.post_secrets (
  post_id    uuid primary key references public.posts(id) on delete cascade,
  token_hash text not null
);

-- ---------- ตารางแจ้งว่าเห็น ----------
create table if not exists public.sightings (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  area       text not null,
  note       text check (char_length(note) <= 120)
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists sightings_post_idx on public.sightings (post_id);

-- ---------- Row Level Security ----------
alter table public.posts        enable row level security;
alter table public.post_secrets enable row level security;
alter table public.sightings    enable row level security;

-- ทุกคนอ่านประกาศได้
drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts for select using (true);
-- ห้าม insert/update/delete ตรง ๆ ต้องผ่านฟังก์ชันด้านล่างเท่านั้น

-- post_secrets: ไม่มี policy = ไม่มีใครอ่านหรือเขียนได้จากหน้าเว็บ

-- ทุกคนอ่านและแจ้งว่าเห็นได้
drop policy if exists "sightings readable" on public.sightings;
create policy "sightings readable" on public.sightings for select using (true);
drop policy if exists "sightings insertable" on public.sightings;
create policy "sightings insertable" on public.sightings for insert with check (true);

-- ---------- ฟังก์ชันลงประกาศ: คืนค่า id และรหัสแก้ไข ----------
create or replace function public.create_post(
  p_status text, p_species text, p_name text, p_fur text, p_area text,
  p_lat double precision, p_lng double precision, p_description text,
  p_phone text, p_reward text, p_photo_url text
) returns table (id uuid, edit_token text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_token text := encode(gen_random_bytes(16), 'hex');
begin
  if p_status not in ('lost','found') then
    raise exception 'status must be lost or found';
  end if;
  insert into posts (status, species, name, fur, area, lat, lng, description, phone, reward, photo_url)
  values (p_status, p_species, nullif(trim(p_name),''), p_fur, p_area, p_lat, p_lng,
          trim(p_description), trim(p_phone), nullif(trim(p_reward),''), p_photo_url)
  returning posts.id into v_id;
  insert into post_secrets (post_id, token_hash) values (v_id, crypt(v_token, gen_salt('bf')));
  return query select v_id, v_token;
end $$;

-- ---------- ฟังก์ชันเปลี่ยนสถานะเป็น "กลับบ้านแล้ว" (ต้องมีรหัสแก้ไข) ----------
create or replace function public.mark_home(p_id uuid, p_token text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (
    select 1 from post_secrets s
    where s.post_id = p_id and s.token_hash = crypt(p_token, s.token_hash)
  ) then
    return false;
  end if;
  update posts set status = 'home' where id = p_id;
  return true;
end $$;

-- ---------- ฟังก์ชันลบประกาศ (ต้องมีรหัสแก้ไข) ----------
create or replace function public.delete_post(p_id uuid, p_token text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (
    select 1 from post_secrets s
    where s.post_id = p_id and s.token_hash = crypt(p_token, s.token_hash)
  ) then
    return false;
  end if;
  delete from posts where id = p_id;
  return true;
end $$;

revoke all on function public.create_post from public;
revoke all on function public.mark_home   from public;
revoke all on function public.delete_post from public;
grant execute on function public.create_post to anon, authenticated;
grant execute on function public.mark_home   to anon, authenticated;
grant execute on function public.delete_post to anon, authenticated;

-- ---------- ที่เก็บรูป ----------
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

drop policy if exists "pet photos upload" on storage.objects;
create policy "pet photos upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'pet-photos');

drop policy if exists "pet photos read" on storage.objects;
create policy "pet photos read" on storage.objects
  for select using (bucket_id = 'pet-photos');
