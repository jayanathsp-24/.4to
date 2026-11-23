from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./4to.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "local-development-only"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    s3_endpoint: str = "http://localhost:9000"
    s3_public_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "4to"
    s3_secret_key: str = "4to-secret"
    s3_bucket: str = "4to-originals"
    s3_region: str = "us-east-1"
    frontend_origin: str = "http://localhost:5173,http://localhost:8081,http://127.0.0.1:5173"
    environment: str = "development"

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.environment == "production":
            if self.jwt_secret == "local-development-only" or len(self.jwt_secret) < 32:
                raise ValueError("In production, JWT_SECRET must be set to a strong secret of at least 32 characters.")
            if self.s3_secret_key == "4to-secret":
                raise ValueError("In production, S3_SECRET_KEY must not use default credentials.")
        return self


settings = Settings()
