export default function TopBar({ title, onBack, onHome, right }) {
  return (
    <header className="topbar">
      <div className="topbar-side">
        {onBack && (
          <button className="icon-btn" onClick={onBack} aria-label="뒤로">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        {onHome && (
          <button className="icon-btn" onClick={onHome} aria-label="홈">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </button>
        )}
      </div>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-side topbar-right">{right}</div>
    </header>
  )
}
