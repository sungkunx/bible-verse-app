#!/usr/bin/env python3
"""
bibledb/*.sdb|*.bdb (SQLite, Bible(book,chapter,verse,btext)) 에서
src/data/verses.json의 495구절 본문을 역본별로 추출
→ src/data/translations.json

- 책 번호: 표준 1(창)~66(계) ↔ OSIS id 매핑
- 마크업 제거: 스트롱코드 <WG123>/<WH123>, <sup>각주</sup>, 단락기호 ○ 등
- 구간 처리: 범위(11-12)는 이어붙임, 비연속(1,14)도 이어붙임,
  상/하반절(38상)은 해당 절 전체를 사용 (DB에 반절 구분 없음)

사용법: python3 scripts/extract_translations.py
"""
import json, re, os, sqlite3, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# OSIS id → 표준 책 번호 (1~66)
OSIS_ORDER = [
    'Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam',
    '1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov',
    'Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos',
    'Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal',
    'Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal','Eph',
    'Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb',
    'Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev',
]
BOOK_NUM = {osis: i + 1 for i, osis in enumerate(OSIS_ORDER)}

# 역본 정의: (id, 파일, 표시 이름, 짧은 이름, 주소 표기 언어, 앱 노출 여부)
#   refLang은 src/data/books.js의 언어 키(ko/en/ja/zh/es/vi/hi)와 일치해야 함.
#   영어가 아닌 역본은 앱에서 "네이티브 주소 · English 주소"로 병기된다.
#   show=False인 역본은 앱 목록에 넣지 않는다. 국한문판은 노출하지 않지만
#   개정국한문은 개역개정 띄어쓰기 복원의 기준으로 쓰이므로 추출은 계속한다.
TRANSLATIONS = [
    ('grg',  '개역개정S.sdb',    '개역개정',          '개역개정', 'ko', True),
    ('kkj',  '한글킹.bdb',       '한글 킹제임스',     '한글킹',   'ko', True),
    ('swm',  '쉬운말.bdb',       '쉬운말 성경',       '쉬운말',   'ko', True),
    ('hdi',  '현대인.bdb',       '현대인의 성경',     '현대인',   'ko', True),
    ('niv',  'NIV2011.bdb',      'NIV 2011',          'NIV',      'en', True),
    ('nlt',  'NLT.bdb',          'NLT',               'NLT',      'en', True),
    ('jpn',  '일본신개역.bdb',   '日本語 新改訳',     '日本語',   'ja', True),
    ('chs',  '중문화간체.bdb',   '中文 和合本简体',   '中文',     'zh', True),
    ('esp',  '스페인RV1995.bdb', 'Español RV1995',    'Español',  'es', True),
    ('vie',  '베트남.bdb',       'Tiếng Việt',        'Việt',     'vi', True),
    ('hin',  '힌디개정.bdb',     '힌디어 (हिन्दी)',     'हिन्दी',     'hi', True),
    # ── 앱에 노출하지 않음 ──
    ('gjkh', '개정국한문.bdb',   '개정 국한문',       '國漢文改', 'ko', False),
]

