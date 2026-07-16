import Screen from './Screen.jsx'
import { PARCOURS } from '../gameData.js'
import { stringToColor } from '../lib/avatarColor.js'

function btnStyle(bg, color, border = 'none') {
  return {
    padding: '12px 16px', borderRadius: 12, border, background: bg, color,
    fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  }
}

export default function WaitingRoom({ room, players, myPlayer, isHost, startGame }) {
  const parcours = room.mode === 'parcours' ? PARCOURS.find((p) => p.id === room.parcours_id) : null

  return (
    <Screen title="Salle d'attente" subtitle={`Code : ${room.code}`} color="#ffd764">
      <div style={{
        background: 'rgba(255,215,100,0.08)', border: '1px solid rgba(255,215,100,0.25)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 20, textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: '#a09888', textTransform: 'uppercase', letterSpacing: 1 }}>
          Code à partager
        </p>
        <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: '#ffd764', letterSpacing: 8 }}>
          {room.code}
        </p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: '#665e52' }}>
          {parcours ? 'Parcours : ' : 'Mode : '}
        </span>
        <span style={{ fontSize: 13, color: '#f5efe0', fontWeight: 600 }}>
          {parcours ? parcours.label : 'Toutes les cartes'}
        </span>
        <span style={{ fontSize: 11, color: '#665e52', marginLeft: 8 }}>
          ({room.card_sequence.length} cartes)
        </span>
      </div>

      <p style={{ fontSize: 12, color: '#a09888', marginBottom: 10 }}>
        Joueurs connectés ({players.length}) :
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {players.map((p) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: 'rgba(255,255,255,0.04)', borderRadius: 10,
            border: p.id === myPlayer?.id ? '1px solid rgba(255,215,100,0.3)' : '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: stringToColor(p.pseudo),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
            }}>
              {p.pseudo[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 14, color: '#f5efe0' }}>{p.pseudo}</span>
            {p.user_id === room.host_user_id && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#ffd764', background: 'rgba(255,215,100,0.12)', padding: '2px 8px', borderRadius: 20 }}>
                Hôte
              </span>
            )}
            {p.id === myPlayer?.id && p.user_id !== room.host_user_id && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#a09888' }}>Vous</span>
            )}
          </div>
        ))}
      </div>

      {isHost ? (
        <button
          onClick={startGame}
          disabled={players.length < 1}
          style={{ ...btnStyle('#ffd764', '#0f0c29'), width: '100%', fontSize: 15, padding: '14px' }}
        >
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
