#!/usr/bin/env python3
"""
gen_exercise_images.py — Generates exercise illustration images using
Google AI Studio (Imagen 3 via Gemini API) and saves them to web/icons/exercises/.

Usage:
  export GEMINI_API_KEY="your_api_key"
  python3 scripts/gen_exercise_images.py [--dry-run] [--category push]

The script reads all exercise JSON files, generates one image per exercise
(skipping those that already have an image_url), saves images as WebP, and
updates the JSON files in-place with the image_url field.

Images are saved to: web/icons/exercises/<exercise_id>.webp
image_url in JSON:    /icons/exercises/<exercise_id>.webp

Requirements:
  pip install google-genai pillow
  (or: pip install google-generativeai pillow for older SDK)

API docs: https://ai.google.dev/gemini-api/docs/image-generation
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

EXERCISES_DIR = Path(__file__).parent.parent / "web" / "data" / "exercises"
OUTPUT_DIR    = Path(__file__).parent.parent / "web" / "icons" / "exercises"
URL_PREFIX    = "/icons/exercises"

# Prompt template — minimal line art style, consistent across exercises
PROMPT_TEMPLATE = (
    "Simple clean line art illustration of a person performing '{name}' exercise. "
    "Minimal style, white background, no shading, no text, no labels. "
    "The figure is a gender-neutral adult seen from a 3/4 angle. "
    "Show proper form clearly. One single frame. Square composition."
)

# Safety: never overwrite existing images unless --force
# Rate limit: ~2 req/s for free tier
RATE_LIMIT_DELAY = 0.6  # seconds between API calls


def load_all_exercises(category_filter=None):
    exercises = []
    for path in sorted(EXERCISES_DIR.glob("*.json")):
        cat = path.stem
        if category_filter and cat != category_filter:
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for ex in data:
            ex["_source_file"] = str(path)
            ex["_category"] = cat
        exercises.extend(data)
    return exercises


def save_exercises_by_file(exercises):
    """Write exercises back to their source files, preserving order."""
    by_file = {}
    for ex in exercises:
        src = ex.pop("_source_file", None)
        ex.pop("_category", None)
        if src:
            by_file.setdefault(src, []).append(ex)

    for path, exs in by_file.items():
        with open(path, "w", encoding="utf-8") as f:
            json.dump(exs, f, ensure_ascii=False, indent=2)
        print(f"  Saved {path}")


def generate_image_gemini(api_key, prompt):
    """
    Generate image using Google GenAI SDK (google-genai package).
    Returns raw PNG/WebP bytes or raises on failure.
    """
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("ERROR: Install google-genai: pip install google-genai", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    response = client.models.generate_image(
        model="imagen-3.0-generate-002",
        prompt=prompt,
        config=types.GenerateImageConfig(
            number_of_images=1,
            aspect_ratio="1:1",
            output_mime_type="image/webp",
            safety_filter_level="block_only_high",
        ),
    )

    if not response.generated_images:
        raise RuntimeError("No image returned by API")

    image_data = response.generated_images[0].image
    # image.image_bytes contains raw bytes
    return image_data.image_bytes


def main():
    parser = argparse.ArgumentParser(description="Generate exercise images via Gemini Imagen")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without calling API")
    parser.add_argument("--category", help="Only process one category (e.g. push)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing images")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key and not args.dry_run:
        print("ERROR: Set GEMINI_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    exercises = load_all_exercises(category_filter=args.category)
    print(f"Loaded {len(exercises)} exercises.", file=sys.stderr)

    generated = 0
    skipped   = 0
    errors    = 0

    for ex in exercises:
        ex_id    = ex["id"]
        name_en  = ex.get("name_en", ex_id)
        out_path = OUTPUT_DIR / f"{ex_id}.webp"
        url      = f"{URL_PREFIX}/{ex_id}.webp"

        # Skip if already has an image and not forcing
        if ex.get("image_url") and not args.force:
            skipped += 1
            continue

        # Skip if file already exists and not forcing
        if out_path.exists() and not args.force:
            ex["image_url"] = url
            skipped += 1
            continue

        prompt = PROMPT_TEMPLATE.format(name=name_en)
        print(f"[{ex['_category']}] {name_en}")

        if args.dry_run:
            print(f"  PROMPT: {prompt}\n")
            ex["image_url"] = url  # simulate
            generated += 1
            continue

        try:
            img_bytes = generate_image_gemini(api_key, prompt)
            out_path.write_bytes(img_bytes)
            ex["image_url"] = url
            generated += 1
            print(f"  → saved {out_path.name} ({len(img_bytes)//1024} KB)")
            time.sleep(RATE_LIMIT_DELAY)
        except Exception as e:
            print(f"  ERROR: {e}", file=sys.stderr)
            errors += 1
            time.sleep(RATE_LIMIT_DELAY * 2)

    print(f"\nGenerated: {generated}, Skipped: {skipped}, Errors: {errors}")

    if not args.dry_run and generated > 0:
        print("Updating JSON files...")
        save_exercises_by_file(exercises)
        print("Done. Remember to bump CACHE_VERSION in service-worker.js!")
    else:
        # Still need to pop the internal fields even in dry-run
        for ex in exercises:
            ex.pop("_source_file", None)
            ex.pop("_category", None)


if __name__ == "__main__":
    main()
