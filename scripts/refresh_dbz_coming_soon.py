"""Build data/dbz-coming-soon.json from Funko shop + news about Dragon Ball Pops."""
from __future__ import annotations

import html as html_lib
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
UA = {
    "User-Agent": (
        "PokémonPopVault/1.0 (+https://github.com/BigDaddyDawg/PokemonPopVault; "
        "fan gallery refresh)"
    )
}
FUNKO_NEWS = "https://funko.com/gb/funko-blog/"
FUNKO_SHOP = "https://funko.com/gb/search?q=dragon+ball"
FUNKO_SHOP_POP = "https://funko.com/gb/search?q=dragon+ball+pop"
FUNKO_SEARCH = (
    "https://funko.com/on/demandware.store/Sites-FunkoEU-Site/en_GB/"
    "Search-UpdateGrid?q=dragon+ball&start=0&sz=48"
)
JINA_NEWS = "https://r.jina.ai/https://funko.com/gb/funko-blog/"

# Announced / pre-order waves tracked manually when shop copy is thin.
# Daima (2024–2025) and ongoing Super Hero / Broly-style drops are the main active lines.
UPCOMING_WAVES = [
    {
        "code": "DAIMA",
        "name": "Dragon Ball Daima Wave",
        "releaseDate": None,
        "type": "wave",
        "number": 1,
        "blurb": (
            "Funko has been rolling out Pop! figures from Dragon Ball Daima — "
            "watch for Gomah, Glorio, Panzy, and mini-form Goku/Vegeta variants."
        ),
        "productUrl": FUNKO_SHOP,
    },
    {
        "code": "DBS-MOVIE",
        "name": "Dragon Ball Super & Movie Exclusives",
        "releaseDate": None,
        "type": "wave",
        "number": 2,
        "blurb": (
            "Convention and retailer exclusives for Broly, Super Hero, and "
            "Battle of Gods characters continue to surface on the Funko shop."
        ),
        "productUrl": FUNKO_SHOP_POP,
    },
]

DBZ_NEWS_KEYWORDS = re.compile(
    r"dragon\s*ball|dbz|dbs|daima|goku|vegeta|broly|funko",
    re.I,
)


def uk_url(path_or_url: str | None) -> str:
    if not path_or_url:
        return FUNKO_SHOP
    raw = path_or_url.strip()
    if raw.startswith("http"):
        if "funko.com/gb/" in raw or "funko.com/gb?" in raw:
            return raw
        return raw.replace("https://funko.com/", "https://funko.com/gb/", 1).replace(
            "http://funko.com/", "https://funko.com/gb/", 1
        )
    if raw.startswith("/gb/") or raw.startswith("/gb?"):
        return "https://funko.com" + raw
    if raw.startswith("/"):
        return "https://funko.com/gb" + raw
    return FUNKO_SHOP


def fetch(url: str, browser: bool = False) -> str:
    headers = dict(UA)
    if browser:
        headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
        )
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return resp.read().decode("utf-8", "ignore")


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", html_lib.unescape(s or "")).strip()


def is_dbz_pop_name(name: str) -> bool:
    if DBZ_NEWS_KEYWORDS.search(name):
        return True
    return bool(re.search(r"\bpop\b", name, re.I) and re.search(r"goku|vegeta|gohan|frieza|broly|piccolo", name, re.I))


def parse_funko_preorders(html: str) -> list[dict]:
    reveals = []
    for m in re.finditer(
        r'<li[^>]*class="[^"]*product[^"]*"[^>]*data-pid="(?P<pid>[^"]+)"[^>]*>(.*?)</li>',
        html,
        re.I | re.S,
    ):
        block = m.group(0)
        blob = block.lower()
        alts = [
            clean(a)
            for a in re.findall(r'alt="([^"]+)"', block)
            if clean(a) and "hi-res" in a.lower()
        ]
        name = ""
        for a in alts:
            name = re.sub(r",\s*,?\s*hi-res view.*$", "", a, flags=re.I).strip(" ,")
            if name:
                break
        if not name or not re.search(r"\bpop\b", name, re.I):
            continue
        if not is_dbz_pop_name(name):
            continue
        imgs = [
            html_lib.unescape(u)
            for u in re.findall(
                r'(https://funko\.com/dw/image/[^"\s]+\.(?:png|jpg|jpeg|webp)[^"\s]*)',
                block,
                re.I,
            )
        ]

        def score(u: str) -> int:
            sm = re.search(r"[?&]sw=(\d+)", u)
            return int(sm.group(1)) if sm else 0

        imgs = sorted(set(imgs), key=score, reverse=True)
        if not imgs:
            continue
        thumb = imgs[0]
        full = re.sub(r"([?&]sw=)\d+", r"\g<1>800", thumb)
        full = re.sub(r"([?&]sh=)\d+", r"\g<1>800", full)
        is_soon = bool(
            re.search(r"pre-?order|coming soon|notify|backorder", blob, re.I)
        )
        href = re.search(
            r'href="((?:https://funko\.com)?/[^"]+\.html)"',
            block,
            re.I,
        )
        raw = re.sub(r"^Pop!\s*", "", name, flags=re.I).strip()
        version = ""
        pname = raw
        vm = re.match(r"^(.+?)\s*\((.+)\)\s*$", raw)
        if vm:
            pname, version = vm.group(1).strip(), vm.group(2).strip()
        reveals.append(
            {
                "id": f"funko-{m.group('pid')}",
                "fullName": name,
                "name": pname,
                "version": version or "Shop listing",
                "rarity": "Coming Soon" if is_soon else "New",
                "setCode": "SOON",
                "setName": "Coming Soon",
                "story": pname,
                "type": "Pop!",
                "color": "",
                "thumb": thumb,
                "full": full,
                "isExternalReveal": is_soon,
                "url": uk_url(href.group(1) if href else None),
            }
        )
    return reveals


