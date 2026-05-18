"""
TaskFlow - CRUD Operations against Firestore
Collection: tasks
"""
from datetime import datetime, timezone
from typing import Optional
from google.cloud.firestore_v1.base_query import FieldFilter

from app.firestore_client import get_db
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, UserCreate, UserInDB

COLLECTION = "tasks"
USERS_COLLECTION = "users" # New collection for users


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_doc(d: dict) -> dict:
    """
    Normalize a Firestore document dict to match the current TaskResponse schema.
    Handles legacy documents that used different field names or were missing fields.
    """
    # Map legacy 'name' field to 'title'
    if "title" not in d and "name" in d:
        d["title"] = d.pop("name")

    # Ensure required fields have fallback defaults for legacy documents
    now = _now_iso()
    d.setdefault("title", "Untitled Task")
    d.setdefault("priority", "medium")
    d.setdefault("status", "todo")
    d.setdefault("tags", [])
    d.setdefault("created_at", now)
    d.setdefault("updated_at", now)

    # Ensure tags is a list (guard against Firestore storing it differently)
    if not isinstance(d.get("tags"), list):
        d["tags"] = []

    return d


# ── CREATE ────────────────────────────────────────────────────────────────────

def create_task(payload: TaskCreate) -> TaskResponse:
    """Create a new task document in Firestore."""
    db = get_db()
    now = _now_iso()
    doc_ref = db.collection(COLLECTION).document()
    data = {
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    doc_ref.set(data)
    return TaskResponse(id=doc_ref.id, **data)


# ── READ (single) ────────────────────────────────────────────────────────────

def get_task(task_id: str) -> Optional[TaskResponse]:
    """Fetch a single task by its document ID."""
    db = get_db()
    doc = db.collection(COLLECTION).document(task_id).get()
    if not doc.exists:
        return None
    d = _normalize_doc(doc.to_dict())
    try:
        return TaskResponse(id=doc.id, **d)
    except Exception:
        return None


# ── READ (list) ──────────────────────────────────────────────────────────────

def list_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[TaskResponse]:
    """List tasks with optional filters, ordered by created_at descending."""
    db = get_db()
    query = db.collection(COLLECTION)

    if status:
        query = query.where(filter=FieldFilter("status", "==", status))
    if priority:
        query = query.where(filter=FieldFilter("priority", "==", priority))

    # Firestore requires composite indexes for where() + order_by().
    # If the index doesn't exist yet, fall back to client-side sort.
    try:
        ordered_query = query.order_by("created_at", direction="DESCENDING")
        ordered_query = ordered_query.offset(offset).limit(limit)
        docs = list(ordered_query.stream())
    except Exception:
        # Composite index not available — fetch without ordering, sort in Python
        unordered_query = query.offset(offset).limit(limit)
        docs = list(unordered_query.stream())
        docs.sort(key=lambda d: d.to_dict().get("created_at", ""), reverse=True)

    results = []
    for doc in docs:
        d = _normalize_doc(doc.to_dict())
        try:
            results.append(TaskResponse(id=doc.id, **d))
        except Exception as e:
            # Skip documents that cannot be mapped even after normalization
            import logging
            logging.warning(f"Skipping malformed task doc {doc.id}: {e}")
    return results


# ── UPDATE ────────────────────────────────────────────────────────────────────

def update_task(task_id: str, payload: TaskUpdate) -> Optional[TaskResponse]:
    """Partially update a task document."""
    db = get_db()
    doc_ref = db.collection(COLLECTION).document(task_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    update_data["updated_at"] = _now_iso()
    doc_ref.update(update_data)

    # Return the merged document
    refreshed = doc_ref.get().to_dict()
    return TaskResponse(id=task_id, **refreshed)


# ── DELETE ────────────────────────────────────────────────────────────────────

def delete_task(task_id: str) -> bool:
    """Delete a task document. Returns True if it existed."""
    db = get_db()
    doc_ref = db.collection(COLLECTION).document(task_id)
    doc = doc_ref.get()
    if not doc.exists:
        return False
    doc_ref.delete()
    return True


# ── USER CRUD ─────────────────────────────────────────────────────────────────

def get_user_by_username(username: str) -> Optional[UserInDB]:
    """Fetch a user by username."""
    db = get_db()
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.where(filter=FieldFilter("username", "==", username)).limit(1)
    docs = list(query.stream())
    if not docs:
        return None
    user_doc = docs[0]
    d = user_doc.to_dict()
    return UserInDB(id=user_doc.id, **d)


def create_user(payload: UserCreate, hashed_password: str) -> UserInDB:
    """Create a new user document in Firestore."""
    db = get_db()
    now = _now_iso()
    doc_ref = db.collection(USERS_COLLECTION).document()
    data = {
        "username": payload.username,
        "hashed_password": hashed_password,
        "created_at": now,
        "updated_at": now,
    }
    doc_ref.set(data)
    return UserInDB(id=doc_ref.id, **data)
