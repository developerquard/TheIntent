"""
Rolling intent reputation per entity per domain
"""

from collections import defaultdict

class IntentReputation:
    def __init__(self):
        self._scores = defaultdict(list)

    def add_intent_score(self, entity_id, domain, score):
        self._scores[(entity_id, domain)].append(score)

    def get_reputation(self, entity_id, domain):
        scores = self._scores.get((entity_id, domain), [])
        if not scores:
            return 0.0
        return round(sum(scores) / len(scores), 4)
