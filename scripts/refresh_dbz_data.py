"""Build data/dbz-cards.json — Dragon Ball Funko Pop catalog with images.

Sources:
- PriceCharting Funko POP Animation console (images + prices)
- Funko.com Demandware search (current shop listings / packshots)
"""
from __future__ import annotations

import html as html_lib
import json
import re
import time
import urllib.parse
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
PC_CONSOLE = "https://www.pricecharting.com/console/funko-pop-animation"
FUNKO_SEARCH = (
    "https://funko.com/on/demandware.store/Sites-FunkoUS-Site/default/"
    "Search-UpdateGrid?q=dragon+ball&start={start}&sz=48"
)

# Slug/title keyword fragments (case-insensitive substring match).
DBZ_KEYWORDS = (
    "goku",
    "vegeta",
    "gohan",
    "goten",
    "trunks",
    "piccolo",
    "frieza",
    "freezer",
    "freeza",
    "cell-",
    "broly",
    "beerus",
    "whis",
    "jiren",
    "buu",
    "majin",
    "krillin",
    "yamcha",
    "bulma",
    "nappa",
    "raditz",
    "zamasu",
    "goku-black",
    "hit-",
    "kale",
    "caulifla",
    "cooler",
    "janemba",
    "bardock",
    "videl",
    "chi-chi",
    "chichi",
    "roshi",
    "android-16",
    "android-17",
    "android-18",
    "ginyu",
    "dende",
    "champa",
    "toppo",
    "dyspo",
    "kefla",
    "ribrianne",
    "uub",
    "tien",
    "chiaotzu",
    "king-kai",
    "shenron",
    "shenlong",
    "dragon-ball",
    "dragonball",
    "ssgss",
    "saiyan",
    "gotenks",
    "vegito",
    "gogeta",
    "golden-frieza",
    "future-trunks",
    "flying-nimbus",
    "king-cold",
    "supreme-kai",
    "kibito",
    "master-roshi",
    "lunch",
    "puar",
    "oolong",
    "chi chi",
    "perfect-cell",
    "kid-buu",
    "fat-buu",
    "evil-majin",
    "fused-zamasu",
    "black-goku",
    "ssj",
    "super-saiyan",
    "galick",
    "kamehameha",
    "nimbus",
    "dr-arinsu",
    "arinsu",
    "glorio",
    "gomah",
    "panzy",
    "pan-",  # DB Pan (avoid bare "pan")
    "-pan-",
    "dbz",
    "dbs",
)

FALSE_POSITIVE_FRAGMENTS = (
    "groot",
    "rocket-raccoon",
    "rocket-raccoon",
    "aang",
    "korra",
    "naruto",
    "luffy",
    "one-piece",
    "bleach",
    "ichigo-kurosaki",
    "hunter-x-hunter",
    "my-hero-academia",
    "demogorgon",
    "marvel",
    "guardians-of-the-galaxy",
)

