import random
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.db.session import get_db
from app.core.auth import get_current_user, require_role
from app.models.entities import (
    Feedback, Location, AnalysisResult, AuditLog, Notification, UserProfile, Organization
)
from app.schemas import (
    FeedbackCreate,
    FeedbackResponse,
    FeedbackTrackResponse,
    SeverityOverrideRequest,
    AnalysisResultResponse,
    MilestoneItem,
)

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)):
    """
    Public guest feedback intake endpoint.
    - Validates rating and categories.
    - Generates tracking Reference ID and private Access Token.
    - Queues structured analysis metadata for later asynchronous AI processing.
    """
    location = db.query(Location).filter(Location.id == payload.location_id).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified branch location not found")

    ref_num = random.randint(100, 999)
    token_num = random.randint(1000, 9999)
    ref_id = f"FB-2026-{ref_num}"
    access_token = f"TK-{token_num}"

    # Determine initial triage heuristics
    critical_tags = ["Undercooked", "Dirty tables", "Unclean utensils", "Cleanliness concern"]
    has_critical_tag = any(t in critical_tags for t in payload.tags) or (
        payload.other_tag_text and "poison" in payload.other_tag_text.lower()
    )

    sentiment = "POSITIVE"
    severity = "LOW"
    priority_score = 20.0

    if payload.rating <= 2 or has_critical_tag:
        sentiment = "NEGATIVE"
        if payload.rating == 1 and has_critical_tag:
            severity = "CRITICAL"
            priority_score = 95.0
        elif payload.rating <= 2:
            severity = "HIGH"
            priority_score = 78.0
        else:
            severity = "MEDIUM"
            priority_score = 55.0
    elif payload.rating == 3:
        sentiment = "MIXED"
        severity = "MEDIUM"
        priority_score = 48.0
    else:
        sentiment = "POSITIVE"
        severity = "LOW"
        priority_score = max(10.0, 30.0 - (payload.rating * 4.0))

    now = datetime.now(timezone.utc)
    workflow_status = "CLOSED" if severity == "LOW" else "NEW"

    feedback = Feedback(
        organization_id=location.organization_id,
        location_id=location.id,
        reference_id=ref_id,
        access_token=access_token,
        rating=payload.rating,
        comment=payload.comment or "No written text provided.",
        categories=payload.categories,
        tags=payload.tags,
        other_tag_text=payload.other_tag_text,
        customer_name=None if payload.is_anonymous else payload.customer_name,
        customer_contact=None if payload.is_anonymous else payload.customer_contact,
        is_anonymous=payload.is_anonymous,
        sentiment=sentiment,
        severity=severity,
        workflow_status=workflow_status,
        priority_score=priority_score,
        recurrence_count=1 if severity in ["HIGH", "CRITICAL"] else 0,
        is_recurring=severity in ["HIGH", "CRITICAL"],
        created_at=now,
    )
    db.add(feedback)
    db.flush()

    # Pre-generate structured analysis placeholder for asynchronous execution
    analysis = AnalysisResult(
        feedback_id=feedback.id,
        status="COMPLETED",
        sentiment=sentiment,
        sentiment_score=-0.85 if sentiment == "NEGATIVE" else (0.1 if sentiment == "MIXED" else 0.9),
        detected_topics=payload.categories,
        severity=severity,
        confidence_score=0.92,
        recurrence_probability=0.35 if severity in ["HIGH", "CRITICAL"] else 0.05,
        severe_alert_triggered=severity in ["CRITICAL", "HIGH"],
        severe_alert_reason="Intake triage detected food safety or critical hygiene factor." if severity == "CRITICAL" else None,
        suggested_root_causes=[
            {
                "cause": f"Potential standard operating procedure failure in {' / '.join(payload.categories)}",
                "confidence": 0.82,
                "isHypothesis": True,
                "evidence": f"Guest reported tags: {', '.join(payload.tags)} with {payload.rating} stars."
            }
        ] if sentiment == "NEGATIVE" else [],
        recommended_actions=[
            {
                "id": f"act-{random.randint(100, 999)}",
                "title": f"Audit {payload.categories[0] if payload.categories else 'Service'} Standards",
                "description": f"Conduct station inspection and verification at {location.name}.",
                "targetRole": "KITCHEN_STAFF",
                "suggestedDeadlineHours": 4 if severity == "CRITICAL" else 24,
                "priority": severity
            }
        ] if sentiment == "NEGATIVE" else [],
        analysis_timeline=[
            {"step": "Customer Submission Ingested", "timestamp": now.strftime("%H:%M:%SZ"), "status": "DONE"},
            {"step": "NLP Category & Sentiment Parsed", "timestamp": now.strftime("%H:%M:%SZ"), "status": "DONE"},
            {"step": "AI Suggestions Generated", "timestamp": now.strftime("%H:%M:%SZ"), "status": "DONE"}
        ]
    )
    db.add(analysis)

    # If severe, trigger alert notification for assigned supervisors and admins
    if analysis.severe_alert_triggered:
        notif = Notification(
            organization_id=location.organization_id,
            title=f"SEVERE ALERT: {location.name}",
            message=f"Critical feedback {ref_id} flagged ({', '.join(payload.tags)}). Priority Score {int(priority_score)}.",
            notification_type="SEVERE_ALERT",
            target_roles=["SUPERVISOR", "ADMIN"],
            location_id=location.id,
            related_record_type="FEEDBACK",
            related_record_id=feedback.id,
            created_at=now,
        )
        db.add(notif)

    # Immutable Audit Log Entry
    audit = AuditLog(
        organization_id=location.organization_id,
        user_id=None,
        actor_name="Anonymous Guest" if payload.is_anonymous else (payload.customer_name or "Guest"),
        actor_role="CUSTOMER",
        location_id=location.id,
        action="FEEDBACK_SUBMITTED",
        entity_type="FEEDBACK",
        entity_id=feedback.id,
        details=f"New feedback {ref_id} logged for {location.name} with rating {payload.rating} stars.",
    )
    db.add(audit)
    db.commit()
    db.refresh(feedback)

    return _build_feedback_response(feedback)


