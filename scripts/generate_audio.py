#!/usr/bin/env python3
"""
Google Cloud Text-to-Speech로 구절 음성 파일(mp3)을 만든다.

  audio/<역본>/<구절id>.mp3       본문
  audio/<역본>/<구절id>.ref.mp3   제목·주소 ("구원의 확신. 요한일서 5장 11절에서 12절.")
  audio/manifest.json             파일이 있는 구절 목록 + 본문 해시

앱은 manifest를 읽어 파일이 있는 구절은 mp3로, 없는 구절은 기기 음성으로 읽는다.
본문이 바뀌면 해시가 달라져 앱이 그 구절만 기기 음성으로 대신 읽고,
이 스크립트를 다시 돌리면 바뀐 구절만 새로 만든다.

인증 (둘 중 하나)
  export GOOGLE_TTS_API_KEY=...        # Text-to-Speech API만 허용한 API 키 권장
  또는 gcloud 로그인 상태 (gcloud auth print-access-token 사용)

사용법
  python3 scripts/generate_audio.py --list-voices ko-KR     # 쓸 수 있는 음성 목록
  python3 scripts/generate_audio.py --sample                # 음성별 샘플 → audio/_samples/
  python3 scripts/generate_audio.py --limit 5               # 5구절만 먼저 만들어 보기
  python3 scripts/generate_audio.py                         # 개역개정 전체 (바뀐 것만)
  python3 scripts/generate_audio.py --trans grg niv --voice ko-KR-Wavenet-A
  python3 scripts/generate_audio.py --dry-run               # 만들 구절 수·글자 수만 확인
"""
import argparse, base64, json, os, subprocess, sys, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_single import load_books, ROOT  # noqa: E402

API = 'https://texttospeech.googleapis.com/v1'
AUDIO_DIR = os.path.join(ROOT, 'audio')
MANIFEST = os.path.join(AUDIO_DIR, 'manifest.json')

# 역본 refLang → Google 언어 코드
LANG_CODE = {'ko': 'ko-KR', 'en': 'en-US', 'ja': 'ja-JP', 'zh': 'cmn-CN',
             'es': 'es-ES', 'vi': 'vi-VN', 'hi': 'hi-IN'}
# 기본 음성 (manifest에 기록된 음성이 있으면 그것을 유지)
DEFAULT_VOICE = {'ko': 'ko-KR-Wavenet-A'}


# ── 인증 / API ─────────────────────────────────────
def auth():
    key = os.environ.get('GOOGLE_TTS_API_KEY')
    if key:
        return {'key': key}
    try:
        tok = subprocess.check_output(['gcloud', 'auth', 'print-access-token'], text=True).strip()
        return {'token': tok}
    except Exception:
        sys.exit('인증 정보가 없습니다. GOOGLE_TTS_API_KEY를 설정하거나 gcloud에 로그인하세요.')


def call(cred, path, body=None):
    url = API + path
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    if 'key' in cred:
        url += ('&' if '?' in url else '?') + 'key=' + cred['key']
    else:
        headers['Authorization'] = 'Bearer ' + cred['token']
    data = json.dumps(body).encode('utf-8') if body is not None else None
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method='POST' if data else 'GET')
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')
            if e.code in (429, 500, 503) and attempt < 4:
                time.sleep(2 ** attempt)
                continue
            sys.exit(f'API 오류 {e.code}: {msg}')
        except urllib.error.URLError:
            if attempt < 4:
                time.sleep(2 ** attempt)
                continue
            raise


def list_voices(cred, lang_code):
    return call(cred, '/voices?languageCode=' + lang_code).get('voices', [])


def synth(cred, text, voice, lang_code):
    res = call(cred, '/text:synthesize', {
        'input': {'text': text},
        'voice': {'languageCode': lang_code, 'name': voice},
        # 속도는 앱에서 조절하므로 1.0으로 만든다
        'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': 1.0},
    })
    return base64.b64decode(res['audioContent'])


# ── 읽을 문장 만들기 (앱의 spokenRef와 같은 규칙) ──
def fnv1a(s):
    """앱(JS)과 같은 32비트 FNV-1a 해시 (UTF-8 바이트 기준)"""
    h = 0x811c9dc5
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xffffffff
    return format(h, '08x')


def fmt_verse_nums(verses, lang):
    out = []
    for seg in verses:
        s = str(seg['start'])
        if seg.get('end'):
            s += '-' + str(seg['end'])
        if seg.get('suffix'):
            s += seg['suffix'] if lang == 'ko' else ('a' if seg['suffix'] == '상' else 'b')
        out.append(s)
    return ','.join(out)


def spoken_ref(ref, lang, books):
    b = books.get(ref['book'])
    if lang != 'ko':
        name = (b.get(lang) or b['en']) if b else ref['book']
        return f"{name} {ref['chapter']}:{fmt_verse_nums(ref['verses'], lang)}".replace('-', '–')
    unit = '편' if ref['book'] == 'Ps' else '장'
    segs = [f"{seg['start']}절" + (f"에서 {seg['end']}절" if seg.get('end') else '') +
            (' ' + seg['suffix'] if seg.get('suffix') else '') for seg in ref['verses']]
    return f"{b['ko'] if b else ref['book']} {ref['chapter']}{unit} " + ', '.join(segs)


def ref_text(v, lang, books):
    if lang == 'ko':
        return f"{v['title']}. {spoken_ref(v['ref'], 'ko', books)}."
    return spoken_ref(v['ref'], lang, books) + '.'


# ── 메인 ───────────────────────────────────────────
def load_manifest():
    if os.path.exists(MANIFEST):
        return json.load(open(MANIFEST, encoding='utf-8'))
    return {'version': 1, 'translations': {}}


