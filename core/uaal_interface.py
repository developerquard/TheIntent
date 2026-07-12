"""
UAAL interface for intent evaluation.

UAAL lives outside this repo.
Marketplace only depends on this contract.
"""

class UAALClient:
    def evaluate_intent(self, intent: dict) -> dict:
        """
        Expected return:
        {
          "decision": "ALLOW" | "BLOCK" | "SOFT_BLOCK",
          "reason": str (optional)
        }
        """
        raise NotImplementedError
