# OOPS — Out of Parent's Shape

Application web mobile (PWA) pour aider les parents à reprendre une activité physique régulière.
Fonctionne entièrement en local, sans serveur, sans collecte de données.

> **Branding** : voir [`BRANDING.md`](BRANDING.md) pour l'identité visuelle, la voix éditoriale,
> et le brief destiné aux LLMs / designers.

---

## Vision

- **Offline-first** : zéro donnée envoyée sur internet, jamais.
- **KISS** : chaque feature doit justifier sa complexité.
- **Science-based** : tous les exercices et programmes s'appuient sur des principes de kinésiologie validés.
- **TDD** : aucune logique métier sans test écrit en premier.
- **Un profil = un appareil** : pas de multi-utilisateur, pas de sync.

---

## Stack technique (décisions fermes — ne pas remettre en question sans raison explicite)

| Couche | Choix | Justification |
|---|---|---|
| Logique métier | Rust → WASM via `wasm-bindgen` | Performance, type-safety, testabilité |
| Build WASM | `wasm-pack build --target web` | Génère ES modules propres, compatible importmap |
| Serve dev | `python3 -m http.server 8080 --directory web` | Zéro dépendance, localhost = contexte sécurisé |
| UI | HTML + CSS + JS vanilla | KISS, pas de framework, contrôle total |
| Résolution modules | `importmap` dans `index.html` | Pas de bundler JS, native browser |
| Stockage | IndexedDB via `Dexie.js` (CDN, caché par SW) | Natif navigateur, offline, zéro dépendance serveur |
| Tests Rust | `cargo test` + `wasm-pack test` | Unit + intégration WASM |
| Tests E2E | `Playwright` (viewport mobile) | Simulation iPhone/Android dans les tests |
| i18n | Fichiers JSON FR/EN + fonction `t()` JS minimale | Simple, extensible |
| Base exercices | Fichiers JSON dans `web/data/exercises/` | Éditables sans toucher au code |
| Notifications | **Post-MVP** — Web Push API + Service Worker | Débloqué après MVP stable |

> **Pourquoi pas Trunk ?** Trunk est optimisé pour les projets Yew/Dioxus. Pour une UI vanilla HTML/JS,
> `wasm-pack` + `importmap` est plus simple et plus prévisible. L'importmap dans `index.html` mappe
> `"oops"` vers `"./pkg/oops.js"` — app.js fait `import init, { build_session } from 'oops'` directement.

---

## Architecture

```
oops/
├── Cargo.toml              # Config Rust + dépendances wasm-bindgen/serde
├── Makefile                # build / dev / test / clean
├── package.json            # Playwright (devDependency uniquement)
├── playwright.config.js    # Config tests E2E (viewport mobile)
├── src/                    # Rust (logique métier → WASM)
│   ├── lib.rs              # Point d'entrée WASM (wasm-bindgen exports)
│   ├── profile.rs          # Profil utilisateur, calculs (TDEE, BMI, niveau)
│   ├── program.rs          # Génération de programme (algo de sélection d'exercices)
│   ├── session.rs          # Logique de séance (RPE, progression, surcharge)
│   └── exercise.rs         # Types et validation des exercices
├── data/
│   └── exercises/          # JSON d'exercices, un fichier par catégorie
│       ├── push.json
│       ├── squat.json
│       ├── hinge.json
│       ├── core.json
│       └── mobility.json
├── web/
│   ├── index.html
│   ├── manifest.json       # PWA manifest
│   ├── service-worker.js   # Offline cache (post-MVP : notifications)
│   ├── css/
│   │   └── main.css
│   ├── js/
│   │   ├── app.js          # Point d'entrée JS, initialisation WASM
│   │   ├── db.js           # Abstraction Dexie.js (accès IndexedDB)
│   │   ├── i18n.js         # Fonction t(key), chargement FR/EN
│   │   └── ui/             # Composants UI (fonctions JS, pas de framework)
│   └── locales/
│       ├── fr.json
│       └── en.json
├── tests/
│   ├── rust/               # Tests unitaires Rust (dans src/ via #[cfg(test)])
│   └── e2e/                # Tests Playwright
├── Cargo.toml
├── Trunk.toml
└── package.json            # Dexie.js + Playwright
```

---

## Modèle de données (IndexedDB via Dexie.js)

### `profile` (objet unique)
```
id, sex, age_years, weight_kg, fitness_level,
sessions_per_week, minutes_per_session,
is_postpartum, injury_notes, lang,
disclaimer_accepted_at, created_at
```

### `exercises` (catalogue, chargé depuis JSON au démarrage)
```
id, name_fr, name_en, category, movement_pattern,
difficulty (1-3), duration_s, equipment_required (toujours false pour MVP),
contraindications[], instructions_fr, instructions_en
```

### `sessions` (historique des séances)
```
id, date, planned_exercises[], completed_exercises[],
rpe_global (1-10), notes, duration_actual_s
```

### `exercise_logs` (suivi détaillé, optionnel par l'utilisateur)
```
id, session_id, exercise_id, sets, reps, weight_kg, rpe
```

### `body_weight_logs` (optionnel)
```
id, date, weight_kg
```

### `settings`
```
key, value (préférences UI, features activées)
```

---

## Principes kinésiologiques appliqués (non négociables)

### Sélection des exercices
Tous les exercices MVP sont **sans matériel**, organisés par **patron de mouvement** :
- **Push** : pompes et variantes (inclinées, genoux, diamant)
- **Squat** : squat bulgare, fente, squat sumo
- **Hinge** : pont fessier, hip hinge, RDL au poids de corps
- **Core** : planche, dead bug, bird-dog, hollow body
- **Mobilité** : chats/vaches, 90/90, world's greatest stretch

