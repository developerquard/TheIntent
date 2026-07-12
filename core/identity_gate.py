import hmac
import hashlib

class IdentityGate:
    def __init__(self, required_score=15.0):
        self.required_score = required_score

    def verify_passport(self, user_id, gitcoin_score):
        """
        Lethal Edge: Decisions aren't just based on velocity, 
        but on 'Humanity Attestation'.
        """
        if gitcoin_score >= self.required_score:
            return True, "HUMAN_VERIFIED"
        return False, "LOW_HUMANITY_SCORE"

    def sign_decision(self, decision_data, secret_key):
        """Creates a tamper-evident signature for the decision."""
        msg = str(decision_data).encode()
        return hmac.new(secret_key.encode(), msg, hashlib.sha256).hexdigest()
