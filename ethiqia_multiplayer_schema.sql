-- ============================================================================
-- EthiqIA — Schéma multijoueurs
-- À exécuter dans Supabase > SQL Editor (une seule fois, sur une base neuve
-- ou en plus de vos tables existantes).
--
-- Prérequis côté Auth : activer les connexions anonymes
--   Dashboard > Authentication > Providers > Anonymous Sign-ins
-- Le client doit appeler supabase.auth.signInAnonymously() avant tout appel
-- RPC ci-dessous, pour que auth.uid() existe.
-- ============================================================================

create extension if not exists pgcrypto; -- pour gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

create table if not exists rooms (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,                 -- code court à partager (ex: "A3F9K")
  mode              text not null check (mode in ('libre', 'parcours')),
  parcours_id       text,                                  -- identifiant du parcours si mode = 'parcours'
  card_sequence     int[] not null default '{}',           -- liste ordonnée des numéros de cartes jouées
  current_index     int not null default 0,                -- position dans card_sequence
  phase             text not null default 'lobby'
                      check (phase in ('lobby','reading','choice1','choice2','results','done')),
  phase_started_at  timestamptz,
  phase_deadline    timestamptz,                           -- source de vérité pour les comptes à rebours client
  host_user_id      uuid references auth.users(id) default auth.uid(),
  created_at        timestamptz not null default now()
);

