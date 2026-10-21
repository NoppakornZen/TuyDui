import { createClient } from '@supabase/supabase-js';
// Server-only client using the service role key. Never import this from client components.
let supabaseAdminInstance = null;
function getSupabaseAdminClient() {
    if (supabaseAdminInstance)
        return supabaseAdminInstance;
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
    const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    return supabaseAdminInstance;
}
export const supabaseAdmin = new Proxy({}, {
    get(_target, prop) {
        const client = getSupabaseAdminClient();
        return client[prop];
    }
});
