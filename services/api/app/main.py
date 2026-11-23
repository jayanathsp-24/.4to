from __future__ import annotations

import asyncio
import secrets
import re
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import Depends, FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import Base, engine, get_db
from app.core.security import (
    create_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.models import (
    Friendship,
    Message,
    Notification,
    Photo,
    PushToken,
    Reminder,
    Space,
    SpaceMember,
    SpacePhoto,
    TreeFolder,
    TreeSpaceLink,
    User,
)
from app.schemas.schemas import (
    FolderCreate,
    FolderOut,
    FriendRequestCreate,
    Login,
    MemberCreate,
    MessageCreate,
    NotificationOut,
    PhotoIds,
    PhotoOut,
    PushTokenCreate,
    Refresh,
    Register,
    SpacePlacement,
    SpaceCreate,
    SpaceUpdate,
    UploadComplete,
    UploadInit,
    UploadInitOut,
    UserUpdate,
)


app = FastAPI(title=".4to API", version="0.1.0")

allowed_origins = [o.strip() for o in settings.frontend_origin.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=allowed_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory sliding-window rate limiter
_rate_limits: dict[str, list[float]] = {}


def check_rate_limit(key: str, max_requests: int = 15, window_seconds: int = 60) -> None:
    now = time.time()
    timestamps = _rate_limits.setdefault(key, [])
    # Evict timestamps outside the sliding window
    _rate_limits[key] = [t for t in timestamps if now - t < window_seconds]
    if len(_rate_limits[key]) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait a moment before trying again.",
        )
    _rate_limits[key].append(now)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_bucket()


def ensure_bucket() -> None:
    try:
        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
        )
        try:
            client.head_bucket(Bucket=settings.s3_bucket)
        except ClientError:
            client.create_bucket(Bucket=settings.s3_bucket)
    except (BotoCoreError, ClientError):
        pass


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": ".4to-api"}


def user_out(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "storage_used_bytes": user.storage_used_bytes,
        "storage_limit_bytes": user.storage_limit_bytes,
    }


