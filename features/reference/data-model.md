# Data Model Reference

**Status:** Feature 1 users and sessions, plus system admin / area admin.

Sequelize model names: `user` → table `users`, `session` → table `sessions`, `area` → table `areas`. None of these tables use `createdAt` / `updatedAt`.

## Tables

### `users`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `fName` | STRING | Required |
| `lName` | STRING | Required |
| `email` | STRING | Required, unique |
| `googleSub` | STRING(255) | Unique, nullable until the first successful sign-in |
| `role` | STRING(20) | `requestor`, `system_admin`, `area_admin`, or `maintenance`. A stored `admin` is a legacy system admin. |
| `areaId` | INTEGER FK | Nullable. Required when `role` is `area_admin`. Null for every other role. References `areas.id` |

Introduced in Feature 1. `areaId`, `system_admin`, and `area_admin` extend the original `admin` role.

Startup seed inserts these rows only when the email is not already present. It does not change an existing row.

| email | fName | lName | role | googleSub | areaId |
|-------|-------|-------|------|-----------|--------|
| `admin@eagles.oc.edu` | Admin | User | `system_admin` | null | null |
| `maint@eagles.oc.edu` | Maintenance | User | `maintenance` | null | null |

`db.prepareAdminTypes()` runs after sync, outside tests:

1. Create `areas` and `users.areaId` when an older database does not have them.
2. Set `role` to `system_admin` and `areaId` to null where `role` is `admin`.
3. Insert the placeholder areas below when the name is missing.
4. Insert the two users above when the email is missing.

### `areas`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING(50) | Required, unique. Trimmed. At most 50 characters |

Placeholder catalog so an area admin can be assigned to an area. Feature 5 adds logo, notification email, timestamps, and editing on this table.

Startup seed inserts these names when they are missing:

| name |
|------|
| `Athletics` |
| `Support Central` |
| `Maintenance` |

Other names, such as `Biology`, can be inserted without a code change. This feature has no area CRUD API.

### `sessions`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `token` | STRING(512) | Required. JWT stored server-side |
| `email` | STRING | Required. Copy of the user's email at creation. Reuse looks up `userId` |
| `expirationDate` | DATETIME | Required. Sequelize `DATE`. Set to 24 hours after creation |
| `userId` | INTEGER FK | Required, references `users.id` |

Introduced in Feature 1.

The spec names `expirationDate` as `DATE`. The column is a datetime so the 24-hour lifetime can be enforced.

## Associations

| From | To | Relationship | On delete |
|------|----|--------------|-----------|
| `users` | `sessions` | one-to-many (`sessions.userId`) | CASCADE |
| `areas` | `users` | one-to-many (`users.areaId`) | RESTRICT |

An area admin must reference an existing area. That rule is enforced in a `users` `beforeValidate` hook. Deleting an area that still has users is restricted by the foreign key.
