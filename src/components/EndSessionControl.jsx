export default function EndSessionControl({ onEndSession }) {
  const handleClick = () => {
    const confirmed = window.confirm(
      'Terminer la session maintenant ? Tous les joueurs passeront directement au bilan avec les cartes jouées jusqu\'ici.'
    )
    if (confirmed) onEndSession()
  }

  return (
    <button
      onClick={handleClick}
      style={{
        background: 'none', border: 'none', color: '#665e52', fontSize: 11,
        cursor: 'pointer', textDecoration: 'underline', padding: 0, marginBottom: 16,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      ⏹ Terminer la session pour tout le monde
    </button>
  )
}
