import hashlib
import json
import time
import sys

LOG_FILE = "intent_audit.log"

def append(entry):
    try:
        with open(LOG_FILE, "r") as f:
            last = f.readlines()[-1]
            prev_hash = last.split("|")[-1].strip()
    except:
        prev_hash = "GENESIS"

    payload = json.dumps(entry, sort_keys=True)
    combined = prev_hash + payload
    new_hash = hashlib.sha256(combined.encode()).hexdigest()

    with open(LOG_FILE, "a") as f:
        f.write(f"{time.time()} | {payload} | {new_hash}\n")

if __name__ == "__main__":
    append(json.loads(sys.argv[1]))
