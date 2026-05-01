import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hnwgqvoybzmsdqbpngjx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhud2dxdm95Ynptc2RxYnBuZ2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NjAzNTAsImV4cCI6MjA5MzIzNjM1MH0.XbuI68-0gqh_U44hhqwBC9aew9poj9ewsColSAI6j3Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
