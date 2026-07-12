import os
from core.intent_marketplace import IntentAuction
from core.replay import replay_decision

AUDIT_LOG_FILE = "intent_audit.log"

class MockUAALBlock:
    def evaluate_intent(self, intent):
        return {"decision": "BLOCK", "reason": "Policy violation"}

def test_block_creates_replayable_audit():
    # 🔒 ensure clean audit log for test isolation
    if os.path.exists(AUDIT_LOG_FILE):
        os.remove(AUDIT_LOG_FILE)

    auction = IntentAuction(intent_evaluator=MockUAALBlock())
    result = auction.bid_on_intent({"type": "buy", "value": 999})

    assert result["status"] == "BLOCKED"
    audit_id = result["audit_id"]

    record = replay_decision(audit_id)
    assert record is not None
    assert record["decision"]["decision"] == "BLOCK"
    assert record["intent"]["value"] == 999
