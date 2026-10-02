export type RuntimeMode = 'demo' | 'supabase';

export interface RuntimeConfig {
  mode: RuntimeMode;
  appUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  aiProvider: string;
  aiModel: string;
  billingProvider: string;
}

declare const process: { env: Record<string, string | undefined> };

/** Optional services are deliberately allowed to be empty for local MVP work. */
export function getRuntimeConfig(env: Record<string, string | undefined> = process.env): RuntimeConfig {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;
  return {
    mode: supabaseUrl && supabaseAnonKey ? 'supabase' : 'demo',
    appUrl: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    supabaseUrl,
    supabaseAnonKey,
    aiProvider: env.AI_PROVIDER || 'unconfigured',
    aiModel: env.AI_MODEL || 'claude-opus-5',
    billingProvider: env.BILLING_PROVIDER || 'manual',
  };
}
