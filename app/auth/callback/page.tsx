'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import LoadingScreen from '@/components/loading-screen';

export default function AuthCallback() {
  const [error, setError] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function finish() {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error')) throw new Error(params.get('error_description') || 'Sign-in failed.');
      const client = createClient();
      if (params.get('code')) {
        const { error } = await client.auth.exchangeCodeForSession(params.get('code')!);
        if (error) throw error;
      }
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) throw new Error(error?.message || 'Please sign in again.');
      const { data: profile, error: profileError } = await client.from('profiles').select('account_type').eq('id',user.id).single();
      if (profileError) throw new Error('Your account could not be loaded. ' + profileError.message);
      window.location.replace('/' + profile.account_type);
    }
    finish().catch(error => setError(error.message));
  }, []);
  if (!error) return <LoadingScreen stage="sign-in"/>;
  return <main style={{maxWidth:500,margin:'20vh auto',padding:24}}><h1>Sign-in needs attention</h1><p role="alert">{error}</p><a href="/">Return to sign in</a></main>;
}
