from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.auth import create_access_token, get_current_user
from app.models.entities import UserProfile, Location, Organization
from app.schemas import LoginRequest, TokenResponse, UserProfileResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user via credentials or demo persona.
    Supports instant switching for Customer, Supervisor, Kitchen Staff, and Administrator.
    """
    persona_configs = {
        "admin": {
            "id": "user-admin",
            "email": "admin@feedbackiq.hotel",
            "name": "Sarah Jenkins",
            "role": "ADMIN",
            "department": "Executive Administration",
            "branch_ids": ["branch-1", "branch-2", "branch-3", "branch-4"]
        },
        "supervisor": {
            "id": "user-supervisor",
            "email": "supervisor@feedbackiq.hotel",
            "name": "Maria Chen",
            "role": "SUPERVISOR",
            "department": "Quality Supervision",
            "branch_ids": ["branch-1", "branch-2"]
        },
        "kitchen": {
            "id": "user-kitchen",
            "email": "chef@feedbackiq.hotel",
            "name": "Marco Rossi",
            "role": "KITCHEN_STAFF",
            "department": "Culinary Team (Line Chef)",
            "branch_ids": ["branch-1"]
        },
        "kitchen-2": {
            "id": "user-kitchen-2",
            "email": "elena.rostova@feedbackiq.hotel",
            "name": "Elena Rostova",
            "role": "KITCHEN_STAFF",
            "department": "Culinary Team (Sous Chef)",
            "branch_ids": ["branch-2"]
        },
    }

    target_email = payload.email
    persona_cfg = None

    if payload.persona and payload.persona.lower() in persona_configs:
        persona_cfg = persona_configs[payload.persona.lower()]
        target_email = persona_cfg["email"]

    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or valid persona must be provided"
        )

    user = db.query(UserProfile).filter(UserProfile.email == target_email).first()

    # If user doesn't exist yet and was requested via demo persona, auto-provision
    if not user and persona_cfg:
        org = db.query(Organization).first()
        if not org:
            org = Organization(name="Grand Luxury Hotel & Suites", slug="grand-hotel")
            db.add(org)
            db.commit()
            db.refresh(org)

        # Ensure locations exist
        locations = []
        for b_id in persona_cfg["branch_ids"]:
            loc = db.query(Location).filter(Location.id == b_id).first()
            if not loc:
                loc = Location(
                    id=b_id,
                    organization_id=org.id,
                    code=f"BR-{b_id[-2:].upper()}",
                    name=f"Branch {b_id}",
                    is_active=True
                )
                db.add(loc)
                db.commit()
                db.refresh(loc)
            locations.append(loc)

        user = UserProfile(
            id=persona_cfg["id"],
            organization_id=org.id,
            supabase_user_id=f"dev-{payload.persona.lower()}-id",
            email=persona_cfg["email"],
            full_name=persona_cfg["name"],
            role=persona_cfg["role"],
            department=persona_cfg["department"],
            is_active=True,
        )
        user.assigned_locations = locations
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User with email '{target_email}' not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Login is disabled."
        )

    branch_ids = [loc.id for loc in user.assigned_locations]

    token_data = {
        "sub": user.supabase_user_id or user.id,
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
        "user_id": user.id,
    }
    token = create_access_token(token_data)

    user_resp = UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        avatar=user.avatar,
        is_active=user.is_active,
        branch_ids=branch_ids,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_resp
    )


@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: UserProfile = Depends(get_current_user)):
    """Retrieve currently authenticated user profile with assigned branch IDs."""
    branch_ids = [loc.id for loc in current_user.assigned_locations]
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        avatar=current_user.avatar,
        is_active=current_user.is_active,
        branch_ids=branch_ids,
    )
