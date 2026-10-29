from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.auth import get_current_user, require_role
from app.models.entities import AuditLog, UserProfile
from app.schemas import AuditLogResponse

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogResponse], dependencies=[Depends(require_role(["ADMIN", "SUPERVISOR"]))])
def get_audit_logs(
    entity_type: Optional[str] = None,
    branch_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve immutable compliance audit events.
    - Administrators can inspect all organization audit records.
    - Supervisors can inspect audit records for their assigned branch.
    """
    query = db.query(AuditLog)

    if current_user.role == "SUPERVISOR":
        assigned_ids = [loc.id for loc in current_user.assigned_locations]
        if branch_id and branch_id != "ALL":
            query = query.filter(AuditLog.location_id == branch_id)
        else:
            query = query.filter(
                (AuditLog.location_id.in_(assigned_ids)) | (AuditLog.location_id.is_(None))
            )
    elif current_user.role == "ADMIN":
        if branch_id and branch_id != "ALL":
            query = query.filter(AuditLog.location_id == branch_id)

    if entity_type and entity_type != "ALL":
        query = query.filter(AuditLog.entity_type == entity_type)

    query = query.order_by(desc(AuditLog.created_at))
    logs = query.offset(skip).limit(limit).all()

    return [
        AuditLogResponse(
            id=a.id,
            timestamp=a.created_at,
            actor_name=a.actor_name,
            actor_role=a.actor_role,
            action=a.action,
            entity_type=a.entity_type,
            entity_id=a.entity_id,
            details=a.details,
            branch_id=a.location_id,
        )
        for a in logs
    ]
