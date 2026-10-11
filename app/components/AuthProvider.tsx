'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    checkUser();
  }, []);

  async function checkUser() {
    try {
      // Dynamically import to avoid build-time errors
      const { supabase } = await import('../../src/lib/supabase');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Not logged in
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      const { supabase } = await import('../../src/lib/supabase');
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  if (!mounted || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0A0D12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        กำลังโหลด...
      </div>
    );
  }

  if (!user && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    return null;
  }

  return (
    <div>
      {user && (
        <div style={{
          background: '#0F131C',
          borderBottom: '1px solid #1E2636',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
            {user.email}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              background: 'transparent',
              border: '1px solid #374151',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              color: '#D1D5DB',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            ออกจากระบบ
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
