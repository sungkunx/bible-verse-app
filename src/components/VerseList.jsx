import { formatReference } from '../lib/refFormat.js'
import { getVerseText } from '../lib/textProvider.js'
import { cardFooter } from './VerseCard.jsx'

export default function VerseList({ verses, lang, favorites, completed, toggle, onOpen }) {
  return (
    <div className="verse-list">
      {verses.map((v, i) => {
        const { code, color } = cardFooter(v)
        const text = getVerseText(v, lang) || getVerseText(v, 'ko')
        return (
          <div key={v.id} className="verse-row" style={{ '--accent': color }}>
            <button className="verse-row-main" onClick={() => onOpen(i)}>
              <div className="verse-row-top">
                <span className="verse-row-code">{code}</span>
                <span className="verse-row-title">{v.title}</span>
                <span className="verse-row-ref">{formatReference(v.ref, lang, 'abbr')}</span>
              </div>
              <p className="verse-row-text">{text}</p>
            </button>
            <div className="verse-row-actions">
              <button
                className={`row-action ${favorites.has(v.id) ? 'on star-on' : ''}`}
                onClick={() => toggle('favorites', v.id)}
                aria-label="즐겨찾기"
              >
                ★
              </button>
              <button
                className={`row-action ${completed.has(v.id) ? 'on check-on' : ''}`}
                onClick={() => toggle('completed', v.id)}
                aria-label="암송완료"
              >
                ✓
              </button>
            </div>
          </div>
        )
      })}
      {verses.length === 0 && <p className="empty-note">아직 담긴 구절이 없습니다</p>}
    </div>
  )
}
