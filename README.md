<div align="center">

# OOPS
### Out of Parent's Shape

**A privacy-first, offline-only PWA to help parents get back in shape — no account, no data collection, no excuses.**

[![License: MIT](https://img.shields.io/badge/code-MIT-2D6A4F?style=flat-square)](LICENSE)
[![Data: CC BY-SA 4.0](https://img.shields.io/badge/exercise%20data-CC%20BY--SA%204.0-F4A261?style=flat-square)](web/data/exercises/LICENSE)
[![Built with Rust](https://img.shields.io/badge/built%20with-Rust%20%2B%20WASM-orange?style=flat-square)](Cargo.toml)
[![PWA](https://img.shields.io/badge/PWA-offline--first-blue?style=flat-square)](web/manifest.json)

</div>

---

## What is OOPS?

Life happened. Kids happened. The gym didn't.

OOPS is a mobile-first Progressive Web App that generates personalised, science-based bodyweight workout sessions. It runs entirely on your device — no server, no sync, no account. Your data never leaves your phone.

Install it once, use it offline, forever.

## Features

- **Personalised programs** — adapts to your sex, age, weight, fitness level, schedule and any physical limitations
- **Science-based** — exercises organised by movement pattern (push, squat, hinge, core, mobility), progressive overload, RPE tracking
- **Postpartum support** — dedicated exercises (pelvic floor), DiastasisRecti-aware filtering
- **39 bodyweight exercises** — no equipment needed, full FR/EN instructions
- **Offline-first** — Service Worker caches everything; works with no connection
- **100% local** — IndexedDB only, no network requests after install
- **Bilingual** — French and English, switchable in settings

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Business logic | Rust → WASM (`wasm-bindgen`) | Type-safe, fast, testable with `cargo test` |
| UI | HTML + CSS + vanilla JS | No framework, no bundler, just ES modules |
| Storage | IndexedDB via Dexie.js | Native browser DB, fully offline |
| Build | `wasm-pack --target web` + importmap | No bundler needed, works with any static server |
| Tests | `cargo test` + Playwright (mobile viewport) | Unit tests for Rust logic, E2E for user flows |

## Getting started

### Prerequisites

```bash
# Rust (via rustup — do NOT use apt)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# wasm-pack
cargo install wasm-pack
```

### Build & run

```bash
# Clone
git clone git@github.com:K-miy/oops.git
cd oops

# Build WASM + serve
make dev
# → http://localhost:8080
```

### Tests

```bash
make test-rust   # 43 Rust unit tests (no browser needed)
make test-wasm   # WASM integration tests (requires Firefox headless)
make test-e2e    # Playwright E2E tests (mobile viewport)
make test        # rust + e2e
```

## Project structure

```
oops/
├── src/                  # Rust business logic (compiled to WASM)
│   ├── exercise.rs       # Exercise types, filtering
│   ├── profile.rs        # User profile, fitness levels, contraindications
│   ├── session.rs        # Session plan, completion tracking
│   ├── program.rs        # Session generation algorithm (FITT-VP)
│   └── lib.rs            # WASM bindings
├── web/data/exercises/       # JSON exercise database (CC BY-SA 4.0)
│   ├── push.json         # 6 exercises
│   ├── squat.json        # 8 exercises
│   ├── hinge.json        # 7 exercises
│   ├── core.json         # 9 exercises (incl. postpartum-only)
│   └── mobility.json     # 10 exercises
├── web/                  # PWA frontend (vanilla HTML/CSS/JS)
│   ├── index.html        # SPA shell + importmap
│   ├── manifest.json     # PWA manifest
│   ├── service-worker.js # Offline cache
│   ├── css/main.css      # Mobile-first design system
│   ├── js/
│   │   ├── app.js        # App orchestration, routing
│   │   ├── db.js         # IndexedDB layer (Dexie.js)
│   │   ├── i18n.js       # FR/EN translations
│   │   └── ui/           # Screen renderers
│   └── locales/          # fr.json, en.json
└── tests/e2e/            # Playwright specs
```

## Science-based design

OOPS applies the **FITT-VP** principles (Frequency, Intensity, Time, Type, Volume, Progression):

- Exercises are grouped by **movement pattern** to ensure balanced programming
- **Progressive overload** is achieved by seed-based exercise rotation over days
- Target **RPE 5–7** for beginners, **6–8** for intermediate
- Minimum **48h recovery** between sessions targeting the same muscle groups
- Postpartum programs prioritise **pelvic floor** and exclude DiastasisRecti-unsafe movements

## Privacy

No analytics. No telemetry. No server. Ever.

All user data (profile, sessions, body weight logs) is stored in the device's IndexedDB and never transmitted anywhere. The exercise data is bundled as static JSON files. The only external resource loaded at runtime is Dexie.js from jsDelivr CDN — cached by the Service Worker on first load and served locally thereafter.

## Contributing

Contributions are very welcome! A few things to keep in mind:

- **TDD is mandatory** — write the test first, then the implementation
- **KISS** — every added feature must justify its complexity
- **No equipment** — exercises must be performable without any gear (Phase 1)
- Exercise data in `web/data/exercises/` is licensed **CC BY-SA 4.0** — attribute your sources

```bash
# Run all checks before submitting a PR
make test
```

## Support

If OOPS helps you get back on track, consider buying the dev a coffee ☕

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-cbesse-F4A261?style=flat-square&logo=buy-me-a-coffee&logoColor=white)](https://buymeacoffee.com/cbesse)

## License

- **Code** — [MIT](LICENSE) © 2026 Camille (K-miy)
- **Exercise data** (`web/data/exercises/`) — [CC BY-SA 4.0](web/data/exercises/LICENSE), sources include [Wger](https://wger.de)
