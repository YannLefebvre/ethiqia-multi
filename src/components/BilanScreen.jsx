import { useState } from 'react'
import Screen from './Screen.jsx'
import IconBilanSection from './IconBilanSection.jsx'
import { generateSessionPdf } from '../lib/generatePdf.js'
import { stringToColor } from '../lib/avatarColor.js'
import { questions } from '../gameData.js'

function btnStyle(bg, color, border = 'none') {
  return {
    padding: '12px 16px', borderRadius: 12, border, background: bg, color,
    fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  }
}

function tabStyle(active) {
  return {
    flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
    background: active ? 'rgba(255,215,100,0.15)' : 'transparent',
    color: active ? '#ffd764' : '#665e52',
  }
}

export default function BilanScreen({ room, answers, players, myPlayer, getBilan, getRatingBilan, messages, onLeave }) {
  const [tab, setTab] = useState('icons')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const { perPlayer, perCard } = getBilan()
  const ratingBilan = getRatingBilan()
  const myStats = perPlayer.find((p) => p.playerId === myPlayer?.id)

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    setPdfError('')
    try {
      await generateSessionPdf({ room, players, answers, messages })
    } catch (e) {
      setPdfError(e.message || 'Impossible de générer le PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  const myAnswers = room.card_sequence
    .map((cardNum) => {
      const card = questions.find((q) => q.id === cardNum)
      const answer = answers.find((a) => a.player_id === myPlayer?.id && a.card_num === cardNum)
      return { cardNum, card, answer }
    })
    .filter((row) => row.answer?.initial_choice != null && row.answer?.final_choice != null)

  return (
    <Screen title="Bilan" subtitle={`${room.card_sequence.length} cartes jouées`} color="#69f0ae">

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 12 }}>
        <button onClick={() => setTab('icons')} style={tabStyle(tab === 'icons')}>🏅 Icônes &amp; enjeux</button>
        <button onClick={() => setTab('stats')} style={tabStyle(tab === 'stats')}>📊 Statistiques du groupe</button>
      </div>

      <button
        onClick={handleDownloadPdf}
        disabled={pdfLoading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
          padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)', color: '#f5efe0', fontWeight: 600, fontSize: 13,
          cursor: pdfLoading ? 'default' : 'pointer', opacity: pdfLoading ? 0.6 : 1,
          fontFamily: 'Inter, sans-serif', marginBottom: pdfError ? 8 : 24,
        }}
      >
        📄 {pdfLoading ? 'Génération en cours…' : 'Télécharger le récapitulatif (PDF)'}
      </button>
      {pdfError && (
        <p style={{ color: '#ff8a80', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>{pdfError}</p>
      )}

      {tab === 'icons' && <IconBilanSection myAnswers={myAnswers} />}

      {tab === 'stats' && (
        <>
      {myStats && (
        <div style={{
          background: 'rgba(105,240,174,0.08)', border: '1px solid rgba(105,240,174,0.25)',
          borderRadius: 16, padding: '18px 20px', marginBottom: 24, textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: '#a09888', textTransform: 'uppercase', letterSpacing: 1 }}>
            Votre constance
          </p>
          <p style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 900, color: '#69f0ae' }}>
            {100 - myStats.switchRate}%
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#a09888' }}>
            Vous avez confirmé votre premier choix sur {myStats.confirmed}/{myStats.total} cartes
            {myStats.changed > 0 && ` — changé d'avis sur ${myStats.changed}`}.
          </p>
        </div>
      )}

      <p style={{ fontSize: 12, color: '#a09888', marginBottom: 10 }}>Votre parcours, carte par carte :</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {myAnswers.map(({ cardNum, card, answer }) => {
          const changed = answer.initial_choice !== answer.final_choice
          return (
            <div key={cardNum} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: 'rgba(255,255,255,0.04)', borderRadius: 10,
              border: changed ? '1px solid rgba(255,215,100,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 13, color: '#f5efe0', flex: 1 }}>{card?.titre ?? `Carte ${cardNum}`}</span>
              <Badge choice={answer.initial_choice} />
              {changed && <span style={{ color: '#ffd764', fontSize: 13 }}>→</span>}
              {changed && <Badge choice={answer.final_choice} highlight />}
              {!changed && <span style={{ fontSize: 10, color: '#665e52' }}>confirmé</span>}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 12, color: '#a09888', marginBottom: 10 }}>Vue d'ensemble du groupe :</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
        {perCard.map(({ cardNum, total, changed, switchRate }) => {
          const card = questions.find((q) => q.id === cardNum)
          return (
            <div key={cardNum} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#a09888', width: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {card?.titre ?? `Carte ${cardNum}`}
              </span>
              <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${switchRate}%`, height: '100%', background: '#ffd764', transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontSize: 11, color: '#665e52', width: 70, textAlign: 'right' }}>
                {changed}/{total} ont changé
              </span>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 12, color: '#a09888', marginBottom: 10 }}>Constance par joueur :</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {perPlayer
          .slice()
          .sort((a, b) => a.switchRate - b.switchRate)
          .map((p) => (
            <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', background: stringToColor(p.pseudo),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {p.pseudo[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: '#f5efe0', flex: 1 }}>{p.pseudo}</span>
              <span style={{ fontSize: 12, color: '#665e52' }}>{p.changed}/{p.total} changements</span>
            </div>
          ))}
      </div>

      {ratingBilan.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: '#a09888', marginBottom: 10 }}>
            Popularité des arguments (notés par les autres joueurs) :
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {ratingBilan
              .slice()
              .sort((a, b) => (b.average ?? -1) - (a.average ?? -1))
              .map((p) => (
                <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: stringToColor(p.pseudo),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {p.pseudo[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, color: '#f5efe0', flex: 1 }}>{p.pseudo}</span>
                  <span style={{ fontSize: 11, color: '#665e52' }}>
                    {p.messageCount} message{p.messageCount > 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: 13, color: '#ffd764', fontWeight: 700, minWidth: 60, textAlign: 'right' }}>
                    {p.average != null ? `★ ${p.average.toFixed(1)}` : 'non noté'}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
        </>
      )}

      <button onClick={onLeave} style={{ ...btnStyle('#ffd764', '#0f0c29'), width: '100%', fontSize: 15, padding: '14px' }}>
        Nouvelle partie
      </button>
    </Screen>
  )
}

function Badge({ choice, highlight }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
      background: highlight ? '#ffd764' : 'rgba(255,255,255,0.1)',
      color: highlight ? '#0f0c29' : '#a09888',
    }}>
      {choice}
    </span>
  )
}
