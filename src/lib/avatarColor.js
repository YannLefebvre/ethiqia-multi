const COLORS = ['#4fc3f7', '#ce93d8', '#69f0ae', '#ffd764', '#ff8a80', '#f48fb1', '#80cbc4']

export function stringToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}
