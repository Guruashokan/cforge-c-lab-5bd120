import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import AsyncSessionLocal, init_db
from app.routers import assessments, companies, judge, problems, topics, users
from app.seed.seeder import seed_all

logger = logging.getLogger("cforge.main")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan: initializes the database and triggers idempotent
    initial data seeding.
    """
    logger.info("Starting CForge Backend...")
    # Initialize database tables
    await init_db()
    logger.info("Database tables verified/created.")

    # Auto-seed initial data
    try:
        async with AsyncSessionLocal() as db_session:
            await seed_all(db_session)
        logger.info("Database seeding completed.")
    except Exception as e:
        logger.error(f"Error during database seeding: {e}", exc_info=True)

    yield

    logger.info("CForge Backend shutdown complete.")


app = FastAPI(
    title="CForge API",
    description="The definitive C programming practice, evaluation, and interview preparation platform.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------
origins = settings.cors_origins_list
if "*" not in origins and "http://localhost:5173" not in origins:
    origins.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Exception Handlers
# ---------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "detail": exc.errors(),
            "body": exc.body,
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP Error",
            "detail": exc.detail,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
        },
    )


# ---------------------------------------------------------
# Core & Health Routes
# ---------------------------------------------------------
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to CForge API - Precision C Programming Platform",
        "docs": "/docs",
        "health": "/api/health",
        "status": "operational",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "CForge Backend API",
        "version": "1.0.0",
        "database": "connected",
        "piston_url": settings.PISTON_API_URL,
    }


# ---------------------------------------------------------
# Include Subrouters
# ---------------------------------------------------------
app.include_router(problems.router)
app.include_router(judge.router)
app.include_router(users.router)
app.include_router(topics.router)
app.include_router(companies.router)
app.include_router(assessments.router)
