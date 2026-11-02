# ADR-0001: System admin and area admin

**Status:** Accepted
**Date:** 2026-10-28
**Deciders:** Vehicle scheduling team

## Context

Sign-in had one administrator role, `admin`, with the same access as a full operator. Later work needs a second administrator who can work only with data for one campus area (Athletics, Biology, and the rest). Area records, vehicles, and reservations are not all on this branch yet. The role split has to exist first so those features can check it without guessing.

Existing `admin` accounts must keep the access they have today. Google sign-in stays the only login path.

## Decision

Store two administrator roles on `users.role`:

- `system_admin` — full access. This replaces `admin`.
- `area_admin` — access only for the one area referenced by `users.areaId`.

`requestor` and `maintenance` stay as they are. A row that still says `admin` is authorized as a system admin, and startup plus the next sign-in rewrite it to `system_admin` with `areaId` null.

Areas are a placeholder table, `areas`, with `id` and `name` only. Seeded names are `Athletics`, `Support Central`, and `Maintenance`, matching the names area management and vehicle assignment already use. New names can be inserted without a code change. Feature 5 owns logos, notification email, and editing, and should extend this table.

Authorization for later routes:

- `isSystemAdmin` / `requireSystemAdmin` — full access. Area admins do not pass.
- `isAnyAdmin` / `requireAnyAdmin` — either administrator.
- `canAccessArea` / `requireAreaAccess` — system admins pass for every area. An area admin passes only when the supplied area id and name match their assignment.

The same three predicates live in the frontend. A `MenuBar` item that allows `admin` or `system_admin` is the old full-access item: system admins see it, area admins do not. There is no screen yet for changing a user's role or area.

## Consequences

### Positive

- Current administrators keep full access after the rewrite.
- Area-scoped features can call one helper instead of inventing a second role check.
- Google sign-in still creates a `requestor` and does not accept a role or area from the client.

### Negative / tradeoffs

- `areas` has no logo or notification email until Feature 5. Do not create a second area table.
- Full-access checks that still compare `role === "admin"` will not see `system_admin` or `area_admin`. Use the helpers. A nav list that still says `admin` is treated as system-admin-only in the frontend.
- Role and area are still changed in the database. This slice does not add a user-management screen.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Keep `role` as `admin` and add an `adminType` column | Later features that check `role === "admin"` would treat area admins as full administrators. |
| Store the area as a string on the user and skip the `areas` table | Area management is about to own an `areas` table keyed by name. A real id gives `canAccessArea` a stable target and lets Feature 5 add columns. |
| Build area CRUD and an admin user screen in this change | Those belong to Feature 5 and Feature 8. This slice only needs the two roles and the assignment. |

## Related artifacts

- Feature specs: [features/feature-1-user-auth.md](../../features/feature-1-user-auth.md), [features/feature-5-area-management.md](../../features/feature-5-area-management.md)
- Reference: [features/reference/data-model.md](../../features/reference/data-model.md), [features/reference/api.md](../../features/reference/api.md), [features/reference/behavior.md](../../features/reference/behavior.md)
