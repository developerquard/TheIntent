import json
import sys
import hashlib

def replay(intent_file):
    with open(intent_file) as f:
        intent = json.load(f)

    intent_hash = hashlib.sha256(
        json.dumps(intent, sort_keys=True).encode()
    ).hexdigest()

    print("🔁 REPLAYING INTENT")
    print("------------------")
    print(json.dumps(intent, indent=2))
    print("\n🧾 INTENT HASH:")
    print(intent_hash)

if __name__ == "__main__":
    replay(sys.argv[1])