# Longest-match-first character → story filter name.
# Each entry: (display story name, slug/title match tokens)
CHARACTER_STORIES: list[tuple[str, tuple[str, ...]]] = [
    ("Goku Black", ("goku-black", "black-goku", "goku black")),
    ("Future Trunks", ("future-trunks", "future trunks")),
    ("Golden Frieza", ("golden-frieza", "golden frieza")),
    ("Perfect Cell", ("perfect-cell", "perfect cell")),
    ("Fused Zamasu", ("fused-zamasu", "fused zamasu")),
    ("Evil Majin Buu", ("evil-majin", "evil majin")),
    ("Kid Buu", ("kid-buu", "kid buu")),
    ("Fat Buu", ("fat-buu", "fat buu")),
    ("Super Buu", ("super-buu", "super buu")),
    ("Master Roshi", ("master-roshi", "master roshi")),
    ("Chi-Chi", ("chi-chi", "chichi", "chi chi")),
    ("Android 16", ("android-16", "android 16")),
    ("Android 17", ("android-17", "android 17")),
    ("Android 18", ("android-18", "android 18")),
    ("Supreme Kai", ("supreme-kai", "supreme kai")),
    ("King Kai", ("king-kai", "king kai")),
    ("King Cold", ("king-cold", "king cold")),
    ("Flying Nimbus", ("flying-nimbus", "flying nimbus")),
    ("Dr. Arinsu", ("dr-arinsu", "dr. arinsu", "arinsu")),
    ("Super Saiyan 4 Goku", ("ss4-goku", "super-saiyan-4-goku", "ss4 goku")),
    ("Super Saiyan Goku", ("super-saiyan-goku", "ssj-goku", "ssgss-goku")),
    ("Super Saiyan Vegeta", ("super-saiyan-vegeta", "ssj-vegeta", "ssgss-vegeta")),
    ("Super Saiyan Gohan", ("super-saiyan-gohan", "ssj-gohan")),
    ("Super Saiyan Trunks", ("super-saiyan-trunks", "ssj-trunks")),
    ("Super Saiyan Broly", ("super-saiyan-broly", "ssj-broly")),
    ("Gotenks", ("gotenks",)),
    ("Gogeta", ("gogeta",)),
    ("Vegito", ("vegito",)),
    ("Shenron", ("shenron", "shenlong")),
    ("Pan", ("pan-", "-pan-", " pan ", "pan ")),
    ("Glorio", ("glorio",)),
    ("Gomah", ("gomah",)),
    ("Panzy", ("panzy",)),
    ("Ribrianne", ("ribrianne",)),
    ("Kefla", ("kefla",)),
    ("Dyspo", ("dyspo",)),
    ("Toppo", ("toppo",)),
    ("Champa", ("champa",)),
    ("Dende", ("dende",)),
    ("Ginyu", ("ginyu", "ginyu-force", "ginyu force")),
    ("Janemba", ("janemba",)),
    ("Cooler", ("cooler",)),
    ("Caulifla", ("caulifla",)),
    ("Kale", ("kale-", "-kale", " kale ")),
    ("Hit", ("hit-", "-hit-", " hit ")),
    ("Zamasu", ("zamasu",)),
    ("Raditz", ("raditz",)),
    ("Nappa", ("nappa",)),
    ("Bulma", ("bulma",)),
    ("Yamcha", ("yamcha",)),
    ("Krillin", ("krillin",)),
    ("Majin Buu", ("majin-buu", "majin buu")),
    ("Buu", ("buu",)),
    ("Jiren", ("jiren",)),
    ("Whis", ("whis",)),
    ("Beerus", ("beerus",)),
    ("Broly", ("broly",)),
    ("Cell", ("cell-", "-cell", " cell ")),
    ("Frieza", ("frieza", "freezer", "freeza")),
    ("Piccolo", ("piccolo",)),
    ("Trunks", ("trunks",)),
    ("Goten", ("goten",)),
    ("Gohan", ("gohan",)),
    ("Vegeta", ("vegeta",)),
    ("Goku", ("goku",)),
    ("Bardock", ("bardock",)),
    ("Videl", ("videl",)),
    ("Uub", ("uub",)),
    ("Tien", ("tien",)),
    ("Chiaotzu", ("chiaotzu",)),
    ("Kibito", ("kibito",)),
    ("Lunch", (" lunch ", "lunch-", "-lunch", " launch ", "launch-", "launch ")),
    ("Puar", ("puar",)),
    ("Oolong", ("oolong",)),
]
CHARACTER_STORIES.sort(key=lambda x: max(len(t) for t in x[1]), reverse=True)


