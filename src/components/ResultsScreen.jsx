import Screen from './Screen.jsx'
import TimerRing from './TimerRing.jsx'
import HostControls from './HostControls.jsx'
import { questions } from '../gameData.js'

const PHASE_DURATION = 5

function pct(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

function VoteBar({ label, countA, countB, total }) {
  const pctA = pct(countA, total)
  const pctB = pct(countB, total)
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, color: '#a09888', textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </p>
      <div style={{
        display: 'flex', height: 36, borderRadius: 10, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{
          width: `${pctA}%`, background: '#4fc3f7', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0f0c29',
          transition: 'width 0.6s ease',
        }}>
          {pctA > 12 && `A · ${pctA}%`}
        </div>
        <div style={{
          width: `${pctB}%`, background: '#ce93d8', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0f0c29',
          transition: 'width 0.6s ease',
        }}>
          {pctB > 12 && `B · ${pctB}%`}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {pctA <= 12 && <span style={{ fontSize: 11, color: '#4fc3f7' }}>A · {pctA}%</span>}
        <span />
        {pctB <= 12 && <span style={{ fontSize: 11, color: '#ce93d8' }}>B · {pctB}%</span>}
      </div>
    </div>
  )
}

export default function ResultsScreen({ room, secondsLeft, currentCardNum, getCardStats, isHost, endSession, forceAdvance, pauseTimer, resumeTimer }) {
  const card = questions.find((q) => q.id === currentCardNum)
  const totalCards = room.card_sequence.length
  const position = room.current_index + 1
  const stats = getCardStats(currentCardNum)
  const isLastCard = position >= totalCards

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
      title="Résultats"
      subtitle={`Carte ${position} / ${totalCards}`}
      color="#69f0ae"
      headerRight={<TimerRing seconds={secondsLeft} total={PHASE_DURATION} />}
      hostControl={isHost && (
        <HostControls
          onForceAdvance={forceAdvance}
          onPauseTimer={pauseTimer}
          onResumeTimer={resumeTimer}
          isPaused={secondsLeft === null}
          onEndSession={endSession}
          advanceLabel={isLastCard ? 'Passer au bilan' : 'Passer à la carte suivante'}
        />
      )}
    >
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: 22, marginBottom: 22,
      }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#69f0ae', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          {card.titre}
        </p>
        <p style={{ margin: 0, fontSize: 15, color: '#f5efe0', lineHeight: 1.6 }}>
          {card.situation}
        </p>
      </div>

      <VoteBar label="Vote initial" countA={stats.initial.A} countB={stats.initial.B} total={stats.initial.total} />
      <VoteBar label="Vote définitif" countA={stats.final.A} countB={stats.final.B} total={stats.final.total} />

      <p style={{ textAlign: 'center', color: '#665e52', fontSize: 12, marginTop: 24 }}>
        {isLastCard ? 'Direction le bilan…' : 'Carte suivante dans quelques secondes…'}
      </p>
    </Screen>
  )
}
