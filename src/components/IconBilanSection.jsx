import { CARDS_AH } from '../cardsAH.js'
import { BILAN_CARDS, ICON_MAX } from '../gameData.js'
import { BILAN_ICON_DATA } from '../iconData.js'
import { countIcons } from '../lib/iconBilan.js'

export default function IconBilanSection({ myAnswers }) {
  const initialPairs = myAnswers.map(({ cardNum, answer }) => ({ cardNum, choice: answer.initial_choice }))
  const finalPairs = myAnswers.map(({ cardNum, answer }) => ({ cardNum, choice: answer.final_choice }))
  const iconCountInitial = countIcons(initialPairs)
  const iconCountFinal = countIcons(finalPairs)
  const totalVoted = myAnswers.length

  return (
    <div>
      <div style={{
        marginBottom: 20, padding: '14px 20px', background: 'rgba(255,255,255,0.05)',
        borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <p style={{ margin: 0, fontSize: 13, color: '#a09888' }}>
          {totalVoted === 0
            ? "Vous n'avez pas encore répondu à de cartes."
            : `Bilan basé sur ${totalVoted} carte${totalVoted > 1 ? 's' : ''} jouée${totalVoted > 1 ? 's' : ''}. Les chiffres reflètent vos choix définitifs ; quand ils diffèrent, votre choix initial est indiqué à part.`}
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#ffd764', margin: '0 0 14px' }}>
          Les enjeux de chaque tension
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {CARDS_AH.map((card, idx) => {
            const scores = card.icons.map((img) => Math.max(iconCountFinal[img] || 0, iconCountInitial[img] || 0))
            const hasAny = scores.some((s) => s > 0)
            return (
              <div key={idx} style={{
                width: 'calc(50% - 6px)', minWidth: 240,
                background: hasAny ? 'linear-gradient(135deg, #2a1f5a, #3d2b7a)' : 'rgba(255,255,255,0.03)',
                border: hasAny ? '2px solid rgba(180,130,255,0.45)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, overflow: 'hidden',
              }}>
                <div style={{ height: 5, background: hasAny ? 'linear-gradient(90deg, #9b59b6, #ce93d8)' : 'rgba(255,255,255,0.06)' }} />
                <div style={{ padding: '12px 14px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(255,215,100,0.15)', color: '#ffd764',
                    fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{card.level}</div>
                  <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, color: '#f5efe0', lineHeight: 1.3 }}>
                    {card.title}
                  </p>
                </div>
                <div style={{ padding: '10px 14px 4px', display: 'flex', justifyContent: 'center' }}>
                  <img src={card.duoImg} alt="" style={{
                    height: 52, objectFit: 'contain',
                    filter: hasAny ? 'none' : 'grayscale(80%) opacity(0.3)',
                  }} />
                </div>
                <div style={{ padding: '4px 14px 8px' }}>
                  <p style={{ margin: 0, fontSize: 11, fontStyle: 'italic', color: hasAny ? '#c0b8a8' : '#554e46', lineHeight: 1.4 }}>
                    {card.question}
                  </p>
                </div>
                {hasAny ? (
                  <div style={{ padding: '0 14px 12px' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#a09888', lineHeight: 1.5 }}>{card.content}</p>
                    <div style={{ marginTop: 8, display: 'flex', gap: 14 }}>
                      {card.icons.map((img, i) => (
                        <IconTally
                          key={i} img={img} color={i === 0 ? '#4fc3f7' : '#ce93d8'}
                          countInitial={iconCountInitial[img] || 0} countFinal={iconCountFinal[img] || 0}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: '0 14px 12px', fontSize: 10, color: '#443d36', fontStyle: 'italic' }}>
                    Répondez aux cartes liées pour révéler cet enjeu.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ margin: '4px 0 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }} />
      <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#ffd764', margin: '0 0 14px' }}>
        Détail de vos icônes
      </h3>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {BILAN_CARDS.map((card, idx) => {
          const count1Final = iconCountFinal[card.img1] || 0
          const count2Final = iconCountFinal[card.img2] || 0
          const hasVotes = count1Final > 0 || count2Final > 0
            || (iconCountInitial[card.img1] || 0) > 0 || (iconCountInitial[card.img2] || 0) > 0
          return (
            <div key={idx} style={{
              width: 'calc(50% - 7px)', minWidth: 260,
              background: hasVotes ? 'linear-gradient(135deg, #2a1f5a, #3d2b7a)' : 'rgba(255,255,255,0.04)',
              border: hasVotes ? '2px solid rgba(180,130,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, overflow: 'hidden', opacity: totalVoted === 0 ? 0.4 : 1,
            }}>
              <div style={{ height: 6, background: hasVotes ? 'linear-gradient(90deg, #9b59b6, #ce93d8)' : 'rgba(255,255,255,0.08)' }} />
              <div style={{ display: 'flex' }}>
                <IconDetailColumn
                  img={card.img1} title={card.title1} desc={card.desc1}
                  countInitial={iconCountInitial[card.img1] || 0} countFinal={count1Final}
                  max={ICON_MAX[card.img1]} accent="#4fc3f7" borderRight
                />
                <IconDetailColumn
                  img={card.img2} title={card.title2} desc={card.desc2}
                  countInitial={iconCountInitial[card.img2] || 0} countFinal={count2Final}
                  max={ICON_MAX[card.img2]} accent="#ce93d8"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function IconTally({ img, color, countInitial, countFinal }) {
  const changed = countInitial !== countFinal
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <img src={BILAN_ICON_DATA[img]} alt="" style={{ width: 18, height: 18, objectFit: 'contain', opacity: 0.7 }} />
      <span style={{ fontSize: 10, color }}>
        {countFinal}
        {changed && <span style={{ color: '#665e52' }}> ({countInitial} initial)</span>}
      </span>
    </div>
  )
}

function IconDetailColumn({ img, title, desc, countInitial, countFinal, max, accent, borderRight }) {
  const has = countFinal > 0
  const changed = countInitial !== countFinal
  return (
    <div style={{
      flex: 1, padding: '16px 12px 12px',
      background: has ? `${accent}14` : 'transparent',
      borderRight: borderRight ? '1px solid rgba(255,255,255,0.06)' : 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      <div style={{ position: 'relative' }}>
        <img src={BILAN_ICON_DATA[img]} alt="" style={{
          width: 56, height: 56, objectFit: 'contain',
          filter: has ? 'none' : 'grayscale(100%) opacity(0.3)',
        }} />
        <div style={{
          position: 'absolute', top: -8, right: -18,
          background: has ? accent : 'rgba(255,255,255,0.1)',
          color: has ? '#0f0c29' : '#665e52',
          borderRadius: 10, padding: '1px 6px',
          fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap',
        }}>
          {countFinal}/{max || '?'}
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold', color: has ? accent : '#554e46', textAlign: 'center', lineHeight: 1.3 }}>
        {title}
      </p>
      <p style={{ margin: 0, fontSize: 10, color: has ? '#b0a898' : '#443d36', textAlign: 'center', lineHeight: 1.4 }}>
        {desc}
      </p>
      {changed && (
        <p style={{ margin: 0, fontSize: 9, color: '#ffd764' }}>
          Choix initial : {countInitial}/{max || '?'}
        </p>
      )}
    </div>
  )
}
