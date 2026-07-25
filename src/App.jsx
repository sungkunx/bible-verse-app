import { useCallback, useEffect, useMemo, useState } from 'react'
import HomeScreen from './components/HomeScreen.jsx'
import GroupScreen from './components/GroupScreen.jsx'
import VerseScreen from './components/VerseScreen.jsx'
import { getCollection, getVerse, selectVerses } from './lib/data.js'
import { loadSet, saveSet } from './lib/storage.js'

/*
 * 화면 이동은 간단한 스택으로 관리합니다.
 *  { name: 'home' }
 *  { name: 'group',  collectionId, sectionId? }        — 하위 그룹 목록
 *  { name: 'verses', collectionId?, sectionId?, subsectionId?, kind?, title }
 *    kind: 'favorites' | 'completed' 이면 컬렉션 대신 저장 목록을 보여줌
 */
export default function App() {
  const [stack, setStack] = useState([{ name: 'home' }])
  const [lang, setLang] = useState('ko')
  const [favorites, setFavorites] = useState(() => loadSet('favorites'))
  const [completed, setCompleted] = useState(() => loadSet('completed'))

  useEffect(() => saveSet('favorites', favorites), [favorites])
  useEffect(() => saveSet('completed', completed), [completed])

  const screen = stack[stack.length - 1]
  const push = useCallback((s) => setStack((st) => [...st, s]), [])
  const pop = useCallback(() => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)), [])
  const home = useCallback(() => setStack([{ name: 'home' }]), [])

  const toggle = useCallback((kind, id) => {
    const [set, setSet] = kind === 'favorites' ? [favorites, setFavorites] : [completed, setCompleted]
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setSet(next)
  }, [favorites, completed])

  // 컬렉션 탭 → 계층 깊이에 따라 자동으로 목적지 결정 (빈 단계 스킵)
  const openCollection = useCallback((collectionId) => {
    const col = getCollection(collectionId)
    if (!col.sections.length) {
      push({ name: 'verses', collectionId, title: col.name })
    } else {
      push({ name: 'group', collectionId })
    }
  }, [push])

  const verseList = useMemo(() => {
    if (screen.name !== 'verses') return []
    if (screen.kind === 'favorites') return [...favorites].map(getVerse).filter(Boolean)
    if (screen.kind === 'completed') return [...completed].map(getVerse).filter(Boolean)
    return selectVerses(screen)
  }, [screen, favorites, completed])

  const shared = { lang, setLang, favorites, completed, toggle, push, pop, home }

  return (
    <div className="app">
      {screen.name === 'home' && (
        <HomeScreen {...shared} openCollection={openCollection} />
      )}
      {screen.name === 'group' && (
        <GroupScreen {...shared} screen={screen} />
      )}
      {screen.name === 'verses' && (
        <VerseScreen {...shared} screen={screen} verses={verseList} />
      )}
    </div>
  )
}
