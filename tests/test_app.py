import copy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    original = copy.deepcopy(activities)
    try:
        yield
    finally:
        activities.clear()
        activities.update(copy.deepcopy(original))


def client():
    return TestClient(app)


def test_get_activities_ok():
    c = TestClient(app)
    resp = c.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Check a couple of known activities exist
    assert "Chess Club" in data
    assert "Programming Class" in data


def test_signup_adds_participant_and_reflects_in_listing():
    c = TestClient(app)
    activity = "Chess Club"
    email = "new_student1@mergington.edu"

    resp = c.post(f"/activities/{quote(activity)}/signup", params={"email": email})
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # Verify via listing
    data = c.get("/activities").json()
    assert email in data[activity]["participants"]


def test_signup_prevents_multiple_activities():
    c = TestClient(app)
    email = "unique_user_multi@mergington.edu"

    resp1 = c.post(f"/activities/{quote('Chess Club')}/signup", params={"email": email})
    assert resp1.status_code == 200

    resp2 = c.post(f"/activities/{quote('Programming Class')}/signup", params={"email": email})
    assert resp2.status_code == 400
    assert resp2.json().get("detail") == "Student already signed up for an activity"


def test_unregister_removes_participant_and_is_idempotent_like():
    c = TestClient(app)
    activity = "Chess Club"
    email = "to_remove@mergington.edu"

    # First sign up the user so we can remove
    resp_signup = c.post(f"/activities/{quote(activity)}/signup", params={"email": email})
    assert resp_signup.status_code == 200

    # Now remove
    resp_del = c.delete(f"/activities/{quote(activity)}/participants", params={"email": email})
    assert resp_del.status_code == 200
    assert "Unregistered" in resp_del.json().get("message", "")

    data = c.get("/activities").json()
    assert email not in data[activity]["participants"]

    # Removing again should 404 (not present)
    resp_del_again = c.delete(f"/activities/{quote(activity)}/participants", params={"email": email})
    assert resp_del_again.status_code == 404
    assert resp_del_again.json().get("detail") == "Student not found in activity"
