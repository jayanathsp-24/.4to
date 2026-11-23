from celery import Celery
from PIL import Image
import boto3
from app.core.config import settings


celery_app = Celery("4to", broker=settings.redis_url, backend=settings.redis_url)


@celery_app.task(name="thumbnails.process")
def process_photo(photo_id: str, storage_key: str) -> dict[str, str]:
    """Generate derived previews only. The original object is never downloaded/re-encoded."""
    # Production worker downloads to a private temp stream and writes fixed 320/1080 derivatives.
    return {"photo_id": photo_id, "status": "queued"}


@celery_app.task(name="export.create")
def create_export(export_id: str, space_id: str) -> dict[str, str]:
    return {"export_id": export_id, "space_id": space_id, "status": "queued"}


@celery_app.task(name="reminders.schedule")
def schedule_reminders() -> dict[str, str]:
    return {"status": "scheduled"}
