import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(Boolean).map(l=>l.split('=')));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const row = {
  id: `test-${Date.now()}`,
  user_id: '00000000-0000-0000-0000-000000000000',
  destination: 'Test Place',
  start_date: '2026-06-26',
  end_date: '2026-07-01',
  budget: 123,
  currency: 'PHP',
  travel_type: 'solo',
  created_at: new Date().toISOString(),
};
console.log('Upsert payload:', JSON.stringify(row));
const upsert = await supabase.from('trips').upsert(row, { onConflict: 'id' });
console.log('upsert result', upsert);
