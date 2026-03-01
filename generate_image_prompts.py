#!/usr/bin/env python3
"""
generate_image_prompts.py — Génère des prompts image pour chaque exercice OOPS

Usage : python3 generate_image_prompts.py
Output : web/data/exercises/image_prompts.txt

Un prompt par exercice, formaté pour DALL-E 3 / ChatGPT / Nano Banana.
Chaque prompt produit un comic strip 3 panneaux horizontal (ratio 3:1).
"""

import json
import glob
import os

# ── Style commun à tous les prompts ──────────────────────────────────────────
STYLE_PREFIX = (
    "3-panel horizontal comic strip, minimalist flat illustration style, "
    "bold black outlines, pure white background. "
    "The character is a non-gendered rounded figure: smooth oval head, "
    "no facial features, no hair, gender-neutral body with simple rounded limbs. "
    "Panels flow left-to-right showing: "
    "[Panel 1] starting position → [Panel 2] mid-movement → [Panel 3] peak or return position. "
    "Flat colors only, no gradients, no shadows. "
    "Accent colors: forest green #2D6A4F for the figure body, "
    "orange #F4A261 for motion highlights or active limbs. "
    "No text, no numbers, no labels anywhere. "
    "Consistent figure size and style across all 3 panels. "
    "Landscape format 3:1 ratio. "
)

STYLE_SUFFIX = (
    "Clean, friendly, app illustration aesthetic. "
    "Each panel separated by a thin black line."
)


def load_all_exercises():
    exercises = []
    pattern = os.path.join(os.path.dirname(__file__), "web/data/exercises/*.json")
    for path in sorted(glob.glob(pattern)):
        fname = os.path.basename(path)
        if fname == "LICENSE":
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            exercises.extend(data)
    return exercises


def make_prompt(ex):
    name    = ex.get("name_en") or ex.get("name_fr", ex["id"])
    instr   = ex.get("instructions_en") or ex.get("instructions_fr", "")
    cat     = ex.get("category", "")
    pattern = ex.get("movement_pattern", "")

    exercise_block = (
        f"Exercise: {name} ({cat} / {pattern}).\n"
        f"Movement: {instr}"
    )

    return f"{STYLE_PREFIX}{exercise_block} {STYLE_SUFFIX}"


def main():
    exercises = load_all_exercises()

    out_path = os.path.join(
        os.path.dirname(__file__), "web/data/exercises/image_prompts.txt"
    )

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"# OOPS — Exercise Image Prompts\n")
        f.write(f"# {len(exercises)} exercises | 3-panel comic strip | non-gendered figure\n")
        f.write(f"# Paste each prompt into DALL-E 3 / ChatGPT / Nano Banana\n")
        f.write(f"# Request landscape / wide format (3:1 ratio)\n")
        f.write("=" * 80 + "\n\n")

        for ex in exercises:
            f.write(f"## {ex['id']}  [{ex.get('category','')}]\n")
            f.write(f"# {ex.get('name_fr', '')} / {ex.get('name_en', '')}\n\n")
            f.write(make_prompt(ex))
            f.write("\n\n" + "-" * 80 + "\n\n")

    print(f"✓ {len(exercises)} prompts → {out_path}")
    print()
    print("Tip: open image_prompts.txt, copie un bloc, colle-le dans ChatGPT/Nano Banana.")
    print("     Demande 'wide landscape 3:1 format' si l'outil le supporte.")


if __name__ == "__main__":
    main()
