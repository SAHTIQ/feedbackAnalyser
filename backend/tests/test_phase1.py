from datetime import datetime, timezone, timedelta
import pytest
from app.core.config import settings
from app.core.auth import create_access_token, decode_access_token
from app.models.entities import (
    Organization, Location, UserProfile, Feedback, AnalysisResult,
    Issue, Recommendation, ActionTask, Alert, VerificationRun,
    WeeklyReport, AuditLog
)


def test_health_check_endpoint(client):
    """Verify GET /api/health returns 200 OK and valid status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "app" in data
    assert "llm_provider" in data


def test_token_creation_and_decoding():
    """Verify JWT creation and decoding cycle."""
    payload = {"sub": "user-123", "email": "test@hotel.com", "role": "SUPERVISOR"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "user-123"
    assert decoded["email"] == "test@hotel.com"
    assert decoded["role"] == "SUPERVISOR"
    assert "exp" in decoded


def test_dev_tokens_bypass():
    """Verify dev bypass tokens are decoded with appropriate roles."""
    for dev_token, role in [
        ("dev-admin-token", "ADMIN"),
        ("dev-supervisor-token", "SUPERVISOR"),
        ("dev-kitchen-token", "KITCHEN_STAFF")
    ]:
        payload = decode_access_token(dev_token)
        assert payload["role"] == role


def test_models_creation_and_relationships(db_session):
    """Verify all 12 core database models create cleanly with relationships."""
    # 1. Organization
    org = Organization(name="Starlight Resort", slug="starlight-resort")
    db_session.add(org)
    db_session.flush()
    assert org.id is not None

    # 2. Location
    loc = Location(organization_id=org.id, name="Ocean Terrace", address="Beachside")
    db_session.add(loc)
    db_session.flush()
    assert loc.id is not None
    assert loc.organization.name == "Starlight Resort"

    # 3. UserProfile
    user = UserProfile(
        organization_id=org.id,
        supabase_user_id="sp-101",
        email="chef.starlight@hotel.com",
        full_name="Chef Maria",
        role="KITCHEN_STAFF"
    )
    db_session.add(user)
    db_session.flush()
    assert user.id is not None

    # 4. Issue
    issue = Issue(
        organization_id=org.id,
        location_id=loc.id,
        title="Tuna Tartare Warm Temperature",
        food_item="Tuna Tartare",
        issue_category="Temperature",
        status="ACTIVE",
        priority_score=8.5,
        priority_level="HIGH"
    )
    db_session.add(issue)
    db_session.flush()
    assert issue.id is not None

    # 5. Feedback
    feedback = Feedback(
        organization_id=org.id,
        location_id=loc.id,
        issue_id=issue.id,
        rating=1,
        comment="Tuna was served warm and tasted off.",
        food_item="Tuna Tartare",
        meal_period="Dinner",
        is_historical=False
    )
    db_session.add(feedback)
    db_session.flush()
    assert feedback.id is not None

    # 6. AnalysisResult
    analysis = AnalysisResult(
        feedback_id=feedback.id,
        sentiment="negative",
        food_item="Tuna Tartare",
        issue_category="Temperature",
        reported_symptom="Served warm and tasted off",
        severity="HIGH",
        uncertainty_flag=False,
        structured_entities={"temperature_issue": True}
    )
    db_session.add(analysis)
    db_session.flush()
    assert analysis.id is not None
    assert feedback.analysis_result.severity == "HIGH"

    # 7. Recommendation
    rec = Recommendation(
        issue_id=issue.id,
        proposed_actions=[{"task": "Recalibrate seafood chilling unit", "role": "KITCHEN_STAFF"}],
        rationale="Prevent food spoilage",
        status="PENDING"
    )
    db_session.add(rec)
    db_session.flush()
    assert rec.id is not None

    # 8. ActionTask
    task = ActionTask(
        issue_id=issue.id,
        recommendation_id=rec.id,
        assigned_user_id=user.id,
        title="Calibrate cooler",
        description="Check thermostat and calibrate sensor",
        assigned_role="KITCHEN_STAFF",
        status="PENDING"
    )
    db_session.add(task)
    db_session.flush()
    assert task.id is not None
    assert task.assigned_user.full_name == "Chef Maria"

    # 9. Alert
    alert = Alert(
        organization_id=org.id,
        issue_id=issue.id,
        feedback_id=feedback.id,
        alert_type="FOOD_SAFETY_HAZARD",
        severity="CRITICAL",
        message="Seafood temperature hazard reported",
        is_acknowledged=False
    )
    db_session.add(alert)
    db_session.flush()
    assert alert.id is not None

    # 10. VerificationRun
    now = datetime.now(timezone.utc)
    vrun = VerificationRun(
        issue_id=issue.id,
        measurement_period_days=7,
        baseline_start=now - timedelta(days=14),
        baseline_end=now - timedelta(days=7),
        baseline_complaint_count=5,
        baseline_feedback_volume=50,
        baseline_complaint_rate=0.1,
        evaluation_start=now - timedelta(days=7),
        evaluation_end=now,
        evaluation_complaint_count=0,
        evaluation_feedback_volume=48,
        evaluation_complaint_rate=0.0,
        rate_change_percentage=-100.0,
        result="IMPROVED"
    )
    db_session.add(vrun)
    db_session.flush()
    assert vrun.id is not None

    # 11. WeeklyReport
    wreport = WeeklyReport(
        organization_id=org.id,
        week_start=(now - timedelta(days=7)).date(),
        week_end=now.date(),
        title="Week 44 Quality Intelligence Report",
        executive_summary="Quality complaints down 80%.",
        common_complaints=[],
        high_priority_issues=[],
        overdue_actions=[],
        measured_outcomes=[]
    )
    db_session.add(wreport)
    db_session.flush()
    assert wreport.id is not None

    # 12. AuditLog
    audit = AuditLog(
        organization_id=org.id,
        user_id=user.id,
        user_email=user.email,
        action="TASK_CREATED",
        entity_type="ACTION_TASK",
        entity_id=task.id,
        changes={"status": "PENDING"}
    )
    db_session.add(audit)
    db_session.flush()
    assert audit.id is not None

    db_session.rollback()
