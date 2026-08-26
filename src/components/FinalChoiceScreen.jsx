import { useEffect, useState } from 'react'
import Screen from './Screen.jsx'
import TimerRing from './TimerRing.jsx'
import OptionButton from './OptionButton.jsx'
import HostControls from './HostControls.jsx'
import ChatPanel from './ChatPanel.jsx'
import { stringToColor } from '../lib/avatarColor.js'
import { questions } from '../gameData.js'

const MIN_REFLECTION_MS = 5000
const PHASE_DURATION = 45 // filet de sécurité serveur, pour l'anneau visuel

export default function FinalChoiceScreen({
  room,
  secondsLeft,
  currentCardNum,
  hasSubmittedCurrentPhase,
  myAnswerForCurrentCard,
  peerInitialChoices,
  submittedCount,
  connectedCount,
  submitChoice,
  isHost,
  endSession,
  forceAdvance,
  pauseTimer,
  resumeTimer,
  messages,
  messageRatings,
  players,
  myPlayer,
  sendMessage,
  rateMessage,
}) {
  const card = questions.find((q) => q.id === currentCardNum)
  const totalCards = room.card_sequence.length
  const position = room.current_index + 1

  // Verrou local de réflexion minimale : indépendant de phase_deadline
  // (qui n'est qu'un filet de sécurité de 45s), pour garantir au moins
  // 5 secondes avant de pouvoir valider un choix définitif.
  const [canFinalize, setCanFinalize] = useState(false)
  useEffect(() => {
    setCanFinalize(false)
    const timeout = setTimeout(() => setCanFinalize(true), MIN_REFLECTION_MS)
    return () => clearTimeout(timeout)
  }, [room.phase_started_at])

  if (!card) {
    return (
      <Screen title="Carte introuvable" color="#ff8a80">
        <p style={{ color: '#a09888', fontSize: 13 }}>
          Impossible de trouver la carte n°{currentCardNum} dans gameData.js.
        </p>
      </Screen>
    )
  }

  const myInitial = myAnswerForCurrentCard?.initial_choice ?? null
  const others = peerInitialChoices.filter((p) => p.choice != null)
  const canChoose = canFinalize && !hasSubmittedCurrentPhase

  return (
    <Screen
      title="Choix définitif"
      subtitle={`Carte ${position} / ${totalCards}`}
      color="#ce93d8"
      headerRight={<TimerRing seconds={secondsLeft} total={PHASE_DURATION} />}
      hostControl={isHost && (
        <HostControls
          onForceAdvance={forceAdvance}
          onPauseTimer={pauseTimer}
          onResumeTimer={resumeTimer}
          isPaused={secondsLeft === null}
          onEndSession={endSession}
          advanceLabel="Clore la discussion et révéler les résultats"
        />
      )}
    >
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: 22, marginBottom: 18,
      }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#ce93d8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          {card.titre}
        </p>
        <p style={{ margin: 0, fontSize: 15, color: '#f5efe0', lineHeight: 1.6 }}>
          {card.situation}
        </p>
      </div>

      <div style={{
        background: 'rgba(206,147,216,0.07)', border: '1px solid rgba(206,147,216,0.2)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 20,
      }}>
        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#a09888', textTransform: 'uppercase', letterSpacing: 1 }}>
          Ce que les autres ont répondu
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {others.map((p) => (
            <div
              key={p.playerId}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 5px',
                background: 'rgba(255,255,255,0.04)', borderRadius: 20,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: stringToColor(p.pseudo),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
              }}>
                {p.pseudo[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: '#f5efe0' }}>{p.pseudo}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#0f0c29',
                background: '#ce93d8', borderRadius: '50%', width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {p.choice}
              </span>
            </div>
          ))}
          {others.length === 0 && (
            <span style={{ fontSize: 12, color: '#665e52' }}>Vous êtes le seul à avoir déjà répondu.</span>
          )}
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#a09888', marginBottom: 10 }}>
        Votre choix initial était <strong style={{ color: '#f5efe0' }}>{myInitial ?? '—'}</strong>.
        Confirmez-le ou changez d'avis :
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <OptionButton
          label="A"
          text={card.altA}
          selected={(myAnswerForCurrentCard?.final_choice ?? myInitial) === 'A'}
          disabled={!canChoose}
          onClick={() => submitChoice(currentCardNum, 'A')}
          badge={myInitial === 'A' ? 'Choix initial' : null}
        />
        <OptionButton
          label="B"
          text={card.altB}
          selected={(myAnswerForCurrentCard?.final_choice ?? myInitial) === 'B'}
          disabled={!canChoose}
          onClick={() => submitChoice(currentCardNum, 'B')}
          badge={myInitial === 'B' ? 'Choix initial' : null}
        />
      </div>

      {!canFinalize && !hasSubmittedCurrentPhase && (
        <p style={{ textAlign: 'center', color: '#665e52', fontSize: 12, marginTop: 16 }}>
          Encore un instant de réflexion…
        </p>
      )}

      <ChatPanel
        messages={messages}
        messageRatings={messageRatings}
        players={players}
        myPlayer={myPlayer}
        currentCardNum={currentCardNum}
        sendMessage={sendMessage}
        rateMessage={rateMessage}
      />

      {hasSubmittedCurrentPhase && (
        <p style={{ textAlign: 'center', color: '#665e52', fontSize: 12, marginTop: 20 }}>
          {submittedCount}/{connectedCount} joueurs ont validé leur choix définitif…
        </p>
      )}
    </Screen>
  )
}
