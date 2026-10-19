from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import Progress, Topic, User
from app.schemas.schemas import TokenResponse, UserLogin, UserRegister, UserResponse
from app.services.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.services.catalyst import catalyst_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    """Register a new developer account and issue JWT session token."""
    # Check if username or email already exists
    stmt = select(User).where(or_(User.username == payload.username, User.email == payload.email))
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        if existing.username == payload.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this username already exists.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists.",
            )

    now = datetime.now(timezone.utc)
    display_name = payload.display_name or payload.username.title()
    hashed_pwd = hash_password(payload.password)

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hashed_pwd,
        display_name=display_name,
        target_company=payload.target_company or "tcs-nqt",
        streak_days=1,
        created_at=now,
        settings={"theme": "dark", "editor_font_size": 14},
    )
    db.add(user)
    await db.flush()

    # Initialize topic progress records for new user
    topics_res = await db.execute(select(Topic))
    for t in topics_res.scalars().all():
        prog = Progress(
            user_id=user.id,
            topic_id=t.id,
            problems_solved=0,
            problems_attempted=0,
            mastery_pct=0.0,
        )
        db.add(prog)

    # Cloud sync with Zoho Catalyst (non-blocking best-effort)
    row_id = await catalyst_service.sync_user_to_cloud({
        "username": user.username,
        "email": user.email,
        "display_name": user.display_name,
        "target_company": user.target_company,
        "streak_days": user.streak_days,
        "created_at": user.created_at,
    })
    if row_id:
        user.catalyst_row_id = row_id

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": str(user.id), "username": user.username})

    user_resp = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        target_company=user.target_company,
        streak_days=user.streak_days,
        created_at=user.created_at,
        settings=user.settings or {},
    )

    return TokenResponse(access_token=access_token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=TokenResponse)
async def login_user(
    payload: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Sign in with username or email and password."""
    stmt = select(User).where(
        or_(
            User.username == payload.username_or_email,
            User.email == payload.username_or_email,
        )
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": str(user.id), "username": user.username})

    user_resp = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        target_company=user.target_company,
        streak_days=user.streak_days,
        created_at=user.created_at,
        settings=user.settings or {},
    )

    return TokenResponse(access_token=access_token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    """Retrieve profile of the currently authenticated developer."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        display_name=current_user.display_name,
        target_company=current_user.target_company,
        streak_days=current_user.streak_days,
        created_at=current_user.created_at,
        settings=current_user.settings or {},
    )


@router.post("/logout")
async def logout_user(current_user: User = Depends(get_current_user)):
    """Sign out the current user."""
    return {"message": f"Successfully logged out {current_user.username}"}
