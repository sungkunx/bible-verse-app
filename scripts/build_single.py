#!/usr/bin/env python3
"""
single/template.html + src/data/verses.json + src/data/books.js
→ single/암송카드.html (데이터가 내장된 단일 HTML 파일)

사용법: python3 scripts/build_single.py
"""
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_books():
    src = open(os.path.join(ROOT, 'src/data/books.js'), encoding='utf-8').read()
    m = re.search(r'export const BOOKS = (\{.*\})\s*$', src, re.S)
    obj = re.sub(r"([{,]\s*)([A-Za-z0-9]+)(\s*:)", r'\1"\2"\3', m.group(1)).replace("'", '"')
    obj = re.sub(r',(\s*[}\]])', r'\1', obj)
    return json.loads(obj)

def main():
    data = json.load(open(os.path.join(ROOT, 'src/data/verses.json'), encoding='utf-8'))
    books = load_books()
    tpl = open(os.path.join(ROOT, 'single/template.html'), encoding='utf-8').read()
    out = tpl.replace('/*__DATA_JSON__*/null', json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    out = out.replace('/*__BOOKS_JSON__*/null', json.dumps(books, ensure_ascii=False, separators=(',', ':')))
    # 1) 단일 파일 배포본  2) GitHub Pages용 루트 index.html (같은 내용)
    for dest in [os.path.join(ROOT, 'single/암송카드.html'), os.path.join(ROOT, 'index.html')]:
        open(dest, 'w', encoding='utf-8').write(out)
        print(f'✓ {dest} ({len(out) // 1024} KB, {len(data["verses"])}구절)')

if __name__ == '__main__':
    main()
