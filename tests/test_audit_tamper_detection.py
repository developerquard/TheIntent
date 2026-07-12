import os
import json

from core.audit_log import append_audit_record
from core.audit_verify import verify_audit_log

AUDIT_LOG_FILE = "intent_audit.log"

def test_detects_audit_log_tampering():
    # Clean slate
    if os.path.exists(AUDIT_LOG_FILE):
        os.remove(AUDIT_LOG_FILE)

    # Write a valid record
    append_audit_record(
        intent={"action": "buy", "amount": 100},
        decision={"decision": "BLOCK", "reason": "Policy violation"},
        mode="enforce"
    )

    ok, _ = verify_audit_log()
    assert ok is True

    # 🔥 Tamper with the log (edit content)
    with open(AUDIT_LOG_FILE, "r+") as f:
        records = f.readlines()
        tampered = json.loads(records[0])
        tampered["intent"]["amount"] = 9999  # illegal change
        f.seek(0)
        f.write(json.dumps(tampered) + "\n")
        f.truncate()

    ok, msg = verify_audit_log()
    assert ok is False
    assert "Hash mismatch" in msg or "Broken chain" in msg
