# PromptPay v2 — Auth, Health, Resilience & Full Button Audit

Make every button in the app provably wired to a working backend endpoint with consistent error handling, automatic retries, and SSE auto-reconnect. Add Email + Google login/logout so each user owns their own API keys, plus a live health indicator in the header.

Note on AI: the chat backend already uses **Lovable AI Gateway** (`google/gemini-2.5-flash`) — no Google Gemini API key is needed or used. We'll keep that and clarify it in Docs.

---

## 1. Authentication (new)

Add Email/Password + Google sign-in via Lovable Cloud auth.

- New `/auth` page: tabs for Sign In / Sign Up, Google button, "Forgot password" link
- New `/reset-password` page (required for password recovery)
- `useAuth` hook wrapping `supabase.auth.onAuthStateChange` + `getSession` (listener set up BEFORE getSession; no async work inside the callback)
- Header: shows user email + Logout button when signed in; "Sign In" link when not
- Dashboard becomes auth-gated; unauthenticated users are redirected to `/auth`
- DB: new `profiles` table linked to `auth.users(id)` with `display_name`, `avatar_url`; trigger auto-creates profile on signup; RLS so users only see their own profile
- DB: add `auth_user_id uuid` column to existing `users` table (the API-key/wallet table) and link each created wallet to the signed-in auth user. Enable RLS on `users`, `sessions`, `transactions` so a user only sees their own rows. (`global_stats` view stays public for the leaderboard.)
- `create-wallet` edge function: now requires a JWT, reads `auth.uid()`, attaches it to the new `users` row
- "My API Keys" panel on dashboard: list all keys for the current auth user, with Revoke button (soft-delete via `revoked_at` column) wired to a new `revoke-key` edge function

Defaults: Email/Password + Google. Email confirmation OFF for hackathon demo speed (configurable later).

## 2. Health check endpoint + live indicator

- New edge function `health` (GET): pings DB (`select 1`), checks `LOVABLE_API_KEY` is set, returns `{ ok, db: "up"|"down", ai: "up"|"down", latencyMs, version, timestamp }`
- New `useHealth` hook: polls `/health` every 15s, exposes `{ status, latencyMs, lastChecked }`
- Header gets a new **HealthDot** component next to the existing realtime ConnectionStatus:
  - Green pulse = all up
  - Amber = degraded (one subsystem down)
  - Red = down or unreachable
  - Hover tooltip shows latency + last-checked timestamp + click-to-recheck

## 3. Resilient fetch + SSE reconnect

New `src/lib/fetcher.ts`:
- `fetchWithRetry(url, opts, { retries=3, backoff=exponential 500ms→4s, retryOn=[408,429,500,502,503,504,networkError] })`
- Honors `Retry-After` header on 429
- Surfaces final failure via toast + structured error
- All button-triggered fetches (`createWallet`, `verifyKey`, `endSession`, `fetchStatsSnapshot`, `revokeKey`, `health`) routed through it

`useChat` upgrade:
- AbortController retained, but on non-user-aborted disconnect mid-stream, automatically reconnect up to 3 times with exponential backoff
- Resume sends a `resume: true` flag + `sessionId` so the backend can continue the same session row instead of creating a new one
- Toast: "Reconnecting stream… (attempt N/3)"
- On final failure: red toast with Retry button that re-invokes `send`
- `chat` edge function: accepts optional `sessionId` + `resume` to append to an existing session and continue settlement numbering

## 4. Button audit — every interactive element

| Component | Button | Wired to | Success state | Error state |
|---|---|---|---|---|
| Header | Logout | `supabase.auth.signOut` | Toast + redirect to /auth | Toast |
| Header | HealthDot click | `health` (manual recheck) | Tooltip updates | Red dot + toast |
| Auth | Sign In | `auth.signInWithPassword` | Redirect / + toast | Toast |
| Auth | Sign Up | `auth.signUp` | Toast "check email" or auto-login | Toast |
| Auth | Google | `auth.signInWithOAuth` | OAuth redirect | Toast |
| Auth | Forgot password | `auth.resetPasswordForEmail` | Toast | Toast |
| Reset password | Update | `auth.updateUser({password})` | Redirect /auth | Toast |
| ChatPanel | Create Account | `create-wallet` (JWT) | Toast + Copy action | Toast |
| ChatPanel | Test | `verify-key` | Toast w/ balance | Toast |
| ChatPanel | Copy | clipboard | Toast | Toast |
| ChatPanel | Send | `chat` SSE w/ retry | Stream tokens | Toast + Retry button |
| ChatPanel | Reset | `end-session` then local clear | Toast | Toast (still resets local) |
| My Keys | Revoke | `revoke-key` (new) | Toast + list refresh | Toast |
| StatsBar | Refresh | `stats-snapshot` | Numbers animate | Toast |
| EconomicProof | Recalc | `stats-snapshot` | Verdict updates | Toast |
| SettlementFeed | TX id | clipboard | Toast | — |
| SettlementFeed | Copy all | clipboard TSV | Toast | — |
| Docs | Code Copy | clipboard | Toast | — |
| Docs / NotFound | Back / Go home | router | navigation | — |

Plus a **dev-only "Run health audit" button** in the footer that pings every endpoint sequentially and prints a green/red checklist toast — judges can click once to verify the whole stack.

## 5. Hackathon polish

- **Agent-to-Agent demo button** on dashboard: spawns a synthetic "agent" that calls `/chat` with the user's key, runs N micropayments back-to-back, proves machine-to-machine flow (aligns with Agent-to-Agent track)
- **Public leaderboard** strip: top 5 users by total USDC settled (from `global_stats` joined w/ profiles), sourced from a new `leaderboard` view
- **Burn-down graph** in EconomicProof: tiny sparkline of last 50 settlements (Recharts) so judges visually see the 50+ transaction requirement
- Footer badges: "Built on Arc · Settled in USDC · Powered by Circle Nanopayments · Lovable Cloud"

## 6. Technical details

- New edge functions: `health`, `revoke-key`. Updates: `chat` (resume), `create-wallet` (JWT-bound). All keep `verify_jwt = false` except `create-wallet` and `revoke-key` which validate JWT in code via `supabase.auth.getUser(token)`.
- Migrations: `profiles` table + trigger + RLS; add `auth_user_id` and `revoked_at` to `users`; enable RLS on `users`/`sessions`/`transactions` with `auth.uid()` policies; create `leaderboard` view.
- `src/lib/fetcher.ts`, `src/hooks/useAuth.ts`, `src/hooks/useHealth.ts`, `src/components/HealthDot.tsx`, `src/components/MyKeys.tsx`, `src/components/AgentDemo.tsx`, `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx`, `src/components/ProtectedRoute.tsx`.
- `useChat` gets reconnect loop + sessionId resume; existing UI surface unchanged except for new toasts.

## Acceptance

- Every button in the table above triggers a real network call (verifiable in DevTools) and renders a toast on success or failure.
- Killing the network mid-stream and restoring it shows "Reconnecting…" and resumes the same session without losing settlement count.
- Health dot turns red within 15s if the chat function is offline.
- Logged-out users cannot reach the dashboard; logged-in users see only their own keys/sessions/transactions.
- Demo flow: sign up → create wallet → send a long prompt → see ≥50 settlements stream in → click "Agent demo" → watch second wave → all green health dot throughout.
