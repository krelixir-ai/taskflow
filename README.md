# TaskFlow App

A modern task management application built with **React** (Vite) + **FastAPI** + **Firestore**.

## Architecture

```
taskflow-app/
├── backend/             # FastAPI backend
│   ├── api/             # API routes (main.py, tasks.py)
│   ├── app/             # Core app (config, firestore, schemas, crud)
│   ├── Dockerfile       # Cloud Run container
│   ├── requirements.txt
│   └── env.yaml         # Cloud Run env vars
├── frontend/            # React (Vite + TypeScript)
│   ├── src/             # Components (App, TaskModal, ConfirmDialog)
│   ├── Dockerfile       # Multi-stage nginx build
│   └── nginx.conf
└── deploy_all.bat       # One-click deploy to Cloud Run
```

## GCP Configuration

- **Project**: `gen-ai-poc-onboarding` (shared with KRE Nexus)
- **Firestore Database**: `taskflow-db` (separate from KRE's `kre-nexus`)
- **Cloud Run Services**: `taskflow-backend`, `taskflow-frontend`
- **Region**: `us-central1`

## Local Development

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8081
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to backend at `http://localhost:8081`.

## APIs

| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| POST   | `/api/tasks`       | Create a new task   |
| GET    | `/api/tasks`       | List all tasks      |
| GET    | `/api/tasks/{id}`  | Get a single task   |
| PUT    | `/api/tasks/{id}`  | Update a task       |
| DELETE | `/api/tasks/{id}`  | Delete a task       |

## Deploy to Cloud Run

```bash
deploy_all.bat
```
