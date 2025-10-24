import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

const supabaseUrl = 'https://jcjkomunegqtjbamfila.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjamtvbXVuZWdxdGpiYW1maWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMDA4MTksImV4cCI6MjA3NTc3NjgxOX0.J1KnqllEQ_nSoNaTwhst3xIQ60o9VAPAzq492qnE4rI';

// Initialize the Supabase client with explicit session persistence settings.
// These are defaults for browsers, but making them explicit ensures the intended
// behavior of keeping the user logged in across browser sessions (closing/reopening windows).
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export { supabase };