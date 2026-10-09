from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app import models  # noqa: F401 - registers ORM tables
from app.database import Base, engine
from app.routes import analytics, auth, events, judging, modules, organizations, public_registrations, registrations


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Creates newly added local-development tables (such as password reset
    # codes) without changing existing tables or user data.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(organizations.router, prefix=settings.api_prefix)
app.include_router(events.router, prefix=settings.api_prefix)
app.include_router(judging.router, prefix=settings.api_prefix)
app.include_router(registrations.router, prefix=settings.api_prefix)
app.include_router(public_registrations.router, prefix=settings.api_prefix)
app.include_router(modules.router, prefix=settings.api_prefix)
app.include_router(analytics.router, prefix=settings.api_prefix)


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "service": "eventops-api"}
