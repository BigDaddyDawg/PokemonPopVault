# Poké Pop Vault

A static gallery of every Pokémon Funko Pop! ever released — browse by series, variant, or species, and tap any Pop to see its details.

## Live site

`https://bigdaddydawg.github.io/PokemonPopVault/`

## Install on your phone (PWA)

Same pattern as Toploader — open the live site in your phone browser, then:

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** menu → **Install app** / **Add to Home screen**

It opens fullscreen like a native app (standalone display + offline shell via service worker).

## Local

Open `index.html` via a local static server (needed so `data/cards.json` can load):

```powershell
python -m http.server 8080
```

Then visit http://localhost:8080

## Data

Pop catalog is built from a curated Pop! Pokémon checklist plus images/listings from [PriceCharting](https://www.pricecharting.com/console/funko-pop-games) and [Funko.com](https://funko.com/) into `data/cards.json`.

```powershell
python scripts/refresh_data.py
```

## Coming Soon tab

Sources of truth:
- **Upcoming waves & shop sightings:** Funko.com Pokémon listings
- **News:** Official [Funko blog](https://funko.com/blog/)

Refresh behavior:
- When you open **Coming Soon**, the app reloads `data/coming-soon.json` and tries a **live** pull of blog headlines
- GitHub Actions also refreshes the snapshot twice a week (Sun/Wed) — or run locally:

```powershell
python scripts/refresh_coming_soon.py
```

Then commit + push, or trigger the **Refresh Coming Soon** workflow from GitHub Actions.

## Credit

Fan project. Pokémon and Funko Pop! are trademarks of their respective owners. Not affiliated with Nintendo, The Pokémon Company, Game Freak, or Funko.
