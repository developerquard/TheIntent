import { evaluateIntent } from '../backend/intent_engine';  // TS binding

interface ARIntent { type: 'join_space'; signals: { proximity: number; velocity: number }; }

async function joinARSpace(spaceId: string, userPos: {x: number, y: number, z: number}) {
  const intent: ARIntent = {
    type: 'join_space',
    signals: { proximity: calcDistance(userPos, spacePos), velocity: getUserVelocity(userId) }
  };
  const decision = await evaluateIntent(intent);  // Backend call
  if (decision === 'ALLOW') {
    // WebXR init: navigator.xr.requestSession('immersive-ar', options);
    renderSpace(spaceId);
  }
}

// Usage: joinARSpace('tokyo_hike_event', {x:0,y:0,z:0});
