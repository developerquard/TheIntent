def abuse_flags(intent):
    flags = []

    velocity = intent.get("velocity", 0)
    surface = intent.get("surface")
    confidence = intent.get("confidence", 0)

    # High-frequency intent emission (spam)
    if velocity > 10:
        flags.append("INTENT_VELOCITY_ABUSE")

    # Low confidence repeated discovery attempts
    if confidence < 0.4 and velocity > 3:
        flags.append("LOW_CONFIDENCE_SPAM")

    # Cross-surface spraying
    if surface == "trending" and velocity > 5:
        flags.append("SURFACE_SPRAYING")

    return flags
