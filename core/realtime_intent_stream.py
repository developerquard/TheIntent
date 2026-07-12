import asyncio
import json
from websockets import serve, broadcast
from core.intent_engine import evaluate_intent

connected_clients = set()

async def realtime_handler(websocket, path):
    user_id = path.split('/')[-1]  # e.g., /stream/user123
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            intent = json.loads(message)
            # Gate with velocity (e.g., broadcast rate)
            intent["signals"]["stream_velocity"] = get_stream_velocity(user_id)
            decision = evaluate_intent(intent)
            if decision['decision'] == 'ALLOW':
                # Broadcast to relevant clients (e.g., matches)
                broadcast(connected_clients, json.dumps({"type": "realtime_update", "data": decision}))
            # Shadow mode: Log without broadcast
    finally:
        connected_clients.remove(websocket)

def get_stream_velocity(user_id):
    # Velocity check: Events per minute
    return len(get_recent_events(user_id, 60)) / 60  # Mock

def get_recent_events(user_id, seconds):
    # From your analytics
    return []  # Mock list

async def start_realtime_server(port=8765):
    async with serve(realtime_handler, "localhost", port):
        await asyncio.Future()  # Run forever

# Usage: asyncio.run(start_realtime_server())
# Client: ws = new WebSocket('ws://localhost:8765/stream/user123')
