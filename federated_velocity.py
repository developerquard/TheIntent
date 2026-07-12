import asyncio
from atproto import Client  # pip-less; use requests for HTTP
from your_intent_engine import evaluate_intent
from collections import defaultdict

async def aggregate_velocity(relay_url: str, event_type: str, window_hours: int = 1):
    client = Client(base_url=relay_url)
    events = await client.app.bsky.feed.getTimeline()  # Fetch firehose-like stream
    velocities = defaultdict(float)
    for event in events:
        did = event.author.did
        velocities[did] += 1  # Increment for type match
    # Normalize to rate
    for did in velocities:
        velocities[did] /= window_hours * 3600  # Events/second, scaled
        intent = {"type": event_type, "signals": {"velocity": velocities[did]}}
        decision = evaluate_intent(intent)
        if decision['decision'] == 'SOFT_BLOCK':
            await client.com.atproto.moderation.emitFlag(did, 'velocity-spike')  # AT moderation API
    return velocities

# Usage: asyncio.run(aggregate_velocity('https://relay.bsky.app', 'like', 1))
