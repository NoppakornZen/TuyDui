export const runtime = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

// For client-side: get from window if available
if (typeof window !== 'undefined') {
  (window as any).__RUNTIME_CONFIG__ = runtime;
}
