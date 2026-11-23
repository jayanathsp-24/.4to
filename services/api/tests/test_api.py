from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base, get_db
from app.main import app


engine = create_engine("sqlite:///./test.db", connect_args={"check_same_thread": False})
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def override_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_db
client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_username_login_and_me():
    register = client.post(
        "/v1/auth/register",
        json={"email": "alice@example.com", "password": "password123", "username": "alice", "display_name": "Alice"},
    )
    assert register.status_code == 201
    assert register.json()["user"]["username"] == "alice"

    availability = client.get("/v1/users/check-username", params={"u": "alice"})
    assert availability.json()["available"] is False

    login = client.post("/v1/auth/login", json={"email": "alice@example.com", "password": "password123"})
    token = login.json()["access_token"]
    me = client.get("/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["username"] == "alice"


def test_friend_request_accept():
    client.post("/v1/auth/register", json={"email": "bob@example.com", "password": "password123", "username": "bob", "display_name": "Bob"})
    login_bob = client.post("/v1/auth/login", json={"email": "bob@example.com", "password": "password123"})
    bob_token = login_bob.json()["access_token"]
    login_alice = client.post("/v1/auth/login", json={"email": "alice@example.com", "password": "password123"})
    alice_token = login_alice.json()["access_token"]
    sent = client.post("/v1/friends/requests", json={"username": "alice"}, headers={"Authorization": f"Bearer {bob_token}"})
    assert sent.status_code == 201
    request_id = sent.json()["id"]
    accepted = client.post(f"/v1/friends/requests/{request_id}/accept", headers={"Authorization": f"Bearer {alice_token}"})
    assert accepted.status_code == 200


def test_user_search_wildcard_escaping():
    login_alice = client.post("/v1/auth/login", json={"email": "alice@example.com", "password": "password123"})
    token = login_alice.json()["access_token"]
    # Searching raw wildcard '%' should not return results when no username literally contains '%'
    res = client.get("/v1/users/search?q=%25", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 0


def test_websocket_unauthorized_subscription_rejected():
    login_bob = client.post("/v1/auth/login", json={"email": "bob@example.com", "password": "password123"})
    token = login_bob.json()["access_token"]
    import uuid
    random_space_id = str(uuid.uuid4())
    with client.websocket_connect(f"/v1/ws?token={token}") as ws:
        ws.send_json({"action": "subscribe", "space_id": random_space_id})
        msg = ws.receive_json()
        assert "error" in msg
        assert "Forbidden" in msg["error"]