def parse_news_markdown(md: str) -> list[dict]:
    items = []
    seen = set()
    lines = md.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r"^#+\s+(.+)$", line.strip())
        if not m:
            continue
        title = clean(re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", m.group(1)))
        if len(title) < 12 or len(title) > 140:
            continue
        if not DBZ_NEWS_KEYWORDS.search(title):
            if not re.search(r"new\s+release|coming\s+soon|pre-?order", title, re.I):
                continue
        key = title.lower()
        if key in seen:
            continue
        seen.add(key)
        summary = ""
        date = ""
        for j in range(i + 1, min(i + 8, len(lines))):
            nxt = lines[j].strip()
            if not date:
                dm = re.search(
                    r"((?:January|February|March|April|May|June|July|August|"
                    r"September|October|November|December)\s+\d{1,2},\s+\d{4})",
                    nxt,
                )
                if dm:
                    date = dm.group(1)
            if nxt and not nxt.startswith("#") and len(nxt) > 40 and not summary:
                summary = clean(re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", nxt))[:300]
        items.append(
            {
                "title": title,
                "date": date,
                "category": "News",
                "summary": summary,
                "url": FUNKO_NEWS,
                "image": None,
            }
        )
        if len(items) >= 12:
            break
    return items


def enrich_waves(reveals: list[dict]) -> list[dict]:
    waves = []
    for w in UPCOMING_WAVES:
        entry = dict(w)
        gallery = [
            r["full"] or r["thumb"]
            for r in reveals
            if r.get("full") or r.get("thumb")
        ][:6]
        if gallery:
            entry["gallery"] = gallery
            entry["heroImage"] = gallery[0]
            entry["revealedCount"] = len(gallery)
        else:
            entry["revealedCount"] = 0
        entry["hasAllCards"] = False
        waves.append(entry)
    return waves


def main() -> None:
    DATA.mkdir(exist_ok=True)
    reveals: list[dict] = []
    try:
        print("Fetching Funko Dragon Ball listings…")
        shop = fetch(FUNKO_SEARCH, browser=True)
        reveals = parse_funko_preorders(shop)
        print(f"  shop reveals: {len(reveals)}")
    except Exception as exc:  # noqa: BLE001
        print(f"  shop fetch failed: {exc}")

    if not reveals:
        cards_path = DATA / "dbz-cards.json"
        if cards_path.exists():
            catalog = json.loads(cards_path.read_text(encoding="utf-8"))
            newest = sorted(
                (c for c in catalog.get("cards", []) if c.get("number")),
                key=lambda c: c.get("number") or 0,
                reverse=True,
            )[:18]
            reveals = [
                {
                    **{k: c.get(k) for k in (
                        "id", "fullName", "name", "version", "rarity", "setCode",
                        "setName", "story", "type", "color", "thumb", "full",
                    )},
                    "isExternalReveal": True,
                    "rarity": "New",
                }
                for c in newest
            ]
            print(f"  fallback reveals from catalog: {len(reveals)}")

    news: list[dict] = []
    try:
        print("Fetching Funko blog via reader…")
        md = fetch(JINA_NEWS)
        news = parse_news_markdown(md)
        print(f"  news: {len(news)}")
    except Exception as exc:  # noqa: BLE001
        print(f"  news failed: {exc}")
        try:
            html = fetch(FUNKO_NEWS, browser=True)
            for m in re.finditer(r"<h[12][^>]*>(.*?)</h[12]>", html, re.I | re.S):
                title = clean(re.sub(r"<[^>]+>", "", m.group(1)))
                if len(title) > 16 and DBZ_NEWS_KEYWORDS.search(title):
                    news.append(
                        {
                            "title": title,
                            "date": "",
                            "category": "News",
                            "summary": "",
                            "url": FUNKO_NEWS,
                            "image": None,
                        }
                    )
                if len(news) >= 10:
                    break
        except Exception as exc2:  # noqa: BLE001
            print(f"  direct news failed: {exc2}")

    upcoming = enrich_waves(reveals)
    soon = [r for r in reveals if r.get("isExternalReveal")] or reveals[:18]

    out = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources": {
            "catalog": "PriceCharting Funko POP Animation + Funko.com Dragon Ball search",
            "news": FUNKO_NEWS,
            "shop": FUNKO_SHOP,
        },
        "upcomingSets": upcoming,
        "reveals": soon,
        "news": news,
    }
    path = DATA / "dbz-coming-soon.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {path} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
