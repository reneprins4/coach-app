#!/usr/bin/env python3
"""Seed additional exercises into Supabase exercises table."""
import json, urllib.request, urllib.error, sys

SUPABASE_URL = "https://wbccpqklrbswnumwhpgq.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY2NwcWtscmJzd251bXdocGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjU5NTcsImV4cCI6MjA4ODkwMTk1N30.wDMTD2RTIUd4AdvugPwgtE1TEEY6ws0VtMUvHXQdVC0"

NEW_EXERCISES = [
    # ── CHEST ──────────────────────────────────────────────────────────────
    {"name": "Dumbbell Fly", "muscle_group": "chest", "category": "isolation", "equipment": "dumbbell", "primary_muscles": ["chest"], "secondary_muscles": ["front_delts"], "difficulty": "beginner", "subfocus": "mid chest"},
    {"name": "Machine Chest Press", "muscle_group": "chest", "category": "compound", "equipment": "machine", "primary_muscles": ["chest"], "secondary_muscles": ["triceps", "front_delts"], "difficulty": "beginner", "subfocus": "mid chest"},
    {"name": "Smith Machine Bench Press", "muscle_group": "chest", "category": "compound", "equipment": "machine", "primary_muscles": ["chest"], "secondary_muscles": ["triceps", "front_delts"], "difficulty": "beginner", "subfocus": "mid chest"},
    {"name": "Landmine Press", "muscle_group": "chest", "category": "compound", "equipment": "barbell", "primary_muscles": ["chest", "front_delts"], "secondary_muscles": ["triceps"], "difficulty": "intermediate", "subfocus": "upper chest"},
    {"name": "Weighted Push-up", "muscle_group": "chest", "category": "compound", "equipment": "bodyweight", "primary_muscles": ["chest"], "secondary_muscles": ["triceps", "front_delts", "core"], "difficulty": "intermediate", "subfocus": "mid chest"},
    {"name": "Cable Crossover", "muscle_group": "chest", "category": "isolation", "equipment": "cable", "primary_muscles": ["chest"], "secondary_muscles": ["front_delts"], "difficulty": "beginner", "subfocus": "mid chest"},
    {"name": "Incline Machine Press", "muscle_group": "chest", "category": "compound", "equipment": "machine", "primary_muscles": ["chest"], "secondary_muscles": ["triceps", "front_delts"], "difficulty": "beginner", "subfocus": "upper chest"},

    # ── BACK ───────────────────────────────────────────────────────────────
    {"name": "Rack Pull", "muscle_group": "back", "category": "compound", "equipment": "barbell", "primary_muscles": ["back", "glutes"], "secondary_muscles": ["hamstrings", "core", "forearms"], "difficulty": "intermediate", "subfocus": "upper back"},
    {"name": "Trap Bar Deadlift", "muscle_group": "back", "category": "compound", "equipment": "barbell", "primary_muscles": ["back", "quads", "glutes"], "secondary_muscles": ["hamstrings", "core"], "difficulty": "intermediate", "subfocus": "posterior chain"},
    {"name": "Single Arm Cable Row", "muscle_group": "back", "category": "compound", "equipment": "cable", "primary_muscles": ["back"], "secondary_muscles": ["biceps", "rear_delts"], "difficulty": "beginner", "subfocus": "mid back"},
    {"name": "Machine Row", "muscle_group": "back", "category": "compound", "equipment": "machine", "primary_muscles": ["back"], "secondary_muscles": ["biceps", "rear_delts"], "difficulty": "beginner", "subfocus": "mid back"},
    {"name": "Reverse Grip Barbell Row", "muscle_group": "back", "category": "compound", "equipment": "barbell", "primary_muscles": ["back"], "secondary_muscles": ["biceps"], "difficulty": "intermediate", "subfocus": "lats"},
    {"name": "Inverted Row", "muscle_group": "back", "category": "compound", "equipment": "bodyweight", "primary_muscles": ["back"], "secondary_muscles": ["biceps", "rear_delts", "core"], "difficulty": "beginner", "subfocus": "mid back"},
    {"name": "Good Morning", "muscle_group": "back", "category": "compound", "equipment": "barbell", "primary_muscles": ["hamstrings", "back"], "secondary_muscles": ["glutes", "core"], "difficulty": "intermediate", "subfocus": "lower back"},
    {"name": "Cable Row (Wide Grip)", "muscle_group": "back", "category": "compound", "equipment": "cable", "primary_muscles": ["back"], "secondary_muscles": ["rear_delts", "biceps"], "difficulty": "beginner", "subfocus": "upper back"},
    {"name": "Weighted Pull-up", "muscle_group": "back", "category": "compound", "equipment": "bodyweight", "primary_muscles": ["back"], "secondary_muscles": ["biceps", "core"], "difficulty": "advanced", "subfocus": "lats"},

    # ── SHOULDERS ──────────────────────────────────────────────────────────
    {"name": "Military Press", "muscle_group": "shoulders", "category": "compound", "equipment": "barbell", "primary_muscles": ["front_delts", "side_delts"], "secondary_muscles": ["triceps", "core"], "difficulty": "intermediate", "subfocus": "front delts"},
    {"name": "Dumbbell Front Raise", "muscle_group": "shoulders", "category": "isolation", "equipment": "dumbbell", "primary_muscles": ["front_delts"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "front delts"},
    {"name": "Cable Front Raise", "muscle_group": "shoulders", "category": "isolation", "equipment": "cable", "primary_muscles": ["front_delts"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "front delts"},
    {"name": "Bent Over Lateral Raise", "muscle_group": "shoulders", "category": "isolation", "equipment": "dumbbell", "primary_muscles": ["rear_delts"], "secondary_muscles": ["rhomboids"], "difficulty": "beginner", "subfocus": "rear delts"},
    {"name": "Plate Front Raise", "muscle_group": "shoulders", "category": "isolation", "equipment": "barbell", "primary_muscles": ["front_delts"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "front delts"},
    {"name": "Cable Y-Raise", "muscle_group": "shoulders", "category": "isolation", "equipment": "cable", "primary_muscles": ["rear_delts", "side_delts"], "secondary_muscles": ["rhomboids"], "difficulty": "intermediate", "subfocus": "rear delts"},
    {"name": "Dumbbell Shrug", "muscle_group": "shoulders", "category": "isolation", "equipment": "dumbbell", "primary_muscles": ["traps"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "traps"},
    {"name": "Z-Press", "muscle_group": "shoulders", "category": "compound", "equipment": "barbell", "primary_muscles": ["front_delts", "side_delts"], "secondary_muscles": ["core", "triceps"], "difficulty": "advanced", "subfocus": "all heads"},
    {"name": "Landmine Lateral Raise", "muscle_group": "shoulders", "category": "isolation", "equipment": "barbell", "primary_muscles": ["side_delts"], "secondary_muscles": [], "difficulty": "intermediate", "subfocus": "side delts"},

    # ── LEGS ───────────────────────────────────────────────────────────────
    {"name": "Box Jump", "muscle_group": "legs", "category": "compound", "equipment": "bodyweight", "primary_muscles": ["quads", "glutes"], "secondary_muscles": ["hamstrings", "calves", "core"], "difficulty": "intermediate", "subfocus": "power"},
    {"name": "Step Up", "muscle_group": "legs", "category": "compound", "equipment": "dumbbell", "primary_muscles": ["quads", "glutes"], "secondary_muscles": ["hamstrings"], "difficulty": "beginner", "subfocus": "quads"},
    {"name": "Goblet Squat", "muscle_group": "legs", "category": "compound", "equipment": "dumbbell", "primary_muscles": ["quads", "glutes"], "secondary_muscles": ["core", "hamstrings"], "difficulty": "beginner", "subfocus": "quads"},
    {"name": "Reverse Lunge", "muscle_group": "legs", "category": "compound", "equipment": "dumbbell", "primary_muscles": ["quads", "glutes"], "secondary_muscles": ["hamstrings", "core"], "difficulty": "beginner", "subfocus": "quads"},
    {"name": "Dumbbell Romanian Deadlift", "muscle_group": "legs", "category": "compound", "equipment": "dumbbell", "primary_muscles": ["hamstrings", "glutes"], "secondary_muscles": ["back", "core"], "difficulty": "beginner", "subfocus": "hamstrings"},
    {"name": "Stiff Leg Deadlift", "muscle_group": "legs", "category": "compound", "equipment": "barbell", "primary_muscles": ["hamstrings", "glutes"], "secondary_muscles": ["back"], "difficulty": "intermediate", "subfocus": "hamstrings"},
    {"name": "Hip Abduction Machine", "muscle_group": "legs", "category": "isolation", "equipment": "machine", "primary_muscles": ["glutes"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "glutes"},
    {"name": "Donkey Calf Raise", "muscle_group": "legs", "category": "isolation", "equipment": "machine", "primary_muscles": ["calves"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "calves"},
    {"name": "Leg Press Calf Raise", "muscle_group": "legs", "category": "isolation", "equipment": "machine", "primary_muscles": ["calves"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "calves"},
    {"name": "Single Leg Press", "muscle_group": "legs", "category": "compound", "equipment": "machine", "primary_muscles": ["quads", "glutes"], "secondary_muscles": ["hamstrings"], "difficulty": "beginner", "subfocus": "quads"},
    {"name": "Zercher Squat", "muscle_group": "legs", "category": "compound", "equipment": "barbell", "primary_muscles": ["quads", "glutes"], "secondary_muscles": ["core", "hamstrings"], "difficulty": "advanced", "subfocus": "quads"},
    {"name": "Pause Squat", "muscle_group": "legs", "category": "compound", "equipment": "barbell", "primary_muscles": ["quads", "glutes"], "secondary_muscles": ["hamstrings", "core"], "difficulty": "intermediate", "subfocus": "quads"},
    {"name": "Cable Pull Through", "muscle_group": "legs", "category": "compound", "equipment": "cable", "primary_muscles": ["glutes", "hamstrings"], "secondary_muscles": ["back"], "difficulty": "beginner", "subfocus": "glutes"},

    # ── ARMS ───────────────────────────────────────────────────────────────
    {"name": "Reverse Curl", "muscle_group": "arms", "category": "isolation", "equipment": "barbell", "primary_muscles": ["brachialis", "forearms"], "secondary_muscles": ["biceps"], "difficulty": "beginner", "subfocus": "forearms"},
    {"name": "Zottman Curl", "muscle_group": "arms", "category": "isolation", "equipment": "dumbbell", "primary_muscles": ["biceps", "brachialis", "forearms"], "secondary_muscles": [], "difficulty": "intermediate", "subfocus": "full arm"},
    {"name": "Rope Pushdown", "muscle_group": "arms", "category": "isolation", "equipment": "cable", "primary_muscles": ["triceps"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "lateral head"},
    {"name": "Cable Overhead Tricep Extension", "muscle_group": "arms", "category": "isolation", "equipment": "cable", "primary_muscles": ["triceps"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "long head"},
    {"name": "JM Press", "muscle_group": "arms", "category": "compound", "equipment": "barbell", "primary_muscles": ["triceps"], "secondary_muscles": ["chest"], "difficulty": "intermediate", "subfocus": "long head"},
    {"name": "Spider Curl", "muscle_group": "arms", "category": "isolation", "equipment": "barbell", "primary_muscles": ["biceps"], "secondary_muscles": [], "difficulty": "intermediate", "subfocus": "peak"},
    {"name": "Drag Curl", "muscle_group": "arms", "category": "isolation", "equipment": "barbell", "primary_muscles": ["biceps"], "secondary_muscles": [], "difficulty": "intermediate", "subfocus": "long head"},
    {"name": "Weighted Dip", "muscle_group": "arms", "category": "compound", "equipment": "bodyweight", "primary_muscles": ["triceps", "chest"], "secondary_muscles": ["front_delts"], "difficulty": "intermediate", "subfocus": "triceps"},
    {"name": "Machine Bicep Curl", "muscle_group": "arms", "category": "isolation", "equipment": "machine", "primary_muscles": ["biceps"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "biceps"},
    {"name": "Single Arm Tricep Pushdown", "muscle_group": "arms", "category": "isolation", "equipment": "cable", "primary_muscles": ["triceps"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "lateral head"},

    # ── CORE ───────────────────────────────────────────────────────────────
    {"name": "Decline Crunch", "muscle_group": "core", "category": "isolation", "equipment": "bodyweight", "primary_muscles": ["core"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "rectus abdominis"},
    {"name": "Weighted Crunch", "muscle_group": "core", "category": "isolation", "equipment": "bodyweight", "primary_muscles": ["core"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "rectus abdominis"},
    {"name": "Knee Raise", "muscle_group": "core", "category": "isolation", "equipment": "bodyweight", "primary_muscles": ["core", "hip_flexors"], "secondary_muscles": [], "difficulty": "beginner", "subfocus": "lower abs"},
    {"name": "Mountain Climber", "muscle_group": "core", "category": "compound", "equipment": "bodyweight", "primary_muscles": ["core"], "secondary_muscles": ["shoulders", "hip_flexors"], "difficulty": "beginner", "subfocus": "stability"},
    {"name": "Toes to Bar", "muscle_group": "core", "category": "isolation", "equipment": "bodyweight", "primary_muscles": ["core", "hip_flexors"], "secondary_muscles": ["lats"], "difficulty": "advanced", "subfocus": "lower abs"},
    {"name": "Hollow Body Hold", "muscle_group": "core", "category": "isolation", "equipment": "bodyweight", "primary_muscles": ["core"], "secondary_muscles": [], "difficulty": "intermediate", "subfocus": "stability"},
    {"name": "Copenhagen Plank", "muscle_group": "core", "category": "isolation", "equipment": "bodyweight", "primary_muscles": ["obliques", "core"], "secondary_muscles": ["hip_adductors"], "difficulty": "advanced", "subfocus": "obliques"},
    {"name": "Windmill", "muscle_group": "core", "category": "compound", "equipment": "kettlebell", "primary_muscles": ["obliques", "core"], "secondary_muscles": ["shoulders", "hamstrings"], "difficulty": "advanced", "subfocus": "rotation"},
    {"name": "L-Sit", "muscle_group": "core", "category": "isolation", "equipment": "bodyweight", "primary_muscles": ["core", "hip_flexors"], "secondary_muscles": ["triceps"], "difficulty": "advanced", "subfocus": "compression"},
    {"name": "Stir the Pot", "muscle_group": "core", "category": "isolation", "equipment": "bodyweight", "primary_muscles": ["core"], "secondary_muscles": ["shoulders"], "difficulty": "intermediate", "subfocus": "stability"},
    {"name": "Landmine Rotation", "muscle_group": "core", "category": "compound", "equipment": "barbell", "primary_muscles": ["obliques", "core"], "secondary_muscles": ["shoulders"], "difficulty": "intermediate", "subfocus": "rotation"},
    {"name": "Cable Woodchop", "muscle_group": "core", "category": "compound", "equipment": "cable", "primary_muscles": ["obliques", "core"], "secondary_muscles": ["shoulders"], "difficulty": "beginner", "subfocus": "rotation"},
]

def get_existing_names():
    url = f"{SUPABASE_URL}/rest/v1/exercises?select=name"
    req = urllib.request.Request(url, headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    return {e["name"].lower() for e in data}

def insert_batch(exercises):
    url = f"{SUPABASE_URL}/rest/v1/exercises"
    payload = json.dumps(exercises).encode()
    req = urllib.request.Request(url, data=payload, method="POST", headers={
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    })
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()[:200]}")
        return e.code

existing = get_existing_names()
to_insert = [e for e in NEW_EXERCISES if e["name"].lower() not in existing]
skipped = len(NEW_EXERCISES) - len(to_insert)

print(f"Existing: {len(existing)}, New to insert: {len(to_insert)}, Skipped (duplicate): {skipped}")

if to_insert:
    # Insert in batches of 20
    for i in range(0, len(to_insert), 20):
        batch = to_insert[i:i+20]
        status = insert_batch(batch)
        print(f"  Batch {i//20+1}: inserted {len(batch)} exercises (HTTP {status})")

# Final count
req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/exercises?select=count", headers={"apikey": ANON_KEY, "Prefer": "count=exact"})
with urllib.request.urlopen(req) as r:
    total = r.headers.get("content-range", "?").split("/")[-1]
print(f"\nTotal exercises in DB: {total}")
