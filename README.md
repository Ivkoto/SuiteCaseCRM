# SuiteCase - Travel Agency CRM

SuiteCase is a staff-facing CRM for travel agencies, focused on customers, departures, bookings, payments, and documents.

## Why This Project
Travel agencies often operate with spreadsheets and disconnected tools.
SuiteCase is designed to centralize daily operations into one clear workflow with production-oriented architecture decisions.

## Why SuiteCase Is Different

SuiteCase is not designed as a generic sales CRM with leads and deal pipelines.
It is designed as a **travel agency operations CRM** focused on executing trips correctly, not just selling them.

Most CRM systems expect the company to adapt its work around the product, even when the product offers flexible modules and configuration.
SuiteCase is designed the other way around: it wraps around the agency's established working strategy, supports the existing operational flow, and then makes that flow easier, more consistent, and more automated.

### Core Differentiators

- Travel-operations-first model:
  - Customers, programs, departures, bookings, payments, and documents are first-class workflows.
- Booking snapshot logic:
  - Price, selected options, and discount context are preserved at booking time for auditability and consistency.
- Operational readiness tracking:
  - Contract status, annex status, ticket status, and document completeness are part of daily operations.
- Payment-pressure visibility:
  - Payment milestones and alerts support proactive follow-up before departures.
- Built for controlled flexibility:
  - Agency-specific rules and habits are treated as part of the product model, not as awkward workarounds around a generic CRM.

### Product Vision

SuiteCase starts as a focused solution for real agency workflows.


## Architecture Direction
- Current: `Client + Server + Core` with vertical/feature-based slices inside the Server project
- Goal: evolve safely to full Clean Architecture only when complexity requires it
- Delivery approach: single-agency runtime focused on the current agency workflow

## Tech Stack
- React + TypeScript + Vite
- ASP.NET Core
- SQL Server

## Development
### Branch Strategy
Use short-lived branches from `main`.

```text
feature/  - New behavior or user-visible capability
fix/      - A normal bug fix
test/     - Only test-related work, or mostly test infrastructure
docs/     - Documentation only
chore/    - Maintenance work that is not a feature, bug fix, test, docs, or refactor
refactor/ - Code structure changes without changing behavior
```

Examples:

```text
feature/customer-minimal-api
feature/customer-search
feature/audit-events

fix/customer-soft-delete-recreate
fix/swagger-openapi-route
fix/passport-duplicate-check

test/customer-integration-tests
test/sqlserver-testcontainers

docs/versioning-strategy
docs/deployment-stages

chore/update-nuget-packages
chore/remove-unused-package
chore/clean-gitignore
chore/configure-dotnet-tools

refactor/extract-customer-normalization
refactor/customer-endpoint-handlers
```

If behavior changes, the branch is not only a refactor. Use `feature/` or `fix/` instead.

### Version Strategy
Use Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

Examples:

```text
v0.1.0
v0.2.0
v1.0.0
v1.0.1
v1.1.0
v2.0.0
```

Rules:

```text
PATCH: bug fix only
MINOR: new backward-compatible feature
MAJOR: breaking API, behavior, database/schema, or import/export change
```

Examples:

```text
v1.0.1 -> bug fix
v1.1.0 -> new backward-compatible feature
v2.0.0 -> breaking API/schema behavior
```

Use pre-release versions only when hosting a test version for agents or company users to validate functionality or behavior before marking it stable.

```text
v0.1.0-beta.1
v1.0.0-rc.1
```

Prefer `v0.12.1`, not `v0.12.01`.

Do not change the version on every PR. Create a version tag only when `main` reaches a meaningful checkpoint.

## Run Locally
### Prerequisites
- .NET SDK 10
- Node.js 20+ and npm

### Setup
```bash
dotnet restore SuiteCase.slnx
cd SuiteCase.Client
npm install
cd ..
```

### Start the app
```bash
dotnet run --project SuiteCase.Server
```

Notes:
- Server runs on `https://localhost:7295` (and `http://localhost:5245`).
- The client is served through ASP.NET Core SPA proxy in development.

## Contact
- Author: Ivaylo Kostov
- GitHub: https://github.com/IvayloKostov
- LinkedIn: https://www.linkedin.com/in/ikostov87/
- Email: ikostov87@gmail.com
- Phone: +359885986062

## License
This project is proprietary software. All rights reserved.

See [LICENSE.md](LICENSE.md) for the full license terms.

Copyright (c) 2026 Ivaylo Kostov. All rights reserved.