# ── 일본어 DB(口語訳 계열) 절 번호 교정 ─────────────────────────
# 이 DB는 21개 장에서 절이 병합/재번호되어 표준 절 번호와 어긋난다.
# 아래는 한국어 본문과 일본어 원문을 1:1 대조해 확정한 교정값.
JPN_ROW_FIX = {  # verseId → 실제 DB 행 번호 목록
    'assurance-3': [12],        # 고전 10:13 → 행12
    'tms60-B-3': [22],          # 롬 6:23 → 행22
    'tms60-C-9': [31],          # 롬 8:32 → 행31
    'tms60-D-1': [32],          # 마 6:33 → 행32
    'tms180-s1-3-12': [27],     # 롬 8:28 → 행27
    'tms180-s2-3-3': [25, 26],  # 마 20:26-27 → 행25-26
    'tms180-s2-3-9': [35],      # 마 9:36 → 행35
    'tms180-s3-2-7': [10],      # 행 17:11 → 행10
    'tms180-s4-1-12': [11, 12], # 롬 6:12-13 → 행11-12
    'tms180-s4-3-10': [36, 37], # 마 9:37-38 → 행36-37
    'tms180-s5-2-6': [24],      # 히 7:25 → 행24
    'tms180-s5-3-4': [13, 14],  # 롬 6:14-15 → 행13-14
    'dep242-1-15': [38],        # 롬 8:39 → 행38
    'dep242-2-2-3': [6, 7],     # 시 130:5-6 → 행6-7
    'dep242-3-3-1': [10],       # 행 17:11 → 행10
    'dep242-3-4-5': [10],       # 행 17:11 → 행10
    'dep242-6-5-7': [22],       # 롬 6:23 → 행22
    'dep242-6-5-18': [62],      # 요 6:63 → 행62
    'dep242-7-2-1': [32],       # 마 6:33 → 행32
}
JPN_TEXT_FIX = {  # 병합된 행에서 해당 절만 발췌
    'dep242-1-3': 'よくよくあなたがたに言っておく。信じる者には永遠の命がある。',  # 요 6:47 (행46 후반부)
}
JPN_SKIP = {  # DB에 본문이 없어 복구 불가 (기본 역본으로 대체됨)
    'tms180-s5-2-4',   # 눅 5:31-32 (5장이 3절까지만 수록)
    'dep242-3-3-5',    # 눅 5:5-6
    'dep242-4-4-2',    # 눅 5:15-16
    'tms180-s2-1-5',   # 골 4:4-6 (4:6이 DB에 없음)
}

# ── 한글 킹제임스: 시편 표제가 1절 본문에 붙어 있다 ────────────
# 예) 시 42:1 "악장을 따라 부른 코라의 아들들을 위한 마스킬수사슴이 시냇물을…"
# 구분 기호가 없어 자동 분리가 불가하므로, 실제 본문과 대조해 확정한
# 표제 문자열을 접두부로 제거한다. 표제가 있는 시편인지는 개정국한문판이
# 표제를 [ ]로 표시하는 것을 이용해 자동 교차 검증한다 (main() 참고).
KKJ_PSALM_TITLES = {
    (42, 1): '악장을 따라 부른 코라의 아들들을 위한 마스킬',
    (133, 1): '다윗의 올라가는 노래',
}

# ── 역본 간 절 번호 체계(versification) 차이 ──────────────────
# verses.json의 절 번호는 개역개정 기준이다. 일부 역본은 절을 나누는
# 방식이 달라 같은 번호가 다른 본문을 가리킨다.
#   고후 13장: 개역개정·쉬운말은 12절이 "거룩하게 입맞춤으로 서로 문안하라"와
#   "모든 성도가 너희에게 문안하느니라"를 합쳐 13절로 끝난다(축도=13절).
#   KJV/서구 계열은 12·13·14로 나뉘어 축도가 14절이다.
# 규칙: (책, 장, 우리 절, 그 장의 최대 절이 이 값일 때, 실제로 읽을 행)
VERSIFICATION = [
    ('2Cor', 13, 13, 14, [14]),
]


