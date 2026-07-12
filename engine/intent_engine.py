import json
import hashlib
import sys

from abuse_policies import abuse_flags
from block_policy import should_hard_block

INTENT_POLICY_VERSION = "sd-v0.2"


def enforcement_level(flags):
    if not flags:
        return "ALLOW"
    if "WEAK_SOCIAL_SIGNAL_LEAP" in flags:
        return "SOFT_BLOCK"
    if "REPEATED_EXPOSURE_RISK" in flags and "LOW_CONFIDENCE_RECOMMENDATION" in flags:
        return "SOFT_BLOCK"
    return "FLAG"


def evaluate_intent(intent):
    flags = []

    confidence = intent.get("confidence", 0)
    signals = intent.get("signals", {})
    mutuals = signals.get("mutual_connections", 0)
    similarity = signals.get("profile_similarity", 0)
    exposures = intent.get("historical_exposures", 0)

    # POLICY 1: Low confidence
    if intent["intent_type"] == "recommend_connection":
        if confidence < 0.6:
            flags.append("LOW_CONFIDENCE_RECOMMENDATION")

    # POLICY 2: Overexposure
    if exposures >= 3:
        flags.append("REPEATED_EXPOSURE_RISK")

    # POLICY 3: Weak signal leap
    if mutuals == 0 and similarity < 0.5:
        flags.append("WEAK_SOCIAL_SIGNAL_LEAP")

    # ABUSE POLICIES (identity-free)
    abuse = abuse_flags(intent)
    flags.extend(abuse)

    # HASH (must be before enforcement)
    intent_hash = hashlib.sha256(
        json.dumps(intent, sort_keys=True).encode()
    ).hexdigest()

    # HARD BLOCK CHECK
    if should_hard_block(intent, flags):
        decision = "HARD_BLOCK"
    else:
        decision = enforcement_level(flags)

    return {
        "decision": decision,
        "mode": "SHADOW",
        "policy_version": INTENT_POLICY_VERSION,
        "risk_flags": flags,
        "intent_hash": intent_hash
    }


if __name__ == "__main__":
    with open(sys.argv[1]) as f:
        intent = json.load(f)

    result = evaluate_intent(intent)
    print(json.dumps(result, indent=2))
