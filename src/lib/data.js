import raw from '../data/verses.json'

export const collections = raw.collections
export const verses = raw.verses

const byId = new Map(verses.map((v) => [v.id, v]))
export const getVerse = (id) => byId.get(id)

export const getCollection = (id) => collections.find((c) => c.id === id)

/** 컬렉션/섹션/서브섹션 조건에 맞는 구절 목록 (원본 순서 유지) */
export function selectVerses({ collectionId, sectionId, subsectionId } = {}) {
  return verses.filter(
    (v) =>
      (!collectionId || v.collectionId === collectionId) &&
      (!sectionId || v.sectionId === sectionId) &&
      (!subsectionId || v.subsectionId === subsectionId),
  )
}

/** 해당 섹션이 서브섹션을 가지는지 */
export function sectionHasSubsections(collectionId, sectionId) {
  const col = getCollection(collectionId)
  const sec = col?.sections.find((s) => s.id === sectionId)
  return Boolean(sec?.subsections?.length)
}
