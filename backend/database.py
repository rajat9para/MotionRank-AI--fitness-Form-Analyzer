import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "")

_client = None
_db = None


async def get_db():
    """Lazy MongoDB connection — connects on first use."""
    global _client, _db
    if _db is None:
        if not MONGODB_URI:
            raise RuntimeError("MONGODB_URI not configured. Set it in your .env file.")
        _client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        await _client.admin.command("ping")
        _db = _client.motionrank
        logger.info("Connected to MongoDB Atlas.")
    return _db


async def close_db():
    """Close MongoDB connection on shutdown."""
    global _client
    if _client:
        _client.close()


def get_collection(name: str):
    """Get a collection — must be called after get_db() has been called at least once."""
    if _db is None:
        raise RuntimeError("Database not initialized. Call get_db() first.")
    return _db[name]
