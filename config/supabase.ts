
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bmfhrevtosmdgrzcllgd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZmhyZXZ0b3NtZGdyemNsbGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0Mjc2NzMsImV4cCI6MjA3NDAwMzY3M30.VEyrU6AcZRjFawt0wT1CdaIFXTz-5R60xa-Hh3VDuMA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
