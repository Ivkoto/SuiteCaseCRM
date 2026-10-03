# SuiteCase Client

React and TypeScript desktop client for SuiteCase CRM. The implemented frontend scope is the Customer Management vertical slice. Other sidebar modules are visible but disabled and marked `Soon`.

## Implemented workflows

- Collapsible desktop navigation and a persisted light/dark theme.
- Server-paged customer directory with name/phone search and retry states.
- Per-page customer selection and clear selection. `Add to Group` remains disabled until Programs & Groups exists.
- Create customer, view details, full-replacement edit, and soft delete.
- Client and server field validation with accessible error summaries and focus management.
- Runtime validation of customer API responses and Problem Details error handling.
- Bulgarian-market date presentation using the `Europe/Sofia` timezone for audit timestamps.
- Dismissible success notices that automatically close after 30 seconds.

Client-side routing defines `/`, `/customers`, `/programs`, `/bookings`, `/documents`, `/payments`, and `/administration`. Only Customers has implemented content. Dashboard and future section URLs render the shared layout with the section's header and an empty main area. Their sidebar items remain disabled and marked `Soon`. Unmatched URLs redirect to `/`.

`src/routing/app-page-config.ts` owns each section's path, title, header description, icon, and page component. Routes, header text, and sidebar availability are derived from this configuration. To activate a section, implement its page in the owning feature folder, import it into the configuration, and replace that section's `Component: null` with the page component. No changes to `App.tsx`, the sidebar, or the route renderer are required. Sidebar availability is not an authorization boundary; the API must enforce access control.

There is currently no authentication UI, document workflow, Travel Board, or active module other than Customers. The client is desktop-first; mobile optimization is not a project target.

## Stack

- React 19
- React Router 7 (declarative routing)
- TypeScript 5.9
- Vite 8
- ESLint 9
- Vitest, Testing Library, and jsdom
- Custom CSS with locally hosted fonts and theme tokens

## Project structure

```text
src/
  App.tsx / App.css              application shell, theme, and shell styles
  routing/                      page configuration and route rendering
  index.css                      fonts, theme tokens, global styles
  layout/app-sidebar.tsx         navigation, branding, and navigation icons
  lib/http-client.ts             HTTP and Problem Details handling
  features/customers/
    api/                          contracts, API calls, response guards
    directory/                    directory toolbar, table, and pagination
    dialogs/                      create and details/edit/delete dialogs
    form/                         form UI, mapping, and validation
    notifications/               success notice
    shared/                       formatting, errors, shared customer CSS
    customers-page.tsx           customer directory orchestration
  testing/setup.ts               Vitest/jsdom setup
public/
  fonts/                          locally hosted font files
  *.png                           brand assets
```

Tests are colocated with the code they cover.

## Setup and development

From the repository root:

```powershell
cd .\ui\SuiteCase.Client
npm ci
npm run dev
```

The development client runs at `https://localhost:54479`. Vite proxies `/api`, `/swagger`, and `/openapi` to the ASP.NET Core server. The default target is `https://localhost:7295`; `ASPNETCORE_HTTPS_PORT` or `ASPNETCORE_URLS` can override it.

The .NET SDK is required when Vite needs to create the local ASP.NET Core HTTPS development certificate. Customer workflows also require the backend and its database dependencies to be running.

### Sharing the development app

The development server listens on localhost by default. Dev Tunnels can forward port `54479` without changing this binding. The tunnel hostname allowlist in `vite.config.ts` supports Fast Refresh connections; it is not authentication.

For direct access from another computer on the same network, explicitly enable network listening:

```powershell
npm run dev -- --host
```

This listens on all network interfaces. Share `https://<your-PC-LAN-IP>:54479` and allow the port through your firewall only on the trusted private network. The localhost development certificate can produce a browser certificate warning when accessed through a LAN address.

The Customer API does not yet require authentication. Share only disposable test data, use tunnel access controls where possible, and stop sharing when the demonstration is finished. Anyone with access can read and modify customer records. No backend binding or database connection changes are needed.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the HTTPS Vite development server with Fast Refresh. |
| `npm run build` | Type-check the client and create the production bundle in `dist/`. |
| `npm run lint` | Run ESLint across the client. |
| `npm test` | Run the Vitest suite once. |
| `npm run preview` | Serve the generated Vite bundle locally. |

The Visual Studio `.esproj` currently has `ShouldRunBuildScript` disabled. Run the npm build, lint, and test commands explicitly; a successful solution build alone does not verify the client.

## API and state boundaries

- The client calls same-origin `/api/customers` endpoints through `src/lib/http-client.ts`.
- Network JSON is treated as unknown and validated before use.
- HTTP failures use Problem Details and field-level error mapping without exposing raw server messages.
- React component state and effects manage the current customer workflow. No global state or server-query library is installed.
- The customer API and server remain authoritative for security, validation, audit, and data-integrity rules.
