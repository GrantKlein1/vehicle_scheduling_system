# Data Model Reference

**Status:** Feature 1 users and sessions.

Sequelize model names: `user` → table `users`, `session` → table `sessions`. Neither table uses `createdAt` / `updatedAt`.

## Tables

### `users`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `fName` | STRING | Required |
| `lName` | STRING | Required |
| `email` | STRING | Required, unique |
| `googleSub` | STRING(255) | Unique, nullable until the first successful sign-in |
| `role` | STRING(20) | `requestor`, `admin`, or `maintenance` |

Introduced in Feature 1.

Startup seed inserts these rows only when the email is not already present:

| email | fName | lName | role | googleSub |
|-------|-------|-------|------|-----------|
| `admin@eagles.oc.edu` | Admin | User | `admin` | null |
| `maint@eagles.oc.edu` | Maintenance | User | `maintenance` | null |

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
