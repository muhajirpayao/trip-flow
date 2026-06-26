import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(Boolean).map(l=>l.split('=')));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const q = async () => {
  const cols = await supabase.from('information_schema.columns').select('column_name,data_type,udt_name,is_nullable,column_default').eq('table_name','trips');
  console.log('columns', cols);
  const con = await supabase.from('information_schema.table_constraints').select('constraint_name,constraint_type').eq('table_name','trips');
  console.log('constraints', con);
};
await q();
