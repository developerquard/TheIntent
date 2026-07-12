import requests
from nostr.event import Event
from your_intent_engine import evaluate_intent
from activitypub.models import Activity  # Hypothetical AP lib

def aggregate_federated_velocity(nostr_event: Event, ap_activity: Activity):
    # Nostr signals
    nostr_signals = get_event_signals(nostr_event)  # From tags
    # AP signals (e.g., likes count)
    ap_signals = requests.get(ap_activity.object.id + '/likes').json()['totalItems']
    total_velocity = nostr_signals['velocity'] + (ap_signals / 3600)  # Normalize
    intent = {
        "type": "federated_note",
        "signals": {
            "cross_velocity": total_velocity,
            "decay": nostr_signals['decay'] * 0.9  # AP decay factor
        }
    }
    decision = evaluate_intent(intent)
    if decision['decision'] == 'SOFT_BLOCK':
        # Propagate: Mute in both
        mute_nostr(nostr_event.pubkey)
        block_ap(ap_activity.actor)
    return decision

def get_event_signals(event):
    for tag in event.tags:
        if tag[0] == 'velocity':
            return {'velocity': float(tag[1]), 'decay': float(tag[2])}
    return {'velocity': 0, 'decay': 1}

# Usage: In Mostr webhook
# aggregate_federated_velocity(incoming_nostr_event, incoming_ap_activity)
