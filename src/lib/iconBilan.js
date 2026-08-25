import { ICON_KEYS } from '../gameData.js'

export function getIconKeysForChoice(cardNum, choice) {
  const keys = ICON_KEYS[cardNum]
  if (!keys || !choice) return []
  return (choice === 'A' ? keys.a : keys.b) || []
}

// pairs: liste de { cardNum, choice }
export function countIcons(pairs) {
  const counts = {}
  for (const { cardNum, choice } of pairs) {
    for (const key of getIconKeysForChoice(cardNum, choice)) {
      counts[key] = (counts[key] || 0) + 1
    }
  }
  return counts
}
