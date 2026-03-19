import os
#!/usr/bin/env python3
"""Create diverse Kravex test users in Supabase"""

import json
import urllib.request
import urllib.error
import time

SUPABASE_URL = "https://wbccpqklrbswnumwhpgq.supabase.co"
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

TEST_USERS = [
    {
        "email": "thomas.beginner@kravex.test",
        "settings": {
            "name": "Thomas",
            "gender": "male",
            "goal": "hypertrophy",
            "frequency": "3x",
            "restTime": 90,
            "units": "kg",
            "bodyweight": "78",
            "experienceLevel": "beginner",
            "equipment": "full_gym",
            "benchMax": "60",
            "squatMax": "80",
            "deadliftMax": "100",
            "trainingGoal": "hypertrophy",
            "trainingPhase": "build",
            "onboardingCompleted": True,
            "language": "nl",
            "time": 60,
        }
    },
    {
        "email": "sara.weightloss@kravex.test",
        "settings": {
            "name": "Sara",
            "gender": "female",
            "goal": "weight_loss",
            "frequency": "4x",
            "restTime": 60,
            "units": "kg",
            "bodyweight": "65",
            "experienceLevel": "beginner",
            "equipment": "home_gym",
            "benchMax": "",
            "squatMax": "50",
            "deadliftMax": "",
            "trainingGoal": "conditioning",
            "trainingPhase": "build",
            "onboardingCompleted": True,
            "language": "nl",
            "time": 45,
        }
    },
    {
        "email": "mark.powerlifter@kravex.test",
        "settings": {
            "name": "Mark",
            "gender": "male",
            "goal": "strength",
            "frequency": "5x",
            "restTime": 180,
            "units": "kg",
            "bodyweight": "95",
            "experienceLevel": "advanced",
            "equipment": "full_gym",
            "benchMax": "160",
            "squatMax": "220",
            "deadliftMax": "260",
            "trainingGoal": "strength",
            "trainingPhase": "peak",
            "mainLift": "squat",
            "mainLiftGoalKg": 240,
            "onboardingCompleted": True,
            "language": "nl",
            "time": 90,
        }
    },
    {
        "email": "lisa.intermediate@kravex.test",
        "settings": {
            "name": "Lisa",
            "gender": "female",
            "goal": "hypertrophy",
            "frequency": "4x",
            "restTime": 90,
            "units": "kg",
            "bodyweight": "60",
            "experienceLevel": "intermediate",
            "equipment": "full_gym",
            "benchMax": "50",
            "squatMax": "80",
            "deadliftMax": "90",
            "trainingGoal": "hypertrophy",
            "trainingPhase": "build",
            "priorityMuscles": ["glutes", "shoulders"],
            "onboardingCompleted": True,
            "language": "en",
            "time": 75,
        }
    },
    {
        "email": "kevin.homegym@kravex.test",
        "settings": {
            "name": "Kevin",
            "gender": "male",
            "goal": "hypertrophy",
            "frequency": "4x",
            "restTime": 90,
            "units": "kg",
            "bodyweight": "82",
            "experienceLevel": "intermediate",
            "equipment": "home_gym",
            "benchMax": "90",
            "squatMax": "120",
            "deadliftMax": "140",
            "trainingGoal": "powerbuilding",
            "trainingPhase": "build",
            "onboardingCompleted": True,
            "language": "nl",
            "time": 60,
        }
    },
    {
        "email": "anna.noequip@kravex.test",
        "settings": {
            "name": "Anna",
            "gender": "female",
            "goal": "conditioning",
            "frequency": "3x",
            "restTime": 60,
            "units": "kg",
            "bodyweight": "58",
            "experienceLevel": "beginner",
            "equipment": "bodyweight_only",
            "benchMax": "",
            "squatMax": "",
            "deadliftMax": "",
            "trainingGoal": "conditioning",
            "trainingPhase": "build",
            "onboardingCompleted": True,
            "language": "nl",
            "time": 30,
        }
    },
    {
        "email": "pieter.deload@kravex.test",
        "settings": {
            "name": "Pieter",
            "gender": "male",
            "goal": "strength",
            "frequency": "5x",
            "restTime": 120,
            "units": "kg",
            "bodyweight": "88",
            "experienceLevel": "advanced",
            "equipment": "full_gym",
            "benchMax": "130",
            "squatMax": "180",
            "deadliftMax": "210",
            "trainingGoal": "strength",
            "trainingPhase": "deload",
            "onboardingCompleted": True,
            "language": "nl",
            "time": 75,
        }
    },
    {
        "email": "jana.lbs@kravex.test",
        "settings": {
            "name": "Jana",
            "gender": "female",
            "goal": "hypertrophy",
            "frequency": "4x",
            "restTime": 90,
            "units": "lbs",
            "bodyweight": "140",
            "experienceLevel": "intermediate",
            "equipment": "full_gym",
            "benchMax": "95",
            "squatMax": "155",
            "deadliftMax": "185",
            "trainingGoal": "hypertrophy",
            "trainingPhase": "build",
            "priorityMuscles": ["back", "arms"],
            "onboardingCompleted": True,
            "language": "en",
            "time": 60,
        }
    },
]


def supabase_request(method, path, body=None):
    url = f"{SUPABASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read()
            return json.loads(body) if body else {"ok": True}
    except urllib.error.HTTPError as e:
        body = e.read()
        return json.loads(body) if body else {"error": e.code}


def create_user(email, password="Kravex2026!"):
    return supabase_request("POST", "/auth/v1/admin/users", {
        "email": email,
        "password": password,
        "email_confirm": True,
    })


def upsert_settings(user_id, settings):
    import datetime
    settings["memberSince"] = datetime.datetime.utcnow().isoformat()
    url = f"{SUPABASE_URL}/rest/v1/user_settings"
    body = json.dumps({
        "user_id": user_id,
        "settings": settings,
        "updated_at": datetime.datetime.utcnow().isoformat(),
    }).encode()
    headers = {**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"}
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return {"ok": True, "status": resp.status}
    except urllib.error.HTTPError as e:
        body = e.read()
        return json.loads(body) if body else {"error": e.code}


def main():
    print("Creating Kravex test users...\n")
    results = []

    for user in TEST_USERS:
        print(f"Creating {user['email']}...")
        resp = create_user(user["email"])

        if "id" in resp:
            user_id = resp["id"]
            print(f"  Auth user created: {user_id}")

            # Upsert settings
            settings_resp = upsert_settings(user_id, user["settings"])
            name = user["settings"]["name"]
            level = user["settings"]["experienceLevel"]
            goal = user["settings"]["trainingGoal"]
            equipment = user["settings"]["equipment"]
            units = user["settings"]["units"]
            print(f"  Settings saved: {name} | {level} | {goal} | {equipment} | {units}")
            results.append({"email": user["email"], "id": user_id, "status": "created"})
        else:
            msg = resp.get("msg", resp.get("message", str(resp)))
            print(f"  Error: {msg}")
            results.append({"email": user["email"], "status": "error", "error": msg})

        time.sleep(0.3)

    print("\n=== SUMMARY ===")
    for r in results:
        status = "OK" if r["status"] == "created" else "FAIL"
        print(f"[{status}] {r['email']}")

    print("\nPassword voor alle users: Kravex2026!")


if __name__ == "__main__":
    main()
