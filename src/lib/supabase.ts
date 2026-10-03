import { createClient } from '@supabase/supabase-js';

// Server-side: use env directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ebwrmwnphlvicwxsqyqn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVid3Jtd25waGx2aWN3eHNxeXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMDY2ODgsImV4cCI6MjEwNjU4MjY4OH0.KK7AAyQreaKkHBiNhkCOkwNgv6SiyaORZ8VjCg9gT7I';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVid3Jtd25waGx2aWN3eHNxeXFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTAwNjY4OCwiZXhwIjoyMTA2NTgyNjg4fQ.JxfAPD4GkUSKuLMA-J9c4JO7EnMumik9Stw3eK5NwSk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