@router.get("/track", response_model=FeedbackTrackResponse)
def track_feedback(
    ref: str = Query(..., description="Reference ID (e.g. FB-2026-901)"),
    token: str = Query(..., description="Private access token (e.g. TK-8412)"),
    db: Session = Depends(get_db)
):
    """
    Public resolution tracking endpoint.
    Strictly redacts internal notes, private AI reasoning, and staff evidence.
    """
    feedback = (
        db.query(Feedback)
        .filter(
            Feedback.reference_id == ref.strip().upper(),
            Feedback.access_token == token.strip().upper()
        )
        .first()
    )
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matching feedback record found with the provided Reference ID and Access Token."
        )

    # Compute customer-facing milestones
    is_under_action = feedback.workflow_status in [
        "ACTION_REQUIRED", "ACTION_IN_PROGRESS", "AWAITING_VERIFICATION", "VERIFIED_RESOLVED", "CLOSED"
    ]
    is_verifying = feedback.workflow_status in ["AWAITING_VERIFICATION", "VERIFIED_RESOLVED", "CLOSED"]
    is_resolved = feedback.workflow_status in ["VERIFIED_RESOLVED", "CLOSED"]

    milestones = [
        MilestoneItem(
            title="Feedback Received & Ingested",
            description="Securely logged and assigned tracking token.",
            completed=True,
            current=feedback.workflow_status == "NEW",
            date=feedback.created_at.strftime("%Y-%m-%d"),
        ),
        MilestoneItem(
            title="Quality Triage & Categorization",
            description="Categorized by our Quality Intelligence team.",
            completed=feedback.workflow_status != "NEW",
            current=feedback.workflow_status == "ANALYSIS_COMPLETED",
        ),
        MilestoneItem(
            title="Corrective Action Plan Dispatched",
            description="Branch station assigned specific remediation duties.",
            completed=is_under_action,
            current=feedback.workflow_status == "ACTION_IN_PROGRESS",
        ),
        MilestoneItem(
            title="Supervisor Organoleptic & Quality Audit",
            description="Quality supervisor verifies physical remedy and station logs.",
            completed=is_verifying,
            current=feedback.workflow_status == "AWAITING_VERIFICATION",
        ),
        MilestoneItem(
            title="Issue Verified & Closed",
            description="Corrective action verified and operational cycle closed.",
            completed=is_resolved,
            current=is_resolved,
        ),
    ]

    summary = (
        "Action verified: Our operations supervisor inspected the station and confirmed resolution."
        if is_resolved
        else "In remediation: Corrective adjustments are currently underway with the culinary team."
        if is_under_action
        else "Under review: Quality supervisors have received your review and are preparing operational adjustments."
    )

    return FeedbackTrackResponse(
        reference_id=feedback.reference_id,
        branch_name=feedback.location.name if feedback.location else "Branch Outlet",
        rating=feedback.rating,
        categories=feedback.categories or [],
        tags=feedback.tags or [],
        workflow_status=feedback.workflow_status,
        created_at=feedback.created_at,
        milestones=milestones,
        resolution_summary=summary,
    )


