# SuiteCase AI Handoff

Start here for project context, pending work, and links to the owning documentation. Inspect code and configuration for current implementation details; this file is not an API reference or a build-health report.

## Context and boundaries

- SuiteCase is an internal staff CRM for one travel agency. Do not add multi-tenancy before a real second-agency requirement.
- The UI is desktop-first; mobile optimization is not a project target.
- Customer Management is the implemented vertical slice. Travel-domain database models do not imply implemented API or UI workflows.
- Server currently uses vertical feature slices, not full Clean Architecture. Add shared abstractions only when implemented workflows justify them.
- Core owns entities and domain rules. Server owns APIs, persistence, security, and infrastructure. Client owns UX; financial, security, and compliance rules remain server-side.
- Return DTOs, not EF entities, across API boundaries.
- Follow the relevant [backend](../src/AGENTS.md) or [React/TypeScript](../ui/AGENTS.md) instructions. Do not branch, commit, push, or tag without explicit permission.

## Next work and blockers

1. Implement [authentication and authorization](Authentication.md), then connect authenticated staff identities to [audit actor attribution](Audit.md#correlation-and-actor-identity). The API is not production-ready without access control.
2. Complete the production requirements owned by [authentication](Authentication.md#browser-authentication), [audit](Audit.md#production-readiness), [customer data protection](Database-blueprint.md#sensitive-identifier-protection), and [operational logging](ErrorHandling.md#pending-work).
3. Implement Travel Programs, Groups, and Options as the next vertical slice, following the [travel data model](Database-blueprint.md). Keep future UI actions disabled until their workflows exist.

[Travel Board synchronization](LiveSynchronization.md) and [customer documents](Documents.md) remain deferred features. Global cross-entity search remains an unresolved design decision. The sensitive-identifier save-race test gap is tracked in [error handling pending work](ErrorHandling.md#pending-work).

## Where to look

| Topic | Owning source |
|---|---|
| Product direction and Git conventions | [Repository README](../README.md) |
| Frontend setup, commands, and implementation scope | [Client README](../ui/SuiteCase.Client/README.md) |
| Customer routes and request/response contracts | [Customer endpoints](../src/SuiteCase.Server/Features/Customers/CustomerEndpoints.cs) and [DTOs](../src/SuiteCase.Server/Features/Customers/DTO/) |
| Data model, customer rules, and persistence constraints | [Database blueprint](Database-blueprint.md) |
| API errors, operational logging, and related gaps | [Error handling](ErrorHandling.md) |
| Audit decisions and production requirements | [Audit](Audit.md) |
| Staff authentication and authorization plan | [Authentication](Authentication.md) |
| Travel Board concurrency and live updates | [Live synchronization](LiveSynchronization.md) |
| Document storage and provider prerequisites | [Documents](Documents.md) |

## Verification

Run the checks relevant to the change; do not rely on previously recorded build or vulnerability-scan results. Frontend commands and the solution-build limitation are documented in the [Client README](../ui/SuiteCase.Client/README.md#commands).

Backend tests are in the [unit test project](../tests/SuiteCase.UnitTests/SuiteCase.UnitTests.csproj) and [integration test project](../tests/SuiteCase.IntegrationTests/SuiteCase.IntegrationTests.csproj). SQL Server integration tests require Docker or another compatible container daemon.

## Maintenance

Keep implementation details and feature plans in their owning sources above. Update this handoff only when project boundaries, immediate priorities, or documentation entry points change. Move unique decisions before removing a section; do not duplicate full feature descriptions here.
