// ─────────────────────────────────────────────────────────────
// 본문 텍스트 공급자 (Text Provider)
//
// 앱의 모든 화면은 본문이 필요할 때 이 모듈의 getVerseText()만 호출합니다.
// 지금은 verses.json에 내장된 텍스트(texts.ko / texts.en)를 반환하지만,
// 나중에 전체 성경 데이터베이스가 준비되면 이 파일만 교체하면 됩니다.
//
// 교체 방법 (예시):
//   1. 성경 DB를 { [translationId]: { [bookId]: { [chapter]: { [verse]: text } } } }
//      형태로 준비 (bookId는 src/data/books.js의 OSIS id 사용)
//   2. 아래 fetchFromBibleDB()를 구현하고 PROVIDER를 'bibledb'로 변경
//   3. ref.verses의 각 구간(start~end, suffix 포함)을 이어붙여 반환
// ─────────────────────────────────────────────────────────────

const PROVIDER = 'embedded' // 'embedded' | 'bibledb'

// 언어 → 기본 역본 매핑 (성경 DB 연동 시 사용)
export const DEFAULT_TRANSLATIONS = { ko: 'KRV', en: 'NIV' }

function fromEmbedded(verse, lang) {
  return verse.texts?.[lang] ?? null
}

// eslint-disable-next-line no-unused-vars
function fetchFromBibleDB(verse, lang) {
  // TODO: 전체 성경 DB 연동 시 구현.
  // const t = DEFAULT_TRANSLATIONS[lang]
  // return verse.ref.verses.map(seg => lookup(t, verse.ref.book, verse.ref.chapter, seg)).join(' ')
  return null
}

/**
 * 구절 본문을 반환. 해당 언어 본문이 없으면 null.
 * @param {object} verse - 정규화된 구절 객체 (ref + texts)
 * @param {'ko'|'en'} lang
 */
export function getVerseText(verse, lang) {
  if (PROVIDER === 'bibledb') {
    const t = fetchFromBibleDB(verse, lang)
    if (t) return t
  }
  return fromEmbedded(verse, lang)
}

/** 해당 언어 본문이 있는지 */
export function hasText(verse, lang) {
  return Boolean(getVerseText(verse, lang))
}
