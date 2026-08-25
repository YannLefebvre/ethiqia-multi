import { useEffect, useState } from 'react'
import { useMultiplayerRoom } from './hooks/useMultiplayerRoom.js'
import HomeScreen from './components/HomeScreen.jsx'
import WaitingRoom from './components/WaitingRoom.jsx'
import CardChoiceScreen from './components/CardChoiceScreen.jsx'
import FinalChoiceScreen from './components/FinalChoiceScreen.jsx'
import ResultsScreen from './components/ResultsScreen.jsx'
import BilanScreen from './components/BilanScreen.jsx'

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg,#0f0c29,#1a1735,#0d0b22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#a09888', fontFamily: 'Inter, sans-serif', fontSize: 14,
    }}>
      Connexion à la session…
    </div>
  )
}

function RoomNotFoundScreen({ onLeave }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg,#0f0c29,#1a1735,#0d0b22)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 14, color: '#a09888', fontFamily: 'Inter, sans-serif', fontSize: 14, padding: 20, textAlign: 'center',
    }}>
      <p>Cette session n'existe plus ou n'est plus accessible.</p>
      <button
        onClick={onLeave}
        style={{
          padding: '10px 20px', borderRadius: 12, border: 'none', background: '#ffd764',
          color: '#0f0c29', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}
      >
        Retour à l'accueil
      </button>
    </div>
  )
}

const ROOM_STORAGE_KEY = 'ethiqia_room_id'

export default function App() {
  const [roomId, setRoomIdState] = useState(() => {
    try {
      return sessionStorage.getItem(ROOM_STORAGE_KEY)
    } catch {
      return null // sessionStorage indisponible (navigation privée stricte, etc.)
    }
  })

  const setRoomId = (id) => {
    setRoomIdState(id)
    try {
      if (id) sessionStorage.setItem(ROOM_STORAGE_KEY, id)
      else sessionStorage.removeItem(ROOM_STORAGE_KEY)
    } catch {
      // pas grave si le stockage échoue, la session continue juste en mémoire
    }
  }

  const {
    createRoom, joinRoom, startGame, submitChoice,
    room, players, answers, messages, messageRatings, myPlayer, isHost, error, roomLoaded,
    secondsLeft, currentCardNum, hasSubmittedCurrentPhase,
    myAnswerForCurrentCard, submittedCount, connectedCount, peerInitialChoices,
    getCardStats, getBilan, getRatingBilan, endSession, forceAdvance, sendMessage, rateMessage,
  } = useMultiplayerRoom(roomId)

  if (!roomId) {
    return <HomeScreen createRoom={createRoom} joinRoom={joinRoom} onEnter={setRoomId} authError={error} />
  }

  if (roomLoaded && !room) {
    return <RoomNotFoundScreen onLeave={() => setRoomId(null)} />
  }

  if (!room) {
    return <LoadingScreen />
  }

  if (room.phase === 'lobby') {
    return (
      <WaitingRoom
        room={room}
        players={players}
        myPlayer={myPlayer}
        isHost={isHost}
        startGame={startGame}
      />
    )
  }

  if (room.phase === 'reading' || room.phase === 'choice1') {
    return (
      <CardChoiceScreen
        room={room}
        secondsLeft={secondsLeft}
        currentCardNum={currentCardNum}
        hasSubmittedCurrentPhase={hasSubmittedCurrentPhase}
        myAnswerForCurrentCard={myAnswerForCurrentCard}
        submittedCount={submittedCount}
        connectedCount={connectedCount}
        submitChoice={submitChoice}
        isHost={isHost}
        endSession={endSession}
        forceAdvance={forceAdvance}
      />
    )
  }

  if (room.phase === 'choice2') {
    return (
      <FinalChoiceScreen
        room={room}
        secondsLeft={secondsLeft}
        currentCardNum={currentCardNum}
        hasSubmittedCurrentPhase={hasSubmittedCurrentPhase}
        myAnswerForCurrentCard={myAnswerForCurrentCard}
        peerInitialChoices={peerInitialChoices}
        submittedCount={submittedCount}
        connectedCount={connectedCount}
        submitChoice={submitChoice}
        isHost={isHost}
        endSession={endSession}
        forceAdvance={forceAdvance}
        messages={messages}
        messageRatings={messageRatings}
        players={players}
        myPlayer={myPlayer}
        sendMessage={sendMessage}
        rateMessage={rateMessage}
      />
    )
  }

  if (room.phase === 'results') {
    return (
      <ResultsScreen
        room={room}
        secondsLeft={secondsLeft}
        currentCardNum={currentCardNum}
        getCardStats={getCardStats}
        isHost={isHost}
        endSession={endSession}
        forceAdvance={forceAdvance}
      />
    )
  }

  if (room.phase === 'done') {
    return (
      <BilanScreen
        room={room}
        answers={answers}
        players={players}
        myPlayer={myPlayer}
        getBilan={getBilan}
        getRatingBilan={getRatingBilan}
        messages={messages}
        onLeave={() => setRoomId(null)}
      />
    )
  }

  return null
}
