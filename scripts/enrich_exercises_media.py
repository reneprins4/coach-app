#!/usr/bin/env python3
"""
Enrich Kravex exercises with image URLs from free-exercise-db (open source, public domain).
Images served from: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{id}/{n}.jpg

Output: Two SQL files to paste in Supabase SQL editor:
  1. migration_add_media_columns.sql  — ALTER TABLE (run first)
  2. migration_exercise_images.sql    — UPDATE statements with image URLs
"""

import json
import os
import re
import urllib.request

GITHUB_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
FREE_DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"

# Our exercise names (from Supabase — fetched via anon key)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not ANON_KEY:
    raise RuntimeError("Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY")


def normalize(name: str) -> str:
    """Lowercase, remove punctuation, collapse whitespace."""
    n = name.lower()
    n = re.sub(r"[^a-z0-9 ]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def fuzzy_match(target: str, candidates: dict) -> tuple[str | None, str | None]:
    """Find best matching exercise. Returns (exercise_id, matched_name) or (None, None)."""
    t_norm = normalize(target)
    t_words = set(t_norm.split())

    # 1. Exact match
    for name, ex_id in candidates.items():
        if normalize(name) == t_norm:
            return ex_id, name

    # 2. Substring match (target is subset of candidate or vice versa)
    best_score = 0
    best_match = None
    best_name = None
    for name, ex_id in candidates.items():
        c_words = set(normalize(name).split())
        if not c_words:
            continue
        overlap = len(t_words & c_words)
        score = overlap / max(len(t_words), len(c_words))
        if score > best_score:
            best_score = score
            best_match = ex_id
            best_name = name

    if best_score >= 0.6:
        return best_match, best_name
    return None, None


def fetch_our_exercises():
    """Fetch exercise names from Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/exercises?select=name&limit=500"
    req = urllib.request.Request(url, headers={
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}",
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return [ex["name"] for ex in data]


def fetch_free_db():
    """Fetch free-exercise-db dataset."""
    print("Downloading free-exercise-db...")
    req = urllib.request.Request(FREE_DB_URL)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    # Build lookup: normalized_name -> exercise
    lookup = {}
    for ex in data:
        lookup[ex["name"]] = ex
    print(f"  {len(data)} exercises loaded")
    return data, lookup


def generate_image_url(ex_id: str, index: int = 0) -> str:
    return f"{GITHUB_BASE}/{ex_id}/{index}.jpg"


# Manual overrides: Kravex name → free-exercise-db name
MANUAL_OVERRIDES = {
    "Ab Wheel":                    "Barbell Ab Rollout",
    "Back Squat":                  "Barbell Full Squat",
    "Bent Over Lateral Raise":     "Dumbbell Rear Lateral Raise",
    "Bicycle Crunch":              "Decline Crunch",  # best available
    "Cable Fly":                   "Cable Crossover",
    "Cable Fly (Mid)":             "Cable Crossover",
    "Cable Kickback":              "One-Legged Cable Kickback",
    "Cable Row (Wide Grip)":       "Cable Seated Crunch",
    "Cable Woodchop":              "Cable Lying Triceps Extension",
    "Chest Dip":                   "Dips - Chest Version",
    "Chest Supported Row":         "Bent Over Two-Dumbbell Row",
    "Conventional Deadlift":       "Barbell Deadlift",
    "Copenhagen Plank":            "Plank",
    "Dip":                         "Dips - Chest Version",
    "Dragon Flag":                 "Ab Wheel Rollout",
    "Dumbbell Fly":                "Dumbbell Flyes",
    "Hip Abduction Machine":       "Side Lying Hip Abduction",
    "Hollow Body Hold":            "Plank",
    "Hyperextension":              "Hyperextensions (Back Extensions)",
    "Knee Raise":                  "Hanging Leg Raise",
    "L-Sit":                       "Plank",
    "Landmine Press":              "Barbell Shoulder Press",
    "Landmine Rotation":           "Landmine Twist",
    "Leg Press Calf Raise":        "Rocking Standing Calf Raise",
    "Machine Row":                 "Cable Seated Crunch",
    "Meadows Row":                 "Lying T-Bar Row",
    "Mountain Climber":            "Mountain Climbers",
    "Nordic Curl":                 "Lying Leg Curls",
    "Overhead Tricep Extension":   "Overhead Triceps",
    "Pause Squat":                 "Barbell Full Squat",
    "Pec Deck":                    "Dumbbell Flyes",
    "Pendlay Row":                 "Bent Over Barbell Row",
    "Rack Pull":                   "Rack Pulls",
    "Reverse Grip Barbell Row":    "Reverse Grip Bent-Over Rows",
    "Rope Pushdown":               "Triceps Pushdown",
    "Side Plank":                  "Push Up to Side Plank",
    "Single Arm Tricep Pushdown":  "Triceps Pushdown",
    "Step Up":                     "Barbell Step Ups",
    "Stiff Leg Deadlift":          "Stiff-Legged Barbell Deadlift",
    "Stir the Pot":                "Plank",
    "Toes to Bar":                 "Hanging Leg Raise",
    "Tricep Pushdown":             "Triceps Pushdown",
    "V-Up":                        "Decline Crunch",
    "Walking Lunges":              "Barbell Walking Lunge",
    "Weighted Crunch":             "Decline Crunch",
    "Windmill":                    "Dumbbell One-Arm Shoulder Press",
    "Z-Press":                     "Barbell Shoulder Press",
    "Zercher Squat":               "Barbell Full Squat",
}


def main():
    print("=== Kravex Exercise Media Enrichment ===\n")

    # Fetch our exercises
    print("Fetching exercises from Supabase...")
    our_exercises = fetch_our_exercises()
    print(f"  {len(our_exercises)} exercises in Kravex\n")

    # Fetch free DB
    free_data, free_lookup = fetch_free_db()
    name_to_id = {name: ex["id"] for name, ex in free_lookup.items()}

    # Match
    print("\nMatching exercises...")
    matched = []
    unmatched = []

    for our_name in sorted(our_exercises):
        # Try manual override first
        override = MANUAL_OVERRIDES.get(our_name)
        if override and override in free_lookup:
            ex_id = free_lookup[override]["id"]
            matched_name = override
        else:
            ex_id, matched_name = fuzzy_match(our_name, name_to_id)
        if ex_id:
            ex = free_lookup.get(matched_name, {})
            images = ex.get("images", [])
            img_urls = [generate_image_url(ex_id, i) for i in range(len(images))]
            matched.append({
                "our_name": our_name,
                "matched_name": matched_name,
                "ex_id": ex_id,
                "img_url_0": img_urls[0] if img_urls else None,
                "img_url_1": img_urls[1] if len(img_urls) > 1 else None,
            })
            status = "✓"
        else:
            unmatched.append(our_name)
            status = "✗"
        print(f"  {status} {our_name:<40} → {matched_name or '(no match)'}")

    print(f"\n=== Results ===")
    print(f"  Matched:   {len(matched)}/{len(our_exercises)}")
    print(f"  Unmatched: {len(unmatched)}")

    if unmatched:
        print("\nUnmatched exercises (need manual URL or YouTube fallback):")
        for name in unmatched:
            print(f"  - {name}")

    # Generate SQL files
    # 1. Migration: add columns
    migration_cols = """-- Migration: Add media columns to exercises table
-- Run this FIRST in Supabase SQL Editor

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS image_url_0 text,
  ADD COLUMN IF NOT EXISTS image_url_1 text,
  ADD COLUMN IF NOT EXISTS media_source text DEFAULT 'free-exercise-db';

-- Verify
SELECT name, image_url_0 FROM exercises LIMIT 5;
"""
    with open("migration_add_media_columns.sql", "w") as f:
        f.write(migration_cols)
    print("\nWrote: migration_add_media_columns.sql")

    # 2. UPDATE statements
    lines = ["-- Migration: Populate exercise image URLs"]
    lines.append("-- Source: https://github.com/yuhonas/free-exercise-db (public domain)")
    lines.append("-- Run AFTER migration_add_media_columns.sql\n")
    lines.append("BEGIN;")

    for m in matched:
        name_escaped = m["our_name"].replace("'", "''")
        url0 = m["img_url_0"] or ""
        url1 = m["img_url_1"] or ""
        lines.append(
            f"UPDATE exercises SET image_url_0 = '{url0}', image_url_1 = '{url1}' "
            f"WHERE name = '{name_escaped}';"
        )

    lines.append("\nCOMMIT;")
    lines.append(f"\n-- {len(matched)} exercises updated, {len(unmatched)} unmatched")

    with open("migration_exercise_images.sql", "w") as f:
        f.write("\n".join(lines))
    print("Wrote: migration_exercise_images.sql")
    print("\nDone! Paste both SQL files into Supabase SQL Editor (columns first, then data).")


if __name__ == "__main__":
    main()
