"""Merge live PriceCharting market prices into data/cards.json (GBP)."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow `python scripts/refresh_prices.py`
sys.path.insert(0, str(Path(__file__).resolve().parent))

from refresh_data import (  # noqa: E402
    DATA,
    fetch_usd_gbp_rate,
    scrape_pricecharting,
    usd_to_gbp,
)

ROOT = Path(__file__).resolve().parents[1]
CARDS_PATH = DATA / "cards.json"


def main() -> None:
    if not CARDS_PATH.exists():
        raise SystemExit(f"Missing {CARDS_PATH} — run refresh_data.py first.")

    catalog = json.loads(CARDS_PATH.read_text(encoding="utf-8"))
    cards = catalog.get("cards") or []
    by_id = {str(c.get("id")): c for c in cards}

    pc_rows = scrape_pricecharting()
    rate = fetch_usd_gbp_rate()
    print(f"USD->GBP rate: {rate}")

    updated = 0
    for row in pc_rows:
        card = by_id.get(str(row["pcId"]))
        if not card:
            continue
        usd = row.get("priceUsd")
        gbp = usd_to_gbp(usd, rate)
        if usd is None and gbp is None:
            continue
        card["priceUsd"] = usd
        card["priceGbp"] = gbp
        card["priceSource"] = "pricecharting"
        updated += 1

    priced = sum(1 for c in cards if c.get("priceGbp") is not None)
    catalog["cards"] = cards
    catalog["priceGenerated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    catalog["fxUsdGbp"] = rate
    CARDS_PATH.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Updated {updated} PriceCharting rows · {priced}/{len(cards)} cards have GBP prices")
    print(f"Wrote {CARDS_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
