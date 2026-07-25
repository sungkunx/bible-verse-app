#!/usr/bin/env python3
"""
verses.json (구버전) → 정규화된 데이터로 변환
- 계층: collection → section(선택) → subsection(선택)
- 구절 참조(book/chapter/verses)를 정식 데이터로 분리 (나중에 성경 DB 연동용)
- 본문 텍스트는 texts 필드에 언어별로 보관 (textProvider가 사용)
"""
import json, re, sys, os

SRC = sys.argv[1] if len(sys.argv) > 1 else "../bible-old/bible-verse-app-main/src/verses.json"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "verses.json")

# 책 이름 → 표준 id (OSIS 스타일). 앱의 books.js와 id가 일치해야 함.
BOOK_ALIASES = {
    "창": "Gen", "출": "Exod", "레": "Lev", "민": "Num", "신": "Deut",
    "수": "Josh", "삼상": "1Sam", "사무엘상": "1Sam", "삼하": "2Sam",
    "대상": "1Chr", "대하": "2Chr", "스": "Ezra", "느": "Neh",
    "욥": "Job", "시": "Ps", "시편": "Ps", "잠": "Prov", "잠언": "Prov",
    "전": "Eccl", "사": "Isa", "렘": "Jer", "애": "Lam", "단": "Dan",
    "욘": "Jonah", "말": "Mal", "합": "Hab",
    "마": "Matt", "마태복음": "Matt", "막": "Mark", "마가복음": "Mark",
    "눅": "Luke", "누가복음": "Luke", "요": "John", "요한복음": "John",
    "행": "Acts", "롬": "Rom", "로마서": "Rom",
    "고전": "1Cor", "고린도전서": "1Cor", "고후": "2Cor", "고린도후서": "2Cor",
    "갈": "Gal", "갈라디아서": "Gal", "엡": "Eph", "에베소서": "Eph",
    "빌": "Phil", "빌립보서": "Phil", "골": "Col", "골로세서": "Col",
    "살전": "1Thess", "데살로니가전서": "1Thess", "살후": "2Thess", "데살로니가후서": "2Thess",
    "딤전": "1Tim", "딤후": "2Tim", "디모데후서": "2Tim", "딛": "Titus",
    "히": "Heb", "히브리서": "Heb", "약": "Jas",
    "벧전": "1Pet", "베드로전서": "1Pet", "벧후": "2Pet",
    "요일": "1John", "요한일서": "1John", "계": "Rev",
}

COLLECTIONS = [
    {
        "id": "assurance", "name": "그리스도인의 확신", "shortName": "확신",
        "match": "그리스도인의 확신", "color": "#C0392B",
        "flatten": True,  # category == subcategory 중복 → 섹션 없음
    },
    {
        "id": "living", "name": "그리스도인의 생활지침", "shortName": "생활지침",
        "match": "그리스도인의 생활지침", "color": "#B08D2B",
        "flatten": True,
    },
    {
        "id": "tms60", "name": "주제별 성경암송 60구절", "shortName": "60구절",
        "match": "주제별 성경암송(60구절)", "color": "#1E8E5A",
        "flatten": False,
    },
    {
        "id": "tms180", "name": "주제별 성경암송 180구절", "shortName": "180구절",
        "match": "주제별 성경암송(180구절)", "color": "#2563AE",
        "flatten": False,
    },
    {
        "id": "dep242", "name": "DEP 242", "shortName": "DEP 242",
        "match": "DEP 242", "color": "#6B4FA0",
        "flatten": False,
    },
]

def slugify_section(label, idx):
    # "A - 새로운삶" → "A", "1. 구원의 확신" → "1", "series 1. ..." → "s1"
    m = re.match(r"^\s*([A-Za-z])\s*-", label)
    if m: return m.group(1)
    m = re.match(r"^\s*series\s*(\d+)", label, re.I)
    if m: return "s" + m.group(1)
    m = re.match(r"^\s*(\d+)\s*\.", label)
    if m: return m.group(1)
    return str(idx + 1)

def clean_section_title(label):
    # 표시용: "A - 새로운삶" → "새로운삶" 등 접두부 정리하되 원문 유지 필드도 따로 둠
    return re.sub(r"\s+", " ", label).strip()

def parse_verse2(v2):
    """verse2: '' / ' ' / '12' / '38상' → (num or None, suffix)"""
    v2 = (v2 or "").strip() if isinstance(v2, str) else str(v2)
    if not v2:
        return None, ""
    m = re.match(r"^(\d+)\s*([상하]?)$", v2)
    if not m:
        return None, ""
    return int(m.group(1)), m.group(2)

