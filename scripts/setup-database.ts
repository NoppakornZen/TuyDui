import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  try {
    console.log('🔄 Running database migration...');

    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '001_initial.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { query: statement + ';' });
      if (error) {
        console.error('Error executing statement:', statement.substring(0, 100), error);
      }
    }

    console.log('✅ Migration completed');

    // Test connection
    const { data, error } = await supabase.from('projects').select('count').limit(1);
    if (error) {
      console.error('❌ Error testing connection:', error);
    } else {
      console.log('✅ Database connection verified');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
