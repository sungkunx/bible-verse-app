import { getCollection } from '../lib/data.js'
import { formatReference } from '../lib/refFormat.js'
import { getVerseText } from '../lib/textProvider.js'

/** 카드 하단에 표시할 코드/그룹 라벨 */
export function cardFooter(verse) {
  const col = getCollection(verse.collectionId)
  const section = col.sections.find((s) => s.id === verse.sectionId)
  const subsection = section?.subsections.find((s) => s.id === verse.subsectionId)
  const groupName = subsection?.name || section?.name || col.shortName
  const code = verse.code.replace(/^s/, '')
  return { code, groupName, color: col.color }
}

/**
 * 실물 암송 카드.
 * 앞면: 제목 + 성경 주소 (실물 카드의 앞면처럼 — 본문을 떠올리는 용도)
 * 뒷면: 본문 전체. flipped로 제어, 탭하면 뒤집힘.
 */
export default function VerseCard({ verse, lang, flipped, onFlip }) {
  const { code, groupName, color } = cardFooter(verse)
  const refFull = formatReference(verse.ref, lang, 'full')
  const text = getVerseText(verse, lang)
  const fallback = !text && lang === 'en'
  const body = text || getVerseText(verse, 'ko')

  return (
    <div className={`card3d ${flipped ? 'flipped' : ''}`} onClick={onFlip} style={{ '--accent': color }}>
      <div className="card-inner">
        {/* 앞면: 본문 카드 */}
        <div className="card-face card-front">
          <div className="card-head">
            <h2 className="card-title">{verse.title}</h2>
            <div className="card-ref">{refFull}</div>
          </div>
          <p className={`card-body ${body && body.length > 180 ? 'long' : ''}`}>
            {body}
          </p>
          {fallback && <div className="card-note">영어 본문이 아직 없어 한국어로 표시합니다</div>}
          <div className="card-foot">
            <span className="card-code">
              {code} <em>{groupName}</em>
            </span>
            <span className="card-foot-ref">{refFull}</span>
          </div>
        </div>
        {/* 뒷면: 제목 + 주소만 (암송 확인용) */}
        <div className="card-face card-back">
          <div className="card-head">
            <h2 className="card-title">{verse.title}</h2>
          </div>
          <div className="card-back-center">
            <div className="card-back-ref">{refFull}</div>
            <div className="card-back-hint">본문을 떠올려 보세요 · 탭하면 본문 보기</div>
          </div>
          <div className="card-foot">
            <span className="card-code">
              {code} <em>{groupName}</em>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
