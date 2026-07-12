from carbon_interface import CarbonInterface  # API lib

def eco_intent(meet_loc: str, user_id: str):
    emissions = CarbonInterface().calculate(distance_to(meet_loc), mode='walk')
    intent = {"type": "green_match", "signals": {"emissions": emissions}}
    decision = evaluate_intent(intent)
    if decision['decision'] == 'ALLOW' and emissions < 10:
        award_tokens(user_id, 5)  # Crypto reward
    return decision

# Usage: eco_intent("Tokyo park", "user123")
