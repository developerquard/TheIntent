import math
import time

def calculate_decay_score(raw_likes, post_time, half_life_seconds=3600):
    """
    Deterministic time decay.
    Score decreases as post ages.
    """
    age_seconds = max(0, time.time() - post_time)

    # Exponential decay: score = likes * 0.5^(age / half_life)
    decay_factor = math.pow(0.5, age_seconds / half_life_seconds)

    # Normalize to [0,1] range roughly
    score = min(1.0, (raw_likes / 100.0) * decay_factor)
    return round(score, 4)
