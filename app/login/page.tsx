'use client';

import { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';

function nextPath() {
  const value = new URLSearchParams(window.location.search).get('redirect') || '';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '';
  return value;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      setError('');

      // Dynamically import Supabase client
      const { supabase } = await import('../../src/lib/supabase');
      const next = nextPath();
      if (next) window.localStorage.setItem('tuydui-after-login', next);

      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/projects`,
        }
      });

      if (signInError) throw signInError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      setLoading(false);
    }
  }

  return <LoginScreen loading={loading || !mounted} error={error} onSignIn={handleGoogleSignIn} />;
}
