import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://semivtnqitoarrcstlyc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbWl2dG5xaXRvYXJyY3N0bHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDY2MTgsImV4cCI6MjA4NjgyMjYxOH0.vEZ8IxspTjS1vFtUHW7on-XpIZ-lN6ge7mhXyqHntc0'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)