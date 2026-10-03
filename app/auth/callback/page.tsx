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
    <div style={{
      minHeight: '100vh',
      background: '#0A0D12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff'
    }}>
      กำลังเข้าสู่ระบบ...
    </div>
  );
}
