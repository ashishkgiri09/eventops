# EVENTOPS — Universal Event Operations & Management Platform

> **Run the event, not the paperwork.**

EVENTOPS is a universal, multi-tenant Event Operations SaaS frontend built to orchestrate and execute mission-critical logistics across:
- **Colleges, Universities & Schools** (Hackathons, Tech Symposiums, College Fests, Robot Battles)
- **Corporate Teams & Enterprises** (Multi-Track Conferences, Tech Summits, Career Expos, Hack Days)
- **Professional Event Organizers & Agencies** (Exhibitions, Industry Conventions, Award Galas)
- **Communities & Non-Profits** (Meetups, Association Gatherings, Civic Assemblies)
- **Individuals Organizing Personal Events** (Celebrations, Private Galas, Intimate Workshops, Community Meetups)

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or pnpm

### Installation & Launch

```bash
# 1. Navigate to project root
cd "C:\Users\Ashish kumar giri\.gemini\antigravity\scratch\eventops"

# 2. Dependencies are already installed. If needed:
npm install

# 3. Launch Next.js Turbopack development server
npm run dev

# 4. Production build verification
npm run build
npm run start
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

## Deploy a preview on Render

The repository includes a `render.yaml` Blueprint for the Next.js frontend, FastAPI backend, and PostgreSQL database. In Render, choose **New → Blueprint**, connect `ashishkgiri09/eventops`, and deploy the Blueprint. It builds both web services from `main` and connects the frontend to the API.

This default preview uses Render's free services. Free web services can sleep while idle, and the included free PostgreSQL database expires after 30 days. Upgrade the database before storing real event registrations or relying on it long term. The hosted database starts empty; local SQLite data is not uploaded. After deployment, verify the API at `/health` and create or register the event again in the hosted app.

Every push to the connected `main` branch can trigger an automatic redeploy. The production deployment is separate from the local development server.

---

## ⚙️ Environment Variables & Backend Integration

The frontend is completely decoupled from backend implementation details and features a centralized API abstraction layer (`src/lib/api/` or `lib/api/`).

Create or edit `.env.local`:

```env
# Backend Base URL (FastAPI)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Centralized API Mock Mode Switch
# Set to 'true' to run fully standalone with realistic mock data (Default)
# Set to 'false' to route supported endpoints to the live FastAPI backend
NEXT_PUBLIC_USE_MOCK_API=true
```

### How Mock Mode Works
When `NEXT_PUBLIC_USE_MOCK_API=true`, all domain API services (`auth`, `organizations`, `events`, `registrations`, `attendance`, `venues`, `judges`, `allocation`, `evaluations`, `rounds`, `staff`, `resources`, `incidents`, `communication`, `analytics`, `assistant`) utilize deterministic, high-fidelity mock data with realistic latency simulation.

To connect to FastAPI:
1. Ensure the FastAPI backend is running on `http://localhost:8000`.
2. Set `NEXT_PUBLIC_USE_MOCK_API=false`.
3. Supported routes will immediately dispatch real JSON HTTP requests through `lib/api/client.ts` with automatic Bearer token injection, request timeouts, and 401 token refresh interception.

---

## 👥 Demo Accounts & Pre-Configured Personas

Use any of these demo accounts to log in at `/login`, or click the **Instant Demo Logins** buttons on the sign-in screen:

| Role | Email | Password | Clearance & Purpose |
| :--- | :--- | :--- | :--- |
| **Event Admin** | `eventadmin@eventops.demo` | `Password@123` | Full operational control, optimizer, rounds, incident triage |
| **Org Admin** | `orgadmin@eventops.demo` | `Password@123` | Multi-tenant governance, member invitations, org settings |
| **Coordinator** | `coordinator@eventops.demo` | `Password@123` | Control center operations, turnstiles, room allocations |
| **Judge / Evaluator** | `judge@eventops.demo` | `Password@123` | Assigned teams, rubric evaluations, scoring submissions |
| **Volunteer / Staff** | `volunteer@eventops.demo` | `Password@123` | QR attendance scanner, turnstile ingress, task kanban |
| **Technical Staff** | `techstaff@eventops.demo` | `Password@123` | Workstation telemetry, 16A power strips, fiber networking |
| **Resource Manager** | `resourcemanager@eventops.demo` | `Password@123` | Meal passes, hardware dev kit vaults, swag kits |
| **Participant** | `participant@eventops.demo` | `Password@123` | Team profile, project abstract, digital QR ticket pass |

---

## 🏢 Dual Workspace Paradigm: Multi-Tenant Org vs Personal Mode

EVENTOPS features a dual-engine workspace architecture:
1. **Organization Mode (`ORGANIZATION`)**: Multi-tenant institutional and corporate governance. Supports tenant switching, team member invitations, sub-teams, and multi-event oversight.
2. **Personal Event Mode (`PERSONAL`)**: Lightweight, autonomous operations for independent creators, meetups, and personal celebrations. Never labeled "Normal Mode". Completely standalone without requiring placeholder organizations.

Switch workspaces instantly using the **Organization & Personal Switcher** in the top left of the sidebar or at `/workspace`.

---

## 📊 Tailored Dashboards

The active dashboard layout automatically detects event type, enabled capabilities, and role permissions:

