import time
from fastapi import Request, HTTPException
from app.core.redis import redis_client

WINDOW = 60        # seconds
MAX_REQUESTS = 30  # per IP per window

async def rate_limiter(request: Request):
    ip = request.client.host
    key = f"rl:{ip}:{int(time.time() // WINDOW)}"

    count = redis_client.incr(key)
    if count == 1:
        redis_client.expire(key, WINDOW)

    if count > MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