def clean_text(t):
    """DB 원문에서 앱에 표시할 순수 본문만 남긴다.

    처리 대상:
      - 스트롱코드 <WG746> / <WH7225>          (개역개정S)
      - 각주 블록 "<br>▷ <sup>①</sup>Or …"     (NIV, NLT) — ▷부터 끝까지 제거
      - 각주 마커 <sup>①</sup>                  (NIV, NLT)
      - 줄바꿈 <br> → 공백                      (시가서 행 구분)
      - 시편 표제 [다윗의 詩, 引導者를 따라…]    (개정국한문)
      - 보충어 중괄호 {그대로 되니라} → 괄호만 제거, 본문은 유지 (개역국한문)
      - 단락 기호 ○ 등                          (쉬운말)
      - 상호참조 (इब्रा. 1:10), 각주 별표         (힌디개정)
    """
    if not t:
        return ''
    t = re.sub(r'<W[GH]\d+>', '', t)               # 스트롱코드
    t = re.sub(r'<br\s*/?>\s*▷.*$', '', t, flags=re.S)  # 각주 블록 (일반형)
    t = re.sub(r'▷.*$', '', t, flags=re.S)         # 각주 블록 (▷만 있는 형태)
    t = re.sub(r'<sup>.*?</sup>', '', t)           # 각주 번호
    t = re.sub(r'<br\s*/?>', ' ', t)               # 줄바꿈
    t = re.sub(r'<[^>]*>', '', t)                  # 남은 태그 (<i>, <a name=…> 등)
    t = re.sub(r'^\s*\[[^\]]{2,60}\]\s*', '', t)   # 시편 표제
    t = t.replace('{', '').replace('}', '')        # 보충어 괄호
    # 상호참조 주석: 괄호 안에 "장:절"이 있는 것만 제거 (본문 괄호는 보존)
    t = re.sub(r'\s*\([^()]*\d+\s*:\s*\d+[^()]*\)', '', t)
    t = t.replace('*', '')                         # 각주 별표
    t = re.sub(r'[○●◎□■″〃]', '', t)            # 단락 기호·인용 부호 잔재
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# ── 개역개정 띄어쓰기 복원 ────────────────────────────────────
# 개역개정S.sdb는 스트롱코드 정렬용이라 형태소 단위로 쪼개져 있어
# 코드를 제거하면 "그의 나라 와", "영 생을" 처럼 띄어쓰기가 깨진다.
# 개정국한문판은 같은 개역개정 본문에 띄어쓰기가 정상이므로,
# 두 본문을 문자 단위로 정렬해 띄어쓰기 위치만 옮겨온다.
# (한자↔한글 변환이 아니라 개역개정S의 글자를 그대로 쓰므로 안전)
# ── 자리표시(placeholder) 행 ──────────────────────────────────
# 여러 DB에는 본문 대신 안내 문구가 들어간 행이 있다.
#   현대인      "(1절에 포함)"        — 앞 절에 합쳐 번역됨
#   개역개정S   "3절에 포함됨", "5절과 같음"
#   국한문      "(없음)", "{상동}"
#   일본신개역  "（8節に合節）"        — 8절에 합절
# 이런 행을 본문으로 오인하면 카드에 안내 문구가 그대로 표시된다.
PH_MERGE = re.compile(
    r'^[\s(（\[{]*(\d+)\s*(?:절|節)\s*(?:에\s*포함(?:됨)?|과\s*같음|に合節|と同じ)[\s)）\]}.]*$')
PH_NONE = re.compile(r'^[\s(（\[{]*(?:없\s*음|상동|同上|N/?A|-+)[\s)）\]}.]*$')


def fetch_verse(cur, book, ch, n):
    """(본문, 병합된 절번호) 반환.
    본문이 있으면 (텍스트, None), 자리표시면 (None, 대상절) 또는 (None, None)."""
    row = cur.execute(
        'SELECT btext FROM Bible WHERE book=? AND chapter=? AND verse=?',
        (book, ch, n)).fetchone()
    if not row:
        return None, None
    txt = clean_text(row[0])
    if not txt:
        return None, None
    m = PH_MERGE.match(txt)
    if m:
        return None, int(m.group(1))
    if PH_NONE.match(txt):
        return None, None
    return txt, None


def read_range(cur, book, ch, numbers):
    """요청한 절들의 본문을 읽는다. 자리표시 행은 건너뛰고,
    요청한 절이 전부 자리표시면 그 행이 가리키는 절을 대신 읽는다."""
    parts, targets = [], []
    for n in numbers:
        txt, merge_to = fetch_verse(cur, book, ch, n)
        if txt:
            parts.append(txt)
        elif merge_to is not None and merge_to not in numbers and merge_to not in targets:
            targets.append(merge_to)
    if not parts:
        for n in sorted(targets):
            txt, _ = fetch_verse(cur, book, ch, n)
            if txt:
                parts.append(txt)
    return parts


