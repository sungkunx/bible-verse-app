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

# 역본 정의: (id, 파일, 표시 이름, 짧은 이름, 참조 표기 언어)
TRANSLATIONS = [
    ('grg',  '개역개정S.sdb',    '개역개정',        '개역개정', 'ko'),
    ('swm',  '쉬운말.bdb',       '쉬운말 성경',     '쉬운말',   'ko'),
    ('hdi',  '현대인.bdb',       '현대인의 성경',   '현대인',   'ko'),
    ('grkh', '개역국한문.bdb',   '개역 국한문',     '國漢文',   'ko'),
    ('gjkh', '개정국한문.bdb',   '개정 국한문',     '國漢文改', 'ko'),
    ('niv',  'NIV2011.bdb',      'NIV 2011',        'NIV',      'en'),
    ('nlt',  'NLT.bdb',          'NLT',             'NLT',      'en'),
    ('jpn',  '일본신개역.bdb',   '日本語 新改訳',   '日本語',   'en'),
    ('chs',  '중문화간체.bdb',   '中文 和合本简体', '中文',     'en'),
    ('esp',  '스페인RV1995.bdb', 'Español RV1995',  'Español',  'en'),
    ('vie',  '베트남.bdb',       'Tiếng Việt',      'Việt',     'en'),
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
    t = re.sub(r'[○●◎□■″〃]', '', t)            # 단락 기호·인용 부호 잔재
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# ── 개역개정 띄어쓰기 복원 ────────────────────────────────────
# 개역개정S.sdb는 스트롱코드 정렬용이라 형태소 단위로 쪼개져 있어
# 코드를 제거하면 "그의 나라 와", "영 생을" 처럼 띄어쓰기가 깨진다.
# 개정국한문판은 같은 개역개정 본문에 띄어쓰기가 정상이므로,
# 두 본문을 문자 단위로 정렬해 띄어쓰기 위치만 옮겨온다.
# (한자↔한글 변환이 아니라 개역개정S의 글자를 그대로 쓰므로 안전)
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

    for tid, fname, name, short, reflang in TRANSLATIONS:
        path = os.path.join(ROOT, 'bibledb', fname)
        if not os.path.exists(path):
            warnings.append(f'{name}: 파일 없음 ({fname}) — 건너뜀')
            continue
        con = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
        cur = con.cursor()
        texts = {}
        missing = []
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
                    parts = []
                    ok = True
                    for vs in JPN_ROW_FIX[v['id']]:
                        row = cur.execute(
                            'SELECT btext FROM Bible WHERE book=? AND chapter=? AND verse=?',
                            (book, ch, vs)).fetchone()
                        if not row or not clean_text(row[0]):
                            ok = False
                            break
                        parts.append(clean_text(row[0]))
                    if ok and parts:
                        texts[v['id']] = ' '.join(parts)
                    else:
                        missing.append(v['id'] + ' (교정 행 조회 실패)')
                    continue

            parts = []
            ok = True
            for seg in v['ref']['verses']:
                for vs in range(seg['start'], seg.get('end', seg['start']) + 1):
                    row = cur.execute(
                        'SELECT btext FROM Bible WHERE book=? AND chapter=? AND verse=?',
                        (book, ch, vs)).fetchone()
                    if not row or not clean_text(row[0]):
                        ok = False
                        break
                    parts.append(clean_text(row[0]))
                if not ok:
                    break
            if ok and parts:
                texts[v['id']] = ' '.join(parts)
            else:
                missing.append(v['id'])
        con.close()
        out['translations'].append({'id': tid, 'name': name, 'short': short, 'refLang': reflang})
        out['texts'][tid] = texts
        status = f'{name}: {len(texts)}/{len(verses)}구절'
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
