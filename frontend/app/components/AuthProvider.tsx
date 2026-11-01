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

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      void import('../../src/lib/supabase').then(({ supabase }) => {
        if (cancelled) return;
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (cancelled) return;
          setUser(session?.user ?? null);
          if (!session && !isPublicPath(pathname)) router.replace('/login');
        });
        unsubscribe = () => data.subscription.unsubscribe();
      });
    }
    return () => { cancelled = true; unsubscribe?.(); };
  }, [pathname, router]);

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

  if (!mounted || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8f7f3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#282924'
      }}>
        {t.common.loading}
      </div>
    );
  }

  if (!user && !isPublicPath(pathname)) {
    return null;
  }

  return <>{children}</>;
}
