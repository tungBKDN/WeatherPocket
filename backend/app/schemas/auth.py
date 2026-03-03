from pydantic import BaseModel, EmailStr, Field


class AuthSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")


class AuthLogin(BaseModel):
    email: EmailStr
    password: str


class CurrentUserResponse(BaseModel):
    id: str
    email: str
    is_active: bool
