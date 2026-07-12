from web3 import Web3
from core.intent_engine import evaluate_intent

w3 = Web3(Web3.HTTPProvider('your_infura_url'))

def trade_intent(nft_id: str, buyer_id: str, price: int):
    intent = {"type": "trade", "signals": {"price_velocity": check_spike(buyer_id)}}
    decision = evaluate_intent(intent)
    if decision['decision'] == 'ALLOW':
        tx = contract.functions.safeTransferFrom(buyer, seller, nft_id).build_transaction()
        return w3.eth.send_transaction(tx)
    return None

# Usage: trade_intent('hike_gear_nft', 'user123', 100)
