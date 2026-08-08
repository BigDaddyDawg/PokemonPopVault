"""Build data/cards.json — every Pop! Pokémon we can resolve with images.

Sources:
- Pop Shop Guide-style checklist (scripts/pokemon_checklist.py)
- PriceCharting Funko POP Games console (images + confirmation)
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

from pokemon_checklist import CHECKLIST

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
UA = {
    "User-Agent": (
        "PokémonPopVault/1.0 (+https://github.com/BigDaddyDawg/PokemonPopVault; "
        "fan gallery refresh)"
    )
}
PC_CONSOLE = "https://www.pricecharting.com/console/funko-pop-games"
FUNKO_SEARCH = (
    "https://funko.com/on/demandware.store/Sites-FunkoUS-Site/default/"
    "Search-UpdateGrid?q=pokemon&start={start}&sz=48"
)


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


def checklist_jumbo_numbers() -> set[int]:
    nums: set[int] = set()
    for number, _name, version, _exclusive in CHECKLIST:
        if number and re.search(r"10\s*inch|18\s*inch|jumbo", version or "", re.I):
            nums.add(number)
    return nums


def checklist_pearlescent_numbers() -> set[int]:
    return {
        number
        for number, _name, version, _exclusive in CHECKLIST
        if number and re.search(r"pearlescent", version or "", re.I)
    }


JUMBO_NUMBERS = checklist_jumbo_numbers()
PEARLESCENT_NUMBERS = checklist_pearlescent_numbers()


def classify_type(version: str, title: str = "", slug: str = "", number: int | None = None) -> str:
    blob = f"{version} {title} {slug}".lower().replace("-", " ")
    if number == 951 or "18 inch" in blob:
        return "Super Jumbo"
    if number in JUMBO_NUMBERS or "10 inch" in blob or "jumbo" in blob:
        return "Jumbo"
    if "bitty" in blob:
        return "Bitty Pop"
    if "moment" in blob or "deluxe" in blob:
        return "Pop! Moment"
    if "4 pack" in blob:
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
    ]:
        if key in blob:
            return label
    # Pokémon Center exclusives in this line are the pearlescent run.
    if number in PEARLESCENT_NUMBERS and "pokemon center" in blob:
        return "Pearlescent"
    if exclusive.strip():
        return "Exclusive"
    return "Shared"


def finish_key(card: dict) -> str:
    if "jumbo" in (card.get("type") or "").lower():
        return "Jumbo"
    rarity = card.get("rarity") or "Shared"
    if rarity in {"Shared", "Exclusive"}:
        return "Standard"
    return rarity


def card_keep_score(card: dict) -> tuple:
    """Higher is better when collapsing twins."""
    version = card.get("version") or ""
    slug = ""
    if card.get("url"):
        slug = card["url"].rsplit("/", 1)[-1]
    specific = 0
    if version and version != card.get("fullName") and not re.fullmatch(r".+#\d+", version):
        specific = 2
    if re.search(
        r"10 inch|flocked|diamond|metallic|pearlescent|soft color|nycc|sdcc|eccc|special",
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


def set_code_for(pop_type: str) -> str:
    return {
        "Pop!": "STD",
        "Jumbo": "JUMBO",
        "Super Jumbo": "SUPER",
        "Bitty Pop": "BITTY",
        "Pop! Moment": "MOMENT",
        "Multi-Pack": "MULTI",
    }.get(pop_type, "STD")


def set_name_for(code: str) -> str:
    return {
        "STD": "Pop! Pokémon",
        "JUMBO": "Pop! Jumbo",
        "SUPER": "Pop! Super Jumbo",
        "BITTY": "Bitty Pop!",
        "MOMENT": "Pop! Moment",
        "MULTI": "Multi-Packs",
    }.get(code, "Pop! Pokémon")


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
        href = re.search(r'href="(?:https://www\.pricecharting\.com)?(/game/funko-pop-games/[^"]+)"', block)
        title_a = re.search(r'class="title"[^>]*>\s*<a[^>]*>([^<]+)</a>', block, re.I | re.S)
        if not title_a:
            title_a = re.search(r'/game/funko-pop-games/[^"]+">([^<]+)</a>', block)
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
        # Prefer boxed (CIB), then new, then loose/used.
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
    """Live USD→GBP rate with a safe fallback."""
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
    print("Scraping PriceCharting Funko POP Games…")
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
        # next page form
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
            # "Pop! Goomy, , hi-res view 1"
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
    # de-dupe
    seen = set()
    out = []
    for it in items:
        if it["pid"] in seen:
            continue
        seen.add(it["pid"])
        out.append(it)
    return out


def scrape_funko() -> list[dict]:
    print("Scraping Funko.com Pokémon search…")
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
    # de-dupe
    seen = set()
    out = []
    for it in all_items:
        if it["pid"] in seen:
            continue
        seen.add(it["pid"])
        out.append(it)
    print(f"  funko pops: {len(out)}")
    return out


def checklist_pokemon_names() -> set[str]:
    return {slugify(n) for _, n, _, _ in CHECKLIST if n}


def is_pokemon_pc_row(row: dict, poke_slugs: set[str], checklist_nums: set[int]) -> bool:
    slug = row["slug"].lower()
    title = row["title"].lower()
    # Must look like a Pokémon entry: slug starts with a known species, or title contains it
    for ps in poke_slugs:
        if slug.startswith(ps + "-") or slug == ps or f" {ps} " in f" {slugify(title)} ":
            if row["number"] is None or row["number"] in checklist_nums or row["number"] >= 350:
                return True
    # Alolan / regional forms
    if "alolan" in slug or "alolan" in title:
        return True
    return False


def match_checklist(row: dict) -> tuple[str, str, str, int | None]:
    """Return name, version, exclusive, number from best checklist match."""
    title = row["title"]
    num = row["number"]
    slug = row["slug"].lower()
    base = re.sub(r"\s*#\d+\s*$", "", title).strip()
    version = ""
    name = base
    bm = re.match(r"^(.+?)\s*\[(.+)\]\s*$", base)
    if bm:
        name, version = bm.group(1).strip(), bm.group(2).strip()
    else:
        vm = re.match(r"^(.+?)\s*\((.+)\)\s*$", base)
        if vm:
            name, version = vm.group(1).strip(), vm.group(2).strip()

    candidates = []
    for cnum, cname, cver, cexcl in CHECKLIST:
        if num and cnum and cnum != num:
            continue
        if not (slugify(cname) in slugify(name) or slug.startswith(slugify(cname))):
            continue
        score = 0
        cver_slug = slugify(cver) if cver else ""
        if cver:
            if cver_slug and cver_slug in slug:
                score += 5
            elif cver_slug and cver_slug in slugify(version):
                score += 4
            else:
                score -= 2
        else:
            specialty = (
                "flocked",
                "diamond",
                "metallic",
                "pearlescent",
                "soft-color",
                "10-inch",
                "18-inch",
            )
            if any(tok in slug for tok in specialty):
                score -= 3
            else:
                score += 2
        candidates.append((score, cname, cver or version, cexcl, cnum or num))

    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        best = candidates[0]
        if best[0] >= 0:
            return best[1], best[2], best[3], best[4]
    return name, version, "", num


def build_cards(pc_rows: list[dict], funko_rows: list[dict]) -> list[dict]:
    poke_slugs = checklist_pokemon_names()
    checklist_nums = {n for n, _, _, _ in CHECKLIST if n}
    cards = []
    seen_keys: set[str] = set()

    for row in pc_rows:
        if not is_pokemon_pc_row(row, poke_slugs, checklist_nums):
            continue
        if not row.get("thumb"):
            continue
        name, version, exclusive, number = match_checklist(row)
        slug = row.get("slug") or ""
        pop_type = classify_type(version, row["title"], slug, number)
        rarity = classify_rarity(version, exclusive, slug, number)
        # Prefer slug-derived specialty over retailer-only version labels
        if exclusive and version == exclusive:
            version = ""
        display_version = version or exclusive or ""
        if rarity in {"Flocked", "Diamond", "Metallic", "Pearlescent", "Soft Color"} and not display_version:
            display_version = rarity
        if pop_type in {"Jumbo", "Super Jumbo"} and "inch" not in display_version.lower():
            display_version = ("18 inch" if pop_type == "Super Jumbo" else "10 inch") + (
                f" {display_version}" if display_version else ""
            )
            display_version = display_version.strip()
        sc = set_code_for(pop_type)
        full_name = f"{name}{f' ({display_version})' if display_version else ''}"
        if number:
            full_name = f"{full_name} #{number}"
        key = slugify(f"{number}-{name}-{display_version}-{rarity}-{pop_type}")
        if key in seen_keys:
            continue
        seen_keys.add(key)
        cards.append(
            {
                "id": int(row["pcId"]),
                "fullName": full_name,
                "name": name,
                "version": display_version or full_name,
                "rarity": rarity,
                "setCode": sc,
                "setName": set_name_for(sc),
                "story": name,
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
        )

    # Add Funko shop items not already present (new releases / soft colors / jumbos)
    for fr in funko_rows:
        raw = fr["name"]
        raw = re.sub(r"^Pop!\s*", "", raw, flags=re.I).strip()
        version = ""
        name = raw
        vm = re.match(r"^(.+?)\s*\((.+)\)\s*$", raw)
        if vm:
            name, version = vm.group(1).strip(), vm.group(2).strip()
        # Must be a known Pokémon or contain Pokemon branding already filtered
        if slugify(name) not in poke_slugs and not any(
            slugify(name).startswith(ps) for ps in poke_slugs
        ):
            # Charmeleon etc may be in checklist with number 0
            if slugify(name) not in {slugify(n) for _, n, _, _ in CHECKLIST}:
                continue
        pop_type = classify_type(version, fr["name"], number=None)
        rarity = classify_rarity(version, "", fr.get("name") or "", None)
        # Skip shop listings that only restate a Pokémon already in the catalog.
        # Plain "Pop! Squirtle" duplicates Squirtle #504; keep only true new finishes.
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
        sc = set_code_for(pop_type)
        cid = abs(hash(fr["pid"])) % (10**9)
        cards.append(
            {
                "id": cid,
                "fullName": fr["name"],
                "name": name,
                "version": version or fr["name"],
                "rarity": rarity,
                "setCode": sc,
                "setName": set_name_for(sc),
                "story": name,
                "type": pop_type,
                "color": "Funko Shop",
                "thumb": fr["thumb"],
                "full": fr["full"],
                "number": None,
                "source": "funko",
                "url": fr.get("url"),
            }
        )

    cards = dedupe_cards(cards)

    def sort_key(c: dict):
        n = c.get("number")
        return (n is None, n or 99999, c.get("name") or "", c.get("version") or "")

    cards.sort(key=sort_key)
    return cards


def dedupe_cards(cards: list[dict]) -> list[dict]:
    """Collapse catalogue twins so each number+species+finish appears once."""
    # Force checklist jumbo numbers into Jumbo even when PC omits "10 inch" in the slug.
    for c in cards:
        number = c.get("number")
        if number in JUMBO_NUMBERS and "jumbo" not in (c.get("type") or "").lower():
            # Keep special finishes as regular-size variants that share a number with a jumbo.
            if (c.get("rarity") or "") in {
                "Flocked",
                "Diamond",
                "Metallic",
                "Pearlescent",
                "Soft Color",
            }:
                continue
            c["type"] = "Super Jumbo" if number == 951 else "Jumbo"
            c["setCode"] = set_code_for(c["type"])
            c["setName"] = set_name_for(c["setCode"])
            if "inch" not in (c.get("version") or "").lower():
                label = "18 inch" if number == 951 else "10 inch"
                ver = c.get("version") or ""
                if ver == c.get("fullName"):
                    ver = ""
                c["version"] = f"{label}{f' {ver}' if ver else ''}".strip()
                c["fullName"] = f"{c['name']} ({c['version']})" + (
                    f" #{number}" if number else ""
                )

    # Keep the richest row for each number + species + finish bucket.
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

    # Numberless Funko rows only if no same species+finish exists.
    existing = {(slugify(c.get("name") or ""), finish_key(c)) for c in out}
    for c in numberless:
        key = (slugify(c.get("name") or ""), finish_key(c))
        if key in existing:
            continue
        out.append(c)
        existing.add(key)

    return out


def main() -> None:
    DATA.mkdir(exist_ok=True)
    pc_rows = scrape_pricecharting()
    rate = fetch_usd_gbp_rate()
    print(f"USD->GBP rate: {rate}")
    for row in pc_rows:
        row["priceGbp"] = usd_to_gbp(row.get("priceUsd"), rate)
    funko_rows = scrape_funko()
    cards = build_cards(pc_rows, funko_rows)

    sets_map = {}
    for c in cards:
        sets_map[c["setCode"]] = {
            "code": c["setCode"],
            "name": c["setName"],
            "releaseDate": None,
            "type": "series",
            "number": {"STD": 1, "JUMBO": 2, "SUPER": 3, "BITTY": 4, "MOMENT": 5, "MULTI": 6}.get(
                c["setCode"], 9
            ),
        }

    rarities_order = [
        "Shared",
        "Exclusive",
        "Flocked",
        "Diamond",
        "Metallic",
        "Pearlescent",
        "Soft Color",
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
            "checklist": "Pop Shop Guide Pop! Pokémon checklist (curated)",
            "images": "PriceCharting + Funko.com",
        },
    }
    path = DATA / "cards.json"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {path} ({path.stat().st_size:,} bytes, {out['count']} pops)")


if __name__ == "__main__":
    main()
