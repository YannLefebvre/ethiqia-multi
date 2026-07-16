// src/hooks/useMultiplayerRoom.js
//
// Hook de synchronisation pour une salle multijoueur EthiqIA.
// Adaptez le chemin d'import ci-dessous vers votre client Supabase existant.
import { supabase } from '../supabase.js';
import { useCallback, useEffect, useRef, useState } from 'react';

const TICK_INTERVAL_MS = 2000;

// Les événements Realtime de Supabase renvoient parfois les timestamps sans
// indicateur de fuseau horaire (ex: "2026-07-15 09:30:02.34"), alors que
// l'API REST les inclut toujours (ex: "2026-07-15T09:30:02.34+00:00"). Sans
// indicateur, new Date(...) interprète la chaîne comme une heure locale au
// lieu d'UTC, ce qui décale le calcul selon le fuseau du navigateur. On
// force donc l'UTC quand l'indicateur est absent.
function parseUtcTimestamp(value) {
  if (!value) return null;
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  const normalized = hasTimezone ? value : `${value.replace(' ', 'T')}Z`;
  return new Date(normalized).getTime();
}

export function useMultiplayerRoom(roomId) {
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageRatings, setMessageRatings] = useState([]);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);
  const [roomLoaded, setRoomLoaded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const clockOffsetRef = useRef(0); // serveur - local, en ms
  const messageIdsRef = useRef(new Set()); // suivi des ids de messages connus, pour filtrer message_ratings côté client

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  // ---------------------------------------------------------------------
  // 0. Calibration de l'horloge : on se cale sur l'heure du serveur plutôt
  //    que de faire confiance à l'horloge locale (souvent en léger décalage,
  //    ce qui suffit à faire tomber un compte à rebours à 0 immédiatement).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const t0 = Date.now();
      const { data, error: rpcError } = await supabase.rpc('now_utc');
      const t1 = Date.now();
      if (cancelled || rpcError || !data) {
        if (rpcError) console.warn('now_utc:', rpcError.message);
        return;
      }
      const serverNow = new Date(data).getTime();
      const estimatedLocalAtServerTime = t0 + (t1 - t0) / 2; // corrige la latence aller-retour
      clockOffsetRef.current = serverNow - estimatedLocalAtServerTime;
    })();
    return () => { cancelled = true; };
  }, [userId]);

  function nowCalibrated() {
    return Date.now() + clockOffsetRef.current;
  }

  // ---------------------------------------------------------------------
  // 1. Authentification anonyme (nécessaire pour auth.uid() côté RLS)
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (!cancelled) setUserId(session.user.id);
        return;
      }
      const { data, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) { setError(authError.message); return; }
      if (!cancelled) setUserId(data.user.id);
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------------------------------------------------------------------
  // 2. Chargement initial + abonnements Realtime (rooms / players / answers)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!roomId) return;
    let active = true;
    setRoomLoaded(false);

    (async () => {
      const [{ data: r }, { data: p }, { data: a }, { data: m }, { data: mr }] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase.from('room_players').select('*').eq('room_id', roomId),
        supabase.from('room_answers').select('*').eq('room_id', roomId),
        supabase.from('room_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
        supabase.from('message_ratings').select('*, room_messages!inner(room_id)').eq('room_messages.room_id', roomId),
      ]);
      if (!active) return;
      setRoom(r ?? null);
      setPlayers(p ?? []);
      setAnswers(a ?? []);
      setMessages(m ?? []);
      setMessageRatings((mr ?? []).map(({ room_messages, ...rest }) => rest));
      setRoomLoaded(true);
    })();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        (payload) => setPlayers((prev) => upsertRow(prev, payload))
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_answers', filter: `room_id=eq.${roomId}` },
        (payload) => setAnswers((prev) => upsertRow(prev, payload))
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
        (payload) => setMessages((prev) => upsertRow(prev, payload))
      )
      .on(
        // message_ratings n'a pas de room_id direct : on ne peut pas filtrer
        // côté serveur, donc on filtre côté client via l'ensemble des
        // messages déjà connus de cette salle (suivis dans messageIdsRef).
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_ratings' },
        (payload) => {
          const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
          if (messageIdsRef.current.has(row.message_id)) {
            setMessageRatings((prev) => upsertRow(prev, payload));
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // ---------------------------------------------------------------------
  // 3. Filet de sécurité : force l'avancement si un joueur bloque la partie
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!roomId) return;
    const interval = setInterval(() => {
      supabase.rpc('tick_room', { p_room_id: roomId }).then(({ error: tickError }) => {
        if (tickError) console.warn('tick_room:', tickError.message);
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [roomId]);

  // ---------------------------------------------------------------------
  // 4. Compte à rebours dérivé de phase_deadline (source de vérité serveur,
  //    jamais du temps local — évite tout désync entre joueurs)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!room?.phase_deadline) { setSecondsLeft(null); return; }
    const deadline = parseUtcTimestamp(room.phase_deadline);
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - nowCalibrated()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room?.phase_deadline]);

  // ---------------------------------------------------------------------
  // 5. Actions (appellent les RPC du schéma SQL)
  // ---------------------------------------------------------------------
  const createRoom = useCallback(async (mode, parcoursId, cardSequence, pseudo) => {
    const { data, error: rpcError } = await supabase.rpc('create_room', {
      p_mode: mode, p_parcours_id: parcoursId, p_card_sequence: cardSequence, p_pseudo: pseudo,
    });
    if (rpcError) throw rpcError;
    return data[0]; // { room_id, code, player_id }
  }, []);

  const joinRoom = useCallback(async (code, pseudo) => {
    const { data, error: rpcError } = await supabase.rpc('join_room', {
      p_code: code, p_pseudo: pseudo,
    });
    if (rpcError) throw rpcError;
    return data[0]; // { room_id, player_id }
  }, []);

  const startGame = useCallback(async () => {
    if (!roomId) return;
    const { error: rpcError } = await supabase.rpc('start_game', { p_room_id: roomId });
    if (rpcError) throw rpcError;
  }, [roomId]);

  const submitChoice = useCallback(async (cardNum, choice) => {
    if (!roomId) return;
    const { error: rpcError } = await supabase.rpc('submit_choice', {
      p_room_id: roomId, p_card_num: cardNum, p_choice: choice,
    });
    if (rpcError) throw rpcError;
  }, [roomId]);

  const endSession = useCallback(async () => {
    if (!roomId) return;
    const { error: rpcError } = await supabase.rpc('end_session', { p_room_id: roomId });
    if (rpcError) throw rpcError;
  }, [roomId]);

  const sendMessage = useCallback(async (cardNum, body) => {
    if (!roomId) return;
    const { error: rpcError } = await supabase.rpc('send_message', {
      p_room_id: roomId, p_card_num: cardNum, p_body: body,
    });
    if (rpcError) throw rpcError;
  }, [roomId]);

  const forceAdvance = useCallback(async () => {
    if (!roomId) return;
    const { error: rpcError } = await supabase.rpc('force_advance', { p_room_id: roomId });
    if (rpcError) throw rpcError;
  }, [roomId]);

  const rateMessage = useCallback(async (messageId, rating) => {
    const { error: rpcError } = await supabase.rpc('rate_message', {
      p_message_id: messageId, p_rating: rating,
    });
    if (rpcError) throw rpcError;
  }, []);

  // ---------------------------------------------------------------------
  // 6. Valeurs dérivées prêtes à consommer par l'UI
  // ---------------------------------------------------------------------
  const myPlayer = players.find((p) => p.user_id === userId) ?? null;
  const isHost = !!(room && userId && room.host_user_id === userId);
  const currentCardNum = room?.card_sequence?.[room.current_index] ?? null;

  const myAnswerForCurrentCard = answers.find(
    (a) => a.player_id === myPlayer?.id && a.card_num === currentCardNum
  ) ?? null;

  const hasSubmittedCurrentPhase = (() => {
    if (!room || !myAnswerForCurrentCard) return false;
    if (room.phase === 'choice1') return myAnswerForCurrentCard.initial_choice != null;
    if (room.phase === 'choice2') return myAnswerForCurrentCard.final_choice != null;
    return false;
  })();

  const submittedCount = answers.filter((a) => {
    if (a.card_num !== currentCardNum) return false;
    return room?.phase === 'choice1' ? a.initial_choice != null : a.final_choice != null;
  }).length;

  const connectedCount = players.filter((p) => p.connected).length;

  // Réponses des autres joueurs à la carte en cours (étape "peer_review")
  const peerInitialChoices = answers
    .filter((a) => a.card_num === currentCardNum && a.initial_choice != null)
    .map((a) => ({
      playerId: a.player_id,
      pseudo: players.find((p) => p.id === a.player_id)?.pseudo ?? '?',
      choice: a.initial_choice,
    }));

  // Statistiques A/B (initial et final) pour une carte donnée — utile pour
  // l'écran de révélation des pourcentages et pour le bilan.
  const getCardStats = useCallback((cardNum) => {
    const cardAnswers = answers.filter((a) => a.card_num === cardNum);
    const count = (list, key, val) => list.filter((a) => a[key] === val).length;
    const initialTotal = cardAnswers.filter((a) => a.initial_choice != null).length;
    const finalTotal = cardAnswers.filter((a) => a.final_choice != null).length;
    return {
      initial: {
        A: count(cardAnswers, 'initial_choice', 'A'),
        B: count(cardAnswers, 'initial_choice', 'B'),
        total: initialTotal,
      },
      final: {
        A: count(cardAnswers, 'final_choice', 'A'),
        B: count(cardAnswers, 'final_choice', 'B'),
        total: finalTotal,
      },
    };
  }, [answers]);

  // Bilan : variation entre choix initial et choix définitif, par joueur et
  // par carte. Une réponse est ignorée tant qu'elle n'a pas les deux valeurs
  // (un joueur qui n'a jamais validé son choix définitif, par ex. après une
  // déconnexion, ne fausse pas les statistiques).
  const getBilan = useCallback(() => {
    const perPlayerMap = new Map();
    for (const p of players) {
      perPlayerMap.set(p.id, { playerId: p.id, pseudo: p.pseudo, total: 0, changed: 0, confirmed: 0 });
    }
    const perCardMap = new Map();
    for (const cardNum of room?.card_sequence ?? []) {
      perCardMap.set(cardNum, { cardNum, total: 0, changed: 0 });
    }

    for (const a of answers) {
      if (a.initial_choice == null || a.final_choice == null) continue;
      const changed = a.initial_choice !== a.final_choice;

      const playerEntry = perPlayerMap.get(a.player_id);
      if (playerEntry) {
        playerEntry.total += 1;
        if (changed) playerEntry.changed += 1; else playerEntry.confirmed += 1;
      }

      const cardEntry = perCardMap.get(a.card_num);
      if (cardEntry) {
        cardEntry.total += 1;
        if (changed) cardEntry.changed += 1;
      }
    }

    const perPlayer = [...perPlayerMap.values()].map((p) => ({
      ...p,
      switchRate: p.total > 0 ? Math.round((p.changed / p.total) * 100) : 0,
    }));

    const perCard = (room?.card_sequence ?? []).map((cardNum) => {
      const c = perCardMap.get(cardNum);
      return { ...c, switchRate: c.total > 0 ? Math.round((c.changed / c.total) * 100) : 0 };
    });

    return { perPlayer, perCard };
  }, [answers, players, room]);

  // Popularité des arguments : moyenne des notes reçues par joueur sur
  // l'ensemble de ses messages de chat, tous cartes confondues.
  const getRatingBilan = useCallback(() => {
    const perPlayerMap = new Map();
    for (const p of players) {
      perPlayerMap.set(p.id, { playerId: p.id, pseudo: p.pseudo, messageCount: 0, ratingSum: 0, ratingCount: 0 });
    }
    const ratingsByMessage = new Map();
    for (const r of messageRatings) {
      ratingsByMessage.set(r.message_id, [...(ratingsByMessage.get(r.message_id) || []), r.rating]);
    }
    for (const m of messages) {
      const entry = perPlayerMap.get(m.player_id);
      if (!entry) continue;
      entry.messageCount += 1;
      const ratings = ratingsByMessage.get(m.id) || [];
      entry.ratingSum += ratings.reduce((a, b) => a + b, 0);
      entry.ratingCount += ratings.length;
    }
    return [...perPlayerMap.values()]
      .filter((p) => p.messageCount > 0)
      .map((p) => ({ ...p, average: p.ratingCount > 0 ? p.ratingSum / p.ratingCount : null }));
  }, [players, messages, messageRatings]);

  return {
    room, players, answers, messages, messageRatings, error, userId, roomLoaded,
    myPlayer, isHost, currentCardNum,
    myAnswerForCurrentCard, hasSubmittedCurrentPhase,
    submittedCount, connectedCount, peerInitialChoices,
    secondsLeft, getCardStats, getBilan, getRatingBilan,
    createRoom, joinRoom, startGame, submitChoice, endSession, forceAdvance, sendMessage, rateMessage,
  };
}

function upsertRow(list, payload) {
  if (payload.eventType === 'DELETE') {
    return list.filter((row) => row.id !== payload.old.id);
  }
  const exists = list.some((row) => row.id === payload.new.id);
  return exists
    ? list.map((row) => (row.id === payload.new.id ? payload.new : row))
    : [...list, payload.new];
}
