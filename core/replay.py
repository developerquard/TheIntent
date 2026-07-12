import json

AUDIT_LOG_FILE = "intent_audit.log"

def replay_decision(audit_id):
    try:
        with open(AUDIT_LOG_FILE) as f:
            for lineno, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue  # skip blank lines safely

                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    # skip corrupted / partial lines
                    continue

                if record.get("audit_id") == audit_id:
                    return record
    except FileNotFoundError:
        return None

    return None
