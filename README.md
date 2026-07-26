# 말씀 암송 카드 (Bible Memory Cards)

실물 암송카드를 넘기듯 사용하는 모바일 대응 웹앱.

## 두 가지 버전

**1. 단일 HTML (현재 주력) — `index.html` / `single/암송카드.html`**

빌드 없이 브라우저에서 바로 열리는 완결형 파일. 지금은 이 버전으로 UI/UX를
빠르게 다듬는 중이며, 확정되면 React 버전으로 옮길 예정.

- 소스: `single/template.html` (CSS/JS) — 데이터는 빌드 시 주입
- 빌드: `python3 scripts/build_single.py`
  → `single/암송카드.html`과 루트 `index.html`(GitHub Pages용) 재생성
- 배포: GitHub Pages를 main 브랜치 / (root)로 설정하면
  루트 `index.html`이 곧 앱 → https://sungkunx.github.io/bible-verse-app/

**2. React + Vite — `src/`**

같은 구조의 React 구현 (추후 전환용 기준). 개발 진입점은 `dev.html`.

```bash
npm install
npm run dev      # 개발 서버 → http://localhost:5173/dev.html
npm run build    # 배포용 빌드 → dist/
```

## 기능 (v0.6)

카드 넘기기(스와이프/플릭, 방향 잠금), 탭하면 뒷면(제목+주소만) 뒤집기,
리스트 뷰(본문 전문 표시), 즐겨찾기·암송완료(localStorage),
**역본 선택 11종 + 암송카드 원문**, **성경 주소 병기**(해당 언어 · English),
본문 자동 크기 맞춤 + 가−/가+ 수동 글자 조절(선택값 모두 저장됨),
홈 화면 **암송 달성도**(암송집별 완료 수·퍼센트·진행바),
**안드로이드 뒤로가기**로 이전 단계 이동(홈에서는 한 번 더 눌러야 종료).

카드 넘김 연출은 방향에 따라 다릅니다. 다음 카드로 갈 때는 현재 카드가
왼쪽으로 날아가고 새 카드가 뒤 카드뭉치에서 올라옵니다. 이전 카드로 돌아갈
때는 현재 카드를 그대로 두고, 바로 앞 카드가 화면 왼쪽 밖에서 손가락을
따라 덱 위로 들어옵니다 — 카드뭉치에서 한 장이 빠졌다가 다시 얹히는 느낌.
문턱을 넘지 못하면 들어오던 카드만 왼쪽으로 되돌아갑니다.

주소 표기는 `src/data/books.js`의 66권 테이블에서 가져오며
한국어·영어·日本語·中文(简体)·Español·Tiếng Việt·हिन्दी 이름을 담고 있습니다.
일본어·중국어 본문은 단어 사이 공백이 없어 `word-break`를 언어별로
다르게 적용합니다(한국어는 `keep-all`로 어절 보존).

## 역본 데이터

`bibledb/`에 성경 DB(SQLite, `Bible(book, chapter, verse, btext)`)를 두고
아래 스크립트를 돌리면 495구절의 역본별 본문이 추출됩니다.
DB 원본은 용량이 커서 커밋하지 않습니다(`.gitignore`) — 결과물인
`src/data/translations.json`만 저장소에 포함됩니다.

```bash
python3 scripts/extract_translations.py   # → src/data/translations.json
python3 scripts/build_single.py           # → index.html, single/암송카드.html
```

수록 역본(11종): 개역개정, 한글 킹제임스, 쉬운말, 현대인,
NIV 2011, NLT, 日本語 新改訳, 中文 和合本简体, Español RV1995,
Tiếng Việt, 힌디어(हिन्दी).
기본 역본은 개역개정이고, `원문`은 예전 앱에서 직접 입력했던 카드 본문입니다.

국한문판은 앱 목록에 노출하지 않지만(`show: False`), **개정국한문판은
개역개정 띄어쓰기 복원의 기준으로 계속 사용**하므로 DB와 추출은 유지합니다.

추출 시 자동 처리되는 것들:

- 스트롱코드(`<WG746>`), 각주 블록(`▷ …`), 각주 번호(`<sup>①</sup>`),
  줄바꿈 태그, 시편 표제(`[다윗의 詩…]`), 상호참조(`(इब्रा. 1:10)`),
  각주 별표 등 마크업 제거
