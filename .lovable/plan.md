## Goal

Make sure every button in PromptPay does real work against the backend. No dead clicks, no placeholder handlers, no buttons that only update local state when they should also persist or call an API.

## Current button audit

| Location | Button | Status | Action |
|---|---|---|---|
| ChatPanel | `+ Create Account` | Working — calls `/create-wallet` | Keep, add copy-to-clipboard on returned key |
| ChatPanel | `Send →` | Working — SSE to `/chat` | Keep |
| ChatPanel | `Reset` | Local-only (clears messages) | Upgrade: also call new `/end-session` to mark active session `completed` and clear server-side draft |
| ChatPanel | API Key / Gateway URL inputs | Working (localStorage) | Add `Save` + `Test` button that pings `/verify-key` |
| Dashboard header | `API Docs →` link | Working | Keep |
| SettlementFeed | TX id text | Not a button | Make it a button → copies `circle_transfer_id` to clipboard, toast confirm |
| StatsBar cards | None | — | Add `Refresh` button that re-queries `global_stats` view |
| Docs page | `← Back` link | Working | Keep |
| Docs page | Code blocks | Not buttons | Add `Copy` button on every code block |
| EconomicProof | None | — | Add `Recalculate from live data` button → fetches real settlement count from DB and re-renders the verdict line |
| NotFound | None | — | Add `Go home` button |

## Backend work (Lovable Cloud edge functions)

1. **`verify-key`** (new) — `POST` with `X-API-Key`. Looks up `users` row, returns `{ valid, balance_usdc, total_spent_usdc }`. Used by the new "Test key" button.
2. **`end-session`** (new) — `POST` with `X-API-Key`. Marks the user's most recent `active` session as `completed` with `completed_at = now()`. Used by `Reset`.
3. **`stats-snapshot`** (new) — `GET`. Returns the `global_stats` view as JSON (totals + highest settlement number + live settlement-count by chain for the EconomicProof "recalculate" button). Used by `Refresh` and `Recalculate`.
4. **`chat` / `create-wallet`** — already deployed, no changes.

All four functions: CORS enabled, `verify_jwt = false` in `supabase/config.toml` (anon-key + custom `X-API-Key` model already in use).

## Frontend work

- **`src/lib/api.ts`** — add `verifyKey()`, `endSession()`, `fetchStatsSnapshot()` helpers.
- **`src/components/ChatPanel.tsx`**
  - Add `Test` button next to API Key input → calls `verifyKey`, shows toast with balance.
  - `Reset` now `await endSession()` then `chat.reset()`.
  - After `Create Account`, show small `Copy key` button.
- **`src/components/SettlementFeed.tsx`** — wrap TX id in a `<button>` that calls `navigator.clipboard.writeText` + toast.
- **`src/components/StatsBar.tsx`** — add small `↻ Refresh` icon-button in corner that re-runs `useStats` fetch.
- **`src/hooks/useStats.ts`** — expose a `refresh()` function that hits `stats-snapshot`.
- **`src/components/EconomicProof.tsx`** — add `Recalculate from live data` button → updates verdict text using `stats-snapshot.highest_settlement_number`.
- **`src/pages/Docs.tsx`** — wrap each `<Code>` in a component with a `Copy` button (top-right of the block).
- **`src/pages/NotFound.tsx`** — add `Go home` button using `react-router` `<Link>`.

## Out of scope

The public-apis GitHub repo reference: confirmed via your answer to focus on button audit; no Public APIs Explorer page will be added in this pass.

## Acceptance

- Clicking any button in the app triggers either a backend call, a navigation, or a clipboard write — verified in DevTools network tab.
- `Reset` closes the active session row in the DB.
- `Test` validates the API key against the `users` table.
- `Copy` buttons all show a success toast.
- `Refresh` and `Recalculate` re-fetch from the DB without reload.
