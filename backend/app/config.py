"""
TaskFlow - Application Configuration
Loads environment from .env or env.yaml (Cloud Run).
"""
import os


def load_environment():
    """Load .env first (for local credentials), then layer env.yaml on top."""
    # Always try .env first — provides GOOGLE_APPLICATION_CREDENTIALS locally
    _load_dotenv()

    # Then overlay env.yaml (used by Cloud Run; also present locally)
    if os.path.exists("env.yaml"):
        try:
            import yaml
            with open("env.yaml", "r") as f:
                env_data = yaml.safe_load(f) or {}
                for key, value in env_data.items():
                    os.environ[key] = str(value)
            print(f"[config] Layered env.yaml: {list(env_data.keys())}")
        except ImportError:
            print("[config] yaml module not available, skipping env.yaml")
        except Exception as e:
            print(f"[config] Error loading env.yaml: {e}")


def _load_dotenv():
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("[config] Loaded from .env file")
    except ImportError:
        print("[config] Using system environment variables")


load_environment()


class Settings:
    PROJECT_ID: str = os.getenv("PROJECT_ID", "gen-ai-poc-onboarding")
    REGION: str = os.getenv("REGION", "us-central1")
    FIRESTORE_DATABASE: str = os.getenv("FIRESTORE_DATABASE", "taskflow-db")

    # CORS
    _cors_raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    )
    CORS_ORIGINS = ["*"] if "*" in _cors_raw else _cors_raw.split(",")


settings = Settings()