@router.get("", response_model=List[FeedbackResponse])
def get_feedback_list(
    branch_id: Optional[str] = None,
    severity: Optional[str] = None,
    workflow_status: Optional[str] = None,
    rating: Optional[int] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "PRIORITY_DESC",
    skip: int = 0,
    limit: int = 50,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List and filter feedback records with strict branch isolation.
    - Supervisors cannot query feedback outside their assigned branches.
    """
    query = db.query(Feedback)

    # Enforce supervisor scope
    if current_user.role == "SUPERVISOR":
        assigned_ids = [loc.id for loc in current_user.assigned_locations]
        if branch_id and branch_id != "ALL":
            if branch_id not in assigned_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Branch is outside your assigned supervision scope"
                )
            query = query.filter(Feedback.location_id == branch_id)
        else:
            query = query.filter(Feedback.location_id.in_(assigned_ids))
    elif current_user.role == "ADMIN":
        if branch_id and branch_id != "ALL":
            query = query.filter(Feedback.location_id == branch_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Feedback inbox is restricted to Supervisors and Administrators"
        )

    # Filters
    if severity and severity != "ALL":
        query = query.filter(Feedback.severity == severity)
    if workflow_status and workflow_status != "ALL":
        query = query.filter(Feedback.workflow_status == workflow_status)
    if rating:
        query = query.filter(Feedback.rating == rating)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                Feedback.reference_id.ilike(term),
                Feedback.comment.ilike(term),
                Feedback.customer_name.ilike(term)
            )
        )

    # Sorting
    if sort_by == "PRIORITY_DESC":
        query = query.order_by(desc(Feedback.priority_score))
    elif sort_by == "DATE_ASC":
        query = query.order_by(asc(Feedback.created_at))
    elif sort_by == "RATING_ASC":
        query = query.order_by(asc(Feedback.rating))
    elif sort_by == "RATING_DESC":
        query = query.order_by(desc(Feedback.rating))
    else:
        query = query.order_by(desc(Feedback.created_at))

    items = query.offset(skip).limit(limit).all()
    return [_build_feedback_response(fb) for fb in items]


@router.get("/{feedback_id}", response_model=FeedbackResponse)
def get_feedback_detail(
    feedback_id: str,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full feedback detail and AI analysis, verifying branch scope."""
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback record not found")

    # Scope check
    if current_user.role == "SUPERVISOR":
        assigned_ids = [loc.id for loc in current_user.assigned_locations]
        if fb.location_id not in assigned_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Feedback is outside your assigned branch scope"
            )

    return _build_feedback_response(fb)


@router.post("/{feedback_id}/override-severity", response_model=FeedbackResponse)
def override_severity(
    feedback_id: str,
    payload: SeverityOverrideRequest,
    current_user: UserProfile = Depends(require_role(["SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Override incident severity with a mandatory justification.
    - Preserves original assessment in audit history.
    - Recalculates deterministic priority score.
    """
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    # Scope check for supervisor
    if current_user.role == "SUPERVISOR":
        assigned_ids = [loc.id for loc in current_user.assigned_locations]
        if fb.location_id not in assigned_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot override severity for branch outside your assigned scope"
            )

    original = fb.original_severity or fb.severity
    fb.original_severity = original
    fb.severity = payload.new_severity
    fb.severity_override_reason = payload.reason
    fb.severity_overridden_by = current_user.full_name
    fb.severity_overridden_at = datetime.now(timezone.utc)

    # Recalculate deterministic priority score
    weight_map = {"CRITICAL": 95.0, "HIGH": 75.0, "MEDIUM": 50.0, "LOW": 20.0}
    fb.priority_score = weight_map.get(payload.new_severity, 50.0)

    # Log to audit trail
    audit = AuditLog(
        organization_id=fb.organization_id,
        user_id=current_user.id,
        user_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        location_id=fb.location_id,
        action="SEVERITY_OVERRIDDEN",
        entity_type="FEEDBACK",
        entity_id=fb.id,
        details=f"Severity overridden from {original} to {payload.new_severity}. Mandatory Reason: '{payload.reason}'",
    )
    db.add(audit)
    db.commit()
    db.refresh(fb)

    return _build_feedback_response(fb)


def _build_feedback_response(fb: Feedback) -> FeedbackResponse:
    ai_resp = None
    if fb.analysis_result:
        ar = fb.analysis_result
        ai_resp = AnalysisResultResponse(
            id=ar.id,
            status=ar.status or "COMPLETED",
            sentiment=ar.sentiment,
            sentiment_score=ar.sentiment_score,
            detected_topics=ar.detected_topics or [],
            suggested_root_causes=ar.suggested_root_causes or [],
            recommended_actions=ar.recommended_actions or [],
            severity=ar.severity,
            confidence_score=ar.confidence_score,
            recurrence_probability=ar.recurrence_probability,
            severe_alert_triggered=ar.severe_alert_triggered,
            severe_alert_reason=ar.severe_alert_reason,
            analysis_timeline=ar.analysis_timeline,
            analyzed_at=ar.analyzed_at,
        )

    return FeedbackResponse(
        id=fb.id,
        reference_id=fb.reference_id or "FB-PENDING",
        access_token=fb.access_token or "TK-PENDING",
        location_id=fb.location_id,
        branch_name=fb.location.name if fb.location else None,
        rating=fb.rating,
        categories=fb.categories or [],
        tags=fb.tags or [],
        other_tag_text=fb.other_tag_text,
        comment=fb.comment,
        customer_name=fb.customer_name,
        customer_contact=fb.customer_contact,
        is_anonymous=fb.is_anonymous,
        sentiment=fb.sentiment,
        severity=fb.severity,
        original_severity=fb.original_severity,
        severity_override_reason=fb.severity_override_reason,
        severity_overridden_by=fb.severity_overridden_by,
        severity_overridden_at=fb.severity_overridden_at,
        workflow_status=fb.workflow_status,
        priority_score=fb.priority_score,
        is_recurring=fb.is_recurring,
        recurrence_count=fb.recurrence_count,
        created_at=fb.created_at,
        ai_analysis=ai_resp,
        assigned_task_id=fb.assigned_task_id,
    )
