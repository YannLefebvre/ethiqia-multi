import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase.js'
import { questions, PARCOURS } from './gameData.js'

// ── CONSTANTES ───────────────────────────────────────────────────────
const THINK_DELAY = 10 // secondes de réflexion minimum
const PHASES = { WAITING: 'waiting', INDIVIDUAL: 'individual', DISCUSSION: 'discussion', COLLECTIVE: 'collective', BILAN: 'bilan' }
const PHASE_LABELS = {
  waiting: 'Salle d\'attente',
  individual: 'Vote individuel',
  discussion: 'Concertation',
  collective: 'Vote collectif',
  bilan: 'Bilan',
}

// ── GÉNÉRATION CODE SESSION ──────────────────────────────────────────
const WORDS = ['LION','AIGLE','LOUP','OURS','CERF','LYNX','BISON','RENARD','CYGNE','IBIS']
function genCode() {
  return WORDS[Math.floor(Math.random() * WORDS.length)] + Math.floor(10 + Math.random() * 90)
}

// ── HOOK TIMER ───────────────────────────────────────────────────────
function useTimer(seconds) {
  const [remaining, setRemaining] = useState(seconds)
  const ref = useRef(null)
  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(ref.current); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [])
  return { remaining, done: remaining === 0 }
}

// ── TIMER GATE : reset via key React ─────────────────────────────────
function TimerGate({ seconds, onUnlock, children }) {
  const { remaining, done } = useTimer(seconds)
  useEffect(() => { if (done && onUnlock) onUnlock() }, [done])
  return children ? children({ remaining, done }) : null
}

// ── COMPOSANT TIMER DISCRET ──────────────────────────────────────────
function TimerRing({ seconds, total }) {
  const pct = seconds / total
  const r = 16
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const color = pct > 0.5 ? '#69f0ae' : pct > 0.25 ? '#ffd764' : '#ff6b6b'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={40} height={40} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        <circle cx={20} cy={20} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }} />
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 24 }}>{seconds}s</span>
    </div>
  )
}

