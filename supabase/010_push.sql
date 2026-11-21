-- 010: แจ้งเตือนเข้ามือถือ (Web Push) ให้คนลงประกาศ เมื่อมีคนกด "ฉันเห็นตัวนี้"
-- วิธีใช้: แก้คำว่า PUT_YOUR_PUSH_SECRET (มีที่เดียว ด้านล่าง) ให้เป็นรหัสเดียวกับ PUSH_SECRET ใน Vercel
--          แล้วรันทั้งไฟล์ใน Supabase > SQL Editor (รันซ้ำได้ ไม่เสียหาย)

create extension if not exists pg_net;

-- เครื่องที่ขอรับแจ้งเตือนของแต่ละประกาศ (คนทั่วไปอ่าน/แก้ตรง ๆ ไม่ได้)
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  unique (post_id, endpoint)
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- สมัครรับแจ้งเตือน: ต้องมีรหัสแก้ไขของประกาศ (เฉพาะคนที่ลงประกาศ)
create or replace function public.subscribe_push(p_post_id uuid, p_token text, p_endpoint text, p_p256dh text, p_auth text)
returns boolean language plpgsql security definer set search_path = public, extensions, private as $$
begin
  perform private.hit('push', 20, 1000, interval '1 hour');
  if not exists (select 1 from post_secrets s where s.post_id = p_post_id and s.token_hash = crypt(p_token, s.token_hash)) then
    return false;
  end if;
  -- รับเฉพาะปลายทางของบริการแจ้งเตือนจริง (Google, Mozilla, Apple, Microsoft)
  if p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
     or char_length(p_endpoint) > 800
     or p_p256dh !~ '^[A-Za-z0-9_=-]{80,100}$'
     or p_auth !~ '^[A-Za-z0-9_=-]{16,30}$' then
    raise exception 'invalid push subscription';
  end if;
  insert into push_subscriptions (post_id, endpoint, p256dh, auth)
  values (p_post_id, p_endpoint, p_p256dh, p_auth)
  on conflict (post_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
  -- ประกาศหนึ่งเก็บไว้ไม่เกิน 5 เครื่องล่าสุด
  delete from push_subscriptions where post_id = p_post_id and id not in (
    select id from push_subscriptions where post_id = p_post_id order by created_at desc limit 5);
  return true;
end $$;
revoke all on function public.subscribe_push(uuid, text, text, text, text) from public;
grant execute on function public.subscribe_push(uuid, text, text, text, text) to anon, authenticated;

-- มีคนแจ้งว่าเห็น -> เรียกเว็บให้ส่งแจ้งเตือน (ถ้าส่งไม่ได้ การแจ้งว่าเห็นยังบันทึกตามปกติ)
create or replace function private.push_on_sighting() returns trigger
language plpgsql security definer set search_path = public, private, extensions as $$
declare
  v_subs jsonb;
  v_name text;
begin
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
    into v_subs from public.push_subscriptions where post_id = new.post_id;
  if jsonb_array_length(v_subs) = 0 then return new; end if;
  select nullif(trim(name), '') into v_name from public.posts where id = new.post_id;
  perform net.http_post(
    url := 'https://tamha-nong.vercel.app/api/push/notify',
    body := jsonb_build_object(
      'title', 'มีคนเห็น' || coalesce('น้อง' || v_name, 'น้องของคุณ') || '!',
      'body', coalesce(nullif(trim(new.note), ''), 'แตะเพื่อดูจุดที่เห็นและเวลา'),
      'url', '/p/' || new.post_id::text,
      'subs', v_subs),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', 'PUT_YOUR_PUSH_SECRET')
  );
  return new;
exception when others then
  return new;
end $$;
drop trigger if exists sightings_push on public.sightings;
create trigger sightings_push after insert on public.sightings
  for each row execute function private.push_on_sighting();