def is_hanja(ch):
    return '㐀' <= ch <= '鿿' or '豈' <= ch <= '﫿'


def build_hanja_map(grg_path, gjkh_path):
    """전체 성경에서 한자→한글 음 대응표를 학습.

    개정국한문판의 한자를 한글로 되돌려 두 본문을 같은 문자열로 만들면
    띄어쓰기 정렬이 정확해진다. (한자가 쓰인 자리가 바로 형태소가
    쪼개진 자리이므로, 이 변환 없이는 그 지점의 띄어쓰기를 복원 못 함)
    """
    from collections import defaultdict, Counter
    votes = defaultdict(Counter)
    ga = sqlite3.connect(f'file:{grg_path}?mode=ro', uri=True)
    gb = sqlite3.connect(f'file:{gjkh_path}?mode=ro', uri=True)
    rows_a = {(b, c, v): t for b, c, v, t in
              ga.execute('SELECT book, chapter, verse, btext FROM Bible')
              if isinstance(b, int)}
    for b, c, v, t in gb.execute('SELECT book, chapter, verse, btext FROM Bible'):
        if not isinstance(b, int):
            continue
        raw_a = rows_a.get((b, c, v))
        if not raw_a:
            continue
        a = re.sub(r'\s+', '', clean_text(raw_a))
        bb = re.sub(r'\s+', '', clean_text(t))
        if len(a) != len(bb) or not a:
            continue
        for ca, cb in zip(a, bb):
            if is_hanja(cb):
                votes[cb][ca] += 1
    ga.close()
    gb.close()
    # 한글 음절로만 채택 (다수결)
    mapping = {}
    for hanja, cnt in votes.items():
        for cand, n in cnt.most_common():
            if '가' <= cand <= '힣':
                mapping[hanja] = cand
                break
    return mapping


def respace(broken, reference, hanja_map=None):
    import difflib
    if not broken or not reference:
        return broken
    a = re.sub(r'\s+', '', broken)
    b_raw = reference
    if hanja_map:
        b_raw = ''.join(hanja_map.get(ch, ch) for ch in b_raw)
    b = re.sub(r'\s+', '', b_raw)
    if not a or not b:
        return broken

    # reference에서 "이 글자 뒤에 공백이 있는가"
    space_after = []
    for i, ch in enumerate(b_raw):
        if ch.isspace():
            continue
        nxt = b_raw[i + 1] if i + 1 < len(b_raw) else ''
        space_after.append(nxt.isspace())

    # 원본(broken)의 공백 위치도 보관 (정렬 실패 구간 대비)
    orig_space_after = []
    for i, ch in enumerate(broken):
        if ch.isspace():
            continue
        nxt = broken[i + 1] if i + 1 < len(broken) else ''
        orig_space_after.append(nxt.isspace())

    spaces = list(orig_space_after)  # 기본값: 원본 띄어쓰기
    matched_idx = set()
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    matched = 0
    for i, j, n in sm.get_matching_blocks():
        for k in range(n):
            if j + k < len(space_after):
                spaces[i + k] = space_after[j + k]
                matched_idx.add(i + k)
        matched += n
    # 일치율이 너무 낮으면 신뢰할 수 없으니 원본 유지
    if matched < len(a) * 0.75:
        return broken

    # 참조본에 없는 글자(정렬 실패) 주변 경계는 원본 띄어쓰기를 따른다.
    # 예: 개역개정S "그의 안에서" vs 개정국한문 "그 안에서" → "그 의 안에서" 방지
    for i in range(len(a)):
        nxt_unmatched = (i + 1 < len(a)) and (i + 1 not in matched_idx)
        if i not in matched_idx or nxt_unmatched:
            spaces[i] = orig_space_after[i] if i < len(orig_space_after) else spaces[i]

    out = ''.join(c + (' ' if sp else '') for c, sp in zip(a, spaces))
    out = re.sub(r'\s+', ' ', out).strip()
    # 원본 DB의 조사 중복 artifact 정리 ("기회를 를 삼지" → "기회를 삼지")
    out = re.sub(r'(?<=\S)(를|을|와|과|의|로|에서|에게) \1(?=\s|$)', r'\1', out)
    return out


