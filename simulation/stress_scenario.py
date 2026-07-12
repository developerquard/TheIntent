from simulation.data_generator import generate_events
from trending import apply_velocity_gate

def run_velocity_test():
    item_id = "post_123"
    events = generate_events(item_id)

    blocked = False

    for _, ts in events:
        result = apply_velocity_gate(item_id, ts)
        if result["decision"] == "SOFT_BLOCK":
            blocked = True
            print("🚨 Velocity block triggered:", result)
            break

    if not blocked:
        print("❌ Velocity gate failed to trigger")
    else:
        print("✅ Velocity gate works as expected")

if __name__ == "__main__":
    run_velocity_test()
