# FarmerBook

FarmerBook is a responsive professional network for farmers and people working
in agriculture. Participants can build a crop- and location-aware profile,
share field updates, discover and follow peers, exchange direct messages, and
report unsafe content.

The repository includes a complete credential-free demonstration and a
Supabase-backed pilot boundary with email authentication, PostgreSQL Row Level
Security, storage policies, and administrator moderation actions.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. With no environment values, every primary route
runs against fictional in-memory demonstration data.

To connect a Supabase project, copy `.env.example` to `.env.local`, provide the
public project values and server-only service-role key, then apply
`supabase/migrations/20260729160000_initial_farmerbook.sql`.

## Quality checks

```bash
npm run check
npm run test:e2e
```

The main quality gate runs ESLint, TypeScript, unit and schema checks, and a
production build. Playwright covers the desktop and mobile demonstration
journeys.

## Product documents

- [MVP product design](docs/MVP_PRODUCT_DESIGN.md)
- [Living implementation plan](PLAN.md)
- [Implementation research](research.md)

Before opening a real pilot, choose the region, crop focus, pilot language,
invitation method, and named moderator; configure production email delivery and
recoverable backups; and complete farmer usability testing.
