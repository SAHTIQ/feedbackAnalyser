from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.auth import get_current_user
from app.models.entities import Notification, UserProfile
from app.schemas import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve in-app notifications scoped to the user's role and location permissions:
    - Kitchen staff receive task assignments and rejection notes for their station.
    - Supervisors receive operational alerts for their assigned branches.
    - Administrators receive all critical organization alerts.
    """
    query = db.query(Notification)

    if current_user.role == "KITCHEN_STAFF":
        query = query.filter(Notification.staff_id == current_user.id)
    elif current_user.role == "SUPERVISOR":
        assigned_branch_ids = [loc.id for loc in current_user.assigned_locations]
        query = query.filter(
            (Notification.location_id.in_(assigned_branch_ids)) | (Notification.location_id.is_(None))
        )

    query = query.order_by(desc(Notification.created_at))
    items = query.all()

    # Filter by target_roles in JSON
    user_role = current_user.role
    filtered = [n for n in items if user_role in (n.target_roles or [])]

    return [
        NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            notification_type=n.notification_type,
            target_roles=n.target_roles or [],
            branch_id=n.location_id,
            staff_id=n.staff_id,
            related_record_type=n.related_record_type,
            related_record_id=n.related_record_id,
            is_read=n.is_read,
            created_at=n.created_at,
        )
        for n in filtered
    ]


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notif.is_read = True
    db.commit()
    return {"status": "success", "id": notification_id}


@router.post("/read-all")
def mark_all_notifications_read(
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all active notifications for the current user as read."""
    query = db.query(Notification).filter(Notification.is_read == False)
    if current_user.role == "KITCHEN_STAFF":
        query = query.filter(Notification.staff_id == current_user.id)
    elif current_user.role == "SUPERVISOR":
        assigned_ids = [loc.id for loc in current_user.assigned_locations]
        query = query.filter(Notification.location_id.in_(assigned_ids))

    query.update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"status": "success", "message": "All notifications marked as read."}
