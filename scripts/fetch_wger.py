#!/usr/bin/env python3
"""
fetch_wger.py — Fetches bodyweight exercises from the wger API and outputs
them in OOPS JSON format for manual review and curation.

Usage:
  python3 scripts/fetch_wger.py > scripts/wger_candidates.json

Then review wger_candidates.json and copy relevant exercises into
web/data/exercises/<category>.json

API docs: https://wger.de/api/v2/
"""

import json
import sys
import urllib.request
import urllib.parse

BASE_URL = "https://wger.de/api/v2"

# wger equipment ID for bodyweight exercises
BODYWEIGHT_EQUIPMENT_ID = 7

# wger language IDs
LANG_EN = 2
LANG_FR = 21  # French on wger

# wger category → OOPS category mapping (wger category IDs)
CATEGORY_MAP = {
    8:  "push",     # Chest
    12: "push",     # Shoulders (vertical push)
    13: "pull",     # Back
    10: "squat",    # Legs
    14: "core",     # Abs
    11: "hinge",    # Buttocks / glutes
    # Category 9 = Arms — skipped (no direct OOPS category)
}

# Movement pattern heuristics based on exercise name keywords
MOVEMENT_PATTERNS = {
    "push":   "horizontal_push",
    "press":  "horizontal_push",
    "dip":    "vertical_push",
    "pull":   "vertical_pull",
    "row":    "horizontal_pull",
    "chin":   "vertical_pull",
    "squat":  "squat",
    "lunge":  "lunge",
    "step":   "lunge",
    "bridge": "hip_hinge",
    "hinge":  "hip_hinge",
    "deadlift": "hip_hinge",
    "plank":  "core_anti_extension",
    "crunch": "core_flexion",
    "sit":    "core_flexion",
    "twist":  "core_anti_rotation",
}


def fetch_json(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def fetch_all_pages(url):
    """Fetch all pages of a paginated wger API endpoint."""
    results = []
    next_url = url
    while next_url:
        data = fetch_json(next_url)
        results.extend(data.get("results", []))
        next_url = data.get("next")
    return results


def get_translations(exercise_id):
    """Fetch FR and EN translations for a given exercise base ID."""
    url = f"{BASE_URL}/exercise/?format=json&exercise_base={exercise_id}&language={LANG_EN}&limit=5"
    en_results = fetch_all_pages(url)
    url_fr = f"{BASE_URL}/exercise/?format=json&exercise_base={exercise_id}&language={LANG_FR}&limit=5"
    fr_results = fetch_all_pages(url_fr)

    name_en = en_results[0]["name"].strip() if en_results else ""
    desc_en = en_results[0].get("description", "").strip() if en_results else ""
    name_fr = fr_results[0]["name"].strip() if fr_results else name_en
    desc_fr = fr_results[0].get("description", "").strip() if fr_results else desc_en

    # Strip HTML tags from descriptions (wger uses HTML)
    import re
    desc_en = re.sub(r"<[^>]+>", " ", desc_en).strip()
    desc_fr = re.sub(r"<[^>]+>", " ", desc_fr).strip()

    return name_en, name_fr, desc_en, desc_fr


def guess_movement_pattern(name_en, category):
    name_lower = name_en.lower()
    for keyword, pattern in MOVEMENT_PATTERNS.items():
        if keyword in name_lower:
            return pattern
    # Fallback by category
    defaults = {
        "push":  "horizontal_push",
        "pull":  "vertical_pull",
        "squat": "squat",
        "hinge": "hip_hinge",
        "core":  "core_anti_extension",
    }
    return defaults.get(category, "unknown")


def make_oops_id(name_en, category):
    """Generate a snake_case ID from name and category."""
    import re
    slug = re.sub(r"[^a-z0-9]+", "_", name_en.lower()).strip("_")
    return f"{category[:4]}_{slug[:30]}"


def main():
    print("Fetching bodyweight exercise bases from wger...", file=sys.stderr)

    # Fetch all exercise bases with bodyweight equipment
    url = (
        f"{BASE_URL}/exerciseinfo/"
        f"?format=json&equipment={BODYWEIGHT_EQUIPMENT_ID}&limit=100"
    )
    bases = fetch_all_pages(url)
    print(f"Found {len(bases)} exercise bases.", file=sys.stderr)

    candidates = []
    skipped = 0

    for base in bases:
        category_id = base.get("category", {}).get("id")
        if category_id not in CATEGORY_MAP:
            skipped += 1
            continue

        category = CATEGORY_MAP[category_id]
        base_id = base["id"]

        # Get translations
        try:
            name_en, name_fr, desc_en, desc_fr = get_translations(base_id)
        except Exception as e:
            print(f"  Warning: could not fetch translations for {base_id}: {e}", file=sys.stderr)
            continue

        if not name_en:
            skipped += 1
            continue

        movement_pattern = guess_movement_pattern(name_en, category)
        oops_id = make_oops_id(name_en, category)

        exercise = {
            "id": oops_id,
            "_wger_id": base_id,
            "name_fr": name_fr or name_en,
            "name_en": name_en,
            "category": category,
            "movement_pattern": movement_pattern,
            "difficulty": 2,        # Default: medium — review manually
            "equipment_required": False,
            "requires_anchor": False,
            "postpartum_only": False,
            "contraindications": [],
            "instructions_fr": desc_fr or "Instructions à compléter.",
            "instructions_en": desc_en or "Instructions to be completed.",
            # Timed vs reps: fill manually based on movement_pattern
            # Core/mobility patterns → add duration_s; others → add reps + sets + rest_s
            "_TODO": "Review: set difficulty, reps OR duration_s, sets, rest_s, progression_to, contraindications"
        }
        candidates.append(exercise)
        print(f"  [{category}] {name_en}", file=sys.stderr)

    print(f"\nDone. {len(candidates)} candidates, {skipped} skipped.", file=sys.stderr)
    print(json.dumps(candidates, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
