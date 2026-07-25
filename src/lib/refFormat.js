import { BOOKS } from '../data/books.js'

// 절 목록 → "11-12" / "1,14" / "37-38상" 형태
export function formatVerseNumbers(verses, lang = 'ko') {
  return verses
    .map((seg) => {
      let s = String(seg.start)
      if (seg.end) s += `-${seg.end}`
      if (seg.suffix) s += lang === 'ko' ? seg.suffix : seg.suffix === '상' ? 'a' : 'b'
      return s
    })
    .join(',')
}

// ref → "요한복음 1:1,14" (full) / "요 1:1,14" (abbr) / "John 1:1,14" (en)
export function formatReference(ref, lang = 'ko', style = 'full') {
  const book = BOOKS[ref.book]
  const name = !book
    ? ref.book
    : lang === 'en'
      ? book.en
      : style === 'abbr'
        ? book.koAbbr
        : book.ko
  return `${name} ${ref.chapter}:${formatVerseNumbers(ref.verses, lang)}`
}
