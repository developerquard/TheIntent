import json
from sentence_transformers import SentenceTransformer
from your_intent_engine import evaluate_intent  # Existing import

model = SentenceTransformer('all-MiniLM-L6-v2')

def search_intents(query: str, user_id: str):
    query_emb = model.encode(query)
    # Fetch candidate intents from DB (e.g., user profiles as intents)
    candidates = load_intents_from_db(user_id)  # Mock: [{"text": "Vegan hiker", "emb": [...]}]
    scores = [cosine_similarity(query_emb, c['emb']) for c in candidates]
    intents = [{"type": "match", "signals": {"relevance": s}} for s in scores if s > 0.7]
    return [evaluate_intent(i) for i in intents]  # Apply policies

# Usage: results = search_intents("vegan hikers Tokyo", "user123")