def main():
    data = json.load(open(os.path.join(ROOT, 'src/data/verses.json'), encoding='utf-8'))
    verses = data['verses']

    out = {'translations': [], 'texts': {}}
    warnings = []

    shown = {t[0] for t in TRANSLATIONS if t[5]}

    for tid, fname, name, short, reflang, show in TRANSLATIONS:
        path = os.path.join(ROOT, 'bibledb', fname)
        if not os.path.exists(path):
            warnings.append(f'{name}: 파일 없음 ({fname}) — 건너뜀')
            continue
        con = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
        cur = con.cursor()
        texts = {}
        missing = []
        vfixed = []   # 절 번호 체계 보정된 구절
        for v in verses:
            book = BOOK_NUM.get(v['ref']['book'])
            if not book:
                missing.append(v['id'] + ' (책 매핑 실패)')
                continue
            ch = v['ref']['chapter']

            # 일본어 DB 절 번호 교정
            if tid == 'jpn':
                if v['id'] in JPN_SKIP:
                    missing.append(v['id'] + ' (교정 불가·의도적 제외)')
                    continue
                if v['id'] in JPN_TEXT_FIX:
                    texts[v['id']] = JPN_TEXT_FIX[v['id']]
                    continue
                if v['id'] in JPN_ROW_FIX:
                    rows_j = JPN_ROW_FIX[v['id']]
                    parts = read_range(cur, book, ch, rows_j)
                    if len(parts) == len(rows_j):
                        texts[v['id']] = ' '.join(parts)
                    else:
                        missing.append(v['id'] + ' (교정 행 조회 실패)')
                    continue

            # 절 번호 체계 차이 보정 (예: 고후 13:13 → KJV 계열은 13:14)
            rows = None
            for bk, vch, ours, trigger_max, mapped in VERSIFICATION:
                if v['ref']['book'] != bk or ch != vch:
                    continue
                segs = v['ref']['verses']
                if len(segs) != 1 or segs[0].get('end') or segs[0]['start'] != ours:
                    continue
                mx = cur.execute(
                    'SELECT MAX(verse) FROM Bible WHERE book=? AND chapter=?',
                    (book, ch)).fetchone()[0]
                # 자리표시 행("(없음)" 등)만 있는 마지막 절은 세지 않는다.
                # 개정국한문은 고후 13:14가 "(없음)"이라 최대절만 보면 오판한다.
                if mx == trigger_max:
                    tail, _ = fetch_verse(cur, book, ch, trigger_max)
                    if tail:
                        rows = mapped
                break
            if rows:
                parts = read_range(cur, book, ch, rows)
                if len(parts) == len(rows):
                    texts[v['id']] = ' '.join(parts)
                    vfixed.append(f'{v["id"]} → {ch}:{",".join(map(str, rows))}')
                else:
                    missing.append(v['id'] + ' (절 번호 보정 조회 실패)')
                continue

            numbers = []
            for seg in v['ref']['verses']:
                numbers.extend(range(seg['start'], seg.get('end', seg['start']) + 1))
            parts = read_range(cur, book, ch, numbers)
            if parts:
                s = ' '.join(parts)
                # 한글 킹제임스: 시편 1절에 붙어 있는 표제 제거
                if tid == 'kkj' and v['ref']['book'] == 'Ps':
                    title = KKJ_PSALM_TITLES.get((ch, v['ref']['verses'][0]['start']))
                    if title and s.startswith(title):
                        s = s[len(title):].strip()
                    elif title:
                        warnings.append(
                            f'{name}: {v["id"]} 표제 제거 실패 (원문이 바뀐 듯) — 확인 필요')
                texts[v['id']] = s
            else:
                missing.append(v['id'])
        con.close()
        out['translations'].append({'id': tid, 'name': name, 'short': short,
                                    'refLang': reflang, 'show': show})
        out['texts'][tid] = texts
        status = f'{name}: {len(texts)}/{len(verses)}구절'
        if vfixed:
            status += f' · 절번호 보정 {len(vfixed)}건({"; ".join(vfixed)})'
        if not show:
            status += ' [내부 기준용 · 앱 미노출]'
        if missing:
            status += f' (누락 {len(missing)}: {", ".join(missing[:5])}{"…" if len(missing) > 5 else ""})'
            warnings.append(status)
        print(('⚠ ' if missing else '✓ ') + status)

    # 개역개정 띄어쓰기 복원 (개정국한문판을 기준으로)
    grg_path = os.path.join(ROOT, 'bibledb', '개역개정S.sdb')
    gjkh_path = os.path.join(ROOT, 'bibledb', '개정국한문.bdb')
    if 'grg' in out['texts'] and 'gjkh' in out['texts'] \
            and os.path.exists(grg_path) and os.path.exists(gjkh_path):
        hmap = build_hanja_map(grg_path, gjkh_path)
        print(f'\n· 한자→한글 대응표 학습: {len(hmap)}자')
        fixed = 0
        for vid, s in out['texts']['grg'].items():
            ref = out['texts']['gjkh'].get(vid)
            if not ref:
                continue
            new = respace(s, ref, hmap)
            if new != s:
                out['texts']['grg'][vid] = new
                fixed += 1
        print(f'✓ 개역개정 띄어쓰기 복원: {fixed}구절 (기준: 개정국한문판)')

    # 한글 킹제임스 시편 표제 누락 교차 검증
    # 개정국한문판은 표제를 [ ]로 표시하므로, 표제가 있는 시편의 1절인데
    # KKJ_PSALM_TITLES에 항목이 없으면 표제가 본문에 섞여 있을 수 있다.
    if 'kkj' in out['texts'] and os.path.exists(gjkh_path):
        gc = sqlite3.connect(f'file:{gjkh_path}?mode=ro', uri=True)
        unchecked = []
        for v in verses:
            if v['ref']['book'] != 'Ps':
                continue
            start = v['ref']['verses'][0]['start']
            if start != 1:
                continue
            row = gc.execute(
                'SELECT btext FROM Bible WHERE book=19 AND chapter=? AND verse=1',
                (v['ref']['chapter'],)).fetchone()
            has_title = bool(row and row[0].lstrip().startswith('['))
            if has_title and (v['ref']['chapter'], start) not in KKJ_PSALM_TITLES:
                unchecked.append(f'{v["id"]} (시 {v["ref"]["chapter"]}:1)')
        gc.close()
        if unchecked:
            warnings.append('한글 킹제임스: 시편 표제가 본문에 섞였을 수 있음 → '
                            + ', '.join(unchecked))
            print('⚠ 한글 킹제임스 시편 표제 미확인:', ', '.join(unchecked))
        else:
            print('✓ 한글 킹제임스 시편 표제 검증 통과')

    # 앱에 노출하지 않는 역본은 결과에서 제거 (개정국한문 = 내부 기준용)
    dropped = [t['id'] for t in out['translations'] if not t.get('show')]
    out['translations'] = [
        {k: v for k, v in t.items() if k != 'show'}
        for t in out['translations'] if t.get('show')
    ]
    for tid in dropped:
        out['texts'].pop(tid, None)
    if dropped:
        print(f'· 앱 목록에서 제외: {", ".join(dropped)}')

    dest = os.path.join(ROOT, 'src/data/translations.json')
    with open(dest, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    size = os.path.getsize(dest) // 1024
    print(f'\n→ {dest} ({size} KB)')
    if warnings:
        print('\n경고 요약:')
        for w in warnings:
            print(' -', w)

if __name__ == '__main__':
    main()
