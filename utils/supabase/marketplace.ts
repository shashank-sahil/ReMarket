'use client';
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from './client';
import type { Listing } from '@/components/store-workspace';
import { runStoreAction } from './store-actions';

export type MarketStore = { id: string; ownerId: string; name: string; storeId: string; category: string; tagline: string; description: string; hall: string; address: string; banner: string };
export type Profile = { id: string; full_name: string; email: string; address: string; account_type: 'kgpians' | 'nonkgpians' };
export function errorMessage(error: unknown) { return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Something went wrong. Please try again.'; }
export function useMarketplace(accountType: Profile['account_type']) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allStores, setStores] = useState<MarketStore[]>([]);
  const [items, setItems] = useState<Listing[]>([]);
  const [storeLimit, setLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState({enabled:false,phoneVerified:false,phone:'',emailDestination:''});
  const [verificationError,setVerificationError]=useState('');
  const reload = useCallback(async () => {
    const client = createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) { window.location.replace('/'); return; }
    setUser(user);
    const [profileResult, entitlement, stores, listings] = await Promise.all([
      client.from('profiles').select('*').eq('id', user.id).single(),
      client.from('entitlements').select('store_limit').eq('user_id', user.id).single(),
      client.from('stores').select('*').order('created_at', { ascending: false }),
      client.from('listings').select('*').order('created_at', { ascending: false }),
    ]);
    for (const result of [profileResult, entitlement, stores, listings]) if (result.error) throw result.error;
    if (profileResult.data.account_type !== accountType) { window.location.replace('/' + profileResult.data.account_type); return; }
    setProfile(profileResult.data); setLimit(entitlement.data!.store_limit);
    let settings=null;
    try{settings=await runStoreAction({step:'config'});setVerificationError('');}
    catch(error){setVerificationError(errorMessage(error));}
    setDemo({enabled:Boolean(settings?.demoEnabled),phoneVerified:Boolean(settings?.demoPhoneVerified),phone:settings?.demoPhone || '',emailDestination:settings?.demoEmailDestination || ''});
    if(settings?.demoEnabled && settings.demoStoreLimit) setLimit(settings.demoStoreLimit);
    setStores(stores.data!.map(row => ({ ...row, storeId: row.store_id, ownerId: row.owner_id })));
    setItems(listings.data!.map(row => ({ ...row, storeId: row.store_id, price: String(row.price) })));
    setError('');
  }, [accountType]);
  useEffect(() => {
    reload().catch(error => setError(errorMessage(error))).finally(() => setLoading(false));
    const { data: { subscription } } = createClient().auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') window.location.replace('/');
    });
    const refresh = () => reload().catch(error => setError(errorMessage(error)));
    window.addEventListener('focus', refresh);
    return () => { subscription.unsubscribe(); window.removeEventListener('focus', refresh); };
  }, [reload]);
  return { user, profile, allStores, stores: allStores.filter(store => store.ownerId === user?.id), items, storeLimit, loading, error, reload, demo, verificationError };
}
export async function uploadImage(value: string, userId: string) {
  if (!value.startsWith('data:')) return value;
  const blob = await (await fetch(value)).blob();
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const client = createClient();
  const { error } = await client.storage.from('marketplace').upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  return client.storage.from('marketplace').getPublicUrl(path).data.publicUrl;
}
