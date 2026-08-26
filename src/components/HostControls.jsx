export default function HostControls({ onForceAdvance, onEndSession, onPauseTimer, onResumeTimer, isPaused, advanceLabel }) {
  const handleForceAdvance = () => {
    const confirmed = window.confirm(
      `${advanceLabel ?? 'Passer à l\u2019étape suivante'} maintenant, pour tout le monde ?`
    )
    if (confirmed) onForceAdvance()
  }

  const handleEndSession = () => {
    const confirmed = window.confirm(
      'Terminer la session maintenant ? Tous les joueurs passeront directement au bilan avec les cartes jouées jusqu\'ici.'
    )
    if (confirmed) onEndSession()
  }

  const linkStyle = {
    background: 'none', border: 'none', color: '#665e52', fontSize: 11,
    cursor: 'pointer', textDecoration: 'underline', padding: 0,
    fontFamily: 'Inter, sans-serif',
  }

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
      {onPauseTimer && onResumeTimer && (
        <button
          onClick={() => (isPaused ? onResumeTimer() : onPauseTimer())}
          style={{ ...linkStyle, color: isPaused ? '#ffd764' : '#665e52' }}
        >
          {isPaused ? '▶ Reprendre le chrono' : '⏸ Mettre le chrono en pause'}
        </button>
      )}
      {onForceAdvance && (
        <button onClick={handleForceAdvance} style={linkStyle}>
          ⏭ {advanceLabel ?? 'Passer à l\u2019étape suivante'}
        </button>
      )}
      <button onClick={handleEndSession} style={linkStyle}>
        ⏹ Terminer la session pour tout le monde
      </button>
    </div>
  )
}