def save_manifest(m):
    os.makedirs(AUDIO_DIR, exist_ok=True)
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, separators=(',', ':'), sort_keys=True)


def main():
    ap = argparse.ArgumentParser(description='Google Cloud TTS로 구절 음성 파일 생성')
    ap.add_argument('--trans', nargs='+', default=['grg'], help='역본 id (기본: grg 개역개정)')
    ap.add_argument('--voice', help='음성 이름 (예: ko-KR-Wavenet-A). 역본 하나일 때만')
    ap.add_argument('--only', nargs='+', help='이 구절 id만')
    ap.add_argument('--limit', type=int, help='앞에서부터 N구절만')
    ap.add_argument('--force', action='store_true', help='바뀌지 않았어도 다시 만들기')
    ap.add_argument('--dry-run', action='store_true', help='API 호출 없이 만들 분량만 표시')
    ap.add_argument('--list-voices', metavar='LANG', help='음성 목록 (예: ko-KR)')
    ap.add_argument('--sample', action='store_true', help='음성별 비교 샘플 생성 → audio/_samples/')
    args = ap.parse_args()

    trans = json.load(open(os.path.join(ROOT, 'src/data/translations.json'), encoding='utf-8'))
    verses = json.load(open(os.path.join(ROOT, 'src/data/verses.json'), encoding='utf-8'))['verses']
    books = load_books()
    tmeta = {t['id']: t for t in trans['translations']}

    if args.list_voices:
        for v in sorted(list_voices(auth(), args.list_voices), key=lambda x: x['name']):
            print(f"{v['name']:32} {v.get('ssmlGender', '')}")
        return

    if args.sample:
        # 첫 구절을 한국어 음성 종류별로 만들어 들어보고 고를 수 있게
        cred = auth()
        v = verses[0]
        text = ref_text(v, 'ko', books) + ' ' + trans['texts']['grg'][v['id']]
        names = [x['name'] for x in list_voices(cred, 'ko-KR')
                 if any(k in x['name'] for k in ('Wavenet', 'Neural2', 'Chirp3-HD'))]
        out = os.path.join(AUDIO_DIR, '_samples')
        os.makedirs(out, exist_ok=True)
        for n in sorted(names):
            open(os.path.join(out, n + '.mp3'), 'wb').write(synth(cred, text, n, 'ko-KR'))
            print('✓', n)
        print(f'→ {out} (배포 전 이 폴더는 지우세요)')
        return

    if args.voice and len(args.trans) > 1:
        sys.exit('--voice는 역본을 하나만 지정했을 때 쓸 수 있습니다.')

    manifest = load_manifest()
    cred = None if args.dry_run else auth()
    total_chars = 0

    for tid in args.trans:
        if tid not in tmeta:
            sys.exit(f'알 수 없는 역본: {tid}')
        lang = tmeta[tid]['refLang']
        lang_code = LANG_CODE[lang]
        entry = manifest['translations'].setdefault(tid, {'voice': None, 'files': {}})
        voice = args.voice or entry.get('voice') or DEFAULT_VOICE.get(lang)
        if not voice and not args.dry_run:
            # 기본 음성이 없는 언어는 WaveNet 음성 중 첫 번째
            cand = sorted(x['name'] for x in list_voices(cred, lang_code) if 'Wavenet' in x['name'])
            if not cand:
                sys.exit(f'{lang_code} WaveNet 음성이 없습니다. --voice로 지정하세요.')
            voice = cand[0]
        voice_changed = bool(entry.get('voice')) and entry['voice'] != voice
        if voice_changed:
            print(f'※ {tid}: 음성이 {entry["voice"]} → {voice}로 바뀌어 전체를 다시 만듭니다')

        texts = trans['texts'][tid]
        todo = [v for v in verses if texts.get(v['id'])]
        if args.only:
            todo = [v for v in todo if v['id'] in args.only]
        if args.limit:
            todo = todo[:args.limit]

        work = []
        for v in todo:
            body = texts[v['id']]
            ref = ref_text(v, lang, books)
            old = entry['files'].get(v['id'], {})
            d = os.path.join(AUDIO_DIR, tid)
            need_body = (args.force or voice_changed or old.get('h') != fnv1a(body)
                         or not os.path.exists(os.path.join(d, v['id'] + '.mp3')))
            need_ref = (args.force or voice_changed or old.get('r') != fnv1a(ref)
                        or not os.path.exists(os.path.join(d, v['id'] + '.ref.mp3')))
            if need_body or need_ref:
                work.append((v, body, ref, need_body, need_ref))

        chars = sum((len(b) if nb else 0) + (len(r) if nr else 0) for _, b, r, nb, nr in work)
        total_chars += chars
        print(f'{tid} ({voice or "자동 선택"}): {len(work)}/{len(todo)}구절 생성 예정, {chars:,}자')
        if args.dry_run or not work:
            continue

        os.makedirs(os.path.join(AUDIO_DIR, tid), exist_ok=True)
        entry['voice'] = voice
        if voice_changed:
            entry['files'] = {}
        for i, (v, body, ref, nb, nr) in enumerate(work, 1):
            base = os.path.join(AUDIO_DIR, tid, v['id'])
            if nb:
                open(base + '.mp3', 'wb').write(synth(cred, body, voice, lang_code))
            if nr:
                open(base + '.ref.mp3', 'wb').write(synth(cred, ref, voice, lang_code))
            entry['files'][v['id']] = {'h': fnv1a(body), 'r': fnv1a(ref)}
            if i % 20 == 0 or i == len(work):
                save_manifest(manifest)   # 중간에 끊겨도 만든 것까지는 기록
                print(f'  {i}/{len(work)}')

    print(f'합계 {total_chars:,}자' + (' (dry-run: 호출하지 않음)' if args.dry_run else ''))


if __name__ == '__main__':
    main()
