"""
Brand-facing trend engine using intent trust
"""

from collections import defaultdict

def compute_trending_topics(intents, min_trust=0.6):
    """
    intents: list of dicts with
      - topic
      - trust_score
      - velocity
    """

    buckets = defaultdict(float)

    for intent in intents:
        if intent["trust_score"] < min_trust:
            continue

        # Trend = velocity × trust
        buckets[intent["topic"]] += (
            intent["velocity"] * intent["trust_score"]
        )

    ranked = sorted(
        buckets.items(),
        key=lambda x: x[1],
        reverse=True
    )

    return ranked
