from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.entities import Feedback, ActionTask, Location, UserProfile
from app.schemas import DashboardMetricsResponse
from app.api.feedback import _build_feedback_response

router = APIRouter(prefix="/api/metrics", tags=["Metrics & Analytics"])


@router.get("/dashboard", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    branch_id: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate live KPI metrics from actual database records.
    Enforces branch scoping:
    - Supervisors only calculate metrics across their assigned locations.
    - Administrators calculate metrics across the organization or selected branch.
    """
    fb_query = db.query(Feedback)
    task_query = db.query(ActionTask)

    if current_user.role == "SUPERVISOR":
        assigned_ids = [loc.id for loc in current_user.assigned_locations]
        if branch_id and branch_id != "ALL":
            if branch_id not in assigned_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot access metrics outside your assigned branch scope"
                )
            fb_query = fb_query.filter(Feedback.location_id == branch_id)
            task_query = task_query.filter(ActionTask.location_id == branch_id)
        else:
            fb_query = fb_query.filter(Feedback.location_id.in_(assigned_ids))
            task_query = task_query.filter(ActionTask.location_id.in_(assigned_ids))
    elif current_user.role == "ADMIN":
        if branch_id and branch_id != "ALL":
            fb_query = fb_query.filter(Feedback.location_id == branch_id)
            task_query = task_query.filter(ActionTask.location_id == branch_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Metrics access restricted to Supervisors and Administrators"
        )

    feedbacks = fb_query.all()
    tasks = task_query.all()

    total_feedback = len(feedbacks)
    avg_rating = round(sum(f.rating for f in feedbacks) / total_feedback, 1) if total_feedback > 0 else 0.0

    severe_issues = sum(1 for f in feedbacks if f.severity in ["CRITICAL", "HIGH"])
    pending_actions = sum(
        1 for t in tasks if t.status in ["ASSIGNED", "IN_PROGRESS", "AWAITING_SCHEDULE_APPROVAL", "REJECTED_REOPENED", "COMPLETED_AWAITING_VERIFICATION"]
    )
    verified_resolved = sum(1 for f in feedbacks if f.workflow_status in ["VERIFIED_RESOLVED", "CLOSED"])

    # Severe issues list requiring immediate supervisor attention
    severe_alerts = [
        _build_feedback_response(f)
        for f in feedbacks
        if f.severity in ["CRITICAL", "HIGH"] and f.workflow_status not in ["VERIFIED_RESOLVED", "CLOSED"]
    ][:5]

    # High-priority feedback list ranked by calculated priority score
    high_priority = sorted(feedbacks, key=lambda f: f.priority_score, reverse=True)[:6]
    high_priority_feedbacks = [_build_feedback_response(f) for f in high_priority]

    # Category distribution derived from real records
    category_counts: Dict[str, int] = {}
    for f in feedbacks:
        for cat in (f.categories or []):
            category_counts[cat] = category_counts.get(cat, 0) + 1
    category_dist = [{"name": k, "value": v} for k, v in category_counts.items()]

    # Star rating distribution
    rating_dist = []
    for stars in [1, 2, 3, 4, 5]:
        c = sum(1 for f in feedbacks if f.rating == stars)
        pct = round((c / total_feedback) * 100) if total_feedback > 0 else 0
        rating_dist.append({"stars": f"{stars} Stars", "count": c, "percentage": pct})

    return DashboardMetricsResponse(
        total_feedback=total_feedback,
        avg_rating=avg_rating,
        severe_issues=severe_issues,
        pending_actions=pending_actions,
        verified_resolved=verified_resolved,
        severe_alerts=severe_alerts,
        high_priority_feedbacks=high_priority_feedbacks,
        category_distribution=category_dist,
        rating_dist=rating_dist,
    )
