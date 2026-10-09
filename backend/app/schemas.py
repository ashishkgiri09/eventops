from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class RegisterIn(ApiModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=10, max_length=128)
    invitation_code: str | None = Field(default=None, max_length=100)

    @model_validator(mode="before")
    @classmethod
    def accept_frontend_name(cls, value: Any):
        if isinstance(value, dict) and "full_name" not in value and "name" in value:
            return {**value, "full_name": value["name"]}
        return value


class LoginIn(ApiModel):
    email: EmailStr
    password: str


class ForgotPasswordIn(ApiModel):
    email: EmailStr


class VerifyPasswordResetCodeIn(ApiModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResetPasswordIn(VerifyPasswordResetCodeIn):
    new_password: str = Field(min_length=10, max_length=128)


class RefreshIn(ApiModel):
    refresh_token: str


class UserOut(ApiModel):
    id: str
    email: EmailStr
    full_name: str = Field(serialization_alias="name")
    role: str = "ORGANIZATION_ADMIN"
    created_at: datetime


class TokenPair(ApiModel):
    access_token: str = Field(serialization_alias="access_token")
    refresh_token: str = Field(serialization_alias="refresh_token")
    token_type: str = Field(default="bearer", serialization_alias="token_type")
    user: UserOut


class OrganizationCreate(ApiModel):
    name: str = Field(min_length=2, max_length=180)
    organization_type: str = Field(default="Institution", serialization_alias="type", validation_alias="type")
    country: str = ""
    city: str = ""
    subtype: str = ""
    website: str = ""
    size: str = ""
    description: str = ""
    logo_data: str | None = Field(default=None, max_length=3_000_000, validation_alias="logo", serialization_alias="logo")

    @model_validator(mode="after")
    def validate_logo_data(self):
        if self.logo_data is not None and not self.logo_data.startswith((
            "data:image/png;base64,", "data:image/jpeg;base64,", "data:image/svg+xml;base64,"
        )):
            raise ValueError("Logo must be an encoded PNG, JPG, or SVG image")
        return self

    @model_validator(mode="before")
    @classmethod
    def normalize_type(cls, value: Any):
        if isinstance(value, dict):
            value = dict(value)
            if "organization_type" in value and "type" not in value:
                value["type"] = value["organization_type"]
        return value


class OrganizationOut(ApiModel):
    id: str
    name: str
    organization_type: str = Field(serialization_alias="type")
    country: str = ""
    city: str = ""
    role: str
    subtype: str = ""
    website: str = ""
    size: str = ""
    description: str = ""
    logo_data: str | None = Field(default=None, serialization_alias="logo")
    plan: str = "Free"
    active_events_count: int = 0
    members_count: int = 1
    created_at: datetime | None = None


class JoinOrganizationIn(ApiModel):
    code: str


class InvitationCreate(ApiModel):
    email: EmailStr
    role: str = "COORDINATOR"


class EventCreate(ApiModel):
    name: str = Field(min_length=2, max_length=200)
    event_type: str = Field(min_length=2, max_length=60, serialization_alias="type", validation_alias="type")
    description: str = ""
    location: str = ""
    organization_id: str | None = None
    starts_at: datetime | None = Field(default=None, serialization_alias="startDate", validation_alias="startDate")
    ends_at: datetime | None = Field(default=None, serialization_alias="endDate", validation_alias="endDate")
    registration_deadline: datetime | None = None
    expected_attendees: int = Field(default=0, ge=0, serialization_alias="expectedParticipants", validation_alias="expectedParticipants")
    capabilities: list[str] | None = Field(default=None, serialization_alias="modules", validation_alias="modules")
    status: str = "DRAFT"
    rounds: list[dict[str, Any]] = []
    time_slots: list[dict[str, Any]] = []
    rules: list[dict[str, Any]] = []

    @model_validator(mode="before")
    @classmethod
    def normalize_event_fields(cls, value: Any):
        if isinstance(value, dict):
            value = dict(value)
            pairs = {"event_type": "type", "starts_at": "startDate", "ends_at": "endDate", "expected_attendees": "expectedParticipants", "capabilities": "modules"}
            for field, alias in pairs.items():
                if field in value and alias not in value:
                    value[alias] = value[field]
        return value

    @model_validator(mode="after")
    def dates_are_ordered(self):
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("endDate must be after startDate")
        return self


class EventPatch(ApiModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    location: str | None = None
    starts_at: datetime | None = Field(default=None, serialization_alias="startDate", validation_alias="startDate")
    ends_at: datetime | None = Field(default=None, serialization_alias="endDate", validation_alias="endDate")
    registration_deadline: datetime | None = None
    expected_attendees: int | None = Field(default=None, ge=0, serialization_alias="expectedParticipants", validation_alias="expectedParticipants")
    capabilities: list[str] | None = Field(default=None, serialization_alias="modules", validation_alias="modules")
    status: str | None = None
    rounds: list[dict[str, Any]] | None = None
    time_slots: list[dict[str, Any]] | None = None
    rules: list[dict[str, Any]] | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_patch_fields(cls, value: Any):
        if isinstance(value, dict):
            value = dict(value)
            pairs = {"starts_at": "startDate", "ends_at": "endDate", "expected_attendees": "expectedParticipants", "capabilities": "modules"}
            for field, alias in pairs.items():
                if field in value and alias not in value:
                    value[alias] = value[field]
        return value


class EventOut(ApiModel):
    id: str
    organization_id: str | None
    owner_id: str
    name: str
    event_type: str = Field(serialization_alias="type")
    description: str
    location: str = ""
    status: str
    starts_at: datetime | None = Field(serialization_alias="startDate")
    ends_at: datetime | None = Field(serialization_alias="endDate")
    registration_deadline: datetime | None
    expected_attendees: int = Field(serialization_alias="expectedParticipants")
    capabilities: list[str] = Field(serialization_alias="modules")
    created_at: datetime
    is_personal_event: bool = Field(default=False, serialization_alias="isPersonalEvent")
    registered_teams_count: int = Field(default=0, serialization_alias="registeredTeamsCount")
    current_round: int = Field(default=1, serialization_alias="currentRound")
    total_rounds: int = Field(default=1, serialization_alias="totalRounds")
    venues_count: int = Field(default=0, serialization_alias="venuesCount")
    judges_count: int = Field(default=0, serialization_alias="judgesCount")
    rounds: list[dict[str, Any]] = []
    time_slots: list[dict[str, Any]] = Field(default=[], serialization_alias="timeSlots")
    rules: list[dict[str, Any]] = []

    @model_validator(mode="before")
    @classmethod
    def add_personal_flag(cls, value: Any):
        if not isinstance(value, dict):
            value = {key: getattr(value, key) for key in ("id", "organization_id", "owner_id", "name", "event_type", "description", "location", "status", "starts_at", "ends_at", "registration_deadline", "expected_attendees", "capabilities", "settings", "created_at")}
        if isinstance(value, dict):
            value = dict(value)
            value.setdefault("is_personal_event", value.get("organization_id") is None)
            value["status"] = str(value.get("status", "DRAFT")).upper()
            module_names = {"judging": "JUDGES", "judges": "JUDGES", "check_in": "CHECK_IN", "teams": "TEAMS", "guests": "GUESTS", "rsvp": "GUESTS", "attendees": "GUESTS", "venues": "VENUES", "sessions": "SESSIONS", "speakers": "SESSIONS", "rounds": "ROUNDS", "volunteers": "STAFF", "staff": "STAFF", "resources": "RESOURCES", "budget": "BUDGET", "incidents": "INCIDENTS", "communication": "COMMUNICATION", "analytics": "ANALYTICS", "sponsors": "SPONSORS", "schedule": "SESSIONS", "tasks": "STAFF", "reminders": "COMMUNICATION"}
            value["capabilities"] = list(dict.fromkeys(module_names.get(str(item).lower(), str(item).upper()) for item in value.get("capabilities", [])))
            settings = value.get("settings") or {}
            value.setdefault("rounds", settings.get("rounds", []))
            value.setdefault("time_slots", settings.get("time_slots", []))
            value.setdefault("rules", settings.get("rules", []))
            value.setdefault("current_round", settings.get("current_round", 1))
            value.setdefault("total_rounds", len(value.get("rounds") or settings.get("rounds", [])) or 1)
        return value


class JudgeCreate(ApiModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr | None = None
    organization: str = ""
    designation: str = ""
    expertise: list[str] = []
    available_slots: list[str] = []
    max_assignments: int = Field(default=8, ge=1, le=100, serialization_alias="maxTeamCapacity", validation_alias="maxTeamCapacity")


class JudgePatch(ApiModel):
    is_active: bool | None = None
    max_assignments: int | None = Field(default=None, ge=1, le=100)
    available_slots: list[str] | None = None
    expertise: list[str] | None = None


class TargetCreate(ApiModel):
    name: str = Field(min_length=1, max_length=180)
    external_id: str | None = None
    domain: str = ""
    slot: str = Field(min_length=1, max_length=100)
    round_number: int = Field(default=1, ge=1)
    judges_required: int = Field(default=2, ge=1, le=10)
    venue: str = ""


class ConflictCreate(ApiModel):
    target_id: str
    reason: str = "Declared conflict"


class AllocationRequest(ApiModel):
    max_runtime_seconds: int = Field(default=10, ge=1, le=60)
    domain_match_weight: int = Field(default=10, ge=0, le=100)
    balance_workload_weight: int = Field(default=5, ge=0, le=100)


class AllocationAccept(ApiModel):
    run_id: str