create table if not exists room_players (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms(id) on delete cascade,
  user_id     uuid not null references auth.users(id) default auth.uid(),
  pseudo      text not null,
  connected   boolean not null default true,
  joined_at   timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists room_answers (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references rooms(id) on delete cascade,
  card_num        int not null,
  player_id       uuid not null references room_players(id) on delete cascade,
  initial_choice  text check (initial_choice in ('A','B')),
  initial_at      timestamptz,
  final_choice    text check (final_choice in ('A','B')),
  final_at        timestamptz,
  unique (room_id, card_num, player_id)
);

create index if not exists idx_room_players_room on room_players(room_id);
create index if not exists idx_room_answers_room_card on room_answers(room_id, card_num);

create table if not exists room_messages (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms(id) on delete cascade,
  card_num    int not null,
  player_id   uuid not null references room_players(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_room_messages_room_card on room_messages(room_id, card_num);

create table if not exists message_ratings (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references room_messages(id) on delete cascade,
  player_id   uuid not null references room_players(id) on delete cascade,
  rating      int not null check (rating between 1 and 3),
  created_at  timestamptz not null default now(),
  unique (message_id, player_id)
);

create index if not exists idx_message_ratings_message on message_ratings(message_id);

-- ----------------------------------------------------------------------------
-- 2. REALTIME (Postgres Changes)
-- ----------------------------------------------------------------------------

alter table rooms            replica identity full;
alter table room_players     replica identity full;
alter table room_answers     replica identity full;
alter table room_messages    replica identity full;
alter table message_ratings  replica identity full;

-- Ajout idempotent à la publication : ALTER PUBLICATION ... ADD TABLE n'a pas
-- de variante IF NOT EXISTS, donc on vérifie avant d'ajouter (permet de
-- rejouer ce script en entier sans erreur sur une base déjà initialisée).
do $$
declare
  t text;
begin
  foreach t in array array['rooms', 'room_players', 'room_answers', 'room_messages', 'message_ratings'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table rooms            enable row level security;
alter table room_players     enable row level security;
alter table room_answers    enable row level security;
alter table room_messages   enable row level security;
alter table message_ratings enable row level security;

-- Fonction utilitaire : le joueur courant fait-il partie de cette salle ?
create or replace function is_room_member(p_room_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from room_players
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

-- rooms : lecture libre (nécessaire pour vérifier un code avant de rejoindre),
-- écriture uniquement via les fonctions RPC (aucune policy update/delete).
drop policy if exists "rooms_select_all" on rooms;
create policy "rooms_select_all" on rooms
  for select using (true);

drop policy if exists "rooms_insert_own" on rooms;
create policy "rooms_insert_own" on rooms
  for insert with check (auth.uid() is not null and host_user_id = auth.uid());

-- room_players : visible aux seuls membres de la salle
drop policy if exists "room_players_select_members" on room_players;
create policy "room_players_select_members" on room_players
  for select using (is_room_member(room_id));

drop policy if exists "room_players_insert_self" on room_players;
create policy "room_players_insert_self" on room_players
  for insert with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "room_players_update_self" on room_players;
create policy "room_players_update_self" on room_players
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- room_answers : visible aux seuls membres de la salle,
-- écriture uniquement via submit_choice() (aucune policy insert/update).
drop policy if exists "room_answers_select_members" on room_answers;
create policy "room_answers_select_members" on room_answers
  for select using (is_room_member(room_id));

-- room_messages : visible aux seuls membres de la salle,
-- écriture uniquement via send_message() (aucune policy insert).
drop policy if exists "room_messages_select_members" on room_messages;
create policy "room_messages_select_members" on room_messages
  for select using (is_room_member(room_id));

-- message_ratings : visible aux seuls membres de la salle du message noté,
-- écriture uniquement via rate_message() (aucune policy insert/update).
drop policy if exists "message_ratings_select_members" on message_ratings;
create policy "message_ratings_select_members" on message_ratings
  for select using (
    exists (
      select 1 from room_messages rm
      where rm.id = message_ratings.message_id and is_room_member(rm.room_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 4. FONCTIONS RPC
-- ----------------------------------------------------------------------------

-- advance_phase : logique interne des transitions. Non destinée à être
-- appelée directement par le client (mais pas bloquée non plus, elle est
-- sans effet si la salle n'existe pas).
create or replace function advance_phase(p_room_id uuid)
returns void
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_room rooms%rowtype;
  v_next_index int;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if v_room is null then
    return;
  end if;

  if v_room.phase = 'reading' then
    update rooms set phase = 'choice1', phase_started_at = now(),
      phase_deadline = now() + interval '60 seconds'
    where id = p_room_id;

  elsif v_room.phase = 'choice1' then
    update rooms set phase = 'choice2', phase_started_at = now(),
      phase_deadline = now() + interval '45 seconds'
    where id = p_room_id;

  elsif v_room.phase = 'choice2' then
    update rooms set phase = 'results', phase_started_at = now(),
      phase_deadline = now() + interval '5 seconds'
    where id = p_room_id;

  elsif v_room.phase = 'results' then
    v_next_index := v_room.current_index + 1;
    if v_next_index < array_length(v_room.card_sequence, 1) then
      update rooms set phase = 'reading', current_index = v_next_index,
        phase_started_at = now(), phase_deadline = now() + interval '8 seconds'
      where id = p_room_id;
    else
      update rooms set phase = 'done', phase_started_at = now(), phase_deadline = null
      where id = p_room_id;
    end if;
  end if;
end;
$$;

-- create_room : crée une salle et son hôte comme premier joueur.
create or replace function create_room(
  p_mode text, p_parcours_id text, p_card_sequence int[], p_pseudo text
)
returns table(room_id uuid, code text, player_id uuid)
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_room_id uuid;
  v_code text;
  v_player_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  loop
    v_code := upper(substr(md5(random()::text), 1, 5));
    exit when not exists (select 1 from rooms r where r.code = v_code);
  end loop;

  insert into rooms (code, mode, parcours_id, card_sequence, host_user_id)
  values (v_code, p_mode, p_parcours_id, p_card_sequence, auth.uid())
  returning id into v_room_id;

  insert into room_players (room_id, user_id, pseudo)
  values (v_room_id, auth.uid(), p_pseudo)
  returning id into v_player_id;

  return query select v_room_id, v_code, v_player_id;
end;
$$;

-- join_room : rejoint (ou rejoint à nouveau, en cas de reconnexion) une salle par code.
create or replace function join_room(p_code text, p_pseudo text)
returns table(room_id uuid, player_id uuid)
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_room rooms%rowtype;
  v_player_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select * into v_room from rooms where code = upper(p_code);
  if v_room is null then
    raise exception 'Code de salle invalide';
  end if;
  if v_room.phase <> 'lobby' then
    raise exception 'La partie a déjà commencé';
  end if;

  insert into room_players (room_id, user_id, pseudo)
  values (v_room.id, auth.uid(), p_pseudo)
  on conflict (room_id, user_id) do update set pseudo = excluded.pseudo, connected = true
  returning id into v_player_id;

  return query select v_room.id, v_player_id;
end;
$$;

-- start_game : réservé à l'hôte, démarre la première carte.
create or replace function start_game(p_room_id uuid)
returns void
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_room rooms%rowtype;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if v_room is null then
    raise exception 'Salle introuvable';
  end if;
  if v_room.host_user_id <> auth.uid() then
    raise exception 'Seul l''hôte peut démarrer la partie';
  end if;
  if v_room.phase <> 'lobby' then
    raise exception 'La partie a déjà démarré';
  end if;
  if array_length(v_room.card_sequence, 1) is null then
    raise exception 'Aucune carte définie pour cette partie';
  end if;

  update rooms set phase = 'reading', current_index = 0,
    phase_started_at = now(), phase_deadline = now() + interval '8 seconds'
  where id = p_room_id;
end;
$$;

-- end_session : réservé à l'hôte, interrompt la session à tout moment et
-- bascule directement au bilan avec les cartes jouées jusque-là.
create or replace function end_session(p_room_id uuid)
returns void
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_room rooms%rowtype;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if v_room is null then
    raise exception 'Salle introuvable';
  end if;
  if v_room.host_user_id <> auth.uid() then
    raise exception 'Seul l''hôte peut interrompre la session';
  end if;
  if v_room.phase in ('lobby', 'done') then
    raise exception 'Rien à interrompre dans la phase courante (%)', v_room.phase;
  end if;

  update rooms set phase = 'done', phase_started_at = now(), phase_deadline = null
  where id = p_room_id;
end;
$$;

-- force_advance : réservé à l'hôte, passe immédiatement à l'étape suivante
-- sans attendre le filet de sécurité (ex : clore la discussion du chat plus
-- tôt que le délai de 45s si tout le monde a fini d'échanger).
create or replace function force_advance(p_room_id uuid)
returns void
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_room rooms%rowtype;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if v_room is null then
    raise exception 'Salle introuvable';
  end if;
  if v_room.host_user_id <> auth.uid() then
    raise exception 'Seul l''hôte peut avancer manuellement une étape';
  end if;
  if v_room.phase not in ('reading', 'choice1', 'choice2', 'results') then
    raise exception 'Aucune étape à avancer dans la phase courante (%)', v_room.phase;
  end if;

  perform advance_phase(p_room_id);
end;
$$;

-- submit_choice : enregistre le choix (initial ou final selon la phase en
-- cours) et déclenche l'avancement de phase si tous les joueurs actifs ont validé.
create or replace function submit_choice(p_room_id uuid, p_card_num int, p_choice text)
returns void
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_room rooms%rowtype;
  v_player_id uuid;
  v_active int;
  v_submitted int;
  v_expected_card int;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if v_room is null then
    raise exception 'Salle introuvable';
  end if;
  if v_room.phase not in ('choice1', 'choice2') then
    raise exception 'Aucun choix attendu dans la phase courante (%)', v_room.phase;
  end if;
  if p_choice not in ('A', 'B') then
    raise exception 'Choix invalide (attendu A ou B)';
  end if;

  v_expected_card := v_room.card_sequence[v_room.current_index + 1]; -- tableaux Postgres indexés à 1
  if p_card_num <> v_expected_card then
    raise exception 'Cette carte n''est plus la carte en cours';
  end if;

  select id into v_player_id from room_players
  where room_id = p_room_id and user_id = auth.uid();
  if v_player_id is null then
    raise exception 'Vous ne faites pas partie de cette salle';
  end if;

  if v_room.phase = 'choice1' then
    insert into room_answers (room_id, card_num, player_id, initial_choice, initial_at)
    values (p_room_id, p_card_num, v_player_id, p_choice, now())
    on conflict (room_id, card_num, player_id)
    do update set initial_choice = excluded.initial_choice, initial_at = excluded.initial_at;
  else
    update room_answers set final_choice = p_choice, final_at = now()
    where room_id = p_room_id and card_num = p_card_num and player_id = v_player_id;
    if not found then
      insert into room_answers (room_id, card_num, player_id, final_choice, final_at)
      values (p_room_id, p_card_num, v_player_id, p_choice, now());
    end if;
  end if;

  select count(*) into v_active from room_players where room_id = p_room_id and connected;
  select count(*) into v_submitted from room_answers
  where room_id = p_room_id and card_num = p_card_num
    and (case when v_room.phase = 'choice1' then initial_choice else final_choice end) is not null;

  if v_submitted >= v_active then
    perform advance_phase(p_room_id);
  end if;
end;
$$;

-- tick_room : filet de sécurité. À appeler périodiquement (ex : toutes les
-- 2-3 secondes, depuis n'importe quel client connecté à la salle) pour
-- forcer l'avancement si le délai de la phase est dépassé (ex : joueur
-- déconnecté qui bloquerait la partie). Idempotent, sans effet si la
-- deadline n'est pas atteinte.
create or replace function tick_room(p_room_id uuid)
returns void
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_deadline timestamptz;
begin
  select phase_deadline into v_deadline from rooms where id = p_room_id for update;
  if v_deadline is not null and now() >= v_deadline then
    perform advance_phase(p_room_id);
  end if;
end;
$$;

-- now_utc : donne au client un point de référence pour calibrer son horloge
-- locale sur celle du serveur (évite tout écart dû à une horloge navigateur
-- mal réglée, plutôt que de faire confiance à Date.now() sans vérification).
create or replace function now_utc()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

-- send_message : chat limité à la phase choice2, où les joueurs peuvent
-- argumenter leur choix avant de le confirmer ou d'en changer.
create or replace function send_message(p_room_id uuid, p_card_num int, p_body text)
returns void
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_room rooms%rowtype;
  v_player_id uuid;
  v_body text;
begin
  select * into v_room from rooms where id = p_room_id;
  if v_room is null then
    raise exception 'Salle introuvable';
  end if;
  if v_room.phase <> 'choice2' then
    raise exception 'Le chat n''est disponible que pendant la phase de choix définitif';
  end if;
  if p_card_num <> v_room.card_sequence[v_room.current_index + 1] then
    raise exception 'Cette carte n''est plus la carte en cours';
  end if;

  v_body := trim(p_body);
  if v_body = '' then
    raise exception 'Message vide';
  end if;
  if length(v_body) > 280 then
    raise exception 'Message trop long (280 caractères maximum)';
  end if;

  select id into v_player_id from room_players where room_id = p_room_id and user_id = auth.uid();
  if v_player_id is null then
    raise exception 'Vous ne faites pas partie de cette salle';
  end if;

  insert into room_messages (room_id, card_num, player_id, body)
  values (p_room_id, p_card_num, v_player_id, v_body);
end;
$$;

-- rate_message : note un message de chat de 1 à 3 étoiles. Un joueur ne peut
-- pas noter son propre message, et sa note remplace la précédente s'il en
-- avait déjà mis une (upsert).
create or replace function rate_message(p_message_id uuid, p_rating int)
returns void
language plpgsql
security definer
as $$
#variable_conflict use_column
declare
  v_message room_messages%rowtype;
  v_player_id uuid;
begin
  if p_rating not in (1, 2, 3) then
    raise exception 'Note invalide (1 à 3 étoiles)';
  end if;

  select * into v_message from room_messages where id = p_message_id;
  if v_message is null then
    raise exception 'Message introuvable';
  end if;

  select id into v_player_id from room_players
  where room_id = v_message.room_id and user_id = auth.uid();
  if v_player_id is null then
    raise exception 'Vous ne faites pas partie de cette salle';
  end if;

  if v_player_id = v_message.player_id then
    raise exception 'Vous ne pouvez pas noter votre propre message';
  end if;

  insert into message_ratings (message_id, player_id, rating)
  values (p_message_id, v_player_id, p_rating)
  on conflict (message_id, player_id) do update set rating = excluded.rating;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. GRANTS
-- ----------------------------------------------------------------------------

revoke all on function now_utc from public;
grant execute on function now_utc to authenticated;

revoke all on function create_room, join_room, start_game, submit_choice, tick_room, end_session, force_advance, send_message, rate_message from public;
grant execute on function create_room, join_room, start_game, submit_choice, tick_room, end_session, force_advance, send_message, rate_message to authenticated;

grant select on rooms, room_players, room_answers, room_messages, message_ratings to authenticated;
grant insert on rooms, room_players to authenticated;
grant update on room_players to authenticated;
