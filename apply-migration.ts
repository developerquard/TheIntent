import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://laxyyifsboedsccqnfhc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_W46hZqYvhXxyoZjHBQpSFA_oS_usk-e';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
  console.log('Checking which tables exist...');
  
  const tables = ['intents', 'rooms', 'room_messages', 'audit_logs', 'waitlist'];
  
  for (const tableName of tables) {
    try {
      const { error } = await admin
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: exists`);
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ${(err as Error).message}`);
    }
  }

  console.log('\n=== TO FIX THIS ISSUE ===');
  console.log('Run this SQL in your Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/laxyyifsboedsccqnfhc/sql/new');
  console.log('\nCopy the SQL from: supabase/migrations/20260707235814_c9280051-496a-4632-99f5-de89b73d8b64.sql');
}

checkTables();
