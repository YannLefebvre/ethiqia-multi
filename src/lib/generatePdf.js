import { questions, PARCOURS } from '../gameData.js'

const MARGIN = 20
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BOTTOM_LIMIT = PAGE_HEIGHT - MARGIN - 6 // laisse la place au pied de page

const COLOR_TITLE = [20, 20, 20]
const COLOR_BODY = [50, 50, 50]
const COLOR_MUTED = [120, 120, 120]
const COLOR_ACCENT = [90, 70, 130]

function pct(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

export async function generateSessionPdf({ room, players, answers, messages }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  const ensureSpace = (needed) => {
    if (y + needed > BOTTOM_LIMIT) {
      doc.addPage()
      y = MARGIN
    }
  }

  const writeLine = (text, { fontSize = 10, style = 'normal', color = COLOR_BODY, gap = 5, x = MARGIN } = {}) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(fontSize)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH - (x - MARGIN))
    ensureSpace(lines.length * (fontSize * 0.42) + gap)
    doc.text(lines, x, y)
    y += lines.length * (fontSize * 0.42) + gap
  }

  // --- En-tête -----------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...COLOR_TITLE)
  doc.text('Éthiq·IA', MARGIN, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.setTextColor(...COLOR_MUTED)
  doc.text('Bilan de session multijoueur', MARGIN, y)
  y += 7

  const parcours = room.mode === 'parcours' ? PARCOURS.find((p) => p.id === room.parcours_id) : null
  doc.setFontSize(10)
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`, MARGIN, y)
  y += 6

  const summary = [
    `Participants : ${players.length}`,
    `Cartes jouées : ${room.card_sequence.length}`,
    parcours ? `Parcours : ${parcours.label}` : 'Mode : toutes les cartes',
    `Messages échangés : ${messages.length}`,
  ].join('    ')
  doc.text(summary, MARGIN, y)
  y += 8

  doc.setDrawColor(200, 200, 200)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 8

  // --- Une section par carte -----------------------------------------------
  room.card_sequence.forEach((cardNum, idx) => {
    const card = questions.find((q) => q.id === cardNum)
    const cardAnswers = answers.filter((a) => a.card_num === cardNum)
    const cardMessages = messages.filter((m) => m.card_num === cardNum)

    ensureSpace(16)
    writeLine(`${idx + 1}  ${card?.titre ?? `Carte ${cardNum}`}`, {
      fontSize: 13, style: 'bold', color: COLOR_TITLE, gap: 3,
    })
    if (card) {
      writeLine(card.situation, { fontSize: 10, color: COLOR_BODY, gap: 3 })
      writeLine(`Option A : ${card.altA}`, { fontSize: 9.5, color: COLOR_MUTED, gap: 1.5 })
      writeLine(`Option B : ${card.altB}`, { fontSize: 9.5, color: COLOR_MUTED, gap: 3 })
    }

    if (cardAnswers.length > 0) {
      const initialA = cardAnswers.filter((a) => a.initial_choice === 'A').length
      const initialB = cardAnswers.filter((a) => a.initial_choice === 'B').length
      const finalA = cardAnswers.filter((a) => a.final_choice === 'A').length
      const finalB = cardAnswers.filter((a) => a.final_choice === 'B').length
      const initialTotal = initialA + initialB
      const finalTotal = finalA + finalB

      writeLine(
        `Vote initial — A : ${initialA} (${pct(initialA, initialTotal)}%)   B : ${initialB} (${pct(initialB, initialTotal)}%)`,
        { fontSize: 9, color: COLOR_MUTED, gap: 1.5 }
      )
      writeLine(
        `Vote définitif — A : ${finalA} (${pct(finalA, finalTotal)}%)   B : ${finalB} (${pct(finalB, finalTotal)}%)`,
        { fontSize: 9, color: COLOR_MUTED, gap: 3 }
      )

      const answerLine = cardAnswers
        .map((a) => {
          const pseudo = players.find((p) => p.id === a.player_id)?.pseudo ?? 'Joueur'
          const changed = a.initial_choice && a.final_choice && a.initial_choice !== a.final_choice
          return changed
            ? `${pseudo} : ${a.initial_choice} -> ${a.final_choice}`
            : `${pseudo} : ${a.final_choice ?? a.initial_choice ?? '—'}`
        })
        .join('    ')
      writeLine(answerLine, { fontSize: 9, color: COLOR_BODY, gap: 4 })
    }

    if (cardMessages.length > 0) {
      writeLine('Échanges :', { fontSize: 9.5, style: 'bold', color: COLOR_TITLE, gap: 1.5 })
      for (const m of cardMessages) {
        const pseudo = players.find((p) => p.id === m.player_id)?.pseudo ?? 'Joueur'
        writeLine(`${pseudo} — ${m.body}`, { fontSize: 9, style: 'italic', color: COLOR_ACCENT, gap: 1, x: MARGIN + 3 })
      }
      y += 2
    }

    y += 4
  })

  // --- Pied de page sur chaque page --------------------------------------
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(`Page ${i} / ${pageCount} — Éthiq·IA`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' })
  }

  doc.save(`ethiqia-bilan-${room.code}.pdf`)
}
