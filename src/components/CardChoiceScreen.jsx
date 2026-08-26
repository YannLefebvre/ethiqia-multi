import Screen from './Screen.jsx'
import TimerRing from './TimerRing.jsx'
import OptionButton from './OptionButton.jsx'
import HostControls from './HostControls.jsx'
import { questions } from '../gameData.js'

// Durées "attendues" utilisées uniquement pour le rendu visuel de l'anneau
// (la vraie source de vérité est room.phase_deadline, côté serveur).
const PHASE_DURATIONS = { reading: 8, choice1: 60 }

export default function CardChoiceScreen({
  room,
  secondsLeft,
  currentCardNum,
  hasSubmittedCurrentPhase,
  myAnswerForCurrentCard,
  submittedCount,
  connectedCount,
  submitChoice,
  isHost,
  endSession,
  forceAdvance,
  pauseTimer,
  resumeTimer,
}) {
  const card = questions.find((q) => q.id === currentCardNum)
  const totalCards = room.card_sequence.length
  const position = room.current_index + 1
  const isReading = room.phase === 'reading'
  const canChoose = room.phase === 'choice1' && !hasSubmittedCurrentPhase

  if (!card) {
    return (
      <Screen title="Carte introuvable" color="#ff8a80">
        <p style={{ color: '#a09888', fontSize: 13 }}>
          Impossible de trouver la carte n°{currentCardNum} dans gameData.js.
        </p>
      </Screen>
    )
  }

  return (
    <Screen
      title={isReading ? 'Lecture' : 'Vote individuel'}
      subtitle={`Carte ${position} / ${totalCards}`}
      color="#4fc3f7"
      headerRight={<TimerRing seconds={secondsLeft} total={PHASE_DURATIONS[room.phase] ?? 10} />}
      hostControl={isHost && (
        <HostControls
          onForceAdvance={forceAdvance}
          onPauseTimer={pauseTimer}
          onResumeTimer={resumeTimer}
          isPaused={secondsLeft === null}
          onEndSession={endSession}
          advanceLabel={isReading ? 'Passer au vote' : 'Clore le vote individuel'}
        />
      )}
    >
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: 22, marginBottom: 20,
      }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#4fc3f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          {card.titre}
        </p>
        <p style={{ margin: 0, fontSize: 15, color: '#f5efe0', lineHeight: 1.6 }}>
          {card.situation}
        </p>
      </div>

      {isReading ? (
        <p style={{ textAlign: 'center', color: '#a09888', fontSize: 13 }}>
          Prenez le temps de lire… le vote s'ouvre dans {secondsLeft}s.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <OptionButton
            label="A"
            text={card.altA}
            selected={myAnswerForCurrentCard?.initial_choice === 'A'}
            disabled={!canChoose}
            onClick={() => submitChoice(currentCardNum, 'A')}
          />
          <OptionButton
            label="B"
            text={card.altB}
            selected={myAnswerForCurrentCard?.initial_choice === 'B'}
            disabled={!canChoose}
            onClick={() => submitChoice(currentCardNum, 'B')}
          />
        </div>
      )}

      {hasSubmittedCurrentPhase && (
        <p style={{ textAlign: 'center', color: '#665e52', fontSize: 12, marginTop: 20 }}>
          {submittedCount}/{connectedCount} joueurs ont répondu…
        </p>
      )}
    </Screen>
  )
}
