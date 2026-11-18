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