@app.post("/v1/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: Register, request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    client_ip = request.client.host if request.client else "local"
    check_rate_limit(f"register:{client_ip}", max_requests=20, window_seconds=60)
    if db.scalar(select(User).where(or_(User.email == str(payload.email), User.username == payload.username.lower()))):
        raise HTTPException(409, "Email or username already in use")
    user = User(
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
        username=payload.username.lower(),
        display_name=payload.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    access = create_token(str(user.id), "access", settings.access_token_minutes)
    refresh = create_token(str(user.id), "refresh", settings.refresh_token_days * 24 * 60)
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "user": user_out(user)}


@app.post("/v1/auth/login")
def login(payload: Login, request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    client_ip = request.client.host if request.client else "local"
    check_rate_limit(f"login:{client_ip}:{str(payload.email).lower()}", max_requests=15, window_seconds=60)
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    access = create_token(str(user.id), "access", settings.access_token_minutes)
    refresh = create_token(str(user.id), "refresh", settings.refresh_token_days * 24 * 60)
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "user": user_out(user)}


@app.post("/v1/auth/refresh")
def refresh(payload: Refresh, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        data = jwt.decode(payload.refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if data.get("kind") != "refresh":
            raise JWTError()
    except JWTError:
        raise HTTPException(401, "Invalid refresh token")
    user = db.get(User, uuid.UUID(str(data["sub"])))
    if not user:
        raise HTTPException(401, "Invalid refresh token")
    return {
        "access_token": create_token(str(user.id), "access", settings.access_token_minutes),
        "refresh_token": create_token(str(user.id), "refresh", settings.refresh_token_days * 24 * 60),
        "token_type": "bearer",
    }


@app.post("/v1/auth/logout")
def logout(_: User = Depends(get_current_user)) -> dict[str, bool]:
    return {"ok": True}


@app.get("/v1/users/check-username")
def check_username(u: str = Query(min_length=1, max_length=30), db: Session = Depends(get_db)) -> dict[str, bool]:
    exists = db.scalar(select(User.id).where(User.username == u.lower()))
    return {"available": exists is None}


@app.get("/v1/me")
def me(user: User = Depends(get_current_user)) -> dict[str, Any]:
    return user_out(user)


@app.patch("/v1/me")
def update_me(payload: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    db.commit()
    db.refresh(user)
    return user_out(user)


@app.get("/v1/users/search")
def search_users(q: str = Query(min_length=1, max_length=50), db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    # Escape SQL LIKE wildcards to prevent query manipulation or exhaustion
    sanitized = q.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_").strip()
    if not sanitized:
        return []
    users = db.scalars(select(User).where(User.username.ilike(f"%{sanitized}%", escape="\\")).limit(20)).all()
    return [user_out(u) for u in users]


@app.get("/v1/friends")
def friends(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    rows = db.scalars(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(Friendship.requester_id == user.id, Friendship.addressee_id == user.id),
        )
    ).all()
    result: list[dict[str, Any]] = []
    for row in rows:
        other_id = row.addressee_id if row.requester_id == user.id else row.requester_id
        other = db.get(User, other_id)
        if other:
            result.append(user_out(other))
    return result


@app.get("/v1/friends/requests")
def friend_requests(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    rows = db.scalars(select(Friendship).where(Friendship.addressee_id == user.id, Friendship.status == "pending")).all()
    return [{"id": str(r.id), "requester_id": str(r.requester_id), "status": r.status} for r in rows]


@app.post("/v1/friends/requests", status_code=201)
def create_friend_request(payload: FriendRequestCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    target = db.scalar(select(User).where(User.username == payload.username.lower()))
    if not target or target.id == user.id:
        raise HTTPException(404, "User not found")
    existing = db.scalar(
        select(Friendship).where(
            or_(
                (Friendship.requester_id == user.id) & (Friendship.addressee_id == target.id),
                (Friendship.requester_id == target.id) & (Friendship.addressee_id == user.id),
            )
        )
    )
    if existing:
        raise HTTPException(409, "Friendship or request already exists")
    row = Friendship(requester_id=user.id, addressee_id=target.id, status="pending")
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": str(row.id), "status": row.status}


@app.post("/v1/friends/requests/{request_id}/accept")
def accept_friend_request(request_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    row = db.get(Friendship, request_id)
    if not row or row.addressee_id != user.id or row.status != "pending":
        raise HTTPException(404, "Friend request not found")
    row.status = "accepted"
    db.commit()
    return {"status": "accepted"}


@app.post("/v1/friends/requests/{request_id}/decline")
def decline_friend_request(request_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    row = db.get(Friendship, request_id)
    if not row or row.addressee_id != user.id or row.status != "pending":
        raise HTTPException(404, "Friend request not found")
    row.status = "declined"
    db.commit()
    return {"status": "declined"}


@app.delete("/v1/friends/{user_id}")
def remove_friend(user_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, bool]:
    row = db.scalar(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                (Friendship.requester_id == user.id) & (Friendship.addressee_id == user_id),
                (Friendship.requester_id == user_id) & (Friendship.addressee_id == user.id),
            ),
        )
    )
    if not row:
        raise HTTPException(404, "Friend not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


pending_uploads: dict[str, UploadInit] = {}
_pending_timestamps: dict[str, float] = {}


def clean_expired_uploads() -> None:
    now = time.time()
    expired = [uid for uid, ts in list(_pending_timestamps.items()) if now - ts > 1800]
    for uid in expired:
        pending_uploads.pop(uid, None)
        pending_uploads.pop(f"{uid}:key", None)
        _pending_timestamps.pop(uid, None)


def s3_client() -> Any:
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
    )


MAX_FOLDER_DEPTH = 6


def folder_depth(db: Session, folder: TreeFolder) -> int:
    depth = 1
    current = folder
    while current.parent_id:
        depth += 1
        current = db.get(TreeFolder, current.parent_id)
        if not current:
            break
    return depth


def ensure_no_folder_cycle(db: Session, folder_id: uuid.UUID | None, parent_id: uuid.UUID | None) -> None:
    if not parent_id:
        return
    current_id: uuid.UUID | None = parent_id
    visited: set[uuid.UUID] = set()
    while current_id:
        if current_id in visited:
            raise HTTPException(422, "Folder cycle detected")
        visited.add(current_id)
        if current_id == folder_id:
            raise HTTPException(422, "Folder cannot be moved beneath itself")
        current = db.get(TreeFolder, current_id)
        if not current:
            break
        current_id = current.parent_id


def ensure_new_growth(db: Session, user: User) -> TreeFolder:
    branch = db.scalar(
        select(TreeFolder).where(
            TreeFolder.owner_id == user.id,
            TreeFolder.name == "New Growth",
            TreeFolder.parent_id.is_(None),
        )
    )
    if branch:
        return branch
    branch = TreeFolder(owner_id=user.id, parent_id=None, name="New Growth")
    db.add(branch)
    db.flush()
    return branch


def link_joined_space(db: Session, user: User, space_id: uuid.UUID) -> None:
    existing = db.scalar(
        select(TreeSpaceLink).where(TreeSpaceLink.user_id == user.id, TreeSpaceLink.space_id == space_id)
    )
    if existing:
        return
    branch = ensure_new_growth(db, user)
    db.add(TreeSpaceLink(user_id=user.id, space_id=space_id, folder_id=branch.id, position=0))


def link_new_space_branch(db: Session, user: User, space: Space) -> TreeFolder:
    existing = db.scalar(
        select(TreeFolder).where(
            TreeFolder.owner_id == user.id,
            TreeFolder.parent_id.is_(None),
            TreeFolder.name == space.name,
        )
    )
    branch = existing or TreeFolder(owner_id=user.id, parent_id=None, name=space.name)
    if not existing:
        db.add(branch)
        db.flush()
    db.add(TreeSpaceLink(user_id=user.id, space_id=space.id, folder_id=branch.id, position=0))
    return branch


def new_invite_code(db: Session) -> str:
    while True:
        code = secrets.token_urlsafe(6).replace("-", "").replace("_", "").upper()[:8]
        if not db.scalar(select(Space).where(Space.invite_code == code)):
            return code


def new_handle(db: Session, name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")[:22] or "space"
    candidate = base
    suffix = 2
    while db.scalar(select(Space).where(Space.handle == candidate)):
        candidate = f"{base[: max(1, 30 - len(str(suffix)) - 1)]}_{suffix}"
        suffix += 1
    return candidate


def ensure_space_handle(db: Session, space: Space) -> str:
    if not space.handle:
        space.handle = new_handle(db, space.name)
        db.flush()
    return space.handle


def ensure_space_code(db: Session, space: Space) -> str:
    if not space.invite_code:
        space.invite_code = new_invite_code(db)
        db.flush()
    return space.invite_code


def remove_space_link(db: Session, user_id: uuid.UUID, space_id: uuid.UUID) -> None:
    link = db.scalar(select(TreeSpaceLink).where(TreeSpaceLink.user_id == user_id, TreeSpaceLink.space_id == space_id))
    if link:
        db.delete(link)


def signed_thumb(photo: Photo | None) -> str | None:
    if not photo or not photo.thumb_key:
        return None
    try:
        return s3_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": photo.thumb_key},
            ExpiresIn=900,
        )
    except (BotoCoreError, ClientError):
        return None


def build_tree_branch(db: Session, user: User, folder: TreeFolder, links: list[TreeSpaceLink], folders: list[TreeFolder]) -> dict[str, Any]:
    child_folders = sorted(
        [item for item in folders if item.parent_id == folder.id],
        key=lambda item: (item.created_at, str(item.id)),
    )
    child_links = sorted(
        [item for item in links if item.folder_id == folder.id],
        key=lambda item: (item.position, item.created_at, str(item.id)),
    )
    spaces_out: list[dict[str, Any]] = []
    for link in child_links:
        space = db.get(Space, link.space_id)
        if not space:
            continue
        member_count = db.query(SpaceMember).filter(SpaceMember.space_id == space.id, SpaceMember.status == "joined").count()
        shared_count = db.query(SpacePhoto).filter(SpacePhoto.space_id == space.id, SpacePhoto.removed_at.is_(None)).count()
        my_shared = db.query(SpacePhoto).filter(
            SpacePhoto.space_id == space.id,
            SpacePhoto.shared_by == user.id,
            SpacePhoto.removed_at.is_(None),
        ).count()
        cover = db.get(Photo, space.cover_photo_id) if space.cover_photo_id else None
        spaces_out.append({
            "space_id": space.id,
            "name": space.name,
            "handle": ensure_space_handle(db, space),
            "invite_code": ensure_space_code(db, space),
            "start_date": space.start_date,
            "end_date": space.end_date,
            "status": space.status,
            "cover_thumb_url": signed_thumb(cover),
            "member_count": member_count,
            "shared_photo_count": shared_count,
            "my_contribution_pending": my_shared == 0,
        })
    photo_count = db.query(Photo).filter(Photo.owner_id == user.id, Photo.folder_id == folder.id, Photo.deleted_at.is_(None)).count()
    return {
        "id": folder.id,
        "name": folder.name,
        "photo_count": photo_count,
        "branches": [build_tree_branch(db, user, child, links, folders) for child in child_folders],
        "spaces": spaces_out,
    }


@app.get("/v1/tree/overview")
def tree_overview(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    folders = db.scalars(select(TreeFolder).where(TreeFolder.owner_id == user.id)).all()
    links = db.scalars(select(TreeSpaceLink).where(TreeSpaceLink.user_id == user.id)).all()
    roots = sorted([folder for folder in folders if folder.parent_id is None], key=lambda item: (item.created_at, str(item.id)))
    root_photos = db.query(Photo).filter(Photo.owner_id == user.id, Photo.folder_id.is_(None), Photo.deleted_at.is_(None)).count()
    return {
        "user": {"id": str(user.id), "username": user.username, "avatar_url": user.avatar_url},
        "root": {
            "id": str(user.id),
            "name": "Photo Tree",
            "photo_count": root_photos,
            "branches": [build_tree_branch(db, user, folder, links, folders) for folder in roots],
            "spaces": [],
        },
    }


@app.put("/v1/tree/spaces/{space_id}/placement")
def place_space(space_id: uuid.UUID, payload: SpacePlacement, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str | int]:
    require_joined(db, space_id, user)
    folder = db.get(TreeFolder, payload.folder_id)
    if not folder or folder.owner_id != user.id:
        raise HTTPException(404, "Folder not found")
    link = db.scalar(select(TreeSpaceLink).where(TreeSpaceLink.user_id == user.id, TreeSpaceLink.space_id == space_id))
    if not link:
        link_joined_space(db, user, space_id)
        db.flush()
        link = db.scalar(select(TreeSpaceLink).where(TreeSpaceLink.user_id == user.id, TreeSpaceLink.space_id == space_id))
    if not link:
        raise HTTPException(500, "Unable to place Space")
    link.folder_id = folder.id
    link.position = payload.position
    db.commit()
    return {"status": "placed", "folder_id": str(folder.id), "position": link.position}


@app.post("/v1/tree/folders", status_code=201)
def create_folder(payload: FolderCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> FolderOut:
    if payload.parent_id:
        parent = db.get(TreeFolder, payload.parent_id)
        if not parent or parent.owner_id != user.id:
            raise HTTPException(404, "Folder not found")
        if folder_depth(db, parent) >= MAX_FOLDER_DEPTH:
            raise HTTPException(422, "Maximum folder depth is 6")
    folder = TreeFolder(owner_id=user.id, parent_id=payload.parent_id, name=payload.name)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return FolderOut.model_validate(folder)


@app.get("/v1/tree/folders")
def list_folders(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[FolderOut]:
    return [FolderOut.model_validate(f) for f in db.scalars(select(TreeFolder).where(TreeFolder.owner_id == user.id)).all()]


@app.post("/v1/uploads/init")
def init_upload(payload: UploadInit, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> UploadInitOut:
    clean_expired_uploads()
    existing = db.scalar(select(Photo).where(Photo.owner_id == user.id, Photo.content_hash == payload.content_hash, Photo.deleted_at.is_(None)))
    if existing:
        return UploadInitOut(upload_id=str(existing.id), photo_id=existing.id, already_exists=True)
    upload_id = str(uuid.uuid4())
    pending_uploads[upload_id] = payload
    _pending_timestamps[upload_id] = time.time()
    key = f"originals/{user.id}/{upload_id}/{payload.name}"
    try:
        url = s3_client().generate_presigned_url(
            "put_object",
            Params={"Bucket": settings.s3_bucket, "Key": key, "ContentType": payload.mime_type},
            ExpiresIn=900,
        )
    except (BotoCoreError, ClientError):
        url = f"{settings.s3_public_endpoint}/{settings.s3_bucket}/{key}"
    pending_uploads[f"{upload_id}:key"] = key  # type: ignore[assignment]
    return UploadInitOut(upload_id=upload_id, already_exists=False, upload_url=url)


@app.post("/v1/uploads/complete", status_code=201)
def complete_upload(payload: UploadComplete, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> PhotoOut:
    metadata = pending_uploads.pop(payload.upload_id, None)
    key = pending_uploads.pop(f"{payload.upload_id}:key", None)
    _pending_timestamps.pop(payload.upload_id, None)
    if not metadata or not isinstance(metadata, UploadInit):
        raise HTTPException(404, "Upload not found")
    photo = Photo(
        owner_id=user.id,
        folder_id=metadata.folder_id,
        storage_key=str(key),
        content_hash=metadata.content_hash,
        mime_type=metadata.mime_type,
        size_bytes=metadata.size_bytes,
        taken_at=metadata.taken_at,
    )
    db.add(photo)
    user.storage_used_bytes += metadata.size_bytes
    db.commit()
    db.refresh(photo)
    return PhotoOut.model_validate(photo)


@app.post("/v1/uploads/abort")
def abort_upload(payload: UploadComplete, _: User = Depends(get_current_user)) -> dict[str, bool]:
    pending_uploads.pop(payload.upload_id, None)
    pending_uploads.pop(f"{payload.upload_id}:key", None)
    return {"ok": True}


@app.get("/v1/tree/photos")
def list_photos(folder: uuid.UUID | None = None, cursor: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[PhotoOut]:
    query = select(Photo).where(Photo.owner_id == user.id, Photo.deleted_at.is_(None))
    if folder:
        query = query.where(Photo.folder_id == folder)
    query = query.order_by(Photo.created_at.desc()).limit(100)
    return [PhotoOut.model_validate(p) for p in db.scalars(query).all()]


@app.get("/v1/tree/photos/suggest")
def suggest_photos(from_: date = Query(alias="from"), to: date = Query(alias="to"), db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[PhotoOut]:
    start = datetime.combine(from_ - timedelta(days=1), datetime.min.time())
    end = datetime.combine(to + timedelta(days=1), datetime.max.time())
    photos = db.scalars(select(Photo).where(Photo.owner_id == user.id, Photo.deleted_at.is_(None), Photo.taken_at.between(start, end)).limit(500)).all()
    return [PhotoOut.model_validate(p) for p in photos]


@app.patch("/v1/tree/folders/{folder_id}")
def update_folder(folder_id: uuid.UUID, payload: FolderCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> FolderOut:
    folder = db.get(TreeFolder, folder_id)
    if not folder or folder.owner_id != user.id:
        raise HTTPException(404, "Folder not found")
    folder.name = payload.name
    if payload.parent_id is not None:
        parent = db.get(TreeFolder, payload.parent_id)
        if not parent or parent.owner_id != user.id:
            raise HTTPException(404, "Parent folder not found")
        ensure_no_folder_cycle(db, folder_id, payload.parent_id)
        descendants_depth = folder_depth(db, parent)
        if descendants_depth >= MAX_FOLDER_DEPTH:
            raise HTTPException(422, "Maximum folder depth is 6")
        folder.parent_id = payload.parent_id
    db.commit()
    db.refresh(folder)
    return FolderOut.model_validate(folder)


@app.delete("/v1/tree/folders/{folder_id}")
def delete_folder(folder_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, bool]:
    folder = db.get(TreeFolder, folder_id)
    if not folder or folder.owner_id != user.id:
        raise HTTPException(404, "Folder not found")
    db.query(Photo).filter(Photo.folder_id == folder_id).update({"folder_id": None})
    db.delete(folder)
    db.commit()
    return {"ok": True}


@app.delete("/v1/tree/photos/{photo_id}")
def delete_photo(photo_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, bool]:
    photo = db.get(Photo, photo_id)
    if not photo or photo.owner_id != user.id or photo.deleted_at:
        raise HTTPException(404, "Photo not found")
    photo.deleted_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@app.get("/v1/tree/photos/{photo_id}/download")
def download_photo(photo_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    photo = db.get(Photo, photo_id)
    if not photo or photo.owner_id != user.id or photo.deleted_at:
        raise HTTPException(404, "Photo not found")
    try:
        url = s3_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": photo.storage_key},
            ExpiresIn=900,
        )
    except (BotoCoreError, ClientError):
        url = f"{settings.s3_public_endpoint}/{settings.s3_bucket}/{photo.storage_key}"
    return {"url": url}


def member_for(db: Session, space_id: uuid.UUID, user_id: uuid.UUID) -> SpaceMember | None:
    return db.get(SpaceMember, (space_id, user_id))


def require_joined(db: Session, space_id: uuid.UUID, user: User) -> SpaceMember:
    member = member_for(db, space_id, user.id)
    if not member or member.status != "joined":
        raise HTTPException(403, "You are not a member of this Space")
    return member


@app.post("/v1/spaces", status_code=201)
def create_space(payload: SpaceCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    if payload.end_date < payload.start_date:
        raise HTTPException(422, "end_date must not precede start_date")
    requested_handle = payload.handle.lower() if payload.handle else new_handle(db, payload.name)
    if db.scalar(select(Space).where(Space.handle == requested_handle)):
        raise HTTPException(409, "Space handle is already taken")
    space = Space(owner_id=user.id, name=payload.name, handle=requested_handle, invite_code=new_invite_code(db), description=payload.description, start_date=payload.start_date, end_date=payload.end_date)
    db.add(space)
    db.flush()
    db.add(SpaceMember(space_id=space.id, user_id=user.id, role="owner", membership_type="friend", status="joined", joined_at=datetime.utcnow()))
    link_new_space_branch(db, user, space)
    db.commit()
    db.refresh(space)
    return {"id": space.id, "owner_id": space.owner_id, "name": space.name, "handle": space.handle, "invite_code": space.invite_code, "join_link": f"/join/{space.invite_code}", "description": space.description, "cover_photo_id": space.cover_photo_id, "start_date": space.start_date, "end_date": space.end_date, "status": space.status}


@app.get("/v1/spaces")
def list_spaces(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    ids = db.scalars(select(SpaceMember.space_id).where(SpaceMember.user_id == user.id, SpaceMember.status.in_(["joined", "invited"]))).all()
    spaces = db.scalars(select(Space).where(Space.id.in_(ids))).all()
    result = [{"id": s.id, "owner_id": s.owner_id, "name": s.name, "handle": ensure_space_handle(db, s), "invite_code": ensure_space_code(db, s), "join_link": f"/join/{s.invite_code}", "description": s.description, "cover_photo_id": s.cover_photo_id, "start_date": s.start_date, "end_date": s.end_date, "status": s.status} for s in spaces]
    db.commit()
    return result


@app.get("/v1/spaces/{space_id}")
def get_space(space_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    space = db.get(Space, space_id)
    if not space:
        raise HTTPException(404, "Space not found")
    require_joined(db, space_id, user)
    code = ensure_space_code(db, space)
    db.commit()
    return {"id": space.id, "owner_id": space.owner_id, "name": space.name, "handle": ensure_space_handle(db, space), "invite_code": code, "join_link": f"/join/{code}", "description": space.description, "cover_photo_id": space.cover_photo_id, "start_date": space.start_date, "end_date": space.end_date, "status": space.status}


@app.patch("/v1/spaces/{space_id}")
def update_space(space_id: uuid.UUID, payload: SpaceUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    space = db.get(Space, space_id)
    if not space:
        raise HTTPException(404, "Space not found")
    member = require_joined(db, space_id, user)
    if member.role not in ("owner", "admin"):
        raise HTTPException(403, "Owner or admin role required")
    updates = payload.model_dump(exclude_unset=True)
    if "handle" in updates:
        requested = updates["handle"].lower() if updates["handle"] else ensure_space_handle(db, space)
        conflict = db.scalar(select(Space).where(Space.handle == requested, Space.id != space.id))
        if conflict:
            raise HTTPException(409, "Space handle is already taken")
        updates["handle"] = requested
    if "cover_photo_id" in updates and updates["cover_photo_id"] is not None:
        cover = db.get(Photo, updates["cover_photo_id"])
        if not cover or cover.owner_id != user.id or cover.deleted_at:
            raise HTTPException(404, "Preview photo not found")
    if "start_date" in updates and "end_date" in updates and updates["end_date"] < updates["start_date"]:
        raise HTTPException(422, "end_date must not precede start_date")
    for field, value in updates.items():
        setattr(space, field, value)
    db.commit()
    db.refresh(space)
    return {"id": space.id, "owner_id": space.owner_id, "name": space.name, "handle": ensure_space_handle(db, space), "invite_code": ensure_space_code(db, space), "description": space.description, "cover_photo_id": space.cover_photo_id, "start_date": space.start_date, "end_date": space.end_date, "status": space.status}


@app.delete("/v1/spaces/{space_id}")
def delete_space(space_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, bool]:
    space = db.get(Space, space_id)
    if not space:
        raise HTTPException(404, "Space not found")
    if space.owner_id != user.id:
        raise HTTPException(403, "Only the owner can delete this Space")
    db.delete(space)
    db.commit()
    return {"ok": True}


@app.post("/v1/spaces/{space_id}/members", status_code=201)
def invite_member(space_id: uuid.UUID, payload: MemberCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    space = db.get(Space, space_id)
    if not space:
        raise HTTPException(404, "Space not found")
    actor = require_joined(db, space_id, user)
    if actor.role not in ("owner", "admin"):
        raise HTTPException(403, "Owner or admin role required")
    target = db.scalar(select(User).where(User.username == payload.username.lower()))
    if not target:
        raise HTTPException(404, "User not found")
    existing = member_for(db, space_id, target.id)
    if existing:
        raise HTTPException(409, "User is already a member or invited")
    friendship = db.scalar(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                (Friendship.requester_id == user.id) & (Friendship.addressee_id == target.id),
                (Friendship.requester_id == target.id) & (Friendship.addressee_id == user.id),
            ),
        )
    )
    db.add(SpaceMember(space_id=space_id, user_id=target.id, role="member", membership_type="friend" if friendship else "independent", status="invited"))
    db.add(Notification(user_id=target.id, type="space_invite", payload={"space_id": str(space_id)}))
    db.commit()
    return {"status": "invited"}


@app.post("/v1/spaces/{space_id}/join")
def join_space(space_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    member = member_for(db, space_id, user.id)
    if not member or member.status != "invited":
        raise HTTPException(404, "Invitation not found")
    member.status = "joined"
    member.joined_at = datetime.utcnow()
    link_joined_space(db, user, space_id)
    db.commit()
    return {"status": "joined"}


@app.post("/v1/spaces/join/{invite_code}")
def join_space_by_code(invite_code: str, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    client_ip = request.client.host if request.client else "local"
    check_rate_limit(f"join:{client_ip}", max_requests=25, window_seconds=60)
    space = db.scalar(select(Space).where(Space.invite_code == invite_code.upper()))
    if not space:
        raise HTTPException(404, "Invalid Photo Space code")
    existing = member_for(db, space.id, user.id)
    if existing and existing.status == "joined":
        return {"status": "already_joined", "space_id": str(space.id), "name": space.name}
    if existing and existing.status in ("left", "removed"):
        existing.status = "joined"
        existing.joined_at = datetime.utcnow()
    elif not existing:
        db.add(SpaceMember(space_id=space.id, user_id=user.id, role="member", membership_type="independent", status="joined", joined_at=datetime.utcnow()))
    link_joined_space(db, user, space.id)
    db.commit()
    return {"status": "joined", "space_id": str(space.id), "name": space.name}


@app.post("/v1/spaces/{space_id}/leave")
def leave_space(space_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    member = member_for(db, space_id, user.id)
    if not member:
        raise HTTPException(404, "Membership not found")
    if member.role == "owner":
        raise HTTPException(409, "Owner cannot leave an owned Space")
    member.status = "left"
    remove_space_link(db, user.id, space_id)
    db.commit()
    return {"status": "left"}


@app.delete("/v1/spaces/{space_id}/members/{member_id}")
def remove_member(space_id: uuid.UUID, member_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, bool]:
    actor = require_joined(db, space_id, user)
    if actor.role not in ("owner", "admin"):
        raise HTTPException(403, "Owner or admin role required")
    member = member_for(db, space_id, member_id)
    if not member or member.role == "owner":
        raise HTTPException(404, "Member not found")
    member.status = "removed"
    remove_space_link(db, member_id, space_id)
    db.commit()
    return {"ok": True}


@app.post("/v1/spaces/{space_id}/photos", status_code=201)
def share_photos(space_id: uuid.UUID, payload: PhotoIds, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    require_joined(db, space_id, user)
    result: list[dict[str, Any]] = []
    for photo_id in payload.photo_ids:
        photo = db.get(Photo, photo_id)
        if not photo or photo.owner_id != user.id or photo.deleted_at:
            raise HTTPException(404, f"Photo {photo_id} not found")
        existing = db.scalar(select(SpacePhoto).where(SpacePhoto.space_id == space_id, SpacePhoto.photo_id == photo_id, SpacePhoto.removed_at.is_(None)))
        if existing:
            continue
        ref = SpacePhoto(space_id=space_id, photo_id=photo_id, shared_by=user.id)
        db.add(ref)
        db.flush()
        db.add(Notification(user_id=user.id, type="photo_shared", payload={"space_id": str(space_id), "photo_id": str(photo_id)}))
        result.append({"id": ref.id, "space_id": ref.space_id, "photo_id": ref.photo_id, "shared_by": ref.shared_by, "shared_at": ref.shared_at})
    db.commit()
    return result


@app.delete("/v1/spaces/{space_id}/photos/{photo_id}")
def unshare_photo(space_id: uuid.UUID, photo_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, bool]:
    member = require_joined(db, space_id, user)
    ref = db.scalar(select(SpacePhoto).where(SpacePhoto.space_id == space_id, SpacePhoto.photo_id == photo_id, SpacePhoto.removed_at.is_(None)))
    if not ref:
        raise HTTPException(404, "Shared photo not found")
    if ref.shared_by != user.id and member.role not in ("owner", "admin"):
        raise HTTPException(403, "Only the sharer, owner, or admin can remove this photo")
    ref.removed_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@app.get("/v1/spaces/{space_id}/photos")
def space_photos(space_id: uuid.UUID, member: uuid.UUID | None = None, cursor: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    require_joined(db, space_id, user)
    query = select(SpacePhoto).where(SpacePhoto.space_id == space_id, SpacePhoto.removed_at.is_(None)).order_by(SpacePhoto.shared_at.desc()).limit(100)
    if member:
        query = query.where(SpacePhoto.shared_by == member)
    refs = db.scalars(query).all()
    result: list[dict[str, Any]] = []
    for ref in refs:
        photo = db.get(Photo, ref.photo_id)
        if photo and not photo.deleted_at:
            result.append({
                "id": ref.id,
                "space_id": ref.space_id,
                "photo_id": ref.photo_id,
                "shared_by": ref.shared_by,
                "shared_at": ref.shared_at,
                "photo": PhotoOut.model_validate(photo).model_dump(mode="json"),
            })
    return result


@app.get("/v1/spaces/{space_id}/progress")
def space_progress(space_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    require_joined(db, space_id, user)
    joined = db.scalars(select(SpaceMember).where(SpaceMember.space_id == space_id, SpaceMember.status == "joined")).all()
    contributing_ids = set(db.scalars(select(SpacePhoto.shared_by).where(SpacePhoto.space_id == space_id, SpacePhoto.removed_at.is_(None)).distinct()).all())
    members = {str(m.user_id): 1 if m.user_id in contributing_ids else 0 for m in joined}
    return {"total_members": len(joined), "contributing_members": sum(members.values()), "members": members}


@app.post("/v1/spaces/{space_id}/remind/{member_id}")
def manual_remind(space_id: uuid.UUID, member_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, bool]:
    require_joined(db, space_id, user)
    target = member_for(db, space_id, member_id)
    if not target or target.status != "joined":
        raise HTTPException(404, "Member not found")
    recent = db.scalar(
        select(Reminder).where(
            Reminder.space_id == space_id,
            Reminder.user_id == member_id,
            Reminder.kind == "manual",
            Reminder.sent_at >= datetime.utcnow() - timedelta(hours=48),
        )
    )
    if recent:
        raise HTTPException(429, "Reminder already sent in the last 48 hours")
    reminder = Reminder(space_id=space_id, user_id=member_id, kind="manual", scheduled_for=datetime.utcnow(), sent_at=datetime.utcnow())
    db.add(reminder)
    db.add(Notification(user_id=member_id, type="reminder", payload={"space_id": str(space_id)}))
    db.commit()
    return {"ok": True}


@app.post("/v1/spaces/{space_id}/export")
def export_space(space_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    require_joined(db, space_id, user)
    return {"id": str(uuid.uuid4()), "status": "queued"}


@app.get("/v1/exports/{export_id}")
def get_export(export_id: uuid.UUID, _: User = Depends(get_current_user)) -> dict[str, str]:
    return {"id": str(export_id), "status": "ready", "url": ""}


@app.get("/v1/spaces/{space_id}/messages")
def get_messages(space_id: uuid.UUID, cursor: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    require_joined(db, space_id, user)
    messages = db.scalars(
        select(Message).where(Message.space_id == space_id, Message.deleted_at.is_(None)).order_by(Message.created_at.desc()).limit(100)
    ).all()
    return [
        {"id": m.id, "space_id": m.space_id, "sender_id": m.sender_id, "body": m.body, "reply_to": m.reply_to, "photo_ref": m.photo_ref, "created_at": m.created_at}
        for m in reversed(messages)
    ]


@app.post("/v1/spaces/{space_id}/messages", status_code=201)
async def post_message(space_id: uuid.UUID, payload: MessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, Any]:
    require_joined(db, space_id, user)
    message = Message(space_id=space_id, sender_id=user.id, body=payload.body, reply_to=payload.reply_to, photo_ref=payload.photo_ref)
    db.add(message)
    db.commit()
    db.refresh(message)
    data = {"id": message.id, "space_id": message.space_id, "sender_id": message.sender_id, "body": message.body, "reply_to": message.reply_to, "photo_ref": message.photo_ref, "created_at": message.created_at}
    await broadcast_message(space_id, data)
    return data


@app.delete("/v1/messages/{message_id}")
def delete_message(message_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, bool]:
    message = db.get(Message, message_id)
    if not message or message.sender_id != user.id:
        raise HTTPException(404, "Message not found")
    message.deleted_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


websocket_rooms: dict[str, set[WebSocket]] = {}


async def broadcast_message(space_id: uuid.UUID, data: dict[str, Any]) -> None:
    import json
    room = websocket_rooms.get(str(space_id), set())
    dead: list[WebSocket] = []
    for socket in room:
        try:
            await socket.send_text(json.dumps(data, default=str))
        except RuntimeError:
            dead.append(socket)
    for socket in dead:
        room.discard(socket)


@app.websocket("/v1/ws")
async def websocket_endpoint(websocket: WebSocket, token: str) -> None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("kind") != "access":
            raise JWTError()
        user_uuid = uuid.UUID(str(payload.get("sub")))
    except (JWTError, ValueError, TypeError):
        await websocket.close(code=4401)
        return
    await websocket.accept()
    subscribed: set[str] = set()
    try:
        while True:
            import json
            raw = await websocket.receive_text()
            event = json.loads(raw)
            if event.get("action") == "subscribe" and event.get("space_id"):
                try:
                    target_space_id = uuid.UUID(str(event["space_id"]))
                except (ValueError, TypeError):
                    await websocket.send_text(json.dumps({"error": "Invalid space_id"}))
                    continue
                # Verify user is an active member of this space before granting access
                db = next(get_db())
                try:
                    member = member_for(db, target_space_id, user_uuid)
                    if not member or member.status != "joined":
                        await websocket.send_text(json.dumps({"error": "Forbidden: not a member of this space"}))
                        continue
                finally:
                    db.close()
                room_id = str(target_space_id)
                websocket_rooms.setdefault(room_id, set()).add(websocket)
                subscribed.add(room_id)
                await websocket.send_text(json.dumps({"status": "subscribed", "space_id": room_id}))
            elif event.get("action") == "unsubscribe" and event.get("space_id"):
                room_id = str(event["space_id"])
                websocket_rooms.get(room_id, set()).discard(websocket)
                subscribed.discard(room_id)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        for room_id in subscribed:
            websocket_rooms.get(room_id, set()).discard(websocket)


@app.get("/v1/notifications")
def notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    rows = db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(100)).all()
    return [{"id": r.id, "type": r.type, "payload": r.payload, "read_at": r.read_at, "created_at": r.created_at} for r in rows]


@app.post("/v1/push-tokens", status_code=201)
def push_token(payload: PushTokenCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    existing = db.scalar(select(PushToken).where(PushToken.user_id == user.id, PushToken.token == payload.token))
    if not existing:
        db.add(PushToken(user_id=user.id, token=payload.token, platform=payload.platform))
        db.commit()
    return {"status": "registered"}
