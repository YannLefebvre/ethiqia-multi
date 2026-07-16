import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. ' +
    'Copiez .env.example vers .env.local et renseignez les clés de votre projet Supabase ' +
    '(Project Settings > API).'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
