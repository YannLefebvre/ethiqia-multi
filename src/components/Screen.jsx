export default function Screen({ title, subtitle, color = '#ffd764', children, headerRight, hostControl }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg,#0f0c29,#1a1735,#0d0b22)',
      fontFamily: 'Inter, sans-serif', color: '#e8e0d0',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 14px 60px' }}>
        <div style={{
          padding: '18px 0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 900, color }}>{title}</h1>
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#665e52' }}>{subtitle}</p>}
          </div>
          {headerRight}
        </div>
        {hostControl}
        {children}
      </div>
    </div>
  )
}
