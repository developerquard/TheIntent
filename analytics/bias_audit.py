from collections import defaultdict
import random
import time
from core.trending_policy import evaluate_trending

def run_bias_audit(samples=500):
    results = defaultdict(int)

    for _ in range(samples):
        raw_likes = random.randint(1, 20)
        creator = random.choice(["small_user", "big_user"])
        viewer = f"viewer_{random.randint(1,100)}"

        decision = evaluate_trending(
            post_id=f"post_{random.randint(1,10)}",
            raw_likes=raw_likes,
            post_time=time.time() - random.randint(0, 7200),
            current_user=viewer,
            creator_id=creator,
            event_time=time.time()
        )

        # Measure suppression AFTER warm-up only
        if decision["decision"] == "SOFT_BLOCK" and raw_likes >= 10:
            results[f"{creator}_SOFT_BLOCK"] += 1
        else:
            results[f"{creator}_ALLOW"] += 1

    print("\nBias audit summary:")
    for k, v in results.items():
        print(k, v)

if __name__ == "__main__":
    run_bias_audit()
