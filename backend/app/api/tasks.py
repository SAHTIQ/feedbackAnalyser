from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.auth import get_current_user, require_role
from app.models.entities import (
    ActionTask, Feedback, Location, UserProfile, AuditLog, Notification
)
from app.schemas import (
    ActionTaskCreate,
    ActionTaskResponse,
    TaskScheduleApproveRequest,
    TaskCompleteRequest,
    TaskVerifyRequest,
    TaskRejectRequest,
)

router = APIRouter(prefix="/api/tasks", tags=["Corrective Action Tasks"])


@router.get("", response_model=List[ActionTaskResponse])
def get_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    branch_id: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List corrective action tasks with role-based scoping:
    - Kitchen staff: strictly sees ONLY tasks where assigned_user_id == current_user.id
    - Supervisors: strictly sees tasks for locations in their assigned_locations
    - Administrators: sees all organization tasks
    """
    query = db.query(ActionTask)

    if current_user.role == "KITCHEN_STAFF":
        query = query.filter(ActionTask.assigned_user_id == current_user.id)
    elif current_user.role == "SUPERVISOR":
        assigned_branch_ids = [loc.id for loc in current_user.assigned_locations]
        if branch_id and branch_id != "ALL":
            if branch_id not in assigned_branch_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Branch is outside your assigned supervision scope"
                )
            query = query.filter(ActionTask.location_id == branch_id)
        else:
            query = query.filter(ActionTask.location_id.in_(assigned_branch_ids))
    elif current_user.role == "ADMIN":
        if branch_id and branch_id != "ALL":
            query = query.filter(ActionTask.location_id == branch_id)

    if status_filter and status_filter != "ALL":
        query = query.filter(ActionTask.status == status_filter)

    query = query.order_by(desc(ActionTask.created_at))
    tasks = query.all()
    return [_build_task_response(t) for t in tasks]


@router.get("/{task_id}", response_model=ActionTaskResponse)
def get_task_detail(
    task_id: str,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve single task details with authorization check."""
    task = db.query(ActionTask).filter(ActionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    _verify_task_access(task, current_user)
    return _build_task_response(task)


@router.post("", response_model=ActionTaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: ActionTaskCreate,
    current_user: UserProfile = Depends(require_role(["SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Create and dispatch a corrective action task from customer feedback.
    Supervisors can immediately approve the schedule or leave it pending approval.
    """
    fb = db.query(Feedback).filter(Feedback.id == payload.feedback_id).first()
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked feedback not found")

    # Scope check for supervisor
    if current_user.role == "SUPERVISOR":
        assigned_branch_ids = [loc.id for loc in current_user.assigned_locations]
        if fb.location_id not in assigned_branch_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot dispatch task for branch outside your assigned scope"
            )

    staff = db.query(UserProfile).filter(UserProfile.id == payload.assigned_user_id).first()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned staff member not found")

    now = datetime.now(timezone.utc)
    task_status = "ASSIGNED" if payload.auto_approve_schedule else "AWAITING_SCHEDULE_APPROVAL"

    initial_history = [
        {
            "id": f"wh-{int(now.timestamp())}",
            "action": "TASK_CREATED_AND_ASSIGNED" if payload.auto_approve_schedule else "TASK_PROPOSED_AWAITING_SCHEDULE",
            "actor": current_user.full_name,
            "actorRole": current_user.role,
            "timestamp": now.isoformat(),
            "details": f"Task created from feedback {fb.reference_id} assigned to {staff.full_name}.",
        }
    ]

    task = ActionTask(
        feedback_id=fb.id,
        location_id=fb.location_id,
        title=payload.title,
        description=payload.description,
        assigned_user_id=staff.id,
        assigned_role="KITCHEN_STAFF",
        severity=payload.severity,
        priority=payload.severity,
        proposed_deadline=payload.proposed_deadline,
        approved_deadline=payload.proposed_deadline,
        is_schedule_approved=payload.auto_approve_schedule,
        approved_by_user_id=current_user.id if payload.auto_approve_schedule else None,
        approved_by_name=current_user.full_name if payload.auto_approve_schedule else None,
        approved_at=now if payload.auto_approve_schedule else None,
        status=task_status,
        workflow_history=initial_history,
        created_at=now,
    )
    db.add(task)
    db.flush()

    # Link task to feedback
    fb.assigned_task_id = task.id
    fb.workflow_status = "ACTION_IN_PROGRESS"

    # Notification to assigned staff
    notif = Notification(
        organization_id=fb.organization_id,
        title="New Corrective Task Assigned",
        message=f"You have been assigned: '{task.title}' at {fb.location.name if fb.location else 'Branch'}.",
        notification_type="TASK_ASSIGNED",
        target_roles=["KITCHEN_STAFF"],
        location_id=fb.location_id,
        staff_id=staff.id,
        related_record_type="TASK",
        related_record_id=task.id,
        created_at=now,
    )
    db.add(notif)

    audit = AuditLog(
        organization_id=fb.organization_id,
        user_id=current_user.id,
        user_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        location_id=fb.location_id,
        action="TASK_CREATED",
        entity_type="TASK",
        entity_id=task.id,
        details=f"Task '{task.title}' created and assigned to {staff.full_name}.",
    )
    db.add(audit)
    db.commit()
    db.refresh(task)

    return _build_task_response(task)


@router.post("/{task_id}/approve-schedule", response_model=ActionTaskResponse)
def approve_schedule(
    task_id: str,
    payload: TaskScheduleApproveRequest,
    current_user: UserProfile = Depends(require_role(["SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Approve or adjust proposed task deadline.
    Every corrective task requires supervisor approval before kitchen execution.
    """
    task = db.query(ActionTask).filter(ActionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    _verify_task_access(task, current_user)

    now = datetime.now(timezone.utc)
    task.approved_deadline = payload.approved_deadline
    task.is_schedule_approved = True
    task.approved_by_user_id = current_user.id
    task.approved_by_name = current_user.full_name
    task.approved_at = now
    task.status = "ASSIGNED"

    history = task.workflow_history or []
    history.append({
        "id": f"wh-{int(now.timestamp())}",
        "action": "SCHEDULE_APPROVED",
        "actor": current_user.full_name,
        "actorRole": current_user.role,
        "timestamp": now.isoformat(),
        "details": f"Execution deadline approved: {payload.approved_deadline.isoformat()}.",
    })
    task.workflow_history = history

    db.commit()
    db.refresh(task)
    return _build_task_response(task)


@router.post("/{task_id}/start", response_model=ActionTaskResponse)
def start_task(
    task_id: str,
    current_user: UserProfile = Depends(require_role(["KITCHEN_STAFF"])),
    db: Session = Depends(get_db)
):
    """Start task work. Restricted to the assigned kitchen staff member."""
    task = db.query(ActionTask).filter(ActionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if task.assigned_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only start tasks assigned to your station"
        )

    now = datetime.now(timezone.utc)
    task.status = "IN_PROGRESS"

    history = task.workflow_history or []
    history.append({
        "id": f"wh-{int(now.timestamp())}",
        "action": "TASK_STARTED",
        "actor": current_user.full_name,
        "actorRole": current_user.role,
        "timestamp": now.isoformat(),
        "details": "Station team initiated corrective remediation.",
    })
    task.workflow_history = history

    db.commit()
    db.refresh(task)
    return _build_task_response(task)


@router.post("/{task_id}/complete", response_model=ActionTaskResponse)
def submit_completion(
    task_id: str,
    payload: TaskCompleteRequest,
    current_user: UserProfile = Depends(require_role(["KITCHEN_STAFF"])),
    db: Session = Depends(get_db)
):
    """
    Submit completion note and optional photo evidence for supervisor audit.
    Restricted to assigned kitchen staff.
    """
    task = db.query(ActionTask).filter(ActionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if task.assigned_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit completion evidence for tasks assigned to you"
        )

    now = datetime.now(timezone.utc)
    task.status = "COMPLETED_AWAITING_VERIFICATION"
    task.completion_notes = payload.completion_notes
    task.completion_photo_url = payload.completion_photo_url
    task.completed_at = now
    task.verification_status = "PENDING"

    history = task.workflow_history or []
    history.append({
        "id": f"wh-{int(now.timestamp())}",
        "action": "EVIDENCE_SUBMITTED_AWAITING_VERIFICATION",
        "actor": current_user.full_name,
        "actorRole": current_user.role,
        "timestamp": now.isoformat(),
        "details": f"Completion note: '{payload.completion_notes}'. Photo attached: {bool(payload.completion_photo_url)}.",
    })
    task.workflow_history = history

    # Notify supervisors
    notif = Notification(
        organization_id=task.location.organization_id if task.location else current_user.organization_id,
        title="Evidence Ready for Supervisor Audit",
        message=f"{current_user.full_name} completed task '{task.title}'. Awaiting physical verification.",
        notification_type="AWAITING_VERIFICATION",
        target_roles=["SUPERVISOR", "ADMIN"],
        location_id=task.location_id,
        related_record_type="TASK",
        related_record_id=task.id,
        created_at=now,
    )
    db.add(notif)
    db.commit()
    db.refresh(task)
    return _build_task_response(task)


@router.post("/{task_id}/verify", response_model=ActionTaskResponse)
def verify_task(
    task_id: str,
    payload: TaskVerifyRequest,
    current_user: UserProfile = Depends(require_role(["SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Verify completion evidence and close task and linked feedback workflow.
    Supervisors must audit physical evidence before closing.
    """
    task = db.query(ActionTask).filter(ActionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    _verify_task_access(task, current_user)

    now = datetime.now(timezone.utc)
    task.status = "VERIFIED_CLOSED"
    task.verification_status = "VERIFIED"
    task.verification_note = payload.verification_note
    task.verified_by_user_id = current_user.id
    task.verified_by_name = current_user.full_name
    task.verified_at = now
    task.closed_at = now

    history = task.workflow_history or []
    history.append({
        "id": f"wh-{int(now.timestamp())}",
        "action": "TASK_VERIFIED_AND_CLOSED",
        "actor": current_user.full_name,
        "actorRole": current_user.role,
        "timestamp": now.isoformat(),
        "details": f"Supervisor verified: '{payload.verification_note}'. Closed operational duty.",
    })
    task.workflow_history = history

    # Update linked feedback
    if task.feedback:
        task.feedback.workflow_status = "VERIFIED_RESOLVED"

    db.commit()
    db.refresh(task)
    return _build_task_response(task)


@router.post("/{task_id}/reject", response_model=ActionTaskResponse)
def reject_task(
    task_id: str,
    payload: TaskRejectRequest,
    current_user: UserProfile = Depends(require_role(["SUPERVISOR", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Reject completion evidence with mandatory reason.
    Returns task to original assignee and reopens it.
    Repeated rejections (>= 2) trigger escalation state and increase priority.
    """
    task = db.query(ActionTask).filter(ActionTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    _verify_task_access(task, current_user)

    now = datetime.now(timezone.utc)
    task.status = "REJECTED_REOPENED"
    task.verification_status = "REJECTED"
    task.rejection_reason = payload.rejection_reason
    task.rejection_count = (task.rejection_count or 0) + 1

    if task.rejection_count >= 2:
        task.is_escalated = True
        task.priority = "CRITICAL"
        task.severity = "CRITICAL"

    history = task.workflow_history or []
    history.append({
        "id": f"wh-{int(now.timestamp())}",
        "action": "COMPLETION_REJECTED",
        "actor": current_user.full_name,
        "actorRole": current_user.role,
        "timestamp": now.isoformat(),
        "details": f"Rejected by supervisor. Mandatory reason: '{payload.rejection_reason}'. Returned to assignee.",
    })
    task.workflow_history = history

    # Alert assigned kitchen staff
    notif = Notification(
        organization_id=task.location.organization_id if task.location else current_user.organization_id,
        title="Corrective Duty Returned by Supervisor",
        message=f"Evidence rejected for '{task.title}'. Reason: '{payload.rejection_reason}'.",
        notification_type="TASK_REJECTED",
        target_roles=["KITCHEN_STAFF"],
        location_id=task.location_id,
        staff_id=task.assigned_user_id,
        related_record_type="TASK",
        related_record_id=task.id,
        created_at=now,
    )
    db.add(notif)
    db.commit()
    db.refresh(task)
    return _build_task_response(task)


def _verify_task_access(task: ActionTask, user: UserProfile):
    """Ensure user is authorized to inspect or modify task."""
    if user.role == "ADMIN":
        return
    if user.role == "KITCHEN_STAFF":
        if task.assigned_user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Task is assigned to a different staff member"
            )
    elif user.role == "SUPERVISOR":
        assigned_branch_ids = [loc.id for loc in user.assigned_locations]
        if task.location_id not in assigned_branch_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Task location is outside your assigned supervision scope"
            )


def _build_task_response(t: ActionTask) -> ActionTaskResponse:
    return ActionTaskResponse(
        id=t.id,
        feedback_id=t.feedback_id,
        feedback_ref=t.feedback.reference_id if t.feedback else None,
        location_id=t.location_id,
        branch_name=t.location.name if t.location else None,
        title=t.title,
        description=t.description,
        assigned_user_id=t.assigned_user_id,
        assigned_user_name=t.assigned_user.full_name if t.assigned_user else None,
        severity=t.severity,
        priority=t.priority,
        proposed_deadline=t.proposed_deadline,
        approved_deadline=t.approved_deadline,
        is_schedule_approved=t.is_schedule_approved,
        approved_by_name=t.approved_by_name,
        approved_at=t.approved_at,
        status=t.status,
        completion_notes=t.completion_notes,
        completion_photo_url=t.completion_photo_url,
        completed_at=t.completed_at,
        verification_status=t.verification_status,
        verification_note=t.verification_note,
        verified_by_name=t.verified_by_name,
        verified_at=t.verified_at,
        rejection_reason=t.rejection_reason,
        rejection_count=t.rejection_count or 0,
        is_escalated=t.is_escalated or False,
        closed_at=t.closed_at,
        workflow_history=t.workflow_history or [],
        created_at=t.created_at,
    )
