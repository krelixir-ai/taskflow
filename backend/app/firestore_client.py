"""
TaskFlow - Firestore Client Singleton
Uses a separate Firestore database (taskflow-db) to keep data isolated
from the KRE Nexus database (kre-nexus).
"""
from google.cloud import firestore
from app.config import settings

_db_instance = None


def get_db() -> firestore.Client:
    """Return a cached Firestore client pointing at the taskflow-db database."""
    global _db_instance
    if _db_instance is None:
        _db_instance = firestore.Client(
            project=settings.PROJECT_ID,
            database=settings.FIRESTORE_DATABASE,
        )
        print(
            f"[firestore] Connected → project={settings.PROJECT_ID}, "
            f"database={settings.FIRESTORE_DATABASE}"
        )
    return _db_instance
