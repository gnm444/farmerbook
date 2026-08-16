# Secrets and GitHub deployment

## Repository boundary

Commit `.env.example` only as a name-and-default contract. Keep real local
values in `.env.local` or another ignored `.env*` file. Private keys,
credential exports, generated build output, Wrangler state, Supabase local
state, and temporary files are ignored by Git.

The CI workflow scans the complete Git history with Gitleaks. The committed
allowlist contains one exact UUID used as an idempotency fixture; do not add a
broad path, rule, or entropy exception to make a failed scan pass.

`NEXT_PUBLIC_*` values are intentionally browser-visible and are not secrets.
The Supabase publishable key is designed for browser use; database Row Level
Security remains the authorization boundary. `SUPABASE_SERVICE_ROLE_KEY` and
every API token, signing secret, webhook credential, password, or encryption
key are server-only secrets.

## AI services

FarmerBook does not require a Codex, OpenAI, ChatGPT, Anthropic, or Claude key.
Its managed inference uses a Cloudflare Workers AI `AI` binding. Usage and
billing therefore belong to the Cloudflare account that owns the deployed
Worker. `.openai/hosting.json` is non-secret build metadata and contains no
developer login or model credential.

The supervised support/social pilot uses the same binding. It adds no Gemini,
Google AI Studio, OpenAI API, ChatGPT or Codex runtime credential. Its only new
environment value is the non-secret, default-false
`ENABLE_SUPPORT_SOCIAL_PILOT` release flag. The existing server-only
`MANAGED_AGENT_PROCESSOR_SECRET` continues to authenticate the exact internal
processor route and must remain in Cloudflare's secret store.

Developer-tool authentication stored on a workstation is unrelated to the
application. Never copy Codex/ChatGPT OAuth tokens, Claude credentials, AWS SSO
cache files, Wrangler OAuth files, Supabase CLI login state, browser cookies,
or macOS Keychain data into this repository or a GitHub secret.

## Current GitHub behavior

GitHub Actions currently runs checks only; it does not deploy or mutate a
database. Keep production deployment manual until the approval, staging,
backup, migration, canary, and rollback gates in `PRODUCTION_RUNBOOK.md` are
implemented in a protected GitHub Environment.

If a reviewed GitHub deployment workflow is added, it needs narrowly scoped
machine credentials rather than workstation OAuth state:

| GitHub Environment value | Classification | Purpose |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Configuration variable | Select the owning Cloudflare account |
| `CLOUDFLARE_API_TOKEN` | Secret | Deploy only the approved Worker/resources |
| `SUPABASE_PROJECT_REF` | Configuration variable | Select staging or production explicitly |
| `SUPABASE_ACCESS_TOKEN` | Secret | Run reviewed Supabase CLI operations |
| `SUPABASE_DB_PASSWORD` | Secret when required | Authenticate a reviewed database migration |

Use separate GitHub Environments and credentials for staging and production,
require reviewers for production, and scope tokens to the minimum resources and
permissions. Do not make application runtime secrets GitHub Actions secrets
unless the workflow is explicitly responsible for provisioning or rotating
them.

Runtime secrets belong in the Cloudflare Worker secret store. Deploy with the
runbook's `--keep-vars` safeguard and inventory secret names without printing
values. Depending on enabled features, these include the Supabase service-role
key; Farmer contact owner/encryption values; YouTube or approved search keys;
Turnstile, outreach, provider, Postmark, webhook, and signing secrets; and the
managed-agent processor secret. OAuth provider client secrets remain in
Supabase Auth provider settings.

## Before every push

1. Run `gitleaks git --redact --no-banner .` to scan committed history.
2. Run `npm run check` and review `git status --short`.
3. Confirm no ignored credential file was force-added with `git ls-files`.
4. If a real secret ever entered a commit, rotate it first and then remove it
   from Git history; deleting it only from the latest revision is insufficient.
