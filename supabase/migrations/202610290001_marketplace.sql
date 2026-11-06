begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', email text not null default '', avatar_url text,
 account_type text not null check (account_type in ('kgpians','nonkgpians')),
 address text not null default '' check (length(address) <= 300)
);
create table public.entitlements (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 store_limit integer not null default 1 check (store_limit between 1 and 5)
);
create function public.provision_marketplace_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,full_name,email,avatar_url,account_type)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.email,''),new.raw_user_meta_data->>'avatar_url',
 case when new.email_confirmed_at is not null and lower(split_part(coalesce(new.email,''),'@',2)) = 'iitkgp.ac.in' then 'kgpians' else 'nonkgpians' end)
 on conflict(id) do update set full_name=excluded.full_name,email=excluded.email,avatar_url=excluded.avatar_url,account_type=excluded.account_type;
 insert into public.entitlements(user_id) values(new.id) on conflict do nothing;
 return new;
end $$;
create trigger on_marketplace_user after insert or update of email,email_confirmed_at,raw_user_meta_data on auth.users for each row execute function public.provision_marketplace_user();
insert into public.profiles(id,full_name,email,avatar_url,account_type)
select id,coalesce(raw_user_meta_data->>'full_name',''),coalesce(email,''),raw_user_meta_data->>'avatar_url',case when email_confirmed_at is not null and lower(split_part(coalesce(email,''),'@',2))='iitkgp.ac.in' then 'kgpians' else 'nonkgpians' end from auth.users;
insert into public.entitlements(user_id) select id from public.profiles;
create table public.stores (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 60), store_id text not null unique check(store_id ~ '^[a-z0-9-]{3,30}$'),
 category text not null, tagline text not null default '' check(length(tagline)<=100), description text not null default '' check(length(description)<=500),
 hall text not null check(length(trim(hall)) between 1 and 80), address text not null default '' check(length(address)<=160), banner text not null default '', created_at timestamptz not null default now()
);
create function public.enforce_store_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare allowed integer;
begin
 select store_limit into allowed from public.entitlements where user_id=new.owner_id for update;
 if not exists(select 1 from public.profiles where id=new.owner_id and account_type='kgpians') then raise exception 'A verified IIT KGP account is required to create a store.'; end if;
 if (select count(*) from public.stores where owner_id=new.owner_id) >= coalesce(allowed,1) then raise exception 'Your account has reached its store limit.'; end if;
 return new;
end $$;
create trigger enforce_store_limit before insert on public.stores for each row execute function public.enforce_store_limit();
create table public.listings (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80), price numeric(10,2) not null check(price>=0), condition text not null check(condition in ('Like new','Good','Well used')),
 description text not null default '' check(length(description)<=500), image text not null default '', created_at timestamptz not null default now()
);
create index stores_owner_idx on public.stores(owner_id);
create index listings_store_idx on public.listings(store_id);
create function public.has_verified_phone() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=auth.uid() and phone_confirmed_at is not null and phone is not null);
$$;
revoke execute on function public.has_verified_phone() from public, anon;
grant execute on function public.has_verified_phone() to authenticated;
alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.stores enable row level security;
alter table public.listings enable row level security;
revoke all on public.profiles,public.entitlements,public.stores,public.listings from anon;
revoke all on public.profiles,public.entitlements,public.stores,public.listings from authenticated;
grant select on public.profiles,public.entitlements,public.stores,public.listings to authenticated;
grant update(address) on public.profiles to authenticated;
grant insert,update,delete on public.stores,public.listings to authenticated;
create policy profile_self on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_address_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy entitlement_self on public.entitlements for select to authenticated using(user_id=auth.uid());
create policy stores_read on public.stores for select to authenticated using(true);
create policy stores_insert on public.stores for insert to authenticated with check(owner_id=auth.uid());
create policy stores_update on public.stores for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy stores_delete on public.stores for delete to authenticated using(owner_id=auth.uid());
create policy listings_read on public.listings for select to authenticated using(true);
create policy listings_insert on public.listings for insert to authenticated with check(public.has_verified_phone() and exists(select 1 from public.stores where id=listings.store_id and owner_id=auth.uid()));
create policy listings_update on public.listings for update to authenticated using(exists(select 1 from public.stores where id=listings.store_id and owner_id=auth.uid())) with check(exists(select 1 from public.stores where id=listings.store_id and owner_id=auth.uid()));
create policy listings_delete on public.listings for delete to authenticated using(exists(select 1 from public.stores where id=listings.store_id and owner_id=auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('marketplace','marketplace',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy marketplace_upload on storage.objects for insert to authenticated with check(bucket_id='marketplace' and (storage.foldername(name))[1]=auth.uid()::text);
create policy marketplace_remove on storage.objects for delete to authenticated using(bucket_id='marketplace' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
