import { getCollection, selectVerses, sectionHasSubsections } from '../lib/data.js'
import TopBar from './TopBar.jsx'

/** 섹션 / 서브섹션 목록 화면 (깊이에 따라 자동 분기) */
export default function GroupScreen({ screen, push, pop, home }) {
  const col = getCollection(screen.collectionId)
  const section = screen.sectionId
    ? col.sections.find((s) => s.id === screen.sectionId)
    : null

  // 보여줄 항목: 섹션 목록 또는 선택된 섹션의 서브섹션 목록
  const items = section
    ? section.subsections.map((sub) => ({
        id: sub.id,
        name: sub.name,
        count: selectVerses({ collectionId: col.id, subsectionId: sub.id }).length,
        target: {
          name: 'verses',
          collectionId: col.id,
          sectionId: section.id,
          subsectionId: sub.id,
          title: sub.name,
        },
      }))
    : col.sections.map((s) => ({
        id: s.id,
        name: s.name,
        count: selectVerses({ collectionId: col.id, sectionId: s.id }).length,
        target: sectionHasSubsections(col.id, s.id)
          ? { name: 'group', collectionId: col.id, sectionId: s.id }
          : { name: 'verses', collectionId: col.id, sectionId: s.id, title: s.name },
      }))

  return (
    <div className="screen">
      <TopBar title={section ? section.name : col.name} onBack={pop} onHome={home} />
      <main className="group-main" style={{ '--accent': col.color }}>
        {!section && (
          <button
            className="group-row all-row"
            onClick={() =>
              push({ name: 'verses', collectionId: col.id, title: `${col.shortName} 전체` })
            }
          >
            <span className="group-name">전체 보기</span>
            <span className="group-count">{col.verseCount}구절</span>
            <span className="chevron">›</span>
          </button>
        )}
        {items.map((item) => (
          <button key={item.id} className="group-row" onClick={() => push(item.target)}>
            <span className="group-badge">{item.id.split('-').pop().toUpperCase()}</span>
            <span className="group-name">{item.name}</span>
            <span className="group-count">{item.count}구절</span>
            <span className="chevron">›</span>
          </button>
        ))}
      </main>
    </div>
  )
}
