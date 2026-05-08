"""
TaskFlow - Task API Router
Exposes POST, GET, PUT, DELETE endpoints for the tasks collection.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.crud import create_task, get_task, list_tasks, update_task, delete_task

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.post("", response_model=TaskResponse, status_code=201)
async def api_create_task(payload: TaskCreate):
    """Create a new task."""
    return create_task(payload)


@router.get("", response_model=list[TaskResponse])
async def api_list_tasks(
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all tasks with optional filters."""
    return list_tasks(status=status, priority=priority, limit=limit, offset=offset)


@router.get("/{task_id}", response_model=TaskResponse)
async def api_get_task(task_id: str):
    """Get a single task by ID."""
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def api_update_task(task_id: str, payload: TaskUpdate):
    """Update (partial) an existing task."""
    task = update_task(task_id, payload)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/{task_id}", status_code=204)
async def api_delete_task(task_id: str):
    """Delete a task."""
    deleted = delete_task(task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
