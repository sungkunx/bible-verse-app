// 즐겨찾기 / 암송완료 localStorage 저장
const KEYS = { favorites: 'bmc.favorites.v1', completed: 'bmc.completed.v1' }

export function loadSet(kind) {
  try {
    const raw = localStorage.getItem(KEYS[kind])
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function saveSet(kind, set) {
  try {
    localStorage.setItem(KEYS[kind], JSON.stringify([...set]))
  } catch {
    /* 저장 실패는 무시 (프라이빗 모드 등) */
  }
}
