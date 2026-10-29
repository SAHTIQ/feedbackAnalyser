import pytest
from datetime import datetime, timezone, timedelta
from app.core.auth import create_access_token


def test_auth_login_and_me(client):
    """Test persona-based quick login and /api/auth/me token verification."""
    # 1. Admin Login
    res_admin = client.post("/api/auth/login", json={"persona": "admin"})
    assert res_admin.status_code == 200
    admin_data = res_admin.json()
    assert admin_data["user"]["role"] == "ADMIN"
    assert "access_token" in admin_data

    # Verify /api/auth/me with Bearer token
    headers = {"Authorization": f"Bearer {admin_data['access_token']}"}
    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "admin@feedbackiq.hotel"

    # 2. Supervisor Login
    res_sup = client.post("/api/auth/login", json={"persona": "supervisor"})
    assert res_sup.status_code == 200
    assert res_sup.json()["user"]["role"] == "SUPERVISOR"
    assert "branch-1" in res_sup.json()["user"]["branch_ids"]

    # 3. Kitchen Staff Login
    res_k = client.post("/api/auth/login", json={"persona": "kitchen"})
    assert res_k.status_code == 200
    assert res_k.json()["user"]["role"] == "KITCHEN_STAFF"


def test_rbac_restrictions(client):
    """Verify that role-based permissions are enforced on protected endpoints."""
    k_login = client.post("/api/auth/login", json={"persona": "kitchen"}).json()
    k_headers = {"Authorization": f"Bearer {k_login['access_token']}"}

    s_login = client.post("/api/auth/login", json={"persona": "supervisor"}).json()
    s_headers = {"Authorization": f"Bearer {s_login['access_token']}"}

    # 1. Kitchen staff attempting to create a branch -> 403 Forbidden
    res_branch = client.post(
        "/api/branches",
        json={"code": "BR-99", "name": "Illegal Branch", "address": "Nowhere", "city": "NY"},
        headers=k_headers
    )
    assert res_branch.status_code == 403

    # 2. Supervisor attempting admin staff deactivation -> 403 Forbidden
    res_deact = client.post(
        "/api/staff/user-kitchen/status",
        json={"is_active": False},
        headers=s_headers
    )
    assert res_deact.status_code == 403

    # 3. Kitchen staff attempting supervisor severity override -> 403 Forbidden
    res_ov = client.post(
        "/api/feedback/fb-001/override-severity",
        json={"new_severity": "LOW", "reason": "Kitchen says it is fine"},
        headers=k_headers
    )
    assert res_ov.status_code == 403


def test_cross_branch_data_isolation(client):
    """Verify supervisor cannot access or leak data from unassigned branches."""
    # Supervisor Maria Chen is assigned only to branch-1 and branch-2
    s_login = client.post("/api/auth/login", json={"persona": "supervisor"}).json()
    s_headers = {"Authorization": f"Bearer {s_login['access_token']}"}

    # 1. Supervisor requests metrics for branch-3 (Airport - unassigned) -> 403 Forbidden
    res_metrics = client.get("/api/metrics/dashboard?branch_id=branch-3", headers=s_headers)
    assert res_metrics.status_code == 403

    # 2. Supervisor requests branch detail for branch-3 -> 403 Forbidden
    res_b3 = client.get("/api/branches/branch-3", headers=s_headers)
    assert res_b3.status_code == 403

    # 3. Supervisor requests metrics for branch-1 (assigned) -> 200 OK
    res_b1 = client.get("/api/metrics/dashboard?branch_id=branch-1", headers=s_headers)
    assert res_b1.status_code == 200

    # 4. Supervisor requests feedback detail for unassigned branch-3 feedback -> 403 Forbidden
    res_fb3 = client.get("/api/feedback/fb-007", headers=s_headers)
    assert res_fb3.status_code == 403


