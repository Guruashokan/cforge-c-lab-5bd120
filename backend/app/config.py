from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./cforge.db"
    PISTON_API_URL: str = "https://emkc.org/api/v2/piston"
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173"
    EXECUTION_TIMEOUT: int = 10
    MEMORY_LIMIT_KB: int = 262144

    # Authentication
    JWT_SECRET_KEY: str = "cforge_super_secure_jwt_secret_key_2026_xyz"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Zoho Catalyst Cloud Database
    CATALYST_PROJECT_ID: str = ""
    CATALYST_CLIENT_ID: str = ""
    CATALYST_CLIENT_SECRET: str = ""
    CATALYST_REFRESH_TOKEN: str = ""
    CATALYST_DATA_CENTER: str = "com"
    CATALYST_TABLE_USERS: str = "Users"
    CATALYST_TABLE_SUBMISSIONS: str = "Submissions"
    CATALYST_TABLE_PROGRESS: str = "UserProgress"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        # Automatically upgrade standard sqlite:// to sqlite+aiosqlite://
        if v.startswith("sqlite://") and not v.startswith("sqlite+aiosqlite://"):
            return v.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return ["http://localhost:5173"]


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
