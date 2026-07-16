export default function TimerRing({ seconds, total }) {
  const pct = total > 0 ? seconds / total : 0
  const r = 16
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const color = pct > 0.5 ? '#69f0ae' : pct > 0.25 ? '#ffd764' : '#ff6b6b'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={40} height={40} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        <circle
          cx={20} cy={20} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
        />
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 24 }}>{seconds}s</span>
    </div>
  )
}
