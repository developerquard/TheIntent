import time
from collections import deque, defaultdict

class VelocityGate:
    """
    Deterministic velocity limiter.
    Blocks unnatural engagement spikes without identity.
    """

    def __init__(self, window_seconds=300, max_events=40):
        self.window = window_seconds
        self.max_events = max_events
        self.events = defaultdict(deque)

    def record(self, item_id, timestamp=None):
        ts = timestamp or time.time()
        q = self.events[item_id]
        q.append(ts)

        # Drop events outside the window
        while q and ts - q[0] > self.window:
            q.popleft()

        return len(q)

    def should_block(self, item_id):
        return len(self.events[item_id]) > self.max_events
