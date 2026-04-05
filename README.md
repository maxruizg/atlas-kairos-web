# Atlas Frontend

Private equity portfolio analytics platform built with React Router v7 (Remix), Tailwind CSS v4, and Recharts.

---

## Tech Stack

- **Framework**: React 19 + React Router 7 (Remix)
- **Styling**: Tailwind CSS 4 (CSS-first config with `@theme` tokens)
- **Charts**: Recharts 3
- **Build**: Vite 6 + TypeScript 5
- **Fonts**: DM Sans (body), IBM Plex Mono (numbers), Syne (headings)

---

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

### Environment Variables

| Variable  | Description                        | Default                                                  |
|-----------|------------------------------------|----------------------------------------------------------|
| `API_URL` | Backend API base URL               | `https://app-ancient-smoke-7925.fly.dev/api/v1`          |

### Scripts

| Command             | Description                              |
|---------------------|------------------------------------------|
| `npm run dev`       | Start dev server on port 3000            |
| `npm run build`     | Production build to `build/`             |
| `npm run start`     | Serve production build                   |
| `npm run typecheck` | React Router codegen + TypeScript check  |
| `npm run lint`      | ESLint check                             |

---

## Screens

### Public

| Route      | Description                                             |
|------------|---------------------------------------------------------|
| `/login`   | Email + password sign-in form                           |
| `/signup`  | Account creation with name, email, password             |

### Authenticated (TopBar + Sidebar layout)

| Route                              | Description                                                                                    |
|------------------------------------|------------------------------------------------------------------------------------------------|
| `/`                                | **Dashboard** — 10 KPI cards, 3 donut charts (geography, asset class, themes), exposure bar chart, 15-column fund table |
| `/sponsors`                        | **Sponsors** — Searchable sponsor cards with fund count, NAV, TVPI, IRR                        |
| `/sponsors/:sponsorId`             | **Sponsor Detail** — Aggregated metrics, fund cards drill-down                                 |
| `/sponsors/:sponsorId/:fundId`     | **Fund Detail** — 10 KPIs, tabbed view (companies, cashflows, NAV history, documents)          |
| `/vault`                           | **Document Vault** — Upload zone, status filters, confidence scores, sponsor badges            |
| `/review`                          | **Review** — Split-pane document review with field-level approval and optimistic UI             |
| `/metrics`                         | **Performance Metrics** — IRR + multiples bar charts, 14-column fund table                     |
| `/ledger`                          | **Audit Ledger** — Timestamped log of all user actions, uploads, approvals, and edits          |
| `/qa`                              | **Knowledge Base** — Formula definitions for TVPI, DPI, RVPI, IRR, MOIC                       |
| `/atlas-ai`                        | **Oracle** — AI chat with table rendering, citations, and query suggestions                    |
| `/settings`                        | **Settings** — Profile, appearance, language, notifications, data display, sign out             |

---

## Architecture

### Data Flow

```
Browser → React Router loaders (server) → api.server.ts → Rust/Actix backend → JSON response
```

All API calls are server-side only (`api.server.ts`). The frontend never calls the backend directly from the browser.

### Context Providers

The app layout (`_app.tsx`) wraps all authenticated routes with:

| Provider         | Cookie            | Purpose                              |
|------------------|-------------------|--------------------------------------|
| `AuthProvider`   | `atlas-session`   | Session management, logout           |
| `ThemeProvider`  | `atlas-theme`     | Dark / light mode toggle             |
| `LangProvider`   | `atlas-lang`      | English / Spanish i18n               |
| `EntityProvider` | `atlas-entity`    | Multi-tenant portfolio selection      |

### Auth Guard

The `_app.tsx` loader checks for the `atlas-session` cookie. If absent, it redirects to `/login`. Login sets a demo cookie (`atlas-session=demo`) — no real authentication backend yet.

### Internationalization

