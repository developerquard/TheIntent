import json
import time
import uuid
import hashlib
import os

AUDIT_LOG_FILE = "intent_audit.log"

def _hash_record(record: dict, prev_hash: str) -> str:
    payload = json.dumps(record, sort_keys=True)
    return hashlib.sha256((prev_hash + payload).encode()).hexdigest()

def _get_last_hash():
    if not os.path.exists(AUDIT_LOG_FILE):
        return "GENESIS"
    with open(AUDIT_LOG_FILE) as f:
        last = None
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                last = json.loads(line)
            except json.JSONDecodeError:
                continue
        return last["record_hash"] if last else "GENESIS"

def append_audit_record(intent, decision, mode):
    prev_hash = _get_last_hash()

    record = {
        "audit_id": str(uuid.uuid4()),
        "timestamp": int(time.time()),
        "mode": mode,
        "intent": intent,
        "decision": decision,
        "prev_hash": prev_hash,
    }

    record["record_hash"] = _hash_record(record, prev_hash)

    with open(AUDIT_LOG_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")

    return record["audit_id"]
