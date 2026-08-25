import { useState } from 'react'
import { PARCOURS, questions } from '../gameData.js'

const ALL_CARD_IDS = questions.map((q) => q.id)

function btnStyle(bg, color, border = 'none') {
  return {
    flex: 1, padding: '12px 16px', borderRadius: 12, border, background: bg, color,
    fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    transition: 'opacity 0.2s',
  }
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
  color: '#f5efe0', fontSize: 14, boxSizing: 'border-box', outline: 'none',
}

const labelStyle = {
  display: 'block', fontSize: 11, color: '#a09888', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: 1,
}

export default function HomeScreen({ createRoom, joinRoom, onEnter, authError }) {
  const [mode, setMode] = useState(null) // 'create' | 'join'
  const [createKind, setCreateKind] = useState('parcours') // 'parcours' | 'libre'
  const [pseudo, setPseudo] = useState('')
  const [code, setCode] = useState('')
  const [parcoursId, setParcoursId] = useState(PARCOURS[0].id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!pseudo.trim()) { setError('Choisissez un pseudo.'); return }
    setLoading(true); setError('')
    try {
      const cardSequence = createKind === 'parcours'
        ? PARCOURS.find((p) => p.id === parcoursId).cards
        : ALL_CARD_IDS
      const result = await createRoom(
        createKind === 'parcours' ? 'parcours' : 'libre',
        createKind === 'parcours' ? parcoursId : null,
        cardSequence,
        pseudo.trim()
      )
      onEnter(result.room_id)
    } catch (e) {
      setError(e.message || 'Erreur lors de la création de la session.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!pseudo.trim()) { setError('Choisissez un pseudo.'); return }
    if (!code.trim()) { setError('Entrez un code de session.'); return }
    setLoading(true); setError('')
    try {
      const result = await joinRoom(code.trim().toUpperCase(), pseudo.trim())
      onEnter(result.room_id)
    } catch (e) {
      setError(e.message || 'Session introuvable ou déjà commencée.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#0f0c29,#1a1735,#0d0b22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: 'Inter, sans-serif',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 440, width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚖️</div>
          <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 900, color: '#ffd764', letterSpacing: '-1px' }}>Éthiq·IA</h1>
          <p style={{ margin: '6px 0 0', color: '#665e52', fontSize: 13 }}>Mode session multi-joueurs</p>
        </div>

        {authError && (
          <div style={{
            background: 'rgba(255,138,128,0.1)', border: '1px solid rgba(255,138,128,0.3)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#ff8a80',
          }}>
            Connexion anonyme impossible : {authError}. Vérifiez que « Anonymous Sign-ins » est activé dans
            Supabase (Authentication &gt; Providers).
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Votre pseudo</label>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Ex : Sophie, Équipe A…"
            style={inputStyle}
          />
        </div>

        {!mode && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setMode('create')} style={btnStyle('#ffd764', '#0f0c29')}>✦ Créer une session</button>
            <button onClick={() => setMode('join')} style={btnStyle('transparent', '#a09888', '1px solid rgba(255,255,255,0.15)')}>→ Rejoindre</button>
          </div>
        )}

        {mode === 'create' && (
          <div style={{ background: 'rgba(255,215,100,0.07)', border: '1px solid rgba(255,215,100,0.2)', borderRadius: 16, padding: 20, marginTop: 4 }}>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#ffd764', fontWeight: 700 }}>✦ Nouvelle session</p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button
                onClick={() => setCreateKind('parcours')}
                style={{
                  ...btnStyle(createKind === 'parcours' ? 'rgba(255,215,100,0.2)' : 'rgba(255,255,255,0.04)', '#f5efe0'),
                  border: createKind === 'parcours' ? '1px solid rgba(255,215,100,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  fontSize: 12,
                }}
              >
                Un parcours
              </button>
              <button
                onClick={() => setCreateKind('libre')}
                style={{
                  ...btnStyle(createKind === 'libre' ? 'rgba(255,215,100,0.2)' : 'rgba(255,255,255,0.04)', '#f5efe0'),
                  border: createKind === 'libre' ? '1px solid rgba(255,215,100,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  fontSize: 12,
                }}
              >
                Toutes les cartes ({ALL_CARD_IDS.length})
              </button>
            </div>

            {createKind === 'parcours' && (
              <>
                <label style={labelStyle}>Parcours</label>
                <select
                  value={parcoursId}
                  onChange={(e) => setParcoursId(e.target.value)}
                  style={{ ...inputStyle, borderRadius: 10, marginBottom: 14 }}
                >
                  {PARCOURS.map((p) => (
                    <option key={p.id} value={p.id} style={{ background: '#1a1735' }}>
                      {p.label} ({p.cards.length} cartes)
                    </option>
                  ))}
                </select>
              </>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode(null)} style={btnStyle('rgba(255,255,255,0.06)', '#a09888')}>← Retour</button>
              <button onClick={handleCreate} disabled={loading} style={btnStyle('#ffd764', '#0f0c29')}>
                {loading ? '…' : 'Créer ✓'}
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div style={{ background: 'rgba(79,195,247,0.07)', border: '1px solid rgba(79,195,247,0.2)', borderRadius: 16, padding: 20, marginTop: 4 }}>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#4fc3f7', fontWeight: 700 }}>→ Rejoindre une session</p>
            <label style={labelStyle}>Code de session</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex : A3F9K"
              style={{
                ...inputStyle, borderRadius: 10, border: '1px solid rgba(79,195,247,0.3)',
                color: '#4fc3f7', fontSize: 18, fontWeight: 700, letterSpacing: 4,
                textAlign: 'center', marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode(null)} style={btnStyle('rgba(255,255,255,0.06)', '#a09888')}>← Retour</button>
              <button onClick={handleJoin} disabled={loading} style={btnStyle('#4fc3f7', '#0f0c29')}>
                {loading ? '…' : 'Rejoindre →'}
              </button>
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
