from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth import get_current_user, require_role
from app.models.entities import UserProfile, Location, AuditLog, ActionTask
from app.schemas import (
    UserProfileResponse,
    UserStatusUpdate,
    UserBranchAssignmentUpdate,
)

router = APIRouter(prefix="/api/staff", tags=["Staff Management"])


@router.get("", response_model=List[UserProfileResponse])
def get_staff_list(
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List staff accounts.
    - Administrators view all accounts in the organization.
    - Supervisors view staff assigned to their monitored locations.
    """
    if current_user.role == "ADMIN":
        users = db.query(UserProfile).all()
    elif current_user.role == "SUPERVISOR":
        assigned_branch_ids = [loc.id for loc in current_user.assigned_locations]
        users = (
            db.query(UserProfile)
            .join(UserProfile.assigned_locations)
            .filter(Location.id.in_(assigned_branch_ids))
            .distinct()
            .all()
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff roster requires supervisor or administrator privileges"
        )

    return [
        UserProfileResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            department=u.department,
            avatar=u.avatar,
            is_active=u.is_active,
            branch_ids=[loc.id for loc in u.assigned_locations],
        )
        for u in users
    ]


@router.post("/{staff_id}/status", response_model=UserProfileResponse)
def update_staff_status(
    staff_id: str,
    payload: UserStatusUpdate,
    current_user: UserProfile = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Activate or deactivate a staff account. Strictly restricted to Administrator.
    - Preserves all historical records, past tasks, and audit logs.
    - If deactivated, login is immediately disabled.
    - Generates an immutable audit log entry.
    """
    target = db.query(UserProfile).filter(UserProfile.id == staff_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff account not found")

    target.is_active = payload.is_active

    # Check for open tasks requiring reassignment
    open_tasks_count = (
        db.query(ActionTask)
        .filter(
            ActionTask.assigned_user_id == target.id,
            ActionTask.status.in_(["ASSIGNED", "IN_PROGRESS", "AWAITING_SCHEDULE_APPROVAL", "REJECTED_REOPENED"])
        )
        .count()
    )

    action_name = "STAFF_ACCOUNT_ACTIVATED" if payload.is_active else "STAFF_ACCOUNT_DEACTIVATED"
    audit_details = (
        f"Administrator {current_user.full_name} set {target.full_name} status to "
        f"{'Active' if payload.is_active else 'Deactivated (Login Disabled)'}. "
        f"Historical records preserved. Open duties requiring reassignment: {open_tasks_count}."
    )

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        user_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action=action_name,
        entity_type="STAFF",
        entity_id=target.id,
        details=audit_details,
    )
    db.add(audit)
    db.commit()
    db.refresh(target)

    return UserProfileResponse(
        id=target.id,
        email=target.email,
        full_name=target.full_name,
        role=target.role,
        department=target.department,
        avatar=target.avatar,
        is_active=target.is_active,
        branch_ids=[loc.id for loc in target.assigned_locations],
    )


@router.post("/{staff_id}/branches", response_model=UserProfileResponse)
def update_staff_branch_assignments(
    staff_id: str,
    payload: UserBranchAssignmentUpdate,
    current_user: UserProfile = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Reassign or transfer a staff member between branches.
    Strictly restricted to Administrator.
    """
    target = db.query(UserProfile).filter(UserProfile.id == staff_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff account not found")

    # Fetch new locations
    locations = db.query(Location).filter(Location.id.in_(payload.branch_ids)).all()
    target.assigned_locations = locations

    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        user_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="STAFF_BRANCH_REASSIGNED",
        entity_type="STAFF",
        entity_id=target.id,
        details=f"Updated branch scope for {target.full_name} to {len(locations)} locations: {[l.name for l in locations]}.",
    )
    db.add(audit)
    db.commit()
    db.refresh(target)

    return UserProfileResponse(
        id=target.id,
        email=target.email,
        full_name=target.full_name,
        role=target.role,
        department=target.department,
        avatar=target.avatar,
        is_active=target.is_active,
        branch_ids=[loc.id for loc in target.assigned_locations],
    )
