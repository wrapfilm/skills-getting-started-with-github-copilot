import pytest
from fastapi.testclient import TestClient
from src.app import app, activities


def test_get_activities():
    # Arrange
    client = TestClient(app)
    # Act
    resp = client.get("/activities")
    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_unregister_cycle():
    # Arrange
    client = TestClient(app)
    activity = "Math Club"
    email = "tester@example.com"

    # ensure clean state
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Act: sign up
    r_signup = client.post(f"/activities/{activity}/signup", params={"email": email})
    # Assert signup
    assert r_signup.status_code == 200
    assert email in activities[activity]["participants"]

    # Act: unregister
    r_unreg = client.delete(f"/activities/{activity}/participants", params={"email": email})
    # Assert unregister
    assert r_unreg.status_code == 200
    assert email not in activities[activity]["participants"]


def test_signup_nonexistent_activity_returns_404():
    # Arrange
    client = TestClient(app)
    email = "x@example.com"
    # Act
    r = client.post("/activities/NoSuchActivity/signup", params={"email": email})
    # Assert
    assert r.status_code == 404


def test_duplicate_signup_returns_400():
    # Arrange
    client = TestClient(app)
    activity = "Programming Class"
    email = "dup@example.com"

    # ensure clean state
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Act: first signup
    r1 = client.post(f"/activities/{activity}/signup", params={"email": email})
    # Assert first signup ok
    assert r1.status_code == 200

    # Act: duplicate signup
    r2 = client.post(f"/activities/{activity}/signup", params={"email": email})
    # Assert duplicate rejected
    assert r2.status_code == 400

    # Cleanup
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)
