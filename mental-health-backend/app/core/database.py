from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    database = None

database = Database()

async def connect_to_mongo():
    """Create database connection"""
    try:
        logger.info(f"Connecting to MongoDB with URL: {settings.DATABASE_URL}")
        logger.info(f"Database name: {settings.DATABASE_NAME}")
        
        database.client = AsyncIOMotorClient(settings.DATABASE_URL)
        database.database = database.client[settings.DATABASE_NAME]
        
        # Ping the database to verify connection
        await database.client.admin.command('ismaster')
        logger.info("Successfully connected to MongoDB Atlas")
        
        # List databases to verify connection
        db_list = await database.client.list_database_names()
        logger.info(f"Available databases: {db_list}")
        
        # List collections in our database
        collections = await database.database.list_collection_names()
        logger.info(f"Available collections in {settings.DATABASE_NAME}: {collections}")
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    if database.client:
        database.client.close()
        logger.info("Disconnected from MongoDB")

def get_database():
    """Get database instance"""
    return database.database