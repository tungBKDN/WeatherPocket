from fastapi import HTTPException, status
from jose import JWTError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse


class AuthService:
    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository = user_repository

    async def signup(self, email: str, fullname: str, password: str) -> dict:
        existing_user = await self.user_repository.get_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = await self.user_repository.create(
            email=email,
            fullname=fullname,
            password_hash=hash_password(password),
        )

        token = create_access_token(str(user.id))

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": UserResponse(
                **{
                    "_id": str(user.id),
                    "email": user.email,
                    "fullname": user.fullname,
                    "is_active": user.is_active,
                    "created_at": user.created_at,
                    "updated_at": user.updated_at
                }
            ).model_dump(by_alias=True)
        }

    async def login(self, email: str, password: str) -> dict:
        user = await self.user_repository.get_by_email(email)

        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        token = create_access_token(str(user.id))

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": UserResponse(
                **{
                    "_id": str(user.id),
                    "email": user.email,
                    "fullname": user.fullname,
                    "is_active": user.is_active,
                    "created_at": user.created_at,
                    "updated_at": user.updated_at
                }
            ).model_dump(by_alias=True)
        }

    async def get_current_user(self, token: str) -> User:
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub")

            if not user_id:
                raise ValueError("Invalid token")

            user = await self.user_repository.get_by_id(user_id)
            if not user:
                raise ValueError("User not found")

            return user
        except (JWTError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

    async def refresh_token(self, user_id: str) -> dict:
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        new_token = create_access_token(str(user.id))

        return {
            "access_token": new_token,
            "token_type": "bearer"
        }
