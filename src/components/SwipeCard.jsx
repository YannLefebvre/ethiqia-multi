import { useRef, useState, useEffect } from 'react'

// Carte qu'on peut glisser à gauche (option A) ou à droite (option B) pour
// choisir, avec rotation proportionnelle au glissement. Le geste est
// strictement local à l'écran de celui qui joue — rien n'est diffusé aux
// autres joueurs tant que le choix n'est pas validé (relâchement au-delà du
// seuil), exactement comme un clic sur les boutons ci-dessous, qui restent
// le repli accessible (clavier, précision réduite, préférence personnelle).
const THRESHOLD = 90

export default function SwipeCard({ titre, situation, onChoose, disabled, accentColor = '#4fc3f7' }) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const startX = useRef(0)

  useEffect(() => {
    const clientX = (e) => (e.touches ? e.touches[0].clientX : e.clientX)
    const move = (e) => {
      if (!draggingRef.current) return
      setDx(clientX(e) - startX.current)
    }
    const up = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      setDragging(false)
      setDx((current) => {
        if (current > THRESHOLD) onChoose('B')
        else if (current < -THRESHOLD) onChoose('A')
        return 0
      })
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [onChoose])

  const handleDown = (e) => {
    if (disabled) return
    draggingRef.current = true
    setDragging(true)
    startX.current = e.touches ? e.touches[0].clientX : e.clientX
  }

  const lean = Math.abs(dx) > THRESHOLD * 0.5 ? (dx > 0 ? 'B' : 'A') : null

  const chipStyle = (side) => ({
    width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s',
    background: lean === side ? accentColor : 'rgba(255,255,255,0.06)',
    color: lean === side ? '#0f0c29' : '#665e52',
    transform: lean === side ? 'scale(1.15)' : 'scale(1)',
  })

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={chipStyle('A')}>A</div>
        <div
          onMouseDown={handleDown}
          onTouchStart={handleDown}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${lean ? accentColor : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 16, padding: 22,
            transform: `translateX(${dx}px) rotate(${dx / 18}deg)`,
            transition: dragging ? 'none' : 'transform 0.35s ease, border-color 0.2s',
            cursor: disabled ? 'default' : 'grab',
            touchAction: 'none', userSelect: 'none',
          }}
        >
          <p style={{ margin: '0 0 10px', fontSize: 12, color: accentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            {titre}
          </p>
          <p style={{ margin: 0, fontSize: 15, color: '#f5efe0', lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>
            {situation}
          </p>
        </div>
        <div style={chipStyle('B')}>B</div>
      </div>
      {!disabled && (
        <p style={{ textAlign: 'center', fontSize: 11, color: '#665e52', margin: '10px 0 0' }}>
          ↔ {lean ? `Relâchez pour valider ${lean}` : 'Glissez la carte vers A ou B, ou choisissez ci-dessous'}
        </p>
      )}
    </div>
  )
}