// ── ÉCRAN ACCUEIL ────────────────────────────────────────────────────
function HomeScreen({ onJoin, onCreate }) {
  const [mode, setMode] = useState(null) // 'join' | 'create'
  const [pseudo, setPseudo] = useState('')
  const [code, setCode] = useState('')
  const [parcours, setParcours] = useState(PARCOURS[0].id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!pseudo.trim()) { setError('Choisissez un pseudo.'); return }
    setLoading(true); setError('')
    const sessionCode = genCode()
    const p = PARCOURS.find(x => x.id === parcours)
    const { data: session, error: e1 } = await supabase
      .from('game_sessions').insert({ code: sessionCode, phase: PHASES.WAITING, card_ids: p.cards, parcours_id: parcours })
      .select().single()
    if (e1) { setError('Erreur création session.'); setLoading(false); return }
    const { data: player, error: e2 } = await supabase
      .from('players').insert({ session_id: session.id, pseudo: pseudo.trim(), is_host: true })
      .select().single()
    if (e2) { setError('Erreur création joueur.'); setLoading(false); return }
    onCreate({ session, player })
    setLoading(false)
  }

  const handleJoin = async () => {
    if (!pseudo.trim()) { setError('Choisissez un pseudo.'); return }
    if (!code.trim()) { setError('Entrez un code de session.'); return }
    setLoading(true); setError('')
    const { data: session, error: e1 } = await supabase
      .from('game_sessions').select('*').eq('code', code.trim().toUpperCase()).single()
    if (e1 || !session) { setError('Session introuvable.'); setLoading(false); return }
    if (session.phase === PHASES.BILAN) { setError('Cette session est terminée.'); setLoading(false); return }
    const { data: player, error: e2 } = await supabase
      .from('players').insert({ session_id: session.id, pseudo: pseudo.trim(), is_host: false })
      .select().single()
    if (e2) { setError('Erreur de connexion.'); setLoading(false); return }
    onJoin({ session, player })
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0f0c29,#1a1735,#0d0b22)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 440, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚖️</div>
          <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 900, color: '#ffd764', letterSpacing: '-1px' }}>Éthiq·IA</h1>
          <p style={{ margin: '6px 0 0', color: '#665e52', fontSize: 13 }}>Mode session multi-joueurs</p>
        </div>

        {/* Pseudo */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#a09888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Votre pseudo</label>
          <input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="Ex : Sophie, Équipe A…"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#f5efe0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
        </div>

        {/* Choix action */}
        {!mode && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setMode('create')} style={btnStyle('#ffd764', '#0f0c29')}>✦ Créer une session</button>
            <button onClick={() => setMode('join')} style={btnStyle('transparent', '#a09888', '1px solid rgba(255,255,255,0.15)')}>→ Rejoindre</button>
          </div>
        )}

        {/* Créer */}
        {mode === 'create' && (
          <div style={{ background: 'rgba(255,215,100,0.07)', border: '1px solid rgba(255,215,100,0.2)', borderRadius: 16, padding: 20, marginTop: 4 }}>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#ffd764', fontWeight: 700 }}>✦ Nouvelle session</p>
            <label style={{ display: 'block', fontSize: 11, color: '#a09888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Parcours</label>
            <select value={parcours} onChange={e => setParcours(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#f5efe0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }}>
              {PARCOURS.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#1a1735' }}>{p.label} ({p.cards.length} cartes)</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode(null)} style={btnStyle('rgba(255,255,255,0.06)', '#a09888')}>← Retour</button>
              <button onClick={handleCreate} disabled={loading} style={btnStyle('#ffd764', '#0f0c29')}>{loading ? '…' : 'Créer ✓'}</button>
            </div>
          </div>
        )}

        {/* Rejoindre */}
        {mode === 'join' && (
          <div style={{ background: 'rgba(79,195,247,0.07)', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 16, padding: 20, marginTop: 4 }}>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#4fc3f7', fontWeight: 700 }}>→ Rejoindre une session</p>
            <label style={{ display: 'block', fontSize: 11, color: '#a09888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Code de session</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Ex : LION42"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(79,195,247,0.3)', background: 'rgba(255,255,255,0.06)', color: '#4fc3f7', fontSize: 18, fontWeight: 700, letterSpacing: 4, textAlign: 'center', boxSizing: 'border-box', marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode(null)} style={btnStyle('rgba(255,255,255,0.06)', '#a09888')}>← Retour</button>
              <button onClick={handleJoin} disabled={loading} style={btnStyle('#4fc3f7', '#0f0c29')}>{loading ? '…' : 'Rejoindre →'}</button>
            </div>
          </div>
        )}

        {error && <p style={{ color: '#ff8a80', fontSize: 13, textAlign: 'center', marginTop: 12 }}>{error}</p>}

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 11, color: '#443d36', lineHeight: 1.6 }}>
          Vos choix sont anonymisés et utilisés uniquement à des fins statistiques.
        </p>
      </div>
    </div>
  )
}

function btnStyle(bg, color, border = 'none') {
  return { flex: 1, padding: '12px 16px', borderRadius: 12, border, background: bg, color, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'opacity 0.2s' }
}

// ── SALLE D'ATTENTE ──────────────────────────────────────────────────
function WaitingRoom({ session, player, players, onStart }) {
  const isHost = player.is_host
  const parcours = PARCOURS.find(p => p.id === session.parcours_id)

  return (
    <Screen title="Salle d'attente" subtitle={`Code : ${session.code}`} color="#ffd764">
      <div style={{ background: 'rgba(255,215,100,0.08)', border: '1px solid rgba(255,215,100,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, textAlign: 'center' }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: '#a09888', textTransform: 'uppercase', letterSpacing: 1 }}>Code à partager</p>
        <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: '#ffd764', letterSpacing: 8 }}>{session.code}</p>
      </div>

      {parcours && (
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: '#665e52' }}>Parcours : </span>
          <span style={{ fontSize: 13, color: '#f5efe0', fontWeight: 600 }}>{parcours.label}</span>
          <span style={{ fontSize: 11, color: '#665e52', marginLeft: 8 }}>({parcours.cards.length} cartes)</span>
        </div>
      )}

      <p style={{ fontSize: 12, color: '#a09888', marginBottom: 10 }}>Joueurs connectés ({players.length}) :</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {players.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: p.id === player.id ? '1px solid rgba(255,215,100,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: stringToColor(p.pseudo), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.pseudo[0].toUpperCase()}</div>
            <span style={{ fontSize: 14, color: '#f5efe0' }}>{p.pseudo}</span>
            {p.is_host && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#ffd764', background: 'rgba(255,215,100,0.12)', padding: '2px 8px', borderRadius: 20 }}>Hôte</span>}
            {p.id === player.id && !p.is_host && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#a09888' }}>Vous</span>}
          </div>
        ))}
      </div>

      {isHost ? (
        <button onClick={onStart} disabled={players.length < 1}
          style={{ ...btnStyle('#ffd764', '#0f0c29'), width: '100%', fontSize: 15, padding: '14px' }}>
          Démarrer la session →
        </button>
      ) : (
        <div style={{ textAlign: 'center', color: '#665e52', fontSize: 13 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          En attente du démarrage par l'hôte…
        </div>
      )}
    </Screen>
  )
}

function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#4fc3f7','#ce93d8','#69f0ae','#ffd764','#ff8a80','#f48fb1','#80cbc4']
  return colors[Math.abs(hash) % colors.length]
}

// ── PHASE VOTE INDIVIDUEL ─────────────────────────────────────────────
function IndividualPhase({ session, player, players, cardIds, myVotes, allVotes, onVote, onPhaseChange, onCardChange, isHost }) {
  // cardIdx piloté par Supabase via session.current_card — synchronisé pour tous
  const cardIdx = session.current_card ?? 0
  const card = questions.find(q => q.id === cardIds[cardIdx])
  const voted = myVotes[card?.id]
  const totalCards = cardIds.length
  const doneCount = Object.keys(myVotes).filter(id => cardIds.includes(Number(id))).length

  // Timer : reset à chaque nouvelle carte (key React = remontage complet)
  const [canVote, setCanVote] = useState(false)
  useEffect(() => { setCanVote(false) }, [cardIdx])
  useEffect(() => { if (voted) setCanVote(true) }, [voted])

  // Tous les joueurs ont-ils voté cette carte ?
  const allVotedThisCard = players.length > 0 && players.every(p => allVotes[p.id]?.[card?.id])

  const handleVote = async (opt) => {
    if (!canVote) return
    await onVote(card.id, opt)
  }

  if (!card) return null

  return (
    <Screen title="Vote individuel" subtitle={`Carte ${cardIdx + 1} / ${totalCards}`} color="#4fc3f7"
      headerRight={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: '#665e52' }}>{doneCount}/{totalCards} votées</span>
        {!canVote && (
          <TimerGate key={cardIdx} seconds={THINK_DELAY} onUnlock={() => setCanVote(true)}>
            {({ remaining }) => <TimerRing seconds={remaining} total={THINK_DELAY} />}
          </TimerGate>
        )}
      </div>}>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {cardIds.map((cid, i) => (
          <div key={cid} style={{ width: 10, height: 10, borderRadius: '50%', background: myVotes[cid] ? (myVotes[cid] === 'A' ? '#4fc3f7' : '#ce93d8') : i === cardIdx ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)', transition: 'all 0.2s' }} />
        ))}
      </div>

      {/* Card */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(79,195,247,0.15)', border: '1px solid rgba(79,195,247,0.3)', color: '#4fc3f7', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{card.id}</div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f5efe0', fontFamily: 'Georgia, serif' }}>{card.titre}</h3>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#a09888', lineHeight: 1.6, fontStyle: 'italic' }}>{card.situation}</p>
      </div>

      {/* Lock overlay */}
      {!canVote && (
        <TimerGate key={`lock-${cardIdx}`} seconds={THINK_DELAY} onUnlock={() => setCanVote(true)}>
          {({ remaining }) => (
            <div style={{ textAlign: 'center', padding: '10px 0', marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#665e52', fontStyle: 'italic' }}>Prenez le temps de lire… Le vote s'active dans {remaining}s</p>
            </div>
          )}
        </TimerGate>
      )}

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {[{ opt: 'A', text: card.altA, color: '#4fc3f7', bg: 'rgba(79,195,247,0.08)', activeBg: 'rgba(79,195,247,0.22)', borderActive: '#4fc3f7' },
          { opt: 'B', text: card.altB, color: '#ce93d8', bg: 'rgba(206,147,216,0.08)', activeBg: 'rgba(206,147,216,0.22)', borderActive: '#ce93d8' }
        ].map(({ opt, text, color, bg, activeBg, borderActive }) => (
          <button key={opt} onClick={() => handleVote(opt)} disabled={!canVote}
            style={{ padding: '14px 16px', borderRadius: 12, border: `2px solid ${voted === opt ? borderActive : 'rgba(255,255,255,0.08)'}`, background: voted === opt ? activeBg : bg, color: '#f5efe0', fontSize: 13, textAlign: 'left', cursor: canVote ? 'pointer' : 'not-allowed', opacity: !canVote ? 0.5 : 1, transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
            <span style={{ display: 'block', fontSize: 9, fontWeight: 800, color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Option {opt === 'A' ? '1' : '2'}{voted === opt ? ' ✓' : ''}</span>
            {text}
          </button>
        ))}
      </div>

      {/* Attente des autres joueurs après vote */}
      {voted && !allVotedThisCard && (
        <div style={{ textAlign: 'center', padding: '10px 0', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#665e52', fontStyle: 'italic' }}>
            Vote enregistré ✓ — En attente des autres…
            ({Object.values(allVotes).filter(v => v[card?.id]).length}/{players.length})
          </p>
        </div>
      )}

      {/* Résultats : visibles seulement quand tous ont voté */}
      {allVotedThisCard && (() => {
        const countA = Object.values(allVotes).filter(v => v[card.id] === 'A').length
        const countB = Object.values(allVotes).filter(v => v[card.id] === 'B').length
        const tot = countA + countB
        const pct = tot > 0 ? Math.round((countA / tot) * 100) : 0
        return (
          <div style={{ padding: '12px 14px', background: 'rgba(105,240,174,0.06)', border: '1px solid rgba(105,240,174,0.2)', borderRadius: 12, marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: '#69f0ae', textTransform: 'uppercase', letterSpacing: 1 }}>✓ Tous ont voté</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#4fc3f7', fontWeight: 700 }}>{pct}%</span>
              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: '#4fc3f7', display: 'inline-block' }} />
                <div style={{ width: `${100-pct}%`, height: '100%', background: '#ce93d8', display: 'inline-block' }} />
              </div>
              <span style={{ fontSize: 12, color: '#ce93d8', fontWeight: 700 }}>{100-pct}%</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {players.map(p => {
                const v = allVotes[p.id]?.[card.id]
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 20, background: v === 'A' ? 'rgba(79,195,247,0.12)' : 'rgba(206,147,216,0.12)', border: `1px solid ${v === 'A' ? 'rgba(79,195,247,0.3)' : 'rgba(206,147,216,0.3)'}` }}>
                    <span style={{ fontSize: 10, color: '#c0b8a8' }}>{p.pseudo}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: v === 'A' ? '#4fc3f7' : '#ce93d8' }}>Opt.{v === 'A' ? '1' : '2'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Navigation hôte seulement */}
      {isHost ? (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => onCardChange(Math.max(0, cardIdx - 1))} disabled={cardIdx === 0}
            style={{ ...btnStyle('rgba(255,255,255,0.06)', '#a09888'), flex: 0, padding: '10px 18px', opacity: cardIdx === 0 ? 0.3 : 1 }}>←</button>
          <button onClick={() => onCardChange(Math.min(totalCards - 1, cardIdx + 1))} disabled={cardIdx === totalCards - 1}
            style={{ ...btnStyle('rgba(255,255,255,0.06)', '#a09888'), opacity: cardIdx === totalCards - 1 ? 0.3 : 1 }}>Suivant →</button>
        </div>
      ) : (
        <p style={{ fontSize: 11, color: '#443d36', textAlign: 'center', marginBottom: 16 }}>L'hôte contrôle la navigation entre les cartes</p>
      )}

      {/* Host control — passer à la concertation */}
      {isHost && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 8 }}>
          <p style={{ fontSize: 11, color: '#665e52', marginBottom: 10 }}>
            Hôte — passez en concertation quand les joueurs sont prêts.
          </p>
          <button onClick={() => onPhaseChange(PHASES.DISCUSSION)} style={{ ...btnStyle('#ffd764', '#0f0c29'), width: '100%' }}>
            → Passer à la concertation
          </button>
        </div>
      )}
    </Screen>
  )
}

// ── PHASE DISCUSSION ─────────────────────────────────────────────────
function DiscussionPhase({ session, player, players, cardIds, allVotes, onPhaseChange, isHost }) {
  const [cardIdx, setCardIdx] = useState(0)
  const card = questions.find(q => q.id === cardIds[cardIdx])
  const totalCards = cardIds.length

  // Calcul des votes pour cette carte
  const cardVotes = Object.entries(allVotes).filter(([pid]) => true)
    .reduce((acc, [pid, votes]) => {
      const v = votes[card?.id]
      if (v) { acc[v] = (acc[v] || 0) + 1 }
      return acc
    }, {})

  const countA = cardVotes['A'] || 0
  const countB = cardVotes['B'] || 0
  const total = countA + countB
  const pctA = total > 0 ? Math.round((countA / total) * 100) : 0

  // Divergence : 50% = max désaccord, 0% ou 100% = consensus
  const divergence = total > 0 ? Math.round(100 - Math.abs(pctA - 50) * 2) : 0

  return (
    <Screen title="Concertation" subtitle={`Carte ${cardIdx + 1} / ${totalCards}`} color="#ffd764">
      {/* Progress */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {cardIds.map((cid, i) => (
          <div key={cid} onClick={() => setCardIdx(i)} style={{ width: 10, height: 10, borderRadius: '50%', cursor: 'pointer', background: i === cardIdx ? '#ffd764' : 'rgba(255,255,255,0.1)', transition: 'all 0.2s' }} />
        ))}
      </div>

      {/* Card */}
      <div style={{ background: 'rgba(255,215,100,0.06)', border: '1px solid rgba(255,215,100,0.2)', borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,215,100,0.15)', color: '#ffd764', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{card?.id}</div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f5efe0', fontFamily: 'Georgia, serif' }}>{card?.titre}</h3>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#a09888', fontStyle: 'italic', lineHeight: 1.6 }}>{card?.situation}</p>
      </div>

      {/* Résultats individuels */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <p style={{ margin: '0 0 12px', fontSize: 11, color: '#a09888', textTransform: 'uppercase', letterSpacing: 1 }}>Votes individuels</p>

        {/* Barre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: '#4fc3f7', fontWeight: 700, minWidth: 36 }}>{pctA}%</span>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pctA}%`, height: '100%', background: '#4fc3f7', display: 'inline-block', transition: 'width 0.5s' }} />
            <div style={{ width: `${100 - pctA}%`, height: '100%', background: '#ce93d8', display: 'inline-block', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: 13, color: '#ce93d8', fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{100 - pctA}%</span>
        </div>

        {/* Par joueur */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {players.map(p => {
            const v = allVotes[p.id]?.[card?.id]
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, background: v === 'A' ? 'rgba(79,195,247,0.12)' : v === 'B' ? 'rgba(206,147,216,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${v === 'A' ? 'rgba(79,195,247,0.3)' : v === 'B' ? 'rgba(206,147,216,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: stringToColor(p.pseudo), fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.pseudo[0].toUpperCase()}</div>
                <span style={{ fontSize: 11, color: '#c0b8a8' }}>{p.pseudo}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: v === 'A' ? '#4fc3f7' : v === 'B' ? '#ce93d8' : '#443d36' }}>{v ? `Opt.${v === 'A' ? '1' : '2'}` : '—'}</span>
              </div>
            )
          })}
        </div>

        {/* Indice de divergence */}
        <div style={{ marginTop: 12, padding: '8px 12px', background: divergence > 60 ? 'rgba(255,107,107,0.08)' : divergence > 30 ? 'rgba(255,215,100,0.08)' : 'rgba(105,240,174,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#665e52' }}>Désaccord :</span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${divergence}%`, height: '100%', background: divergence > 60 ? '#ff6b6b' : divergence > 30 ? '#ffd764' : '#69f0ae' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: divergence > 60 ? '#ff6b6b' : divergence > 30 ? '#ffd764' : '#69f0ae' }}>{divergence}%</span>
        </div>
      </div>

      {/* Options texte */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(79,195,247,0.06)', border: '1px solid rgba(79,195,247,0.15)' }}>
          <span style={{ fontSize: 9, color: '#4fc3f7', fontWeight: 800, display: 'block', marginBottom: 3 }}>OPTION 1 ({countA} vote{countA > 1 ? 's' : ''})</span>
          <span style={{ fontSize: 12, color: '#c0b8a8' }}>{card?.altA}</span>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(206,147,216,0.06)', border: '1px solid rgba(206,147,216,0.15)' }}>
          <span style={{ fontSize: 9, color: '#ce93d8', fontWeight: 800, display: 'block', marginBottom: 3 }}>OPTION 2 ({countB} vote{countB > 1 ? 's' : ''})</span>
          <span style={{ fontSize: 12, color: '#c0b8a8' }}>{card?.altB}</span>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={() => setCardIdx(i => Math.max(0, i - 1))} disabled={cardIdx === 0} style={{ ...btnStyle('rgba(255,255,255,0.06)', '#a09888'), flex: 0, padding: '10px 18px', opacity: cardIdx === 0 ? 0.3 : 1 }}>←</button>
        <button onClick={() => setCardIdx(i => Math.min(totalCards - 1, i + 1))} disabled={cardIdx === totalCards - 1} style={{ ...btnStyle('rgba(255,255,255,0.06)', '#a09888'), opacity: cardIdx === totalCards - 1 ? 0.3 : 1 }}>Suivant →</button>
      </div>

      {isHost && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <button onClick={() => onPhaseChange(PHASES.COLLECTIVE)} style={{ ...btnStyle('#ffd764', '#0f0c29'), width: '100%' }}>
            → Passer au vote collectif
          </button>
        </div>
      )}
    </Screen>
  )
}

// ── PHASE VOTE COLLECTIF ──────────────────────────────────────────────
function CollectivePhase({ session, player, players, cardIds, collectiveVotes, onCollectiveVote, onPhaseChange, isHost }) {
  const [cardIdx, setCardIdx] = useState(0)
  const [myVote, setMyVote] = useState({})

  const card = questions.find(q => q.id === cardIds[cardIdx])
  const totalCards = cardIds.length

  const [canVote, setCanVote] = useState(false)
  useEffect(() => { setCanVote(false) }, [cardIdx])

  const cv = collectiveVotes[card?.id]
  const countA = cv?.count_a || 0
  const countB = cv?.count_b || 0
  const totalVotes = countA + countB
  const result = cv?.option // 'A', 'B', ou 'AB'

  const allDone = cardIds.every(cid => collectiveVotes[cid])

  const handleVote = async (opt) => {
    if (!canVote || myVote[card.id]) return
    setMyVote(v => ({ ...v, [card.id]: opt }))
    await onCollectiveVote(card.id, opt)
  }

  return (
    <Screen title="Vote collectif" subtitle={`Carte ${cardIdx + 1} / ${totalCards}`} color="#ce93d8"
      headerRight={!canVote ? (
        <TimerGate key={`coll-${cardIdx}`} seconds={THINK_DELAY} onUnlock={() => setCanVote(true)}>
          {({ remaining }) => <TimerRing seconds={remaining} total={THINK_DELAY} />}
        </TimerGate>
      ) : null}>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {cardIds.map((cid, i) => (
          <div key={cid} onClick={() => setCardIdx(i)} style={{ width: 10, height: 10, borderRadius: '50%', cursor: 'pointer', background: collectiveVotes[cid] ? '#ce93d8' : i === cardIdx ? 'rgba(206,147,216,0.4)' : 'rgba(255,255,255,0.08)', transition: 'all 0.2s' }} />
        ))}
      </div>

      {/* Card */}
      <div style={{ background: 'rgba(206,147,216,0.06)', border: '1px solid rgba(206,147,216,0.2)', borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(206,147,216,0.15)', color: '#ce93d8', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{card?.id}</div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f5efe0', fontFamily: 'Georgia, serif' }}>{card?.titre}</h3>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#a09888', fontStyle: 'italic', lineHeight: 1.6 }}>{card?.situation}</p>
      </div>

      {/* Résultat collectif si déjà voté */}
      {result && (
        <div style={{ background: result === 'AB' ? 'rgba(255,215,100,0.1)' : result === 'A' ? 'rgba(79,195,247,0.1)' : 'rgba(206,147,216,0.1)', border: `1px solid ${result === 'AB' ? 'rgba(255,215,100,0.3)' : result === 'A' ? 'rgba(79,195,247,0.3)' : 'rgba(206,147,216,0.3)'}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: '#665e52', textTransform: 'uppercase', letterSpacing: 1 }}>Décision collective</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: result === 'AB' ? '#ffd764' : result === 'A' ? '#4fc3f7' : '#ce93d8' }}>
            {result === 'AB' ? '⚖️ Égalité — Les deux options' : result === 'A' ? '→ Option 1' : '→ Option 2'}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#665e52' }}>{countA} vs {countB} — {totalVotes} vote{totalVotes > 1 ? 's' : ''}</p>
        </div>
      )}

      {!canVote && !myVote[card?.id] && (
        <TimerGate key={`coll-lock-${cardIdx}`} seconds={THINK_DELAY} onUnlock={() => setCanVote(true)}>
          {({ remaining }) => (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#665e52', fontStyle: 'italic', marginBottom: 10 }}>Réfléchissez encore {remaining}s avant de voter…</p>
          )}
        </TimerGate>
      )}

      {/* Options vote */}
      {!myVote[card?.id] && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {[{ opt: 'A', text: card?.altA, color: '#4fc3f7', activeBg: 'rgba(79,195,247,0.2)' },
            { opt: 'B', text: card?.altB, color: '#ce93d8', activeBg: 'rgba(206,147,216,0.2)' }
          ].map(({ opt, text, color, activeBg }) => (
            <button key={opt} onClick={() => handleVote(opt)} disabled={!canVote}
              style={{ padding: '14px 16px', borderRadius: 12, border: `2px solid ${canVote ? (opt === 'A' ? 'rgba(79,195,247,0.4)' : 'rgba(206,147,216,0.4)') : 'rgba(255,255,255,0.06)'}`, background: canVote ? (opt === 'A' ? 'rgba(79,195,247,0.08)' : 'rgba(206,147,216,0.08)') : 'rgba(255,255,255,0.03)', color: '#f5efe0', fontSize: 13, textAlign: 'left', cursor: canVote ? 'pointer' : 'not-allowed', opacity: !canVote ? 0.4 : 1, transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
              <span style={{ display: 'block', fontSize: 9, fontWeight: 800, color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Option {opt === 'A' ? '1' : '2'}</span>
              {text}
            </button>
          ))}
        </div>
      )}

      {myVote[card?.id] && !result && (
        <div style={{ textAlign: 'center', padding: 16, color: '#665e52', fontSize: 13 }}>
          Vote enregistré — en attente des autres joueurs…
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={() => setCardIdx(i => Math.max(0, i - 1))} disabled={cardIdx === 0} style={{ ...btnStyle('rgba(255,255,255,0.06)', '#a09888'), flex: 0, padding: '10px 18px', opacity: cardIdx === 0 ? 0.3 : 1 }}>←</button>
        <button onClick={() => setCardIdx(i => Math.min(totalCards - 1, i + 1))} disabled={cardIdx === totalCards - 1} style={{ ...btnStyle('rgba(255,255,255,0.06)', '#a09888'), opacity: cardIdx === totalCards - 1 ? 0.3 : 1 }}>Suivant →</button>
      </div>

      {isHost && allDone && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <button onClick={() => onPhaseChange(PHASES.BILAN)} style={{ ...btnStyle('#ffd764', '#0f0c29'), width: '100%' }}>
            → Voir le bilan
          </button>
        </div>
      )}
    </Screen>
  )
}

// ── BILAN ─────────────────────────────────────────────────────────────
function BilanPhase({ session, players, cardIds, allVotes, collectiveVotes, globalStats }) {
  const [tab, setTab] = useState('session') // 'session' | 'global'

  // Stats session
  const sessionStats = cardIds.map(cid => {
    const card = questions.find(q => q.id === cid)
    const votes = Object.values(allVotes).map(v => v[cid]).filter(Boolean)
    const countA = votes.filter(v => v === 'A').length
    const countB = votes.filter(v => v === 'B').length
    const total = countA + countB
    const pctA = total > 0 ? Math.round((countA / total) * 100) : 0
    // Divergence = 0 si unanime, 100 si parfaitement partagé
    const divergence = total > 0 ? Math.round(100 - Math.abs(pctA - 50) * 2) : 0
    const cv = collectiveVotes[cid]
    const collective = cv?.option
    const majoriteIndiv = pctA >= 50 ? 'A' : 'B'
    const evolution = collective && majoriteIndiv && collective !== 'AB'
      ? collective === majoriteIndiv ? 'stable' : 'revirement'
      : collective === 'AB' ? 'egalite' : 'nc'

    return { card, countA, countB, total, pctA, divergence, collective, evolution }
  }).sort((a, b) => b.divergence - a.divergence)

  const avgDivergence = sessionStats.length > 0
    ? Math.round(sessionStats.reduce((s, x) => s + x.divergence, 0) / sessionStats.length)
    : 0

  const revirements = sessionStats.filter(s => s.evolution === 'revirement').length

  return (
    <Screen title="Bilan" subtitle={`Session ${session.code}`} color="#ffd764">
      {/* Résumé session */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Joueurs', value: players.length, color: '#4fc3f7' },
          { label: 'Désaccord moy.', value: `${avgDivergence}%`, color: avgDivergence > 50 ? '#ff6b6b' : avgDivergence > 25 ? '#ffd764' : '#69f0ae' },
          { label: 'Revirements', value: revirements, color: '#ce93d8' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#665e52', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ id: 'session', label: '📊 Cette session' }, { id: 'global', label: '🌐 Toutes sessions' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${tab === t.id ? 'rgba(255,215,100,0.4)' : 'rgba(255,255,255,0.08)'}`, background: tab === t.id ? 'rgba(255,215,100,0.1)' : 'rgba(255,255,255,0.04)', color: tab === t.id ? '#ffd764' : '#665e52', fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'session' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: '#665e52' }}>Classement par désaccord initial ↓ (les plus clivantes en premier)</p>
          {sessionStats.map(({ card, countA, countB, total, pctA, divergence, collective, evolution }) => (
            <div key={card.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', color: '#a09888', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{card.id}</div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f5efe0', fontFamily: 'Georgia, serif', flex: 1 }}>{card.titre}</span>
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: divergence > 60 ? 'rgba(255,107,107,0.15)' : divergence > 30 ? 'rgba(255,215,100,0.12)' : 'rgba(105,240,174,0.1)', color: divergence > 60 ? '#ff8a80' : divergence > 30 ? '#ffd764' : '#69f0ae', fontWeight: 700 }}>
                  {divergence}% désaccord
                </span>
              </div>

              {/* Barre individuelle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#665e52', minWidth: 80 }}>Individuel</span>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pctA}%`, height: '100%', background: '#4fc3f7', display: 'inline-block' }} />
                  <div style={{ width: `${100 - pctA}%`, height: '100%', background: '#ce93d8', display: 'inline-block' }} />
                </div>
                <span style={{ fontSize: 10, color: '#4fc3f7', minWidth: 30 }}>{pctA}%</span>
                <span style={{ fontSize: 10, color: '#ce93d8', minWidth: 30, textAlign: 'right' }}>{100-pctA}%</span>
              </div>

              {/* Vote collectif */}
              {collective && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: '#665e52', minWidth: 80 }}>Collectif</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: collective === 'AB' ? '#ffd764' : collective === 'A' ? '#4fc3f7' : '#ce93d8' }}>
                    {collective === 'AB' ? '⚖️ Égalité (A+B)' : collective === 'A' ? 'Option 1' : 'Option 2'}
                  </span>
                  {evolution === 'revirement' && <span style={{ fontSize: 10, color: '#ff8a80', background: 'rgba(255,107,107,0.1)', padding: '2px 7px', borderRadius: 20 }}>↺ Revirement</span>}
                  {evolution === 'stable' && <span style={{ fontSize: 10, color: '#69f0ae', background: 'rgba(105,240,174,0.1)', padding: '2px 7px', borderRadius: 20 }}>✓ Confirmé</span>}
                  {evolution === 'egalite' && <span style={{ fontSize: 10, color: '#ffd764', background: 'rgba(255,215,100,0.1)', padding: '2px 7px', borderRadius: 20 }}>⚖️ Partagé</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'global' && (
        <GlobalStats cardIds={cardIds} sessionCode={session.code} />
      )}
    </Screen>
  )
}

// ── STATS GLOBALES ────────────────────────────────────────────────────
function GlobalStats({ cardIds }) {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGlobal()
  }, [])

  async function loadGlobal() {
    setLoading(true)
    // Récupère tous les votes collectifs pour ces cartes
    const { data, error } = await supabase
      .from('votes_collectif')
      .select('question_id, option, count_a, count_b')
      .in('question_id', cardIds)

    if (error || !data) { setLoading(false); return }

    // Agrège par question
    const agg = {}
    data.forEach(row => {
      if (!agg[row.question_id]) agg[row.question_id] = { totalA: 0, totalB: 0, sessions: 0 }
      agg[row.question_id].totalA += row.count_a
      agg[row.question_id].totalB += row.count_b
      agg[row.question_id].sessions += 1
    })

    const result = cardIds.map(cid => {
      const card = questions.find(q => q.id === cid)
      const a = agg[cid] || { totalA: 0, totalB: 0, sessions: 0 }
      const total = a.totalA + a.totalB
      const pctA = total > 0 ? Math.round((a.totalA / total) * 100) : 0
      // Polarisation : à quel point ce sujet divise globalement
      const polarisation = total > 0 ? Math.round(100 - Math.abs(pctA - 50) * 2) : 0
      return { card, ...a, total, pctA, polarisation }
    }).sort((a, b) => b.polarisation - a.polarisation)

    setStats(result)
    setLoading(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#665e52' }}>Chargement des statistiques…</div>

  return (
    <div>
      <p style={{ margin: '0 0 14px', fontSize: 11, color: '#665e52' }}>
        Données agrégées sur toutes les sessions — classées par indice de polarisation global ↓
      </p>
      {stats.map(({ card, totalA, totalB, sessions, total, pctA, polarisation }) => (
        <div key={card.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', color: '#a09888', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{card.id}</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f5efe0', fontFamily: 'Georgia, serif', flex: 1 }}>{card.titre}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: polarisation > 60 ? '#ff8a80' : polarisation > 30 ? '#ffd764' : '#69f0ae' }}>{polarisation}%</div>
              <div style={{ fontSize: 9, color: '#443d36' }}>polarisation</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pctA}%`, height: '100%', background: '#4fc3f7', display: 'inline-block' }} />
              <div style={{ width: `${100 - pctA}%`, height: '100%', background: '#ce93d8', display: 'inline-block' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#665e52' }}>
            <span><span style={{ color: '#4fc3f7', fontWeight: 700 }}>{pctA}%</span> Opt.1 ({totalA} votes)</span>
            <span style={{ color: '#443d36' }}>{sessions} session{sessions > 1 ? 's' : ''} — {total} votes</span>
            <span><span style={{ color: '#ce93d8', fontWeight: 700 }}>{100 - pctA}%</span> Opt.2 ({totalB} votes)</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── COMPOSANT ÉCRAN ───────────────────────────────────────────────────
function Screen({ title, subtitle, color, children, headerRight }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0f0c29,#1a1735,#0d0b22)', fontFamily: 'Inter, sans-serif', color: '#e8e0d0' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 14px 60px' }}>
        <div style={{ padding: '18px 0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 900, color }}>{title}</h1>
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#665e52' }}>{subtitle}</p>}
          </div>
          {headerRight}
        </div>
        {children}
      </div>
    </div>
  )
}

// ── APP PRINCIPALE ────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [player, setPlayer] = useState(null)
  const [players, setPlayers] = useState([])
  const [myVotes, setMyVotes] = useState({})
  const [allVotes, setAllVotes] = useState({}) // { player_id: { question_id: option } }
  const [collectiveVotes, setCollectiveVotes] = useState({})

  // ── Refs pour éviter les closures périmées ────────────────────────
  const sessionIdRef = useRef(null)
  const playerIdRef = useRef(null)

  // ── Chargement initial (une seule fois à la connexion) ─────────────
  useEffect(() => {
    if (!session?.id || !player?.id) return
    if (sessionIdRef.current === session.id) return // déjà initialisé
    sessionIdRef.current = session.id
    playerIdRef.current = player.id

    loadPlayers()
    loadMyVotes()
    loadAllVotes()
    loadCollectiveVotes()

    // Realtime: session changes — polling fallback toutes les 2s
    const sessionSub = supabase.channel('session-' + session.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${session.id}` },
        payload => {
          setSession(prev => ({ ...prev, ...payload.new }))
        })
      .subscribe()

    // Polling de secours sur game_sessions (au cas où Realtime filter ne fonctionne pas)
    const pollInterval = setInterval(async () => {
      const { data } = await supabase.from('game_sessions').select('*').eq('id', session.id).single()
      if (data) setSession(prev => {
        if (prev.current_card !== data.current_card || prev.phase !== data.phase) {
          return { ...prev, ...data }
        }
        return prev
      })
    }, 2000)

    // Realtime: players join
    const playerSub = supabase.channel('players-' + session.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `session_id=eq.${session.id}` },
        () => loadPlayers())
      .subscribe()

    // Realtime: individual votes
    const votesSub = supabase.channel('votes-indiv-' + session.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes_indiv', filter: `session_id=eq.${session.id}` },
        () => loadAllVotes())
      .subscribe()

    // Realtime: collective votes
    const collSub = supabase.channel('votes-coll-' + session.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes_collectif', filter: `session_id=eq.${session.id}` },
        () => loadCollectiveVotes())
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(sessionSub)
      supabase.removeChannel(playerSub)
      supabase.removeChannel(votesSub)
      supabase.removeChannel(collSub)
    }
  }, [session?.id, player?.id])

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').eq('session_id', session.id).order('joined_at')
    if (data) setPlayers(data)
  }

  async function loadMyVotes() {
    const { data } = await supabase.from('votes_indiv').select('*').eq('session_id', session.id).eq('player_id', player.id)
    if (data) {
      const v = {}
      data.forEach(row => { v[row.question_id] = row.option })
      setMyVotes(v)
    }
  }

  async function loadAllVotes() {
    const { data } = await supabase.from('votes_indiv').select('*').eq('session_id', session.id)
    if (data) {
      const v = {}
      data.forEach(row => {
        if (!v[row.player_id]) v[row.player_id] = {}
        v[row.player_id][row.question_id] = row.option
      })
      setAllVotes(v)
      // Update my votes too
      if (v[player.id]) setMyVotes(v[player.id])
    }
  }

  async function loadCollectiveVotes() {
    const { data } = await supabase.from('votes_collectif').select('*').eq('session_id', session.id)
    if (data) {
      const v = {}
      data.forEach(row => { v[row.question_id] = row })
      setCollectiveVotes(v)
    }
  }

  // ── Vote individuel ───────────────────────────────────────────────
  async function handleVote(questionId, opt) {
    setMyVotes(v => ({ ...v, [questionId]: opt }))
    await supabase.from('votes_indiv')
      .upsert({ session_id: session.id, player_id: player.id, question_id: questionId, option: opt },
        { onConflict: 'session_id,player_id,question_id' })
  }

  // ── Vote collectif (agrégation côté client) ───────────────────────
  async function handleCollectiveVote(questionId, opt) {
    // Récupère le vote collectif actuel
    const { data: existing } = await supabase.from('votes_collectif')
      .select('*').eq('session_id', session.id).eq('question_id', questionId).single()

    const newCountA = (existing?.count_a || 0) + (opt === 'A' ? 1 : 0)
    const newCountB = (existing?.count_b || 0) + (opt === 'B' ? 1 : 0)
    const totalVotes = newCountA + newCountB

    // On comptabilise quand tous ont voté (approximation: au bout de nb joueurs votes)
    let resultOption = null
    if (totalVotes >= players.length) {
      if (newCountA > newCountB) resultOption = 'A'
      else if (newCountB > newCountA) resultOption = 'B'
      else resultOption = 'AB' // Égalité → les deux
    }

    await supabase.from('votes_collectif').upsert({
      session_id: session.id,
      question_id: questionId,
      count_a: newCountA,
      count_b: newCountB,
      option: resultOption || (existing?.option || '?'),
    }, { onConflict: 'session_id,question_id' })
  }

  // ── Changement de phase (hôte uniquement) ────────────────────────
  async function handlePhaseChange(newPhase) {
    await supabase.from('game_sessions').update({ phase: newPhase }).eq('id', session.id)
    setSession(prev => ({ ...prev, phase: newPhase }))
  }

  // ── Connexion / création ──────────────────────────────────────────
  const handleCreate = ({ session: s, player: p }) => {
    setSession(s); setPlayer(p); setPlayers([p])
  }
  const handleJoin = ({ session: s, player: p }) => {
    setSession(s); setPlayer(p)
  }

  if (!session || !player) {
    return <HomeScreen onCreate={handleCreate} onJoin={handleJoin} />
  }

  const isHost = player.is_host
  const phase = session.phase
  const cardIds = session.card_ids || []

  // ── Routing des phases ────────────────────────────────────────────
  if (phase === PHASES.WAITING) {
    return <WaitingRoom session={session} player={player} players={players} onStart={() => handlePhaseChange(PHASES.INDIVIDUAL)} />
  }

  const handleCardChange = async (idx) => {
    await supabase.from('game_sessions').update({ current_card: idx }).eq('id', session.id)
  }

  if (phase === PHASES.INDIVIDUAL) {
    return <IndividualPhase session={session} player={player} players={players} cardIds={cardIds}
      myVotes={myVotes} allVotes={allVotes} onVote={handleVote} onPhaseChange={handlePhaseChange}
      onCardChange={handleCardChange} isHost={isHost} />
  }

  if (phase === PHASES.DISCUSSION) {
    return <DiscussionPhase session={session} player={player} players={players} cardIds={cardIds}
      allVotes={allVotes} onPhaseChange={handlePhaseChange} isHost={isHost} />
  }

  if (phase === PHASES.COLLECTIVE) {
    return <CollectivePhase session={session} player={player} players={players} cardIds={cardIds}
      collectiveVotes={collectiveVotes} onCollectiveVote={handleCollectiveVote}
      onPhaseChange={handlePhaseChange} isHost={isHost} />
  }

  if (phase === PHASES.BILAN) {
    return <BilanPhase session={session} players={players} cardIds={cardIds}
      allVotes={allVotes} collectiveVotes={collectiveVotes} />
  }

  return null
}
