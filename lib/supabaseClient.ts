// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// ⬇️ Paste your actual values from Supabase → Settings → API
const supabaseUrl = 'https://fmsgrjkpixcfhewcpzhm.supabase.co';
const supabaseAnonKey = 'sb_publishable_6gvk8K-UML1MOJQPvCuM5A_5AFm2Wr4';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
 