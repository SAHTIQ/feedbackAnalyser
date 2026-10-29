from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth import get_current_user, require_role
from app.models.entities import Location, UserProfile, Organization
from app.schemas import BranchResponse, BranchCreate

router = APIRouter(prefix="/api/branches", tags=["Branches"])


@router.get("", response_model=List[BranchResponse])
def get_branches(
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List branches based on role scope.
    - Administrators see all organization branches.
    - Supervisors see only their assigned locations.
    - Kitchen staff see only their assigned location.
    """
    if current_user.role == "ADMIN":
        branches = db.query(Location).filter(Location.is_active == True).all()
    else:
        branches = current_user.assigned_locations

    return [
        BranchResponse(
            id=b.id,
            code=b.code or f"BR-{b.id[:4].upper()}",
            name=b.name,
            address=b.address,
            city=b.city,
            phone=b.phone,
            manager_name=b.manager_name,
            is_active=b.is_active,
        )
        for b in branches
    ]


@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch_detail(
    branch_id: str,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single branch details with cross-branch authorization check."""
    branch = db.query(Location).filter(Location.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    # Enforce supervisor and kitchen staff boundary
    if current_user.role != "ADMIN":
        assigned_ids = [loc.id for loc in current_user.assigned_locations]
        if branch.id not in assigned_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Branch is outside your assigned operational scope"
            )

    return BranchResponse(
        id=branch.id,
        code=branch.code or f"BR-{branch.id[:4].upper()}",
        name=branch.name,
        address=branch.address,
        city=branch.city,
        phone=branch.phone,
        manager_name=branch.manager_name,
        is_active=branch.is_active,
    )


@router.post("", response_model=BranchResponse, dependencies=[Depends(require_role(["ADMIN"]))])
def create_branch(
    payload: BranchCreate,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new branch outlet. Admin authorization strictly required."""
    org = db.query(Organization).first()
    new_loc = Location(
        organization_id=org.id,
        code=payload.code,
        name=payload.name,
        address=payload.address,
        city=payload.city,
        phone=payload.phone,
        manager_name=payload.manager_name,
        is_active=True,
    )
    db.add(new_loc)
    db.commit()
    db.refresh(new_loc)

    return BranchResponse(
        id=new_loc.id,
        code=new_loc.code,
        name=new_loc.name,
        address=new_loc.address,
        city=new_loc.city,
        phone=new_loc.phone,
        manager_name=new_loc.manager_name,
        is_active=new_loc.is_active,
    )
