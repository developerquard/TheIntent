from core.intent_marketplace import IntentAuction

class MockUAALAllow:
    def evaluate_intent(self, intent):
        return {"decision": "ALLOW"}

class MockUAALBlock:
    def evaluate_intent(self, intent):
        return {"decision": "BLOCK", "reason": "High risk intent"}

def test_uaal_allows_intent():
    auction = IntentAuction(intent_evaluator=MockUAALAllow())
    result = auction.bid_on_intent({"type": "buy", "value": 100})
    assert result["status"] == "ALLOWED"

def test_uaal_blocks_intent():
    auction = IntentAuction(intent_evaluator=MockUAALBlock())
    result = auction.bid_on_intent({"type": "buy", "value": 100})
    assert result["status"] == "BLOCKED"
    assert result["reason"] == "High risk intent"
