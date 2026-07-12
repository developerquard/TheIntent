import json
from engine.intent_engine import evaluate_intent

synthetic_users = [
    ("user_A", "user_B", 0.55, 3, 0),
    ("user_A", "user_C", 0.82, 0, 2),
    ("user_A", "user_D", 0.48, 4, 0),
]

for subject, target, confidence, exposures, mutuals in synthetic_users:
    intent = {
        "intent_type": "recommend_connection",
        "actor": "system",
        "subject_user": subject,
        "target_user": target,
        "confidence": confidence,
        "historical_exposures": exposures,
        "signals": {
            "mutual_connections": mutuals,
            "profile_similarity": confidence
        },
        "surface": "trending",
        "timestamp": "2025-01-30T12:00:00Z"
    }

    result = evaluate_intent(intent)
    print(json.dumps(result, indent=2))

