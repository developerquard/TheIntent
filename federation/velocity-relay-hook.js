const { evaluateIntent } = require('../core/intent_engine');  // Your policy via API

async function publishWithVelocity(relay, event) {
  const signals = await computeVelocity(event.pubkey, event.kind);  // e.g., recent events from DB
  const intent = {
    type: event.kind === 1 ? 'note' : 'reaction',
    signals: { velocity: signals.rate, decay: signals.decay, warmup: signals.warmup }
  };
  const decision = await evaluateIntent(intent);  // JSON-RPC to your engine
  if (decision.decision === 'ALLOW') {
    relay.publish(event);  // Broadcast to subscribers
    if (decision.federate) await bridgeToMostr(event);  // POST to AP inbox
    return true;
  }
  // Soft-block: Add to mute list (NIP-28)
  relay.mutePubkey(event.pubkey, 'high-velocity');
  return false;
}

async function computeVelocity(pubkey, kind) {
  // Query relay DB (e.g., SQLite) for last 1h events
  const events = await relay.db.getEvents(pubkey, kind, Date.now() - 3600000);
  const rate = events.length / 3600;
  const decay = rate * Math.exp(- (Date.now() - events[0].created_at) / 3600000);
  return { rate, decay, warmup: events.length < 5 };  // Warm-up if low activity
}

// Hook into relay: relay.on('event:publish', publishWithVelocity);
async function bridgeToMostr(event) {
  // Translate to AP Activity
  const activity = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    'type': 'Create',
    'actor': `https://mostr.pub/users/${event.pubkey}`,
    'object': { 'type': 'Note', 'content': event.content, 'tag': [{ type: 'velocity', name: event.tags.find(t => t[0] === 'velocity') }] }
  };
  await fetch('https://mostr.pub/inbox', { method: 'POST', body: JSON.stringify(activity) });
}

// Usage: In relay server