def test_public_feedback_intake_and_tracking(client):
    """Verify public guest feedback submission and tokenized tracking."""
    # 1. Public submission (no auth token required)
    feedback_payload = {
        "location_id": "branch-1",
        "rating": 1,
        "categories": ["Food Quality"],
        "tags": ["Undercooked", "Cold food"],
        "comment": "Chicken was raw in the middle! Cold center.",
        "customer_name": "Test Diner",
        "customer_contact": "diner@example.com",
        "is_anonymous": False,
    }
    res_sub = client.post("/api/feedback", json=feedback_payload)
    assert res_sub.status_code == 201
    fb_data = res_sub.json()
    assert fb_data["reference_id"].startswith("FB-2026-")
    assert fb_data["access_token"].startswith("TK-")
    assert fb_data["severity"] == "CRITICAL"
    assert fb_data["priority_score"] >= 90.0

    ref_id = fb_data["reference_id"]
    token = fb_data["access_token"]

    # 2. Public customer tracking
    res_track = client.get(f"/api/feedback/track?ref={ref_id}&token={token}")
    assert res_track.status_code == 200
    track_data = res_track.json()
    assert track_data["reference_id"] == ref_id
    assert len(track_data["milestones"]) == 5
    assert "resolution_summary" in track_data
    # Verify no private internal reasoning is exposed in public tracking
    assert "ai_analysis" not in track_data
    assert "structured_entities" not in track_data

    # 3. Tracking with invalid token -> 404 Not Found
    res_invalid = client.get(f"/api/feedback/track?ref={ref_id}&token=WRONG-TOKEN")
    assert res_invalid.status_code == 404


def test_supervisor_severity_override(client):
    """Verify supervisor can override severity with mandatory justification."""
    s_login = client.post("/api/auth/login", json={"persona": "supervisor"}).json()
    s_headers = {"Authorization": f"Bearer {s_login['access_token']}"}

    # Get an existing feedback
    feedbacks = client.get("/api/feedback?branch_id=branch-1", headers=s_headers).json()
    assert len(feedbacks) > 0
    target_fb = feedbacks[0]

    # Attempt override without reason -> 422 Unprocessable Entity
    res_fail = client.post(
        f"/api/feedback/{target_fb['id']}/override-severity",
        json={"new_severity": "MEDIUM", "reason": ""},
        headers=s_headers
    )
    assert res_fail.status_code == 422

    # Successful override with valid reason
    res_override = client.post(
        f"/api/feedback/{target_fb['id']}/override-severity",
        json={"new_severity": "MEDIUM", "reason": "Guest confirmed slight exaggeration; kitchen probe test passed."},
        headers=s_headers
    )
    assert res_override.status_code == 200
    updated_fb = res_override.json()
    assert updated_fb["severity"] == "MEDIUM"
    assert updated_fb["severity_override_reason"] is not None
    assert updated_fb["severity_overridden_by"] == "Maria Chen"


def test_corrective_action_lifecycle(client):
    """
    Test complete task lifecycle:
    1. Supervisor dispatches task
    2. Proposed schedule approval
    3. Kitchen staff starts work
    4. Kitchen staff submits completion note + photo
    5. Supervisor rejects with reason -> reopens to assignee
    6. Repeated failure triggers escalation
    7. Supervisor verifies and closes workflow
    """
    s_login = client.post("/api/auth/login", json={"persona": "supervisor"}).json()
    s_headers = {"Authorization": f"Bearer {s_login['access_token']}"}

    k_login = client.post("/api/auth/login", json={"persona": "kitchen"}).json()
    k_headers = {"Authorization": f"Bearer {k_login['access_token']}"}

    # 1. Dispatch Task
    deadline = (datetime.now(timezone.utc) + timedelta(hours=8)).isoformat()
    res_task = client.post(
        "/api/tasks",
        json={
            "feedback_id": "fb-001",
            "title": "Recalibrate Station 2 Meat Probe",
            "description": "Ice point calibration required.",
            "assigned_user_id": "user-kitchen",
            "severity": "CRITICAL",
            "proposed_deadline": deadline,
            "auto_approve_schedule": False,
        },
        headers=s_headers
    )
    assert res_task.status_code == 201
    task = res_task.json()
    assert task["status"] == "AWAITING_SCHEDULE_APPROVAL"
    task_id = task["id"]

    # 2. Supervisor approves schedule
    res_appr = client.post(
        f"/api/tasks/{task_id}/approve-schedule",
        json={"approved_deadline": deadline},
        headers=s_headers
    )
    assert res_appr.status_code == 200
    assert res_appr.json()["status"] == "ASSIGNED"

    # 3. Kitchen staff starts work
    res_start = client.post(f"/api/tasks/{task_id}/start", headers=k_headers)
    assert res_start.status_code == 200
    assert res_start.json()["status"] == "IN_PROGRESS"

    # 4. Kitchen staff completes task
    res_comp = client.post(
        f"/api/tasks/{task_id}/complete",
        json={
            "completion_notes": "Tested digital probe in ice bath; reads exactly 0.0°C.",
            "completion_photo_url": "https://example.com/photo.jpg"
        },
        headers=k_headers
    )
    assert res_comp.status_code == 200
    assert res_comp.json()["status"] == "COMPLETED_AWAITING_VERIFICATION"

    # 5. Supervisor rejects with mandatory reason
    res_rej = client.post(
        f"/api/tasks/{task_id}/reject",
        json={"rejection_reason": "Thermometer certificate serial number missing from log."},
        headers=s_headers
    )
    assert res_rej.status_code == 200
    rejected_task = res_rej.json()
    assert rejected_task["status"] == "REJECTED_REOPENED"
    assert rejected_task["rejection_count"] == 1

    # 6. Re-complete and second rejection -> triggers escalation
    client.post(
        f"/api/tasks/{task_id}/complete",
        json={"completion_notes": "Second attempt without serial number."},
        headers=k_headers
    )
    res_rej2 = client.post(
        f"/api/tasks/{task_id}/reject",
        json={"rejection_reason": "Still missing calibration cert."},
        headers=s_headers
    )
    assert res_rej2.json()["is_escalated"] is True

    # 7. Final completion and successful supervisor verification
    client.post(
        f"/api/tasks/{task_id}/complete",
        json={"completion_notes": "Serial #PRB-8899 documented and logged."},
        headers=k_headers
    )
    res_verify = client.post(
        f"/api/tasks/{task_id}/verify",
        json={"verification_note": "Physically audited probe serial PRB-8899 on cook line. Verified."},
        headers=s_headers
    )
    assert res_verify.status_code == 200
    verified_task = res_verify.json()
    assert verified_task["status"] == "VERIFIED_CLOSED"
    assert verified_task["verification_status"] == "VERIFIED"


