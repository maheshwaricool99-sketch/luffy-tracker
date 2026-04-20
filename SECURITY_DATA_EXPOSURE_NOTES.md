# Security Data Exposure Notes

## Active signal serializer boundary

The active signal APIs are role-aware and serialize from:

- `src/app/api/signals/route.ts`
- `src/app/api/signals/[id]/route.ts`
- `src/lib/signals/queries/listSignals.ts`
- `src/lib/signals/queries/getSignalById.ts`

Serializer split:

- Guest: `src/lib/signals/serializers/serializeSignalForGuest.ts`
- Free: `src/lib/signals/serializers/serializeSignalForFree.ts`
- Premium: `src/lib/signals/serializers/serializeSignalForPremium.ts`
- Admin: `src/lib/signals/serializers/serializeSignalForAdmin.ts`

## Guest / free locked fields

Guest and free payloads do not return execution-grade fields in the active list API:

- `entry`
- `stopLoss`
- `targets`

Guest and free drawer payloads return:

- `tradePlan: null`
- `adminDiagnostics: null`

Guest/free payloads also keep `isPremiumLocked: true`.

## Premium-only fields

Premium list and drawer payloads may include:

- `entry`
- `stopLoss`
- `targets`
- `tradePlan`
- premium rationale / explanation fields exposed through the drawer serializer

Premium payloads do **not** include admin diagnostics.

## Admin-only fields

Admin list payloads may include:

- `sourceStrategy`
- `moderationState`
- visibility / moderation metadata

Admin drawer payloads may include:

- `adminDiagnostics`
- source strategy version
- validation flags
- internal diagnostics maps

These fields are only emitted from the admin serializer path after server-side role resolution.

## Legacy field review

Repo-wide references to sensitive fields such as `entry`, `stopLoss`, `targets`, `execution`, `adminDiagnostics`, `providerState`, and `moderation` were reviewed.

Findings:

- Active public signal APIs are role-serialized and do not leak premium/admin fields to guest/free users.
- Admin-only surfaces live under `/admin/*` and are additionally protected server-side by `requireAdminApi()`.
- Premium signal detail remains gated through role-aware serializers rather than client-only hiding.
- Technical/admin tables and drawers may reference sensitive fields, but those surfaces are either admin-only or fed from already-gated server routes.

## Health route decision

`/health` and `/api/health` remain authenticated-only by product intent.

Reason:

- the health surface contains operational freshness, degradation, and recovery details intended for logged-in users and operators
- public trust messaging is handled through the public product pages rather than exposing the internal health dashboard anonymously

Enforcement:

- `src/proxy.ts` does not include `/health` or `/api/health` in `PUBLIC_ROUTES`
- unauthenticated requests are redirected to `/login?next=...`
