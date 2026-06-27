from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nick: Optional[str] = Field(default=None, index=True)
    city: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    notify_push: bool = True
    notify_email: bool = True
    notify_days_before: int = 3
    notify_hour: int = 8
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PantryItem(SQLModel, table=True):
    __tablename__ = "pantry_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str
    category: str = "inne"
    quantity: float = 1.0
    unit: str = "szt."
    barcode: Optional[str] = None
    image_url: Optional[str] = None
    added_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    # active | eaten | wasted | shared
    status: str = "active"


class ConsumptionLog(SQLModel, table=True):
    __tablename__ = "consumption_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    item_name: str
    category: str
    quantity: float
    unit: str
    # eaten | wasted
    action: str
    weight_kg: Optional[float] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)


class ProductCache(SQLModel, table=True):
    """Cache wynikow Open Food Facts zeby nie odpytywac API za kazdym razem."""

    __tablename__ = "product_cache"

    barcode: str = Field(primary_key=True)
    name: str
    category: str = "inne"
    image_url: Optional[str] = None
    raw_json: Optional[str] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class PushSubscription(SQLModel, table=True):
    __tablename__ = "push_subscriptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    endpoint: str = Field(unique=True)
    p256dh: str
    auth: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ShareListing(SQLModel, table=True):
    __tablename__ = "share_listings"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    item_name: str
    quantity: float
    unit: str
    expires_at: Optional[datetime] = None
    city: str
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    # available | reserved | picked_up
    status: str = "available"
    reserved_by: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Friendship(SQLModel, table=True):
    __tablename__ = "friendships"

    id: Optional[int] = Field(default=None, primary_key=True)
    requester_id: int = Field(foreign_key="users.id", index=True)
    addressee_id: int = Field(foreign_key="users.id", index=True)
    # pending | accepted
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RecipeCache(SQLModel, table=True):
    __tablename__ = "recipe_cache"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)
    recipes_json: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    # expiry | restock | share
    type: str
    message: str
    item_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read: bool = False
