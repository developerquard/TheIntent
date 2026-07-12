import json
from collections import defaultdict
from engine.intent_engine import evaluate_intent

def compute_trending(intents):
    score = defaultdict(int)

    for intent in intents:
        result = evaluate_intent(intent)

        if result["decision"] == "ALLOW":
            target = intent.get("target_user")
            score[target] += 1

    return sorted(score.items(), key=lambda x: x[1], reverse=True)

if __name__ == "__main__":
    with open("intents.json") as f:
        intents = json.load(f)

    trending = compute_trending(intents)
    print(json.dumps(trending, indent=2))

# ===============================
# Velocity Gate Integration (SAFE)
# ===============================

from core.velocity_gate import VelocityGate

_velocity_gate = VelocityGate(
    window_seconds=300,
    max_events=40
)

def apply_velocity_gate(item_id, event_time=None):
    """
    Records engagement velocity and flags unnatural spikes.
    """
    count = _velocity_gate.record(item_id, event_time)

    if _velocity_gate.should_block(item_id):
        return {
            "decision": "SOFT_BLOCK",
            "risk_flags": ["VELOCITY_SPIKE_DETECTED"],
            "event_count": count
        }

    return {
        "decision": "ALLOW",
        "event_count": count
    }

# ===============================
# End Velocity Gate Integration
# ===============================


# ===============================
# Unified Trending Policy Hook
# ===============================

from core.trending_policy import evaluate_trending

def trending_decision(**kwargs):
    return evaluate_trending(**kwargs)

# ===============================
# End Unified Policy
# ===============================

