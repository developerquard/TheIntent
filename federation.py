import requests
from your_intent_engine import evaluate_intent

def federate_intent(local_intent: dict, remote_server: str):
    # Send via ActivityPub
    resp = requests.post(f"{remote_server}/inbox", json=local_intent)
    if resp.status_code == 200:
        cross_intent = {"type": "federated_match", "signals": {"remote_velocity": resp.json()['rate']}}
        return evaluate_intent(cross_intent)
    return {"decision": "BLOCK"}

# Usage: federate_intent({"type": "follow"}, "https://mastodon.social")
