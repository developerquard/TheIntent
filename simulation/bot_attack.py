import time
import random
import sys
import os

# Ensure we can import from core
sys.path.append(os.getcwd())
from core.decay_logic import calculate_decay_score

def simulate_bot_attack():
    print("🛡️ Initializing Bot Attack Defense Simulation...")
    
    # Target post info
    post_id = "target_post_99"
    created_at = time.time() - 3600  # Posted 1 hour ago
    
    # 1. Normal Organic Growth
    organic_likes = 50
    organic_score = calculate_decay_score(organic_likes, created_at)
    
    # 2. Bot Attack (Sudden spike of 5000 likes)
    bot_likes = 5000
    total_likes = organic_likes + bot_likes
    manipulated_score = calculate_decay_score(total_likes, created_at)
    
    print(f"\n[Post: {post_id}]")
    print(f"Organic Score: {organic_score:.2f}")
    print(f"Post-Attack Score: {manipulated_score:.2f}")

    # 3. Detection Logic: Velocity Check
    # In a real system, we track 'likes per minute'
    likes_per_minute = total_likes / 60 
    THRESHOLD = 50  # Max 50 likes per minute for new accounts
    
    print(f"Current Velocity: {likes_per_minute:.2f} likes/min")
    
    if likes_per_minute > THRESHOLD:
        print("🚩 DECISION: HARD_BLOCK")
        print("🚩 RISK_FLAG: ANOMALOUS_VELOCITY_DETECTED")
    else:
        print("✅ DECISION: ALLOW")

if __name__ == "__main__":
    simulate_bot_attack()
