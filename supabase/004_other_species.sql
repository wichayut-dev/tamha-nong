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