def fetch(url: str, data: bytes | None = None) -> str:
    req = urllib.request.Request(url, data=data, headers=UA, method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode("utf-8", "ignore")


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", html_lib.unescape(s or "")).strip()


def slugify(s: str) -> str:
    s = s.lower().replace("é", "e").replace(".", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def classify_type(version: str, title: str = "", slug: str = "", number: int | None = None) -> str:
    blob = f"{version} {title} {slug}".lower().replace("-", " ")
    if "18 inch" in blob:
        return "Super Jumbo"
    if "10 inch" in blob or "jumbo" in blob:
        return "Jumbo"
    if "bitty" in blob:
        return "Bitty Pop"
    if "moment" in blob or "deluxe" in blob:
        return "Pop! Moment"
    if "4 pack" in blob or "2 pack" in blob or "3 pack" in blob:
        return "Multi-Pack"
    return "Pop!"


def classify_rarity(version: str, exclusive: str, slug: str = "", number: int | None = None) -> str:
    blob = f"{version} {exclusive} {slug}".lower().replace("-", " ")
    for key, label in [
        ("flocked", "Flocked"),
        ("diamond", "Diamond"),
        ("pearlescent", "Pearlescent"),
        ("soft color", "Soft Color"),
        ("metallic", "Metallic"),
        ("silver metallic", "Metallic"),
        ("gitd", "Glow in the Dark"),
        ("glow in the dark", "Glow in the Dark"),
        ("glow", "Glow in the Dark"),
        ("chase", "Chase"),
    ]:
        if key in blob:
            return label
    if exclusive.strip():
        return "Exclusive"
    return "Shared"


def finish_key(card: dict) -> str:
    if "jumbo" in (card.get("type") or "").lower():
        return "Jumbo"
    rarity = card.get("rarity") or "Shared"
    if rarity in {"Shared", "Exclusive", "Chase"}:
        return "Standard"
    return rarity


def card_keep_score(card: dict) -> tuple:
    version = card.get("version") or ""
    slug = ""
    if card.get("url"):
        slug = card["url"].rsplit("/", 1)[-1]
    specific = 0
    if version and version != card.get("fullName") and not re.fullmatch(r".+#\d+", version):
        specific = 2
    if re.search(
        r"10 inch|flocked|diamond|metallic|pearlescent|soft color|nycc|sdcc|eccc|gitd|chase|special",
        f"{version} {slug}",
        re.I,
    ):
        specific += 3
    return (
        specific,
        1 if card.get("source") == "pricecharting" else 0,
        len(version),
        -(card.get("id") or 0),
    )


def set_code_for_type(pop_type: str) -> str:
    """Legacy form-factor codes — kept for reference; catalog uses franchise lines."""
    return {
        "Pop!": "STD",
        "Jumbo": "JUMBO",
        "Super Jumbo": "SUPERJ",
        "Bitty Pop": "BITTY",
        "Pop! Moment": "MOMENT",
        "Multi-Pack": "MULTI",
    }.get(pop_type, "STD")


LINE_ORDER = {
    "DB": 1,
    "Z": 2,
    "GT": 3,
    "SUPER": 4,
    "DAIMA": 5,
}

LINE_NAMES = {
    "DB": "Dragon Ball",
    "Z": "Dragon Ball Z",
    "GT": "Dragon Ball GT",
    "SUPER": "Dragon Ball Super",
    "DAIMA": "Dragon Ball Daima",
}

DAIMA_STORIES = {
    "Gomah",
    "Glorio",
    "Panzy",
    "Dr. Arinsu",
}

GT_STORIES = {
    "Super Saiyan 4 Goku",
}

SUPER_STORIES = {
    "Beerus",
    "Whis",
    "Champa",
    "Hit",
    "Jiren",
    "Zamasu",
    "Goku Black",
    "Fused Zamasu",
    "Kale",
    "Caulifla",
    "Kefla",
    "Golden Frieza",
    "Ribrianne",
    "Toppo",
    "Dyspo",
}

ORIG_STORIES = {
    "Master Roshi",
    "Oolong",
    "Lunch",
    "Flying Nimbus",
    "Puar",
}


def classify_line(
    *,
    story: str,
    name: str = "",
    version: str = "",
    full_name: str = "",
    slug: str = "",
    number: int | None = None,
) -> tuple[str, str]:
    """Return (setCode, setName) for anime franchise line."""
    blob = " ".join(
        [
            story or "",
            name or "",
            version or "",
            full_name or "",
            slug.replace("-", " ") if slug else "",
        ]
    ).lower()
    story_l = (story or "").strip()

    if story_l in DAIMA_STORIES or re.search(r"\bdaima\b|gomah|glorio|panzy|arinsu", blob):
        return "DAIMA", LINE_NAMES["DAIMA"]

    if story_l in GT_STORIES or re.search(
        r"super saiyan 4|ssj4|ss4\b|ss 4\b|\bgt\b|baby vegeta|syn shenron|omega shenron|\bgiru\b",
        blob,
    ):
        return "GT", LINE_NAMES["GT"]

    if story_l in SUPER_STORIES or re.search(
        r"ssgss|super saiyan god|ultra instinct|kaioken|kaio-ken|"
        r"\bbeerus\b|\bwhis\b|\bjiren\b|\bzamasu\b|goku black|"
        r"\bkale\b|caulifla|\bkefla\b|golden frieza|cell max|"
        r"\bchampa\b|dragon ball super|\bdbs\b|resurrection|"
        r"eating noodles|orange piccolo|gamma [12]",
        blob,
    ):
        return "SUPER", LINE_NAMES["SUPER"]

    # Super Broly movie wave (~1860s) and SSGSS Gogeta / Super God Vegeta
    if re.search(r"\bgogeta\b", blob) and not re.search(r"super saiyan 4|ssj4|ss4\b", blob):
        if number is None or number >= 1800 or "ssgss" in blob or "super saiyan god" in blob:
            return "SUPER", LINE_NAMES["SUPER"]
    if story_l in {"Broly", "Super Saiyan Broly"} and number is not None and number >= 1800:
        return "SUPER", LINE_NAMES["SUPER"]
    if story_l == "Vegito" and re.search(r"ssgss|super saiyan god", blob):
        return "SUPER", LINE_NAMES["SUPER"]

    if story_l in ORIG_STORIES or re.search(
        r"flying nimbus|master roshi|\boolong\b|\bpular\b|\bpilar\b|"
        r"\blunch\b|\blaunch\b|kid goku|young goku|emperor pilaf",
        blob,
    ):
        # Don't let BoxLunch exclusives land in OG
        if "boxlunch" in blob.replace(" ", "") or "box lunch" in blob:
            if story_l != "Lunch":
                pass
            elif not re.search(r"(?<![a-z])lunch(?![a-z])", name.lower() if name else ""):
                return "Z", LINE_NAMES["Z"]
        else:
            return "DB", LINE_NAMES["DB"]

    return "Z", LINE_NAMES["Z"]


def set_code_for(pop_type: str) -> str:
    return set_code_for_type(pop_type)


def set_name_for(code: str) -> str:
    if code in LINE_NAMES:
        return LINE_NAMES[code]
    return {
        "STD": "Pop! Dragon Ball",
        "JUMBO": "Pop! Jumbo",
        "SUPERJ": "Pop! Super Jumbo",
        "SUPER": "Dragon Ball Super",
        "BITTY": "Bitty Pop!",
        "MOMENT": "Pop! Moment",
        "MULTI": "Multi-Packs",
    }.get(code, "Dragon Ball Z")


def is_non_db_intruder(card: dict) -> bool:
    """Drop BoxLunch / cross-franchise bleed that keyword-matched 'lunch' etc."""
    blob = f"{card.get('fullName','')} {card.get('name','')} {card.get('version','')}".lower()
    if re.search(
        r"tiny rick|kirishima|todoroki|tuxedosam|blue-?eyes white dragon|"
        r"my hero|one piece|naruto|aang|groot",
        blob,
    ):
        return True
    # BoxLunch exclusives that aren't DB Lunch/Launch
    if "boxlunch" in blob.replace(" ", "") or "box lunch" in blob:
        if (card.get("story") or "") == "Lunch" and not re.search(
            r"(?<![a-z])(?:lunch|launch)(?![a-z])", (card.get("name") or "").lower()
        ):
            return True
    return False


def parse_money(text: str) -> float | None:
    if not text:
        return None
    m = re.search(r"([0-9]+(?:\.[0-9]+)?)", text.replace(",", ""))
    if not m:
        return None
    try:
        return round(float(m.group(1)), 2)
    except ValueError:
        return None


def parse_pc_rows(html: str) -> list[dict]:
    rows = []
    for m in re.finditer(
        r'<tr id="product-(?P<id>\d+)"[^>]*>.*?</tr>',
        html,
        re.I | re.S,
    ):
        block = m.group(0)
        href = re.search(
            r'href="(?:https://www\.pricecharting\.com)?(/game/funko-pop-animation/[^"]+)"',
            block,
        )
        title_a = re.search(r'class="title"[^>]*>\s*<a[^>]*>([^<]+)</a>', block, re.I | re.S)
        if not title_a:
            title_a = re.search(r'/game/funko-pop-animation/[^"]+">([^<]+)</a>', block)
        img = re.search(
            r'src="(https://storage\.googleapis\.com/images\.pricecharting\.com/[^"]+)"',
            block,
        )
        if not href or not title_a:
            continue
        slug = href.group(1).split("/")[-1]
        slug = urllib.parse.unquote(slug)
        num_m = re.search(r"-(\d+)$", slug)
        number = int(num_m.group(1)) if num_m else None
        title = clean(title_a.group(1))
        thumb = img.group(1) if img else None
        full = None
        if thumb:
            full = re.sub(r"/\d+\.jpg", "/1600.jpg", thumb)
            thumb = re.sub(r"/\d+\.jpg", "/240.jpg", thumb)

        def col_price(cls: str) -> float | None:
            cm = re.search(
                rf'class="[^"]*\b{re.escape(cls)}\b[^"]*"[^>]*>.*?<span class="js-price">([^<]*)</span>',
                block,
                re.I | re.S,
            )
            return parse_money(cm.group(1)) if cm else None

        used = col_price("funko_used_price")
        cib = col_price("cib_price")
        new = col_price("funko_new_price")
        market_usd = next((p for p in (cib, new, used) if p is not None), None)

        rows.append(
            {
                "pcId": m.group("id"),
                "slug": slug,
                "title": title,
                "number": number,
                "thumb": thumb,
                "full": full,
                "url": "https://www.pricecharting.com" + href.group(1),
                "priceUsd": market_usd,
                "priceUsdUsed": used,
                "priceUsdCib": cib,
                "priceUsdNew": new,
            }
        )
    return rows


def fetch_usd_gbp_rate() -> float:
    try:
        raw = fetch("https://api.frankfurter.app/latest?from=USD&to=GBP")
        data = json.loads(raw)
        rate = float(data["rates"]["GBP"])
        if 0.5 < rate < 1.5:
            return rate
    except Exception as exc:  # noqa: BLE001
        print(f"  FX rate fallback ({exc})")
    return 0.79


def usd_to_gbp(usd: float | None, rate: float) -> float | None:
    if usd is None:
        return None
    return round(usd * rate, 2)


def scrape_pricecharting() -> list[dict]:
    print("Scraping PriceCharting Funko POP Animation…")
    all_rows: list[dict] = []
    seen_ids: set[str] = set()
    html = fetch(PC_CONSOLE + "?sort=name")
    cursor = 0
    while True:
        rows = parse_pc_rows(html)
        new = 0
        for r in rows:
            if r["pcId"] in seen_ids:
                continue
            seen_ids.add(r["pcId"])
            all_rows.append(r)
            new += 1
        print(f"  cursor {cursor}: +{new} (total {len(all_rows)})")
        cur_m = re.search(
            r'<form[^>]*class="[^"]*js-next-page[^"]*"[^>]*>.*?<input[^>]*name="cursor"[^>]*value="(\d+)"',
            html,
            re.I | re.S,
        )
        if not cur_m or new == 0:
            break
        next_cursor = cur_m.group(1)
        if next_cursor == str(cursor):
            break
        cursor = int(next_cursor)
        body = urllib.parse.urlencode({"sort": "name", "cursor": cursor}).encode()
        time.sleep(0.35)
        try:
            html = fetch(PC_CONSOLE, data=body)
        except Exception as exc:  # noqa: BLE001
            print(f"  stop at cursor {cursor}: {exc}")
            break
        if cursor > 5000:
            break
    return all_rows


def parse_funko_tiles(html: str) -> list[dict]:
    items = []
    for m in re.finditer(
        r'<li[^>]*class="[^"]*product[^"]*"[^>]*data-pid="(?P<pid>[^"]+)"[^>]*>(.*?)</li>',
        html,
        re.I | re.S,
    ):
        block = m.group(0)
        pid = m.group("pid")
        alts = [
            clean(a)
            for a in re.findall(r'alt="([^"]+)"', block)
            if clean(a) and clean(a).lower() not in {"product", "image"}
        ]
        name = ""
        for a in alts:
            name = re.sub(r",\s*,?\s*hi-res view.*$", "", a, flags=re.I).strip(" ,")
            if name:
                break
        href = re.search(r'href="(/[^"]+\.html)"', block)
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
        if not name or not imgs:
            continue
        if not re.search(r"\bpop\b", name, re.I):
            continue
        thumb = imgs[0]
        full = re.sub(r"([?&]sw=)\d+", r"\g<1>800", thumb)
        full = re.sub(r"([?&]sh=)\d+", r"\g<1>800", full)
        items.append(
            {
                "pid": pid,
                "name": name,
                "url": ("https://funko.com" + href.group(1)) if href else None,
                "thumb": thumb,
                "full": full,
            }
        )
    seen = set()
    out = []
    for it in items:
        if it["pid"] in seen:
            continue
        seen.add(it["pid"])
        out.append(it)
    return out


def scrape_funko() -> list[dict]:
    print("Scraping Funko.com Dragon Ball search…")
    all_items: list[dict] = []
    browser_ua = {
        **UA,
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    for start in range(0, 400, 48):
        try:
            req = urllib.request.Request(
                FUNKO_SEARCH.format(start=start), headers=browser_ua
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                html = resp.read().decode("utf-8", "ignore")
        except Exception as exc:  # noqa: BLE001
            print(f"  funko fetch failed at {start}: {exc}")
            break
        items = parse_funko_tiles(html)
        print(f"  start {start}: {len(items)}")
        if not items:
            break
        all_items.extend(items)
        if len(items) < 8:
            break
        time.sleep(0.25)
    seen = set()
    out = []
    for it in all_items:
        if it["pid"] in seen:
            continue
        seen.add(it["pid"])
        out.append(it)
    print(f"  funko pops: {len(out)}")
    return out


def is_false_positive(slug: str, title: str) -> bool:
    blob = f"{slug} {slugify(title)}".lower()
    if any(fp in blob for fp in FALSE_POSITIVE_FRAGMENTS):
        return True
    # Ichigo only when clearly Bleach, not a DB homonym
    if "ichigo" in blob and not any(
        k in blob for k in ("goku", "vegeta", "dragon-ball", "dragonball", "dbz", "dbs")
    ):
        return True
    return False


def matches_dbz_keyword(slug: str, title: str) -> bool:
    slug_l = slug.lower()
    title_l = title.lower()
    title_slug = slugify(title)
    blob = f"{slug_l} {title_l} {title_slug}"
    for kw in DBZ_KEYWORDS:
        if kw.endswith("-") or kw.startswith("-"):
            if kw in slug_l or kw in title_slug:
                return True
        elif kw == "pan-":
            if re.search(r"(?:^|-)pan(?:-|$)", slug_l) or re.search(r"\bpan\b", title_l):
                if "panzy" not in blob:
                    return True
        elif kw in ("dbz", "dbs"):
            if re.search(rf"\b{kw}\b", blob):
                return True
        elif kw in blob:
            return True
    if "dragon ball" in title_l or "dragonball" in title_l:
        return True
    return False


def is_dbz_row(row: dict) -> bool:
    slug = row.get("slug") or ""
    title = row.get("title") or ""
    if is_false_positive(slug, title):
        return False
    return matches_dbz_keyword(slug, title)


def extract_story(slug: str, title: str) -> str:
    blob = f"{slug.lower()} {title.lower()} {slugify(title)}"
    for story_name, tokens in CHARACTER_STORIES:
        for tok in tokens:
            if tok.endswith("-") or tok.startswith("-"):
                if tok in blob:
                    return story_name
            elif tok.strip() and tok in blob:
                return story_name
    if "dragon ball" in title.lower():
        return "Dragon Ball"
    return "Dragon Ball"


def parse_title_fields(title: str, slug: str) -> tuple[str, str, str]:
    """Return (display name, version, exclusive hint from brackets)."""
    base = re.sub(r"\s*#\d+\s*$", "", title).strip()
    base = re.sub(r"^Pop!\s*", "", base, flags=re.I).strip()
    version = ""
    name = base
    exclusive = ""

    bm = re.match(r"^(.+?)\s*\[(.+)\]\s*$", base)
    if bm:
        name, version = bm.group(1).strip(), bm.group(2).strip()
        exclusive = version
    else:
        vm = re.match(r"^(.+?)\s*\((.+)\)\s*$", base)
        if vm:
            name, version = vm.group(1).strip(), vm.group(2).strip()
            if re.search(r"exclusive|only at|hot topic|gamestop|funko shop|walmart|target", version, re.I):
                exclusive = version

    # Slug-derived finish labels when title is plain
    slug_l = slug.lower()
    slug_finishes = []
    for label, pat in [
        ("Flocked", r"flocked"),
        ("Metallic", r"metallic"),
        ("Diamond", r"diamond"),
        ("Glow in the Dark", r"gitd|glow"),
        ("Chase", r"chase"),
        ("10 inch", r"10-inch|10-inch"),
        ("ECCC", r"eccc"),
        ("NYCC", r"nycc"),
        ("SDCC", r"sdcc"),
    ]:
        if re.search(pat, slug_l):
            slug_finishes.append(label)
    if slug_finishes and not version:
        version = " ".join(slug_finishes)

    return name.strip() or base, version, exclusive


def build_cards(pc_rows: list[dict], funko_rows: list[dict]) -> list[dict]:
    cards = []
    seen_keys: set[str] = set()

    for row in pc_rows:
        if not is_dbz_row(row):
            continue
        if not row.get("thumb"):
            continue
        slug = row.get("slug") or ""
        name, version, exclusive = parse_title_fields(row["title"], slug)
        story = extract_story(slug, row["title"])
        number = row["number"]
        pop_type = classify_type(version, row["title"], slug, number)
        rarity = classify_rarity(version, exclusive, slug, number)
        if exclusive and version == exclusive:
            version = ""
        display_version = version or exclusive or ""
        if rarity in {"Flocked", "Diamond", "Metallic", "Pearlescent", "Soft Color", "Glow in the Dark", "Chase"}:
            if not display_version or display_version == exclusive:
                display_version = rarity if not display_version else f"{display_version} {rarity}".strip()
        if pop_type in {"Jumbo", "Super Jumbo"} and "inch" not in display_version.lower():
            display_version = ("18 inch" if pop_type == "Super Jumbo" else "10 inch") + (
                f" {display_version}" if display_version else ""
            )
            display_version = display_version.strip()
        full_name = f"{name}{f' ({display_version})' if display_version else ''}"
        if number:
            full_name = f"{full_name} #{number}"
        sc, sn = classify_line(
            story=story,
            name=name,
            version=display_version,
            full_name=full_name,
            slug=slug,
            number=number,
        )
        key = slugify(f"{number}-{name}-{display_version}-{rarity}-{pop_type}")
        if key in seen_keys:
            continue
        seen_keys.add(key)
        draft = {
                "id": int(row["pcId"]),
                "fullName": full_name,
                "name": name,
                "version": display_version or full_name,
                "rarity": rarity,
                "setCode": sc,
                "setName": sn,
                "story": story,
                "type": pop_type,
                "color": exclusive or "Common retail",
                "thumb": row["thumb"],
                "full": row["full"] or row["thumb"],
                "number": number,
                "source": "pricecharting",
                "url": row["url"],
                "priceUsd": row.get("priceUsd"),
                "priceGbp": row.get("priceGbp"),
            }
        if is_non_db_intruder(draft):
            continue
        cards.append(draft)

    for fr in funko_rows:
        raw = fr["name"]
        if not re.search(r"dragon\s*ball|dbz|dbs", raw, re.I):
            if not is_dbz_row({"slug": slugify(raw), "title": raw}):
                continue
        raw_clean = re.sub(r"^Pop!\s*", "", raw, flags=re.I).strip()
        version = ""
        name = raw_clean
        vm = re.match(r"^(.+?)\s*\((.+)\)\s*$", raw_clean)
        if vm:
            name, version = vm.group(1).strip(), vm.group(2).strip()
        slug = slugify(raw_clean)
        story = extract_story(slug, raw_clean)
        pop_type = classify_type(version, fr["name"], slug, number=None)
        rarity = classify_rarity(version, "", fr.get("name") or "", None)
        name_s = slugify(name)
        ver_s = slugify(version)
        already = [c for c in cards if slugify(c["name"]) == name_s]
        if already:
            if not ver_s:
                continue
            if any(
                ver_s in slugify(c.get("version") or "")
                or ver_s in slugify(c.get("rarity") or "")
                or slugify(c.get("rarity") or "") == slugify(rarity)
                for c in already
            ):
                continue
        cid = abs(hash(fr["pid"])) % (10**9)
        draft = {
                "id": cid,
                "fullName": fr["name"],
                "name": name,
                "version": version or fr["name"],
                "rarity": rarity,
                "setCode": "Z",
                "setName": LINE_NAMES["Z"],
                "story": story,
                "type": pop_type,
                "color": "Funko Shop",
                "thumb": fr["thumb"],
                "full": fr["full"],
                "number": None,
                "source": "funko",
                "url": fr.get("url"),
            }
        sc, sn = classify_line(
            story=story,
            name=name,
            version=version,
            full_name=fr["name"],
            slug=slug,
            number=None,
        )
        draft["setCode"] = sc
        draft["setName"] = sn
        if is_non_db_intruder(draft):
            continue
        cards.append(draft)

    cards = dedupe_cards(cards)

    def sort_key(c: dict):
        n = c.get("number")
        return (n is None, n or 99999, c.get("name") or "", c.get("version") or "")

    cards.sort(key=sort_key)
    return cards


def dedupe_cards(cards: list[dict]) -> list[dict]:
    best: dict[tuple, dict] = {}
    numberless: list[dict] = []
    for c in cards:
        number = c.get("number")
        if number is None:
            numberless.append(c)
            continue
        key = (number, slugify(c.get("name") or ""), finish_key(c))
        prev = best.get(key)
        if prev is None or card_keep_score(c) > card_keep_score(prev):
            best[key] = c

    out = list(best.values())
    existing = {(slugify(c.get("name") or ""), finish_key(c)) for c in out}
    for c in numberless:
        key = (slugify(c.get("name") or ""), finish_key(c))
        if key in existing:
            continue
        out.append(c)
        existing.add(key)
    return out


def write_catalog(cards: list[dict]) -> Path:
    cards = [c for c in cards if not is_non_db_intruder(c)]
    cards = [
        c
        for c in cards
        if not re.search(
            r"metallic",
            f"{c.get('rarity','')} {c.get('version','')} {c.get('fullName','')} {c.get('name','')} {c.get('color','')}",
            re.I,
        )
    ]
    cards = [
        c
        for c in cards
        if not re.search(
            r"\bbitty\b|\bkeychain\b|\bpocket pop\b|\(\s*mini\s*\)|(?<![a-z])mini(?![a-z])",
            f"{c.get('type','')} {c.get('version','')} {c.get('fullName','')} {c.get('name','')}",
            re.I,
        )
    ]
    for c in cards:
        sc, sn = classify_line(
            story=c.get("story") or "",
            name=c.get("name") or "",
            version=c.get("version") or "",
            full_name=c.get("fullName") or "",
            slug=slugify(c.get("url") or c.get("fullName") or ""),
            number=c.get("number"),
        )
        c["setCode"] = sc
        c["setName"] = sn

    def sort_key(c: dict):
        line_n = LINE_ORDER.get(c.get("setCode") or "", 9)
        n = c.get("number")
        return (line_n, n is None, n or 99999, c.get("name") or "", c.get("version") or "")

    cards.sort(key=sort_key)

    sets_map = {}
    for c in cards:
        code = c["setCode"]
        sets_map[code] = {
            "code": code,
            "name": c["setName"],
            "releaseDate": None,
            "type": "series",
            "number": LINE_ORDER.get(code, 9),
        }

    rarities_order = [
        "Shared",
        "Exclusive",
        "Chase",
        "Flocked",
        "Diamond",
        "Pearlescent",
        "Soft Color",
        "Glow in the Dark",
    ]
    present = {c["rarity"] for c in cards}
    rarities = [r for r in rarities_order if r in present] + sorted(
        present - set(rarities_order)
    )

    out = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(cards),
        "sets": sorted(sets_map.values(), key=lambda s: s["number"]),
        "rarities": rarities,
        "stories": sorted({c["story"] for c in cards if c["story"]}),
        "cards": cards,
        "sources": {
            "pricecharting": "PriceCharting Funko POP Animation console",
            "funko": "Funko.com Dragon Ball search",
            "images": "PriceCharting + Funko.com",
            "series": "Franchise line: Dragon Ball / Z / GT / Super / Daima",
        },
    }
    path = DATA / "dbz-cards.json"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {path} ({path.stat().st_size:,} bytes, {out['count']} pops)")
    from collections import Counter

    print("series", Counter(c["setCode"] for c in cards))
    return path


def reclassify_existing() -> None:
    path = DATA / "dbz-cards.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    write_catalog(list(data.get("cards") or []))


def main() -> None:
    import sys

    if "--reclassify" in sys.argv:
        reclassify_existing()
        return

    DATA.mkdir(exist_ok=True)
    pc_rows = scrape_pricecharting()
    rate = fetch_usd_gbp_rate()
    print(f"USD->GBP rate: {rate}")
    for row in pc_rows:
        row["priceGbp"] = usd_to_gbp(row.get("priceUsd"), rate)
    funko_rows = scrape_funko()
    cards = build_cards(pc_rows, funko_rows)
    write_catalog(cards)


if __name__ == "__main__":
    main()
