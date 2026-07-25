import { collections } from '../lib/data.js'
import TopBar from './TopBar.jsx'

export default function HomeScreen({ openCollection, push, favorites, completed, lang, setLang }) {
  return (
    <div className="screen">
      <TopBar
        title="말씀 암송 카드"
        right={
          <button className="pill-btn" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>
            {lang === 'ko' ? 'En' : '한'}
          </button>
        }
      />
      <main className="home-main">
        <p className="home-caption">암송집을 선택하세요</p>
        <div className="collection-list">
          {collections.map((c) => (
            <button
              key={c.id}
              className="collection-card"
              style={{ '--accent': c.color }}
              onClick={() => openCollection(c.id)}
            >
              <span className="collection-stripe" />
              <span className="collection-info">
                <span className="collection-name">{c.name}</span>
                <span className="collection-meta">
                  {c.verseCount}구절{c.sections.length > 0 && ` · ${c.sections.length}개 주제`}
                </span>
              </span>
              <span className="chevron">›</span>
            </button>
          ))}
        </div>

        <div className="home-shortcuts">
          <button
            className="shortcut-card"
            onClick={() => push({ name: 'verses', kind: 'favorites', title: '즐겨찾기' })}
          >
            <span className="shortcut-icon star">★</span>
            즐겨찾기
            <span className="shortcut-count">{favorites.size}</span>
          </button>
          <button
            className="shortcut-card"
            onClick={() => push({ name: 'verses', kind: 'completed', title: '암송완료' })}
          >
            <span className="shortcut-icon check">✓</span>
            암송완료
            <span className="shortcut-count">{completed.size}</span>
          </button>
        </div>
      </main>
    </div>
  )
}
