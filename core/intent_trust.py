"""
Intent Trust Score
Measures whether an intent is reliable enough to:
- match
- trend
- enter rooms
"""

import math
import time

def compute_intent_trust(
    intent_quality: float,    # clarity, schema completeness [0,1]
    stability: float,         # temporal consistency [0,1]
    uaal_trust: float,        # from UAAL [0,1]
    outcome_signal: float,    # [-1, +1]
    created_at: float,        # unix timestamp
    now: float | None = None
):
    if now is None:
        now = time.time()

    age_hours = (now - created_at) / 3600.0

    # Exponential decay (intent must stay fresh)
    decay_lambda = 0.08   # tuneable
    decay = math.exp(-decay_lambda * age_hours)

    base = intent_quality * stability * uaal_trust

    # Outcome affects magnitude but not sign safety
    adjusted = base * (1 + max(-0.5, min(outcome_signal, 1.0)))

    trust_score = adjusted * decay

    return round(max(0.0, min(trust_score, 1.0)), 4)
