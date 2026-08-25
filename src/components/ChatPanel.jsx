import { useEffect, useRef, useState } from 'react'
import { stringToColor } from '../lib/avatarColor.js'

const MAX_LENGTH = 280

function StarRating({ average, myRating, canRate, onRate }) {
  const stars = [1, 2, 3]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
      {stars.map((n) => {
        const filled = canRate ? n <= (myRating ?? 0) : average != null && n <= Math.round(average)
        return (
          <button
            key={n}
            onClick={canRate ? () => onRate(n) : undefined}
            disabled={!canRate}
            title={canRate ? `Noter ${n} étoile${n > 1 ? 's' : ''}` : undefined}
            style={{
              background: 'none', border: 'none', padding: 0, fontSize: 12, lineHeight: 1,
              cursor: canRate ? 'pointer' : 'default',
              color: filled ? '#ffd764' : 'rgba(255,255,255,0.15)',
            }}
          >
            ★
          </button>
        )
      })}
      {average != null && (
        <span style={{ fontSize: 10, color: '#665e52', marginLeft: 2 }}>
          {average.toFixed(1)}
        </span>
      )}
    </div>
  )
}

export default function ChatPanel({ messages, messageRatings, players, myPlayer, currentCardNum, sendMessage, rateMessage }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  const cardMessages = messages.filter((m) => m.card_num === currentCardNum)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [cardMessages.length])

  const handleSend = async () => {
    const body = draft.trim()
    if (!body) return
    setSending(true)
    setError('')
    try {
      await sendMessage(currentCardNum, body)
      setDraft('')
    } catch (e) {
      setError(e.message || "Impossible d'envoyer le message.")
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, marginTop: 20, overflow: 'hidden',
    }}>
      <p style={{ margin: 0, padding: '10px 14px', fontSize: 11, color: '#a09888', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        💬 Pourquoi ce choix ? (argumentez si vous le souhaitez)
      </p>

      <div ref={listRef} style={{ maxHeight: 180, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cardMessages.length === 0 && (
          <p style={{ margin: 0, fontSize: 12, color: '#443d36', fontStyle: 'italic' }}>
            Personne n'a encore pris la parole sur cette carte.
          </p>
        )}
        {cardMessages.map((m) => {
          const author = players.find((p) => p.id === m.player_id)
          const isMe = m.player_id === myPlayer?.id
          const ratingsForMessage = messageRatings.filter((r) => r.message_id === m.id)
          const average = ratingsForMessage.length > 0
            ? ratingsForMessage.reduce((sum, r) => sum + r.rating, 0) / ratingsForMessage.length
            : null
          const myRating = ratingsForMessage.find((r) => r.player_id === myPlayer?.id)?.rating
          return (
            <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: stringToColor(author?.pseudo ?? '?'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff', marginTop: 2,
              }}>
                {(author?.pseudo ?? '?')[0].toUpperCase()}
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: isMe ? '#ffd764' : '#a09888', marginRight: 6 }}>
                  {author?.pseudo ?? 'Un joueur'}
                </span>
                <span style={{ fontSize: 13, color: '#f5efe0', lineHeight: 1.4 }}>{m.body}</span>
                {!isMe && (
                  <StarRating
                    average={average}
                    myRating={myRating}
                    canRate={true}
                    onRate={(n) => rateMessage(m.id, n)}
                  />
                )}
                {isMe && average != null && (
                  <StarRating average={average} canRate={false} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Votre argument…"
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)', color: '#f5efe0', fontSize: 13,
            fontFamily: 'Inter, sans-serif', outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: '#ce93d8', color: '#0f0c29', fontWeight: 700, fontSize: 13,
            cursor: sending || !draft.trim() ? 'default' : 'pointer',
            opacity: sending || !draft.trim() ? 0.5 : 1, fontFamily: 'Inter, sans-serif',
          }}
        >
          Envoyer
        </button>
      </div>
      {error && <p style={{ margin: '0 14px 10px', fontSize: 11, color: '#ff8a80' }}>{error}</p>}
    </div>
  )
}
