import random
import time

def generate_events(
    item_id,
    normal_rate=1,
    spike_rate=20,
    duration=60,
    spike_at=30
):
    """
    Generates timestamps simulating organic growth + bot spike.
    """
    events = []
    start = time.time()

    for t in range(duration):
        rate = spike_rate if t >= spike_at else normal_rate
        for _ in range(rate):
            events.append((item_id, start + t))

    return events
