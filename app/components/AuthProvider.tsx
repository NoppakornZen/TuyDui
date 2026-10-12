'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Brand from './Brand';
import Icon from './Icon';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
      <div className="app-loading" role="status"><Brand href="/login" /><div className="spinner" /><p>Opening your workspace...</p></div>
    );
  }

  if (!user && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    return null;
  }

  return (
    <div>
      {user && pathname !== '/login' && (
        <header className="app-topbar">
          <Brand />
          <nav className="app-nav" aria-label="Main navigation">
            <a href="/projects" aria-current={pathname.startsWith('/projects') || pathname.startsWith('/workspace') ? 'page' : undefined}><Icon name="folder" />Projects</a>
            <a href="/profile" aria-current={pathname === '/profile' ? 'page' : undefined}><Icon name="user" />Profile</a>
          </nav>
          <div className="app-account"><span className="account-email" title={user.email}>{user.email}</span><button className="signout-btn" onClick={handleSignOut} title="Sign out"><Icon name="logout" size={16} /><span>Sign out</span></button></div>
        </header>
      )}
      {children}
    </div>
  );
}
