HARD_BLOCK_POLICIES = {
    "ACCOUNT_DELETION",
    "MASS_OUTREACH",
    "DATA_EXTRACTION"
}

def should_hard_block(intent, flags):
    if intent["intent_type"] in HARD_BLOCK_POLICIES:
        return True

    if "INTENT_VELOCITY_ABUSE" in flags and "LOW_CONFIDENCE_SPAM" in flags:
        return True

    return False
