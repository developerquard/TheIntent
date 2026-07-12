import json
import hashlib

AUDIT_LOG_FILE = "intent_audit.log"

def _hash_record(record: dict, prev_hash: str) -> str:
    payload = json.dumps(
        {k: v for k, v in record.items() if k != "record_hash"},
        sort_keys=True
    )
    return hashlib.sha256((prev_hash + payload).encode()).hexdigest()

def verify_audit_log():
    prev_hash = "GENESIS"
    line_no = 0

    with open(AUDIT_LOG_FILE) as f:
        for line in f:
            line_no += 1
            line = line.strip()
            if not line:
                continue

            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                return False, f"Invalid JSON at line {line_no}"

            expected_hash = _hash_record(record, prev_hash)
            actual_hash = record.get("record_hash")

            if actual_hash != expected_hash:
                return False, f"Hash mismatch at line {line_no}"

            if record.get("prev_hash") != prev_hash:
                return False, f"Broken chain at line {line_no}"

            prev_hash = actual_hash

    return True, "Audit log is intact"
