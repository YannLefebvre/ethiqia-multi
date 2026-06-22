-- ================================================================
-- Éthiq·IA Multi — Setup Supabase (corrigé)
-- ================================================================

-- 1. Sessions de jeu
create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  phase text not null default 'waiting',
  current_card int default null,
  parcours_id text default null,
  card_ids int[] default '{}',
  created_at timestamptz default now()
);

-- 2. Joueurs
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references game_sessions(id) on delete cascade,
  pseudo text not null,
  is_host boolean default false,
  joined_at timestamptz default now()
);

-- 3. Votes individuels (phase 1)
create table if not exists votes_indiv (
  session_id uuid references game_sessions(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  question_id int not null,
  option text not null check (option in ('A', 'B')),
  primary key (session_id, player_id, question_id)
);

-- 4. Votes collectifs (phase 3)
create table if not exists votes_collectif (
  session_id uuid references game_sessions(id) on delete cascade,
  question_id int not null,
  option text,
  count_a int default 0,
  count_b int default 0,
  primary key (session_id, question_id)
);

-- ================================================================
-- Activer le Realtime
-- ================================================================
alter publication supabase_realtime add table game_sessions;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table votes_indiv;
alter publication supabase_realtime add table votes_collectif;

-- ================================================================
-- Politiques RLS
-- ================================================================
alter table game_sessions enable row level security;
alter table players enable row level security;
alter table votes_indiv enable row level security;
alter table votes_collectif enable row level security;

create policy "public_all_game_sessions" on game_sessions for all using (true) with check (true);
create policy "public_all_players" on players for all using (true) with check (true);
create policy "public_all_votes_indiv" on votes_indiv for all using (true) with check (true);
create policy "public_all_votes_collectif" on votes_collectif for all using (true) with check (true);
