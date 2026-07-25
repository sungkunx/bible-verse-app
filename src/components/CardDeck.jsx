import { useCallback, useEffect, useRef, useState } from 'react'
import VerseCard from './VerseCard.jsx'

/** 스와이프로 넘기는 카드 덱 */
export default function CardDeck({ verses, lang, index, setIndex, favorites, completed, toggle }) {
  const [drag, setDrag] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [leaving, setLeaving] = useState(null) // {dir, verse} 애니메이션용
  const start = useRef(null)

  const verse = verses[index]
  const count = verses.length

  const go = useCallback(
    (dir) => {
      const next = index + dir
      if (next < 0 || next >= count) return
      setLeaving({ dir, verse })
      setFlipped(false)
      setIndex(next)
      setTimeout(() => setLeaving(null), 260)
    },
    [index, count, verse, setIndex],
  )

  // 키보드 지원 (데스크톱)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onPointerDown = (e) => {
    start.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false }
  }
  const onPointerMove = (e) => {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    if (Math.abs(dx) > 6) start.current.moved = true
    setDrag(dx)
  }
  const onPointerUp = (e) => {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    const dt = Date.now() - start.current.t
    const fast = Math.abs(dx) / dt > 0.45
    const canPrev = index > 0
    const canNext = index < count - 1
    if ((dx < -60 || (fast && dx < -24)) && canNext) go(1)
    else if ((dx > 60 || (fast && dx > 24)) && canPrev) go(-1)
    else if (!start.current.moved && dt < 400) setFlipped((f) => !f)
    setDrag(0)
    start.current = null
  }

  if (!verse) return null
  const isFav = favorites.has(verse.id)
  const isDone = completed.has(verse.id)

  return (
    <div className="deck-area">
      <div
        className="deck"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { setDrag(0); start.current = null }}
      >
        {/* 뒤에 쌓인 카드 (실물 카드 뭉치 느낌) */}
        {index + 2 < count && <div className="deck-under under-2" />}
        {index + 1 < count && <div className="deck-under under-1" />}

        {/* 넘어가는 카드 잔상 */}
        {leaving && (
          <div className={`deck-leaving ${leaving.dir > 0 ? 'to-left' : 'to-right'}`}>
            <VerseCard verse={leaving.verse} lang={lang} flipped={false} />
          </div>
        )}

        <div
          className="deck-current"
          style={{
            transform: `translateX(${drag}px) rotate(${drag * 0.04}deg)`,
            transition: drag === 0 ? 'transform 0.25s ease' : 'none',
          }}
        >
          <VerseCard verse={verse} lang={lang} flipped={flipped} onFlip={null} />
        </div>
      </div>

      <div className="deck-controls">
        <button className="nav-btn" onClick={() => go(-1)} disabled={index === 0} aria-label="이전">
          ‹
        </button>
        <button
          className={`action-btn ${isFav ? 'on star-on' : ''}`}
          onClick={() => toggle('favorites', verse.id)}
          aria-label="즐겨찾기"
        >
          ★
        </button>
        <span className="deck-counter">
          {index + 1} <em>/ {count}</em>
        </span>
        <button
          className={`action-btn ${isDone ? 'on check-on' : ''}`}
          onClick={() => toggle('completed', verse.id)}
          aria-label="암송완료"
        >
          ✓
        </button>
        <button className="nav-btn" onClick={() => go(1)} disabled={index === count - 1} aria-label="다음">
          ›
        </button>
      </div>
      <p className="deck-hint">카드를 탭하면 본문이 가려집니다 · 좌우로 넘겨보세요</p>
    </div>
  )
}