Two languages supported: English (`en`) and Spanish (`es`). All UI strings are in `app/lib/i18n.ts`. Use the `useT()` hook in components:

```tsx
const t = useT();
return <h1>{t.dashboard.title}</h1>;
```

### Theming

CSS-first Tailwind v4 config with 40+ `--color-atlas-*` tokens defined in `app/app.css`. Dark mode is default. A preload script in `root.tsx` prevents flash on page load.

---

## Key Components

### Charts (`app/components/charts/`)

| Component         | Description                                      |
|-------------------|--------------------------------------------------|
| `MiniDonut`       | Donut chart for geography / asset class / themes  |
| `ExposureChart`   | Stacked bar chart for sponsor exposure            |
| `NavHistoryChart` | Line chart of fund NAV over time                  |
| `CashflowChart`   | Stacked bar chart (capital calls vs distributions)|
| `DarkTip`         | Custom Recharts tooltip with dark theme           |

### Layout (`app/components/layout/`)

| Component | Description                                         |
|-----------|-----------------------------------------------------|
| `Sidebar` | 62px nav column with icon + label NavLinks           |
| `TopBar`  | Entity selector, review alert badge, theme toggle    |

### UI (`app/components/ui/`)

| Component      | Description                                    |
|----------------|------------------------------------------------|
| `SponsorBadge` | Color-coded initials badge                     |
| `StatusBadge`  | Document status pill (Needs Review, Approved…) |
| `FieldCard`    | Extracted data field with approve/reject        |
| `UploadModal`  | Drag-and-drop file upload dialog               |
| `KPICard`      | Metric display card                            |
| `ProgressBar`  | Percent-called bar                             |
| `TabPill`      | Tab navigation buttons                         |
| `Skeleton`     | Loading placeholder                            |

---

## Data Model

Core types in `app/lib/types.ts`:

- **Entity** — Portfolio entity (family office, fund of funds)
- **Sponsor** — GP / fund manager with aggregated metrics
- **Fund** — Individual fund with full financial data, companies, transactions, NAV history, cashflows
- **PortfolioCompany** — Underlying company investment
- **Document** / **ReviewDocument** / **ReviewField** — Document extraction workflow
- **CopilotMessage** / **CopilotSuggestion** — AI chat types

---

## Formatting Utilities (`app/lib/utils.ts`)

| Function            | Description                                      |
|---------------------|--------------------------------------------------|
| `formatCurrency(n)` | `$12.5M`, `$800K` shorthand                     |
| `formatMultiplier(n)` | `1.85x` with 2 decimal places                 |
| `formatIrr(n)`      | `+18.2%` with sign                               |
| `irrColor(n)`       | Green (>15%), white (>5%), orange (>0%), red      |
| `moicColor(n)`      | Green (>=2x), purple (>=1.5x), white (>=1x), red |

---

## Directory Structure

```
frontend/
├── app/
│   ├── app.css                      # Tailwind @theme tokens
│   ├── root.tsx                     # HTML shell, fonts, theme preload
│   ├── routes.ts                    # Route config
│   ├── routes/                      # All route modules
│   ├── components/
│   │   ├── charts/                  # Recharts wrappers
│   │   ├── layout/                  # Sidebar, TopBar
│   │   └── ui/                      # Reusable UI primitives
│   └── lib/
│       ├── api.server.ts            # Server-only API client
│       ├── types.ts                 # TypeScript interfaces
│       ├── i18n.ts                  # EN/ES translations
│       ├── utils.ts                 # Formatters & color helpers
│       ├── chart-colors.ts          # Recharts palette
│       ├── auth-context.tsx         # Session management
│       ├── theme-context.tsx        # Dark/light mode
│       ├── lang-context.tsx         # Language selection
│       ├── entity-context.tsx       # Multi-tenant entity
│       └── use-t.ts                 # useT() hook
├── package.json
├── vite.config.ts
└── tsconfig.json
```
