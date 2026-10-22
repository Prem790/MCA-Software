# MCA Software

MCA Software is an independent corporate compliance and practice-management
application for professional firms. It is being built to organize company
records, obligations, assignments, documents, and reviews in one workspace.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)
![Next.js](https://img.shields.io/badge/Next.js-App_Router-111111)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1)
![Node.js](https://img.shields.io/badge/Node.js-24.x-43853D)

## Core Features

Implemented interface preview:

- Responsive workspace with dashboard, company list/details, and director/document sections.
- Searchable company, assignment, compliance and document lists with empty states.
- Monthly calendar with navigation and links to assignments on a selected date.
- Task detail with local checklist, review simulation and sample comments.
- Downloadable fictional text files; firm, team and notification settings layouts.
- Sign-in layout and preview guide; disabled actions explain their future behavior.
- Five fictional companies and 20 assignments using a fixed 22 October 2026 snapshot.

Preview data is public and fixed. Local interactions reset on reload/navigation;
there is no operational login, business persistence, upload or email delivery.
The calendar uses illustrative dates, with no legal-deadline calculation.

Implemented foundation:

- Next.js/React/TypeScript application shell with shared Tailwind/shadcn styling.
- Strict runtime configuration and separate liveness/readiness endpoints.
- Better Auth + Drizzle integration; public sign-up disabled, no onboarding UI yet.
- Versioned PostgreSQL schema with 14 tables and tenant/company integrity links.
- Opt-in, transactional seed for five fictional companies and 20 tasks.
- SQL migration/constraint/auth tests, browser workflow/accessibility tests and architecture checks.
- CI, a non-root standalone container recipe, and operational documentation.

Planned MVP: roles, company/director management, compliance tracker/calendar,
assignments/checklists/comments, private documents, reviews, reminders, activity
history and exports. Later phases add a client portal, document generation,
billing, selected MCA integrations and evaluated AI. See [delivery phases](docs/roadmap.md).

## Architecture

A root-level **modular monolith**, not separate frontend/API services. Next routes
handle HTTP/UI; module use cases will own business operations. Domain code stays
independent of vendors. Neon hosts PostgreSQL; DigitalOcean hosts the application.

```mermaid
flowchart TD
    Browser[Browser] --> Web[Next.js UI and HTTP routes]
    Web --> Preview[Public preview / fixed fictional records]
    Web --> Auth[Better Auth: application mode only]
    Web -. planned business API .-> Modules[Domain-oriented modules]
    Auth --> Database[(Neon PostgreSQL / Drizzle)]
    Modules --> Database
    Modules -. Phase 2 .-> Storage[Private DigitalOcean Spaces]
    Worker[Phase 2 job worker] -.-> Database
    Worker -.-> Email[Resend]
```

```text
src/
  app/                 # Pages and thin HTTP boundaries
  components/ui/       # Shared UI primitives
  features/preview/    # Isolated sample screens, selectors and local interactions
  demo/                # Shared deterministic fictional fixture factory
  modules/             # Identity, firms, companies, compliance, tasks, documents, audit
  platform/            # Configuration, auth, database, logging and HTTP helpers
drizzle/               # Reviewed SQL migrations and snapshots
scripts/               # Explicit migration and fictional seed commands
tests/                 # Unit, DB integration and browser tests
docs/                  # Architecture, decisions, roadmap, contracts and runbooks
infrastructure/        # Optional local DB and DigitalOcean deployment recipes
```

See [architecture and boundaries](docs/architecture/overview.md),
[decision record](docs/adr/001-foundation.md), and
[security/data handling](docs/security/data-handling.md).

## Setup & Install

Prerequisites: **Node 24.x >=24.11**, npm, and Git. Docker is optional for local
PostgreSQL and required only to build/run the provided deployment containers.
No paid account is needed for the preview, migration tests or auth integration tests.

From your repository checkout:

```bash
node --version
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:3000/preview. The root redirects there. The default
`APP_MODE=foundation` serves the fictional preview;
auth is disabled and readiness deliberately returns 503. This is not a database
failure. Credentials are needed only for application mode.

To enable a disposable development database:

1. Set `DATABASE_URL` in `.env` using a development Neon connection string;
   retain TLS parameters. Optionally set a direct `DATABASE_MIGRATION_URL`.
2. Generate a secret with `openssl rand -base64 48` and set `BETTER_AUTH_SECRET`.
3. Run `npm run db:migrate`, set `APP_MODE=application`, and restart the server.
4. For fictional data, explicitly set `SEED_DATABASE_URL` and
   `ALLOW_DEMO_SEED=true`, then run `npm run db:seed`. No passwords or usable
   login accounts are seeded. Never seed a production/client database.

See [local development](docs/runbooks/development.md) for local PostgreSQL,
environment details, seed safeguards and migration review.

| Command                 | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `npm run dev`         | Development server                                         |
| `npm run check`       | Formatting, lint, architecture, strict types and tests     |
| `npm run db:generate` | Generate SQL from schema changes without DB access         |
| `npm run db:check`    | Check migration metadata consistency                       |
| `npm run db:migrate`  | Explicitly apply migrations to the configured DB           |
| `npm run db:seed`     | Opt-in fictional fixtures in a selected disposable DB      |
| `npm run test:e2e`    | Chromium workflows, mobile layout and accessibility checks |
| `npm run build`       | Production build; use explicit production config below     |
| `npm start`           | Start a production build with runtime configuration        |

For a foundation production build:

```bash
APP_MODE=foundation APP_URL=https://build.example.test npm run build
```

For browser tests, first build the application, then run `npx playwright install chromium`
and `npm run test:e2e`. The browser suite starts/stops a local production server.
Database integration tests execute in-process PostgreSQL using PGlite; they do
not contact Neon or certify provider networking/TLS. CI also audits dependencies and scans tracked source for secrets.

Hosting target: DigitalOcean with Neon PostgreSQL, private Spaces uploads later.
No infrastructure is provisioned and no deploy runs automatically. See
[deployment and recovery](docs/runbooks/deployment-recovery.md) and
[Phase 0 verification](docs/verification/phase-0.md) and
[Phase 1 verification](docs/verification/phase-1.md) for actual checks and limitations.

## Core API / Usage

Preview walkthrough: open `/login`, choose **Open sample workspace**, open a
company, explore its assignments, check the remaining checklist items, simulate
a review request and add a sample comment. Reload to restore the original data.
Search and calendar filters are URL-based and can be bookmarked.

```bash
curl -i http://localhost:3000/api/health
# 200: {"status":"ok","service":"mca-software","requestId":"..."}

curl -i http://localhost:3000/api/readiness
# Foundation mode: 503, SERVICE_UNAVAILABLE
# Application mode with migrated reachable database: 200, status=ready
```

Operational errors use stable codes and generated request IDs; credentials and
internal errors are never returned. Auth is mounted at `/api/auth/*`, requires
application configuration, and disallows public sign-up. There are no business
CRUD endpoints yet. Read [HTTP contracts](docs/api/contracts.md).

Phase 1 is an interface preview; Phase 2 delivers the first working MVP.
REA is optional investigation tooling, not a runtime dependency. Reference
assumptions and unknowns are recorded in [research boundaries](docs/research/reference-boundaries.md).
