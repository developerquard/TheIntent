import json
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from core.audit_verify import verify_audit_log

def sign_root():
    ok, msg = verify_audit_log()
    if not ok:
        raise RuntimeError("Audit log failed verification")

    # Extract last record hash
    with open("intent_audit.log") as f:
        last = None
        for line in f:
            line = line.strip()
            if not line:
                continue
            last = json.loads(line)

    root_hash = last["record_hash"]

    with open("uaal_private_key.pem", "rb") as f:
        private_key = serialization.load_pem_private_key(f.read(), password=None)

    signature = private_key.sign(root_hash.encode())

    with open("signed_audit_root.json", "w") as f:
        json.dump({
            "root_hash": root_hash,
            "signature": signature.hex()
        }, f, indent=2)

    print("Audit root hash signed.")

if __name__ == "__main__":
    sign_root()
