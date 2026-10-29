import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.entities import UserProfile, Organization

security = HTTPBearer(auto_error=False)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SUPABASE_JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    # Special dev bypass tokens for quick testing
    dev_tokens = {
        "dev-admin-token": {"sub": "dev-admin-id", "email": "admin@feedbackiq.hotel", "role": "ADMIN", "org_slug": "grand-hotel"},
        "dev-supervisor-token": {"sub": "dev-sup-id", "email": "supervisor@feedbackiq.hotel", "role": "SUPERVISOR", "org_slug": "grand-hotel"},
        "dev-kitchen-token": {"sub": "dev-kitchen-id", "email": "chef@feedbackiq.hotel", "role": "KITCHEN_STAFF", "org_slug": "grand-hotel"},
    }
    if token in dev_tokens:
        return dev_tokens[token]
        
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> UserProfile:
    """Retrieve and validate the authenticated user from the database."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    email = payload.get("email")
    role = payload.get("role", "KITCHEN_STAFF")
    
    # Check if user profile already exists
    user = db.query(UserProfile).filter(
        (UserProfile.supabase_user_id == user_id) | (UserProfile.email == email)
    ).first()
    
    if not user:
        # Resolve or create default organization
        org = db.query(Organization).first()
        if not org:
            org = Organization(name="Grand Luxury Hotel", slug="grand-hotel")
            db.add(org)
            db.commit()
            db.refresh(org)
            
        user = UserProfile(
            supabase_user_id=user_id or "user-" + email,
            email=email,
            full_name=payload.get("name", email.split("@")[0].capitalize()),
            role=role,
            organization_id=org.id,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")
        
    return user


def require_role(allowed_roles: List[str]):
    """Enforce role-based access control."""
    def role_checker(current_user: UserProfile = Depends(get_current_user)) -> UserProfile:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles}, your role is {current_user.role}"
            )
        return current_user
    return role_checker
