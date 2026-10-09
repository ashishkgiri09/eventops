# EVENTOPS API

FastAPI backend for institutional, corporate, and personal event workspaces. One identity can own personal events and join multiple organizations. Organization membership and event ownership are checked on every event-scoped request.

## Run locally

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

The API is at `http://localhost:8000`; interactive API docs are at `/docs`. Local development defaults to SQLite. For PostgreSQL, set `DATABASE_URL` to a PostgreSQL URL, for example `postgresql+psycopg://eventops:password@localhost:5432/eventops`. Run `alembic upgrade head` from this directory to apply schema migrations. Set `NEXT_PUBLIC_API_URL=http://localhost:8000` and `NEXT_PUBLIC_USE_MOCK_API=false` in the frontend environment to call the API.

## Implemented domains

- **Identity:** registration, login, short-lived access tokens, rotating hashed refresh tokens, logout, and current-user lookup.
- **Workspaces:** organization creation, member listing, email-bound invitation codes, joining, and organization role checks.
- **Events:** create, list, read, update, lifecycle status, capability/module presets, and a dashboard configuration response with institutional/corporate/personal variants.
- **Registrations:** persistent team and guest records, RSVP updates, event-specific cryptographic-style random QR credentials.
- **Attendance:** QR scan, duplicate/invalid detection, manual override, reversal, summary, and audit history.
- **Judging:** judge roster, expertise, availability windows, workload caps, declared conflicts, evaluation targets, saved draft allocation runs, and approval.
- **Optimization:** Google OR-Tools CP-SAT enforces required judge count, judge capacity, one target per judge per time slot, declared conflicts, and slot availability. A local scikit-learn TF-IDF/cosine-similarity model scores judge expertise against target domains; its scores feed the solver objective alongside workload balancing. This is an explainable matching signal, not a trained outcome-prediction model.
- **Event operations:** tenant-scoped CRUD for sessions, venues, sponsors, budgets, incidents, staff, volunteers, resources, announcements, feedback, evaluations, tasks, and rounds. Shared module records use JSON payloads with server-side field validation and role checks; high-volume/relational workflows can be normalized into dedicated tables as requirements settle.
- **Rounds & analytics:** leaderboard, score-based round advancement, attendance/judge/domain/budget/resource summaries.

## Main routes

- `POST /api/v1/auth/register|login|refresh|logout`; `GET /api/v1/auth/me`
- `GET|POST /api/v1/organizations`; `GET /api/v1/organizations/{id}`
- `POST /api/v1/organizations/{id}/invitations`; `POST /api/v1/organizations/join`
- `GET|POST /api/v1/events`; `GET|PATCH /api/v1/events/{id}`; `GET /api/v1/events/{id}/dashboard`
- `GET|POST /api/v1/events/{id}/registrations`; `GET|POST /api/v1/events/{id}/guests`; `PATCH /api/v1/events/{id}/guests/{guest_id}/rsvp`
- `GET /api/v1/events/{id}/attendance/summary|audit-log|search`; `POST /api/v1/events/{id}/attendance/scan`
- `GET|POST /api/v1/events/{id}/judging/judges|targets`; `POST /api/v1/events/{id}/judging/optimize`; `GET /api/v1/events/{id}/judging/runs/{run_id}`; `POST /api/v1/events/{id}/judging/runs/accept`
- `GET|POST /api/v1/events/{id}/modules/{module}`; `PATCH|DELETE /api/v1/events/{id}/modules/{module}/{record_id}`
- `GET /api/v1/events/{id}/rounds|rounds/leaderboard`; `POST /api/v1/events/{id}/rounds/advance`
- `GET /api/v1/events/{id}/analytics/overview`

## Current integration boundary

The API foundation and frontend service clients support real persistence for the listed modules. The frontend defaults to mock mode; set `NEXT_PUBLIC_USE_MOCK_API=false` only after the backend is running. Delivery gateways for email/SMS/WhatsApp, OTP/password-recovery email, and generative AI chat are not configured. The allocation screen's saved hard/soft constraint editor and what-if simulator also remain local UI state; the server enforces its documented hard constraints and accepts objective weights. Allocation uses the local text-matching model and constraint solver without external credentials. Never treat a draft allocation as final until an organizer approves it.

Before deployment, configure a strong `JWT_SECRET`, HTTPS, explicit CORS origins, email verification/password recovery, rate limits, audit retention, backups, and monitoring. The API uses database migrations; apply new schema changes as versioned Alembic revisions.
