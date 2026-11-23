from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Register(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    username: str = Field(pattern=r"^[a-zA-Z0-9_]{3,30}$")
    display_name: str = Field(min_length=1, max_length=80)


class Login(BaseModel):
    email: EmailStr
    password: str


class Refresh(BaseModel):
    refresh_token: str


class TokenPair(ORMModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(ORMModel):
    id: UUID
    email: EmailStr
    username: str
    display_name: str
    avatar_url: str | None = None
    storage_used_bytes: int
    storage_limit_bytes: int


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    avatar_url: str | None = None


class FriendRequestCreate(BaseModel):
    username: str


class FriendshipOut(ORMModel):
    id: UUID
    requester_id: UUID
    addressee_id: UUID
    status: str


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    parent_id: UUID | None = None


class FolderOut(ORMModel):
    id: UUID
    name: str
    parent_id: UUID | None


class SpacePlacement(BaseModel):
    folder_id: UUID
    position: int = Field(default=0, ge=0)


class TreeSpaceOut(BaseModel):
    space_id: UUID
    name: str
    invite_code: str
    start_date: date
    end_date: date
    status: str
    cover_thumb_url: str | None = None
    member_count: int
    shared_photo_count: int
    my_contribution_pending: bool


class TreeBranchOut(BaseModel):
    id: UUID
    name: str
    photo_count: int
    branches: list["TreeBranchOut"] = Field(default_factory=list)
    spaces: list[TreeSpaceOut] = Field(default_factory=list)


class TreeOverviewOut(BaseModel):
    user: dict[str, str | None]
    root: dict[str, object]


class UploadInit(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    size_bytes: int = Field(gt=0, le=100 * 1024**3)
    mime_type: str = Field(pattern=r"^[\w.+-]+/[\w.+-]+$")
    content_hash: str = Field(min_length=32, max_length=128)
    folder_id: UUID | None = None
    taken_at: datetime | None = None


class UploadInitOut(BaseModel):
    upload_id: str
    photo_id: UUID | None = None
    already_exists: bool
    upload_url: str | None = None
    expires_in: int = 900


class UploadComplete(BaseModel):
    upload_id: str
    photo_id: UUID | None = None


class PhotoOut(ORMModel):
    id: UUID
    folder_id: UUID | None
    content_hash: str
    mime_type: str
    size_bytes: int
    width: int | None
    height: int | None
    taken_at: datetime | None
    created_at: datetime


class SpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    handle: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_]{3,30}$")
    description: str | None = Field(default=None, max_length=2000)
    start_date: date
    end_date: date


class SpaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    handle: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_]{3,30}$")
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    cover_photo_id: UUID | None = None


class SpaceOut(ORMModel):
    id: UUID
    owner_id: UUID
    name: str
    handle: str | None = None
    invite_code: str | None = None
    description: str | None
    cover_photo_id: UUID | None = None
    start_date: date
    end_date: date
    status: str


class MemberCreate(BaseModel):
    username: str


class MemberOut(ORMModel):
    space_id: UUID
    user_id: UUID
    role: str
    membership_type: str
    status: str
    joined_at: datetime | None


class PhotoIds(BaseModel):
    photo_ids: list[UUID] = Field(min_length=1)


class SpacePhotoOut(ORMModel):
    id: UUID
    space_id: UUID
    photo_id: UUID
    shared_by: UUID
    shared_at: datetime


class ProgressOut(BaseModel):
    total_members: int
    contributing_members: int
    members: dict[str, int]


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    reply_to: UUID | None = None
    photo_ref: UUID | None = None


class MessageOut(ORMModel):
    id: UUID
    space_id: UUID
    sender_id: UUID
    body: str
    reply_to: UUID | None
    photo_ref: UUID | None
    created_at: datetime


class PushTokenCreate(BaseModel):
    token: str = Field(min_length=1)
    platform: str = Field(pattern=r"^(android|ios|web)$")


class NotificationOut(ORMModel):
    id: UUID
    type: str
    payload: dict
    read_at: datetime | None
    created_at: datetime