1. **Institutional Dashboard** (`/dashboard` - Hackathons & Fests):
   - Turnstile arrival velocity charts (`recharts`)
   - 120 Teams enrolled, checked-in vs absent metrics
   - Venue suites & bench occupancy
   - Active judges & fatigue overload monitor
   - Tournament progression & Round advancement cutoffs
   - Volunteer field task counts & resource depletion
   - Live critical incidents SLA alerts

2. **Corporate Dashboard** (`/dashboard` - Conferences & Summits):
   - 1,200 Registered attendees with VIP turnstile velocity
   - Multi-track session ingress & room capacity fill rates
   - Keynote speaker schedules & room conflict alerts
   - Sponsor deliverables & branding verification
   - Budget commitment vs planned ceiling tracking
   - Attendee feedback & evaluation satisfaction analytics

3. **Personal Celebration Dashboard** (`/dashboard` - Parties & Galas):
   - Friendly guest count with confirmed, tentative, and declined RSVPs
   - Celebration schedule & stage toast itinerary
   - Venue confirmation details
   - Real-time personal budget summary & expense ledger
   - Interactive milestone to-do checklist
   - Automated T-48h RSVP reminder dispatches

---

## 🧙 Event Setup Wizard (`/events/create`)

A 6-step interactive wizard supporting all event scales:
1. **Basics**: Title, event type preset, description.
2. **Dates**: Start date, end date, registration deadline (with strict validation ensuring end date follows start date).
3. **Audience**: Attendance sizing, admission gating, open vs invite-only scope.
4. **Modules & Capabilities**: Auto-primes sensible presets based on event type, with full custom toggle control for all 15 operational modules.
5. **Module-Specific Setup**: Competitive rounds, budget ceilings, scoring rubric model, and floorplan configuration.
6. **Review & Save**: Parameter summary with **Save as Draft** or **Publish Event Now** actions.

Supported Event States: `DRAFT`, `PUBLISHED`, `REGISTRATION_CLOSED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` (with confirmation modals for state transitions).

---

## 🔌 API Integration Architecture (`lib/api/`)

The API abstraction layer is organized by domain in `lib/api/`:

| Domain Service | Description | Backend Status |
| :--- | :--- | :--- |
| `client.ts` | Centralized fetch client, JWT headers, timeouts, 401 token refresh | API adapter available; mock mode is on by default |
| `auth.ts` | Login, register, token refresh, logout, getMe, OTP, password reset | Demo/mock behavior; FastAPI adapter needs response normalization |
| `organizations.ts` | List orgs, get org, create org, invitations, join with code | Demo/mock behavior; API adapter needs schema mapping |
| `events.ts` | List events, get event, create, patch, event dashboard | Demo/mock behavior; API adapter needs schema mapping |
| `registrations.ts` | Team management, project info, guest list & RSVPs | *Mock Service* (FastAPI endpoints planned) |
| `attendance.ts` | QR ticket scanning, duplicate detection, invalid states, undo check-in | *Mock Service* (FastAPI endpoints planned) |
| `venues.ts` | Facilities, benches, power/network telemetry, equipment | *Mock Service* (FastAPI endpoints planned) |
| `sessions.ts` | Multi-track agenda, room assignments, capacity conflict detection | *Mock Service* (FastAPI endpoints planned) |
| `judges.ts` | Jury roster, workload balance, domain expertise, conflict checking | *Mock Service* (FastAPI endpoints planned) |
| `allocation.ts` | Google OR-Tools CP-SAT constraint solver runner & what-if lab | *Mock Service* (FastAPI endpoints planned) |
| `evaluation.ts` | Multi-criteria rubrics, draft saving, submission & confetti lock | *Mock Service* (FastAPI endpoints planned) |
| `rounds.ts` | Tournaments, rankings, criteria, advancement quotas & cutoffs | *Mock Service* (FastAPI endpoints planned) |
| `staff.ts` / `volunteers.ts` | Staff directory, shift assignments, 4-stage operational kanban | *Mock Service* (FastAPI endpoints planned) |
| `resources.ts` | Logistics vaults, meal passes, dev kits, budget ledger | *Mock Service* (FastAPI endpoints planned) |
| `incidents.ts` | Priority triage, technical dispatch, SLA timeline & resolution | *Mock Service* (FastAPI endpoints planned) |
| `communication.ts` | Multi-channel broadcast (In-App, Email, SMS, WhatsApp) | *Mock Service* (FastAPI endpoints planned) |
| `analytics.ts` | Attendance trends, jury variance, downloadable CSV audit report | *Mock Service* (FastAPI endpoints planned) |
| `assistant.ts` | AI Copilot natural language queries grounded in live event data | *Mock Service* (FastAPI endpoints planned) |

The app currently runs against mock services (`NEXT_PUBLIC_USE_MOCK_API=true` in `.env.local`). The screens and domain APIs are ready for integration, but this frontend is not yet connected end-to-end to the FastAPI backend. Real OR-Tools optimization and AI model calls belong in the backend; the allocation and assistant screens currently show mock results.

---

## 🛡️ Route RBAC & Security

Routes are enforced via strict Role-Based Access Control (`lib/permissions.ts` and `components/layout/AppShell.tsx`):
- Attempting unauthorized access renders the dedicated **`403 Forbidden AccessDenied`** view displaying the required clearance levels and a role-switcher elevation prompt.
- Tokens are centrally managed by `lib/auth/session.ts` with transparent refresh token rotation.
- Logging out invalidates the refresh token and clears all local session storage before redirecting to `/login`.
