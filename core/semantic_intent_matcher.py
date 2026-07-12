import json
from sentence_transformers import SentenceTransformer, util
from core.intent_engine import evaluate_intent  # Your core

model = SentenceTransformer('all-MiniLM-L6-v2')

def match_semantic_intents(query: str, user_id: str, top_k: int = 5):
    query_emb = model.encode(query)
    # Load user/community intents (e.g., from DB or JSON)
    intents_db = load_intents_db()  # Mock: [{"id": "1", "text": "vegan hiking Tokyo", "emb": [...], "user_id": "abc"}]
    hits = util.semantic_search(query_emb, [i['emb'] for i in intents_db], top_k=top_k)[0]
    matched_intents = []
    for score, idx in hits:
        intent = intents_db[idx]
        enriched = {
            "type": "semantic_match",
            "signals": {"relevance": score, "velocity": get_user_velocity(intent['user_id'])},
            "target": intent
        }
        decision = evaluate_intent(enriched)  # Policy gate (e.g., block low-relevance)
        if decision['decision'] == 'ALLOW':
            matched_intents.append({**enriched, "decision": decision})
    # Audit trail: Log replayable
    log_audit("semantic_match", query, matched_intents, user_id)
    return matched_intents

def load_intents_db():
    # Placeholder: Load from JSON/DB
    return [{"id": "1", "text": "vegan hiking", "emb": model.encode("vegan hiking").tolist(), "user_id": "abc"}]

def get_user_velocity(user_id):
    # From your trending_policy
    return 1.2  # Mock

def log_audit(action, query, results, user_id):
    with open('audit_logs.json', 'a') as f:
        json.dump({"action": action, "query": query, "results": results, "user": user_id}, f)
        f.write('\n')

# Usage: matches = match_semantic_intents("vegan hikers in Tokyo", "user123")
