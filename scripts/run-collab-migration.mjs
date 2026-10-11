import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔄 Running collaboration migration...');

const sql = readFileSync('supabase/migrations/002_collaboration.sql', 'utf-8');

console.log('\n⚠️  Please run this migration manually in Supabase SQL Editor:');
console.log('1. Go to: https://supabase.com/dashboard/project/' + url.split('//')[1].split('.')[0] + '/editor');
console.log('2. Paste the contents of supabase/migrations/002_collaboration.sql');
console.log('3. Click "Run"\n');
console.log('This adds:');
console.log('- project_members table (for collaboration)');
console.log('- project_invites table (for share links)');
console.log('- Role-based access (owner, editor, viewer)');
console.log('- Updated policies for member access\n');
