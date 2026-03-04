from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from fastapi.security import OAuth2PasswordBearer

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthSignup, AuthLogin, CurrentUserResponse
from app.schemas.user import UserResponse, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Constants
ACCESS_TOKEN_COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 3600  # 1 hour


def get_auth_service() -> AuthService:
    return AuthService(UserRepository())


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    service: AuthService = Depends(get_auth_service)
) -> User:
    """Dependency to get current authenticated user"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return await service.get_current_user(token)


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    data: AuthSignup,
    response: Response,
    service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """Register a new user."""
    result = await service.signup(data.email, data.fullname, data.password)

    # Set httpOnly cookie
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=result["access_token"],
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )

    return TokenResponse(
        access_token=result["access_token"],
        token_type=result["token_type"],
        user=result["user"]
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: AuthLogin,
    response: Response,
    service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """Login user and return JWT token."""
    result = await service.login(data.email, data.password)

    # Set httpOnly cookie
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=result["access_token"],
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )

    return TokenResponse(
        access_token=result["access_token"],
        token_type=result["token_type"],
        user=result["user"]
    )


@router.post("/logout")
async def logout(response: Response):
    """Logout user by clearing token cookie."""
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax"
    )
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=CurrentUserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    """Get current authenticated user."""
    return CurrentUserResponse(
        id=str(current_user.id),
        email=current_user.email,
        fullname=current_user.fullname,
        is_active=current_user.is_active
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """Refresh JWT token."""
    result = await service.refresh_token(str(current_user.id))
    return TokenResponse(
        access_token=result["access_token"],
        token_type=result["token_type"],
        user=UserResponse(
            **{
                "_id": str(current_user.id),
                "email": current_user.email,
                "fullname": current_user.fullname,
                "is_active": current_user.is_active,
                "created_at": current_user.created_at,
                "updated_at": current_user.updated_at
            }
        ).model_dump(by_alias=True)
    )
