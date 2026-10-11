import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

console.log('🔄 Applying migration via SQL...\n');

const sql = readFileSync('supabase/migrations/001_initial.sql', 'utf-8');

// Use Supabase Management API to execute raw SQL
const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const managementUrl = `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`;

const response = await fetch(managementUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`
  },
  body: JSON.stringify({ query: sql })
});

if (!response.ok) {
  const text = await response.text();
  console.log('Response status:', response.status);
  console.log('Response:', text.substring(0, 500));
  
  console.log('\n📝 Manual migration required:');
  console.log('Please visit: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('And paste the contents of: supabase/migrations/001_initial.sql\n');
  process.exit(0);
}

console.log('✅ Migration applied successfully!\n');

// Verify tables exist
const { data, error } = await supabase.from('projects').select('*').limit(0);
if (error) {
  console.log('⚠️  Could not verify tables:', error.message);
} else {
  console.log('✅ Tables verified');
}
