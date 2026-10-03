import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔄 Testing connection...');

// Test with a simple query first
const { data: testData, error: testError } = await supabase
  .from('_realtime_schema_migrations')
  .select('*')
  .limit(1);

if (testError && testError.code !== 'PGRST116') {
  console.log('Note:', testError.message);
}

console.log('✅ Connected to Supabase');

// Read migration file
const sql = readFileSync('supabase/migrations/001_initial.sql', 'utf-8');
console.log('\n📄 Migration file read. Contains', sql.split('\n').length, 'lines');
console.log('\n⚠️  Please run this migration manually in Supabase SQL Editor:');
console.log('1. Go to:', url.replace('https://', 'https://supabase.com/dashboard/project/') + '/editor');
console.log('2. Paste the contents of supabase/migrations/001_initial.sql');
console.log('3. Click "Run"');
console.log('\nOr copy this URL and paste the file content:');
console.log(url.replace('.supabase.co', '') + ' -> SQL Editor\n');