### Génération de programme
- **FITT-VP** : Fréquence, Intensité, Temps, Type, Volume, Progression
- **Surcharge progressive** : augmenter le volume (reps/séries) avant l'intensité
- **Récupération** : 48h minimum entre deux séances sollicitant les mêmes groupes musculaires
- **Dose minimale efficace** pour débutants : 2-3 séances/semaine, 20-30 min

### RPE (Rate of Perceived Exertion)
- Échelle 1-10 (1 = effort nul, 10 = maximal)
- Cible pour débutants : RPE 5-7
- Si RPE > 8 deux séances de suite → régression automatique suggérée
- Si RPE < 5 → progression suggérée

### Post-partum
- Jamais de crunchs abdominaux (risque diastase)
- Priorité plancher pelvien (Kegel intégrés aux premières séances)
- Progression plus lente (ramp-up sur 6 semaines minimum)
- Déclenche le disclaimer médical renforcé

### Niveaux de fitness
- **Débutant** : < 2 séances/semaine depuis > 3 mois
- **Intermédiaire** : activité régulière mais non structurée
- Les niveaux déterminent le volume initial et la vitesse de progression

---

## Features par phase

### Phase 1 — MVP
- [ ] Onboarding (profil complet + disclaimer médical)
- [ ] Génération de séance quotidienne (exercices selon profil)
- [ ] Affichage et déroulement de séance (timer, instructions)
- [ ] Marquage séance terminée / passée
- [ ] PWA installable (manifest + service worker offline basique)
- [ ] Bilingue FR/EN
- [ ] Base d'exercices no-equipment (≥ 30 exercices JSON)

### Phase 2 — Tracking
- [ ] RPE post-séance (débloquable dans les settings)
- [ ] Suivi poids corporel (débloquable)
- [ ] Logs détaillés sets/reps (débloquable)
- [ ] Historique et visualisation progression

### Phase 3 — Notifications
- [ ] Service Worker + Web Push (PWA)
- [ ] Choix des jours et heures de rappel
- [ ] Rappel configurable par fréquence souhaitée

### Phase 4 — Raffinement
- [ ] Programme post-partum dédié
- [ ] Gestion des limitations physiques (filtrage exercices)
- [ ] Suggestions d'adaptation selon RPE historique

---

## TDD — Workflow obligatoire

```
1. Écrire le test (rouge)
2. Écrire le minimum de code pour passer (vert)
3. Refactorer si nécessaire (refactor)
4. Committer
```

### Règles
- Toute fonction dans `src/` Rust a son test `#[cfg(test)]` dans le même fichier.
- Toute fonction JS non-triviale a son test Playwright ou test unitaire.
- Les tests E2E couvrent les happy paths des flows utilisateur complets.
- Aucune PR/commit sans `cargo test` + `wasm-pack test` + `npx playwright test` au vert.

### Lancement des tests
```bash
cargo test                           # Tests unitaires Rust (rapide, pas de browser)
wasm-pack test --headless --firefox  # Tests WASM dans navigateur headless
npx playwright test                  # Tests E2E (nécessite `make build` avant)

# Ou via Makefile :
make test-rust    # cargo test
make test-wasm    # wasm-pack test
make test-e2e     # playwright test
make test         # rust + e2e
```

---

## Conventions de code

### Rust
- `snake_case` pour fonctions et variables
- `PascalCase` pour types et structs
- Pas de `unwrap()` dans le code de production — utiliser `?` et propager les erreurs
- Les types exposés via `wasm-bindgen` sont dans `lib.rs` uniquement
- Pas de logique métier dans `lib.rs` — il délègue aux modules

### JavaScript
- ES Modules natifs (pas de bundler JS côté UI)
- `camelCase` pour fonctions et variables
- Fonctions pures autant que possible
- `db.js` est la seule couche autorisée à toucher à Dexie/IndexedDB
- Pas de framework, pas de build step JS supplémentaire

### JSON exercices
```json
{
  "id": "push_standard",
  "name_fr": "Pompe standard",
  "name_en": "Standard push-up",
  "category": "push",
  "movement_pattern": "horizontal_push",
  "difficulty": 2,
  "duration_s": 30,
  "equipment_required": false,
  "contraindications": [],
  "instructions_fr": "...",
  "instructions_en": "..."
}
```

### i18n
- Toutes les strings UI dans `locales/fr.json` et `locales/en.json`
- Clés en `snake_case` hiérarchique : `"onboarding.disclaimer.title"`
- La langue par défaut est `fr` ; fallback sur `en` si clé manquante

---

## Disclaimer médical (obligatoire au 1er lancement)

Affiché avant tout accès à l'app, acceptation stockée dans `profile.disclaimer_accepted_at`.

Contenu minimum :
> FR : "Cette application ne remplace pas un avis médical. Consultez votre médecin avant de commencer tout programme d'exercice, particulièrement en période post-partum ou en cas de douleurs chroniques."
> EN : "This app does not replace medical advice. Consult your doctor before starting any exercise program, especially postpartum or if you experience chronic pain."

---

## Sources de données exercices

Base initiale constituée à partir de :
- **Wger** (wger.de) — base open-source d'exercices (filtrer `equipment: none`)
- Curation manuelle pour valider les contraindications et instructions

Fichiers JSON dans `web/data/exercises/` — modifiables directement pour ajouter des exercices sans toucher au code Rust ou JS.

---

## Ce qu'on ne fait PAS (périmètre exclu)

- Pas d'exercices avec matériel (même barre de traction) — Phase 1
- Pas de nutrition / calories
- Pas de sync cloud, pas de compte, pas de login
- Pas de partage social
- Pas d'IA générative pour les exercices — tout est déterministe et auditable
- Pas de React, Vue, Angular, Svelte ou tout autre framework JS
