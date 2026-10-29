begin;

-- Temporary sandbox state; never marks auth.users.phone as genuinely verified.
create table public.store_demo_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  phone_verified boolean not null default false,
  plan_limit integer check(plan_limit in (1,5)),
  expires_at timestamptz not null
);
alter table public.store_demo_access enable row level security;
revoke all on public.store_demo_access from public, anon, authenticated;
grant select,insert,update,delete on public.store_demo_access to service_role;

create or replace function public.has_verified_phone() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id=auth.uid() and phone_confirmed_at is not null and phone is not null)
    or exists(select 1 from public.store_demo_access where user_id=auth.uid() and phone_verified and expires_at>now());
$$;
revoke execute on function public.has_verified_phone() from public,anon;
grant execute on function public.has_verified_phone() to authenticated;

create or replace function public.enforce_store_limit() returns trigger
language plpgsql security definer set search_path='' as $$
declare allowed integer; demo_limit integer;
begin
  select store_limit into allowed from public.entitlements where user_id=new.owner_id for update;
  select plan_limit into demo_limit from public.store_demo_access where user_id=new.owner_id and expires_at>now();
  allowed=coalesce(demo_limit,allowed,1);
  if not exists(select 1 from public.profiles where id=new.owner_id and account_type='kgpians') then raise exception 'A verified IIT KGP account is required.'; end if;
  if (select count(*) from public.stores where owner_id=new.owner_id)>=allowed then raise exception 'Your account has reached its store limit.'; end if;
  return new;
end $$;

-- Codes and pending payloads are accessible only to the trusted server.
create table public.store_action_challenges (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('create', 'delete')),
  payload jsonb not null,
  email text not null,
  phone text not null,
  email_code_hash text not null,
  test_phone boolean not null default false,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  consumed_at timestamptz
);
create index store_challenges_user_created_idx on public.store_action_challenges(user_id, created_at desc);
alter table public.store_action_challenges enable row level security;
revoke all on public.store_action_challenges from public, anon, authenticated;
grant select, insert, update on public.store_action_challenges to service_role;

-- Store details may still be edited by their owner, but creating/deleting
-- requires the trusted function below. RLS alone cannot enforce two OTPs.
revoke insert, delete on public.stores from public, anon, authenticated;

create or replace function public.start_store_action(
  p_id uuid, p_user_id uuid, p_action text, p_payload jsonb,
  p_email text, p_phone text, p_email_code_hash text, p_test_phone boolean default false
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  if p_action not in ('create', 'delete') then raise exception 'Invalid action.'; end if;
  if not exists (select 1 from auth.users where id=p_user_id and email=p_email and email_confirmed_at is not null and
    ((not p_test_phone and phone=p_phone and phone_confirmed_at is not null) or
     (p_test_phone and exists(select 1 from public.store_demo_access where user_id=p_user_id and phone=p_phone and phone_verified and expires_at>now())))) then
    raise exception 'Verify both your email and phone first.';
  end if;
  if not exists (select 1 from public.profiles where id=p_user_id and account_type='kgpians') then
    raise exception 'A verified IIT KGP account is required.';
  end if;
  if p_action='delete' and not exists (select 1 from public.stores where id=(p_payload->>'id')::uuid and owner_id=p_user_id) then
    raise exception 'Store not found.';
  end if;
  if exists (select 1 from public.store_action_challenges where user_id=p_user_id and created_at > now() - interval '60 seconds') then
    raise exception 'Please wait 60 seconds before requesting new codes.';
  end if;
  if (select count(*) from public.store_action_challenges where user_id=p_user_id and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Too many code requests. Please try again later.';
  end if;
  update public.store_action_challenges set consumed_at=now() where user_id=p_user_id and consumed_at is null;
  insert into public.store_action_challenges(id,user_id,action,payload,email,phone,email_code_hash,test_phone)
    values(p_id,p_user_id,p_action,p_payload,p_email,p_phone,p_email_code_hash,p_test_phone);
  return p_id;
end $$;

-- Reserve each attempt atomically, before comparing codes or contacting Twilio.
create or replace function public.reserve_store_action_attempt(p_id uuid, p_user_id uuid)
returns setof public.store_action_challenges language sql security definer set search_path = '' as $$
  update public.store_action_challenges set attempts=attempts+1
  where id=p_id and user_id=p_user_id and consumed_at is null and expires_at > now() and attempts < 5
  returning *;
$$;

-- Called only after the trusted server confirms both channels. The action and
-- challenge consumption are one transaction, so a code cannot be replayed.
create or replace function public.complete_store_action(p_id uuid, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare challenge public.store_action_challenges%rowtype; result_id uuid;
begin
  select * into challenge from public.store_action_challenges
    where id=p_id and user_id=p_user_id and consumed_at is null and expires_at > now() and attempts between 1 and 5
    for update;
  if not found then raise exception 'Verification expired or has already been used.'; end if;
  if not exists (select 1 from auth.users where id=p_user_id and email=challenge.email and email_confirmed_at is not null and
    ((not challenge.test_phone and phone=challenge.phone and phone_confirmed_at is not null) or
     (challenge.test_phone and exists(select 1 from public.store_demo_access where user_id=p_user_id and phone=challenge.phone and phone_verified and expires_at>now())))) then
    raise exception 'Your verified contact information changed. Request new codes.';
  end if;
  if challenge.action='create' then
    insert into public.stores(owner_id,name,store_id,category,tagline,description,hall,address,banner)
    values(p_user_id,challenge.payload->>'name',challenge.payload->>'store_id',challenge.payload->>'category',
      coalesce(challenge.payload->>'tagline',''),coalesce(challenge.payload->>'description',''),
      challenge.payload->>'hall',coalesce(challenge.payload->>'address',''),coalesce(challenge.payload->>'banner',''))
    returning id into result_id;
  elsif challenge.action='delete' then
    delete from public.stores where id=(challenge.payload->>'id')::uuid and owner_id=p_user_id returning id into result_id;
    if result_id is null then raise exception 'Store not found.'; end if;
  else raise exception 'Invalid action.';
  end if;
  update public.store_action_challenges set consumed_at=now() where id=challenge.id;
  return result_id;
end $$;

revoke execute on function public.start_store_action(uuid,uuid,text,jsonb,text,text,text,boolean) from public, anon, authenticated;
revoke execute on function public.reserve_store_action_attempt(uuid,uuid) from public, anon, authenticated;
revoke execute on function public.complete_store_action(uuid,uuid) from public, anon, authenticated;
grant execute on function public.start_store_action(uuid,uuid,text,jsonb,text,text,text,boolean) to service_role;
grant execute on function public.reserve_store_action_attempt(uuid,uuid) to service_role;
grant execute on function public.complete_store_action(uuid,uuid) to service_role;

commit;
