'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const finish = () => {
      if (cancelled) return;
      const next = window.localStorage.getItem('tuydui-after-login') || '/projects';
      const safe = next.startsWith('/') && !next.startsWith('//') && !/[\\\r\n]/.test(next);
      window.localStorage.removeItem('tuydui-after-login');
      router.replace(safe ? next as '/projects' : '/projects');
    };
    void (async () => {
      try {
        const { supabase } = await import('../../../src/lib/supabase');
        if (cancelled) return;
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (session) finish(); });
        unsubscribe = () => listener.subscription.unsubscribe();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (data.session) finish();
        else if (!cancelled) setError('Sign in did not complete. Return to login and try again.');
      } catch { if (!cancelled) setError('Sign in could not complete. Please try again.'); }
    })();
    return () => { cancelled = true; unsubscribe?.(); };
  }, [router]);

  if (!mounted) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0D12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff'
    }}>
      {error ? <p role="alert">{error} <a href="/login">Login</a></p> : 'กำลังเข้าสู่ระบบ...'}
    </div>
  );
}
