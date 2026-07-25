import { useEffect, useState } from 'react'
import TopBar from './TopBar.jsx'
import CardDeck from './CardDeck.jsx'
import VerseList from './VerseList.jsx'

export default function VerseScreen({ screen, verses, lang, setLang, favorites, completed, toggle, pop, home }) {
  const [mode, setMode] = useState('card') // 'card' | 'list'
  const [index, setIndex] = useState(0)

  // 즐겨찾기 해제 등으로 목록이 줄었을 때 인덱스 보정
  useEffect(() => {
    if (index >= verses.length) setIndex(Math.max(0, verses.length - 1))
  }, [verses.length, index])

  return (
    <div className="screen">
      <TopBar
        title={screen.title}
        onBack={pop}
        onHome={home}
        right={
          <button className="pill-btn" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>
            {lang === 'ko' ? 'En' : '한'}
          </button>
        }
      />
      <div className="mode-toggle">
        <button className={mode === 'card' ? 'on' : ''} onClick={() => setMode('card')}>
          카드
        </button>
        <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>
          리스트
        </button>
      </div>

      {verses.length === 0 ? (
        <p className="empty-note">아직 담긴 구절이 없습니다</p>
      ) : mode === 'card' ? (
        <CardDeck
          verses={verses}
          lang={lang}
          index={Math.min(index, verses.length - 1)}
          setIndex={setIndex}
          favorites={favorites}
          completed={completed}
          toggle={toggle}
        />
      ) : (
        <VerseList
          verses={verses}
          lang={lang}
          favorites={favorites}
          completed={completed}
          toggle={toggle}
          onOpen={(i) => { setIndex(i); setMode('card') }}
        />
      )}
    </div>
  )
}
