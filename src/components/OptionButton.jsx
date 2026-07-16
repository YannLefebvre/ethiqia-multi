export default function OptionButton({ label, text, selected, disabled, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: 'left', padding: '16px 18px', borderRadius: 14, position: 'relative',
        border: selected ? '2px solid #4fc3f7' : '1px solid rgba(255,255,255,0.1)',
        background: selected ? 'rgba(79,195,247,0.12)' : 'rgba(255,255,255,0.03)',
        color: '#f5efe0', fontSize: 14, lineHeight: 1.5, fontFamily: 'Inter, sans-serif',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled && !selected ? 0.6 : 1,
        width: '100%',
      }}
    >
      <span style={{
        display: 'inline-block', width: 22, height: 22, borderRadius: '50%',
        background: selected ? '#4fc3f7' : 'rgba(255,255,255,0.08)',
        color: selected ? '#0f0c29' : '#a09888', fontSize: 12, fontWeight: 700,
        textAlign: 'center', lineHeight: '22px', marginRight: 10,
      }}>
        {label}
      </span>
      {text}
      {badge && (
        <span style={{
          position: 'absolute', top: 10, right: 12, fontSize: 10, fontWeight: 700,
          color: '#ffd764', background: 'rgba(255,215,100,0.12)', padding: '2px 8px', borderRadius: 20,
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}
