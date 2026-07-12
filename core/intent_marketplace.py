import os
try:
    from web3 import Web3
except ImportError:
    Web3 = None

from core.audit_log import append_audit_record

UAAL_MODE = os.getenv("UAAL_MODE", "shadow")  # shadow | enforce


class IntentAuction:
    def __init__(self, web3_provider=None, intent_evaluator=None):
        if web3_provider and Web3 is None:
            raise RuntimeError("Web3 dependency not installed")

        self.web3 = Web3(web3_provider) if web3_provider else None
        self.intent_evaluator = intent_evaluator

    def bid_on_intent(self, intent_payload: dict):
        decision = {"decision": "ALLOW"}

        if self.intent_evaluator:
            decision = self.intent_evaluator.evaluate_intent(intent_payload)

        audit_id = append_audit_record(
            intent=intent_payload,
            decision=decision,
            mode=UAAL_MODE
        )

        if UAAL_MODE == "enforce" and decision.get("decision") != "ALLOW":
            return {
                "status": "BLOCKED",
                "reason": decision.get("reason", "UAAL policy"),
                "audit_id": audit_id,
            }

        return {
            "status": "ALLOWED",
            "audit_id": audit_id,
            "shadowed": UAAL_MODE == "shadow",
        }


def get_price_velocity(prices):
    if not prices or len(prices) < 2:
        return 0.0
    return (prices[-1] - prices[0]) / len(prices)


def check_bid_spike(bids, threshold=2.0):
    if not bids or len(bids) < 2:
        return False
    avg = sum(bids[:-1]) / max(len(bids) - 1, 1)
    return bids[-1] > avg * threshold
