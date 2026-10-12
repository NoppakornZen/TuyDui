'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const { supabase } = await import('../../../src/lib/supabase');

      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          router.push('/workspace');
        }
      });
    } catch (error) {
      console.error('Auth callback error:', error);
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="app-loading" role="status"><div className="spinner" /><p>Signing in...</p></div>
  );
}
