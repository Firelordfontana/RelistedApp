import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://zvvvbyfrzhhztetzvqam.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_NiMom8_uPfb6ivxbIJH_3Q_v6C1aLJV';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);