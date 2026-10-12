'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from './LocaleProvider';

const PUBLIC_PATHS = ['/','/tutorial','/login','/auth/callback'];
const isPublicPath = (pathname: string) => PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next');

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();

  useEffect(() => {
    setMounted(true);
    void checkUser(pathname);
  }, [pathname]);

  async function checkUser(currentPath: string) {
    if (isPublicPath(currentPath)) {
      setUser(null);
      setLoading(false);
      return;
    }
    const hasSupabaseConfig = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    if (!hasSupabaseConfig) {
      setUser(null);
      setLoading(false);
      router.replace('/login');
      return;
    }
    try {
      // Dynamically import to avoid build-time errors
      const { supabase } = await import('../../src/lib/supabase');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser && !isPublicPath(currentPath)) {
        router.push('/login');
      }
    } catch (error) {
      console.warn('Auth check failed:', error);
      // Not logged in
      if (!isPublicPath(currentPath)) {
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
        {t.common.loading}
      </div>
    );
  }

  if (!user && !isPublicPath(pathname)) {
    return null;
  }

  return (
    <div>
      {user && !isPublicPath(pathname) && (
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
            {t.projects.signOut}
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
