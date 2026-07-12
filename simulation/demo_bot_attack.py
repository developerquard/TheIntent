import time
from trending import trending_decision

def demo():
    post_id = "post_bot_attack"
    creator = "user_influencer"
    viewer = "random_viewer"

    print("\n--- Organic growth ---")
    for i in range(5):
        result = trending_decision(
            post_id=post_id,
            raw_likes=i + 1,
            post_time=time.time() - 3600,
            current_user=viewer,
            creator_id=creator,
            event_time=time.time()
        )
        print(result)

    print("\n--- Bot spike ---")
    for i in range(50):
        result = trending_decision(
            post_id=post_id,
            raw_likes=100 + i,
            post_time=time.time() - 3600,
            current_user=viewer,
            creator_id=creator,
            event_time=time.time()
        )
        if result["decision"] == "SOFT_BLOCK":
            print("🚨 BLOCKED:", result)
            break

if __name__ == "__main__":
    demo()
