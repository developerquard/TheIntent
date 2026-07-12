from core.intent_marketplace import (
    IntentAuction,
    get_price_velocity,
    check_bid_spike
)

def test_get_price_velocity_basic():
    prices = [100, 105, 110]
    assert get_price_velocity(prices) > 0

def test_get_price_velocity_empty():
    assert get_price_velocity([]) == 0.0

def test_check_bid_spike_false():
    bids = [100, 102, 101]
    assert not check_bid_spike(bids, threshold=3.0)

def test_check_bid_spike_true():
    bids = [100, 105, 300]
    assert check_bid_spike(bids, threshold=2.0)

def test_intent_auction_without_web3():
    auction = IntentAuction()
    assert auction.web3 is None
