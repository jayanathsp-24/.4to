from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app


client = TestClient(app)


def auth(email: str, username: str) -> dict[str, str]:
    result = client.post(
        "/v1/auth/register",
        json={"email": email, "password": "password123", "username": username, "display_name": username.title()},
    )
    return {"Authorization": f"Bearer {result.json()['access_token']}"}


def test_tree_overview_and_placement_are_private():
    owner_headers = auth("tree-owner@example.com", "treeowner")
    created = client.post(
        "/v1/spaces",
        headers=owner_headers,
        json={"name": "Bali Trip", "start_date": "2026-01-01", "end_date": "2026-01-03"},
    )
    assert created.status_code == 201
    space_id = created.json()["id"]
    folder = client.post("/v1/tree/folders", headers=owner_headers, json={"name": "2026"})
    assert folder.status_code == 201
    overview = client.get("/v1/tree/overview", headers=owner_headers)
    assert overview.status_code == 200
    assert any(branch["name"] == "Bali Trip" and branch["spaces"] for branch in overview.json()["root"]["branches"])
    placed = client.put(
        f"/v1/tree/spaces/{space_id}/placement",
        headers=owner_headers,
        json={"folder_id": folder.json()["id"], "position": 2},
    )
    assert placed.status_code == 200

    other_headers = auth("tree-other@example.com", "treeother")
    assert client.get("/v1/tree/overview", headers=other_headers).json()["root"]["branches"] == []
    assert client.put(
        f"/v1/tree/spaces/{space_id}/placement",
        headers=other_headers,
        json={"folder_id": folder.json()["id"], "position": 0},
    ).status_code == 403


def test_join_creates_new_growth_link():
    owner_headers = auth("invite-owner@example.com", "inviteowner")
    invited_headers = auth("invite-user@example.com", "inviteuser")
    created = client.post(
        "/v1/spaces",
        headers=owner_headers,
        json={"name": "Joined Space", "start_date": "2026-02-01", "end_date": "2026-02-02"},
    )
    space_id = created.json()["id"]
    invited = client.post("/v1/spaces/" + space_id + "/members", headers=owner_headers, json={"username": "inviteuser"})
    assert invited.status_code == 201
    assert client.post("/v1/spaces/" + space_id + "/join", headers=invited_headers).status_code == 200
    overview = client.get("/v1/tree/overview", headers=invited_headers).json()
    assert any(branch["name"] == "New Growth" and branch["spaces"] for branch in overview["root"]["branches"])


def test_space_has_unique_join_code():
    headers = auth("code-owner@example.com", "codeowner")
    first = client.post("/v1/spaces", headers=headers, json={"name": "First", "start_date": "2026-03-01", "end_date": "2026-03-02"}).json()
    second = client.post("/v1/spaces", headers=headers, json={"name": "Second", "start_date": "2026-04-01", "end_date": "2026-04-02"}).json()
    assert first["invite_code"] != second["invite_code"]
    guest_headers = auth("code-guest@example.com", "codeguest")
    joined = client.post(f"/v1/spaces/join/{first['invite_code']}", headers=guest_headers)
    assert joined.status_code == 200
    assert joined.json()["name"] == "First"


def test_space_handles_are_unique_and_editable():
    suffix = uuid4().hex[:8]
    headers = auth(f"handle-owner-{suffix}@example.com", f"handleowner{suffix}")
    first = client.post("/v1/spaces", headers=headers, json={"name": "Bali Trip", "handle": f"bali_trip_{suffix}", "start_date": "2026-05-01", "end_date": "2026-05-02"}).json()
    second = client.post("/v1/spaces", headers=headers, json={"name": "Other Trip", "handle": f"other_trip_{suffix}", "start_date": "2026-06-01", "end_date": "2026-06-02"}).json()
    assert first["handle"] == f"bali_trip_{suffix}"
    conflict = client.patch(f"/v1/spaces/{second['id']}", headers=headers, json={"handle": f"bali_trip_{suffix}"})
    assert conflict.status_code == 409
    updated = client.patch(f"/v1/spaces/{first['id']}", headers=headers, json={"name": "Bali Memories", "handle": "bali_memories"})
    assert updated.status_code == 200
    assert updated.json()["handle"] == "bali_memories"
