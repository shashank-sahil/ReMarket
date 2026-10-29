begin;

-- Match the university domain or a subdomain, with a domain boundary.
-- Accept kgpian.iitkgp.ac.in; reject fakeiitkgp.ac.in and iitkgp.ac.in.example.com.
create or replace function public.is_iitkgp_email(email_address text)
returns boolean language sql immutable set search_path = '' as $$
  select lower(split_part(coalesce(email_address, ''), '@', 2))
    ~ '(^|[.])iitkgp[.]ac[.]in$';
$$;

create or replace function public.provision_marketplace_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, email, avatar_url, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'avatar_url',
    case when new.email_confirmed_at is not null and public.is_iitkgp_email(new.email)
      then 'kgpians' else 'nonkgpians' end
  )
  on conflict(id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    account_type = excluded.account_type;

  insert into public.entitlements(user_id) values(new.id) on conflict do nothing;
  return new;
end;
$$;

-- Correct existing accounts while preserving their address, stores and plan.
update public.profiles as profile
set account_type = case
  when account.email_confirmed_at is not null and public.is_iitkgp_email(account.email)
    then 'kgpians' else 'nonkgpians' end
from auth.users as account
where account.id = profile.id
  and profile.account_type is distinct from case
    when account.email_confirmed_at is not null and public.is_iitkgp_email(account.email)
      then 'kgpians' else 'nonkgpians' end;

commit;