def strip_leading_number(title):
    # "1. 구원의 확신" / "1.예수님의 신성" → "구원의 확신"
    return re.sub(r"^\s*\d+\s*[.)]\s*", "", title).strip()

def main():
    with open(SRC, encoding="utf-8") as f:
        raw = json.load(f)

    warnings = []
    out_collections = []
    out_verses = []

    for col in COLLECTIONS:
        rows = [r for r in raw if r["category"] == col["match"]]
        col_out = {
            "id": col["id"], "name": col["name"], "shortName": col["shortName"],
            "color": col["color"], "sections": [], "verseCount": len(rows),
        }
        sections = []  # 순서 유지
        for r in rows:
            sec_label = "" if col["flatten"] else r["subcategory"].strip()
            sub_label = (r.get("subsubcategory") or "").strip()
            if sec_label and sec_label not in [s["label"] for s in sections]:
                sections.append({"label": sec_label, "subsections": []})
            if sec_label and sub_label:
                sec = next(s for s in sections if s["label"] == sec_label)
                if sub_label not in sec["subsections"]:
                    sec["subsections"].append(sub_label)

        sec_meta = {}
        for i, s in enumerate(sections):
            sid = slugify_section(s["label"], i)
            sub_meta = {}
            for j, sub in enumerate(s["subsections"]):
                sub_meta[sub] = {"id": f"{sid}-{j+1}", "name": clean_section_title(sub)}
            sec_meta[s["label"]] = {"id": sid, "name": clean_section_title(s["label"]),
                                    "subs": sub_meta}
            col_out["sections"].append({
                "id": sid, "name": clean_section_title(s["label"]),
                "subsections": [sub_meta[sub] | {} for sub in s["subsections"]],
            })

        # 구절 변환
        counters = {}
        for r in rows:
            sec_label = "" if col["flatten"] else r["subcategory"].strip()
            sub_label = (r.get("subsubcategory") or "").strip()
            sec = sec_meta.get(sec_label)
            sub = sec["subs"].get(sub_label) if (sec and sub_label) else None

            book_raw = r["book"].strip()
            book_id = BOOK_ALIASES.get(book_raw)
            if not book_id:
                warnings.append(f"알 수 없는 책 이름: {book_raw!r} ({r['versename']})")
                continue

            v2, suffix = parse_verse2(r["verse2"])
            verses = [{"start": r["verse1"]}]
            if v2 is not None:
                if v2 == r["verse1"] + 1 and not suffix:
                    verses = [{"start": r["verse1"], "end": v2}]
                else:
                    seg = {"start": v2}
                    if suffix: seg["suffix"] = suffix
                    verses.append(seg)

            group_key = (col["id"], sec["id"] if sec else "", sub["id"] if sub else "")
            counters[group_key] = counters.get(group_key, 0) + 1
            ordinal = counters[group_key]
            if r["number"] != ordinal and r["number"] != len([x for x in rows if x is r]) :
                pass  # 원본 number는 그대로 보존, ordinal은 그룹 내 순번

            vid = "-".join(x for x in [col["id"], sec["id"] if sec else None,
                                       sub["id"].split("-")[-1] if sub else None,
                                       str(r["number"])] if x)
            # 카드 코드: 60구절 → "D-2", DEP → "3-2-5" 등
            code_parts = [p for p in [sec["id"] if sec else None,
                                      sub["id"].split("-")[-1] if sub else None,
                                      str(r["number"])] if p]
            code = "-".join(code_parts) if code_parts else str(r["number"])

            out_verses.append({
                "id": vid,
                "collectionId": col["id"],
                "sectionId": sec["id"] if sec else None,
                "subsectionId": sub["id"] if sub else None,
                "number": r["number"],
                "code": code,
                "title": strip_leading_number(r["versename"]),
                "ref": {"book": book_id, "chapter": r["chapter"], "verses": verses},
                "texts": {
                    "ko": re.sub(r"\s+", " ", r["koreanText"]).strip(),
                    "en": re.sub(r"\s+", " ", r["englishText"]).strip() or None,
                },
            })
        out_collections.append(col_out)

    # id 중복 검사
    ids = [v["id"] for v in out_verses]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        warnings.append(f"중복 id: {sorted(dupes)[:10]}")

    result = {"collections": out_collections, "verses": out_verses}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    print(f"✓ {len(out_verses)}구절 변환 완료 → {os.path.relpath(OUT)}")
    for c in out_collections:
        n = len([v for v in out_verses if v['collectionId'] == c['id']])
        print(f"  {c['name']}: {n}구절, 섹션 {len(c['sections'])}개")
    if warnings:
        print("\n경고:")
        for w in warnings: print(" -", w)

if __name__ == "__main__":
    main()
