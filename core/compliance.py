from enum import Enum

class ComplianceMode(Enum):
    STRICT = "STRICT"      # Block everything suspicious
    SHADOW = "SHADOW"      # Log everything, block nothing
    ADAPTIVE = "ADAPTIVE"  # Move between modes based on threat level

class ComplianceFirewall:
    def __init__(self, mode=ComplianceMode.SHADOW):
        self.mode = mode

    def enforce(self, policy_result):
        if self.mode == ComplianceMode.SHADOW:
            # Replay-only mode: record but don't disrupt
            return {"action": "ALLOW", "logged_warning": policy_result['threat']}
        
        if policy_result['threat_level'] > 0.8:
            return {"action": "BLOCK", "reason": "VIOLATION_OF_DETERMINISTIC_POLICY"}
            
        return {"action": "ALLOW"}