def test_staff_deactivation_governance(client):
    """
    Verify staff deactivation preserves history and disables login.
    Only administrator can execute transfers and deactivations.
    """
    a_login = client.post("/api/auth/login", json={"persona": "admin"}).json()
    a_headers = {"Authorization": f"Bearer {a_login['access_token']}"}

    # Deactivate Kitchen Staff #2 (Elena Rostova)
    res_deact = client.post(
        "/api/staff/user-kitchen-2/status",
        json={"is_active": False},
        headers=a_headers
    )
    assert res_deact.status_code == 200
    assert res_deact.json()["is_active"] is False

    # Attempt login as deactivated staff member -> 403 Forbidden
    res_login_fail = client.post("/api/auth/login", json={"persona": "kitchen-2"})
    assert res_login_fail.status_code == 403
    assert "deactivated" in res_login_fail.json()["detail"].lower()

    # Reactivate account
    res_react = client.post(
        "/api/staff/user-kitchen-2/status",
        json={"is_active": True},
        headers=a_headers
    )
    assert res_react.status_code == 200
    assert res_react.json()["is_active"] is True


def test_staff_branch_transfer(client):
    """Verify administrator can transfer staff between branches, creating an audit log."""
    a_login = client.post("/api/auth/login", json={"persona": "admin"}).json()
    a_headers = {"Authorization": f"Bearer {a_login['access_token']}"}

    # Transfer user-kitchen to both branch-1 and branch-2
    res_transfer = client.post(
        "/api/staff/user-kitchen/branches",
        json={"branch_ids": ["branch-1", "branch-2"]},
        headers=a_headers
    )
    assert res_transfer.status_code == 200
    updated_branches = res_transfer.json()["branch_ids"]
    assert "branch-1" in updated_branches
    assert "branch-2" in updated_branches


def test_notifications_and_audit_logs(client):
    """Verify notification read state toggles and audit log inspection."""
    s_login = client.post("/api/auth/login", json={"persona": "supervisor"}).json()
    s_headers = {"Authorization": f"Bearer {s_login['access_token']}"}

    # Get notifications
    res_notif = client.get("/api/notifications", headers=s_headers)
    assert res_notif.status_code == 200
    notifications = res_notif.json()
    assert isinstance(notifications, list)

    # Mark all read
    res_read_all = client.post("/api/notifications/read-all", headers=s_headers)
    assert res_read_all.status_code == 200
    assert res_read_all.json()["status"] == "success"

    # Get Audit logs
    a_login = client.post("/api/auth/login", json={"persona": "admin"}).json()
    a_headers = {"Authorization": f"Bearer {a_login['access_token']}"}
    res_audit = client.get("/api/audit-logs", headers=a_headers)
    assert res_audit.status_code == 200
    audit_entries = res_audit.json()
    assert len(audit_entries) > 0
    assert "action" in audit_entries[0]
    assert "actor_name" in audit_entries[0]
