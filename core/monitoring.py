import json
from collections import Counter, defaultdict
from datetime import datetime

AUDIT_LOG_FILE = "intent_audit.log"

def summarize():
    decisions = Counter()
    reasons = Counter()
    modes = Counter()
    by_day = defaultdict(int)

    with open(AUDIT_LOG_FILE) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue

            # Decision
            decision = r.get("decision", {}).get("decision", "UNKNOWN")
            decisions[decision] += 1

            # Reasons (only for non-allow)
            if decision != "ALLOW":
                reason = r.get("decision", {}).get("reason", "UNKNOWN")
                reasons[reason] += 1

            # Mode (backward compatible)
            mode = r.get("mode", "unknown")
            modes[mode] += 1

            # Time series
            ts = r.get("timestamp")
            if ts:
                day = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
                by_day[day] += 1

    return {
        "decisions": dict(decisions),
        "reasons": dict(reasons),
        "modes": dict(modes),
        "events_per_day": dict(by_day),
    }
