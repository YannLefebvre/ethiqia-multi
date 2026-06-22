import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://svvcfsnjkmirlxqvvxmw.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2dmNmc25qa21pcmx4cXZ2eG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDAyNzMsImV4cCI6MjA5NjExNjI3M30.FPZsc5i4Mhkz7XCN7xrUU-cW0DWMDNSWHOsFf8SrQ5Q"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── SQL à exécuter une fois dans Supabase SQL Editor ────────────────
//
// create table if not exists sessions (
//   id uuid primary key default gen_random_uuid(),
//   code text unique not null,
//   phase text not null default 'waiting',
//   current_card int default null,
//   parcours_id text default null,
//   card_ids int[] default '{}',
//   created_at timestamptz default now()
// );
//
// create table if not exists players (
//   id uuid primary key default gen_random_uuid(),
//   session_id uuid references sessions(id) on delete cascade,
//   pseudo text not null,
//   is_host boolean default false,
//   joined_at timestamptz default now()
// );
//
// create table if not exists votes_indiv (
//   session_id uuid references sessions(id) on delete cascade,
//   player_id uuid references players(id) on delete cascade,
//   question_id int not null,
//   option text not null,
//   primary key (session_id, player_id, question_id)
// );
//
// create table if not exists votes_collectif (
//   session_id uuid references sessions(id) on delete cascade,
//   question_id int not null,
//   option text not null,
//   count_a int default 0,
//   count_b int default 0,
//   primary key (session_id, question_id)
// );
//
// -- Enable Realtime on all tables (in Supabase dashboard → Table Editor → Realtime)
// -- Or via SQL:
// alter publication supabase_realtime add table sessions;
// alter publication supabase_realtime add table players;
// alter publication supabase_realtime add table votes_indiv;
// alter publication supabase_realtime add table votes_collectif;