- **자리표시 행 처리** — 여러 DB에는 본문 대신 안내 문구가 든 행이 있음
  (현대인 `(1절에 포함)` 48건, 국한문 `(없음)`, 일본어 `（8節に合節）` 등).
  이런 행은 본문으로 쓰지 않고, 절을 가리키는 경우 그 절을 대신 읽음
- **개역개정 띄어쓰기 복원** — 개역개정S는 스트롱코드 정렬용이라
  형태소가 쪼개져 있음(`영 생을`, `그의 나라 와`). 전체 성경에서
  한자→한글 대응표(2,023자)를 학습해 개정국한문판과 문자 단위로 정렬하고
  띄어쓰기 위치만 옮겨옴 (415구절 교정)
- **절 번호 체계(versification) 차이 보정** — 개역개정은 고후 13장이
  13절까지지만 KJV/서구 계열은 14절까지라 축도가 14절임. 장의 최대 절을
  확인해 자동 보정 (`VERSIFICATION` 표, 8개 역본에 적용)
- **일본어 DB 절 번호 교정** — 이 DB는 21개 장에서 절이 병합·재번호되어
  표준 절 번호와 어긋남. 한국어 본문과 1:1 대조해 확정한 교정표 적용
  (19구절 교정, 원문 자체가 없는 4구절은 기본 역본으로 대체 표시)
- **한글 킹제임스 시편 표제 분리** — 표제가 1절 본문에 붙어 있어
  (`다윗의 시주는 나의 목자시니`) 확정된 표제 문자열을 제거. 표제가 있는
  시편인지는 개정국한문판의 `[ ]` 표시로 자동 교차 검증

## 구조

```
src/
  data/
    verses.json      # 정규화된 495구절 (아래 '데이터' 참고)
    books.js         # 성경 66권 표준 테이블 (OSIS id ↔ 한/영 이름)
  lib/
    data.js          # 컬렉션/구절 조회 셀렉터
    textProvider.js  # ★ 본문 텍스트 공급자 — 성경 DB 연동 시 이 파일만 교체
    refFormat.js     # 참조 표기 생성 ("요한복음 1:1,14" 등)
    storage.js       # 즐겨찾기/암송완료 localStorage
  components/
    HomeScreen  → GroupScreen → VerseScreen(CardDeck | VerseList)
scripts/
  normalize.py       # 구버전 verses.json → 새 스키마 변환 스크립트
```

## 데이터

구버전의 5개 카테고리 필드(category/subcategory/subsubcategory)를
`collection → section → subsection` 계층으로 통일했고, 깊이가 얕은 컬렉션은
빈 단계를 자동으로 건너뜁니다 (앱 코드가 계층 깊이를 하드코딩하지 않음).

구절 스키마:

```json
{
  "id": "tms60-D-2",
  "collectionId": "tms60",
  "sectionId": "D",
  "subsectionId": null,
  "number": 2,
  "code": "D-2",
  "title": "그리스도를 첫자리에 모심",
  "ref": { "book": "Luke", "chapter": 9, "verses": [{ "start": 23 }] },
  "texts": { "ko": "...", "en": null }
}
```

핵심 설계: **성경 주소(ref)가 정식 데이터**이고 본문(texts)은 캐시일 뿐입니다.
`ref.book`은 OSIS 표준 id라서 나중에 전체 성경 데이터베이스(역본별)를 연동할 때
`textProvider.js`의 `fetchFromBibleDB()`만 구현하면 언어/역본 전환 시
본문을 성경 DB에서 가져오게 됩니다. 화면 코드는 수정할 필요가 없습니다.

- `ref.verses`는 구간 배열: `[{start:11, end:12}]` = 11-12절,
  `[{start:1},{start:14}]` = 1,14절, `suffix: "상"` = 절 앞부분(38상)
- 영어 본문이 없는 구절(255개)은 영어 모드에서 한국어로 대체 표시

## 다음 단계 (계획)

- 전체 성경 데이터베이스 연동 (textProvider 교체)
- 게임/퀴즈 기능
- 구절 직접 추가·편집
