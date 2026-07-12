import os
import json
import shutil
import time
from core.audit_verify import verify_audit_log
from core.monitoring import summarize

BUNDLE_DIR = "uaal_regulator_bundle"

def generate_bundle():
    if os.path.exists(BUNDLE_DIR):
        shutil.rmtree(BUNDLE_DIR)

    os.makedirs(BUNDLE_DIR)

    # 1. Copy audit log
    shutil.copy("intent_audit.log", f"{BUNDLE_DIR}/intent_audit.log")

    # 2. Verify audit integrity
    ok, msg = verify_audit_log()
    with open(f"{BUNDLE_DIR}/audit_verification.json", "w") as f:
        json.dump({
            "verified": ok,
            "message": msg,
            "timestamp": int(time.time())
        }, f, indent=2)

    # 3. Monitoring summary
    summary = summarize()
    with open(f"{BUNDLE_DIR}/monitoring_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    # 4. README
    with open(f"{BUNDLE_DIR}/README.txt", "w") as f:
        f.write(
            "UAAL REGULATOR RESPONSE BUNDLE\n\n"
            "Contents:\n"
            "- intent_audit.log          : append-only, hash-chained audit log\n"
            "- audit_verification.json   : integrity verification result\n"
            "- monitoring_summary.json   : aggregated decisions & trends\n\n"
            "Verification:\n"
            "1. Re-run hash verification on intent_audit.log\n"
            "2. Compare root hash with signed root\n"
        )

    print(f"Regulator bundle generated at ./{BUNDLE_DIR}")

if __name__ == "__main__":
    generate_bundle()
