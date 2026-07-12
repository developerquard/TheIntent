from core.velocity_gate import VelocityGate
from core.decay_logic import calculate_decay_score
from core.graph_utils import DiscoveryGraph

_velocity_gate = VelocityGate(window_seconds=300, max_events=40)
_graph = DiscoveryGraph()

def evaluate_trending(
    *,
    post_id,
    raw_likes,
    post_time,
    current_user,
    creator_id,
    decay_threshold=0.3,
    max_social_distance=2,
    event_time=None
):
    """
    Unified, deterministic trending policy (FIXED).
    """
    flags = []
    decision = "ALLOW"

    # --- Velocity Gate (hard signal) ---
    velocity_count = _velocity_gate.record(post_id, event_time)
    if _velocity_gate.should_block(post_id):
        return {
            "decision": "SOFT_BLOCK",
            "risk_flags": ["VELOCITY_SPIKE_DETECTED"],
            "signals": {
                "decay_score": None,
                "velocity_count": velocity_count,
                "social_distance": None
            }
        }

    # --- Decay Gate with Warm-up ---
    WARMUP_LIKES = 10
    decay_score = calculate_decay_score(raw_likes, post_time)

    if raw_likes >= WARMUP_LIKES and decay_score < decay_threshold:
        decision = "SOFT_BLOCK"
        flags.append("LOW_CONFIDENCE_RECOMMENDATION")

    # --- Social Distance (signal only, NEVER blocks) ---
    distance = _graph.get_social_distance(current_user, creator_id)
    if distance > max_social_distance:
        flags.append("WEAK_SOCIAL_SIGNAL_LEAP")

    return {
        "decision": decision,
        "risk_flags": sorted(set(flags)),
        "signals": {
            "decay_score": decay_score,
            "velocity_count": velocity_count,
            "social_distance": distance
        }
    }
