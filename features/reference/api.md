# API Reference

**Status:** Feature 1 authentication is implemented.

API health stays on `/api/health`. Authentication routes are mounted at `/vehicleScheduling`.

## Endpoints

| Method | Path | Auth | Purpose | Introduced |
|--------|------|------|---------|------------|
| `GET` | `/api/health` | No | Process health check | Starter |
| `POST` | `/vehicleScheduling/login` | No | Verify a Google credential and return a session | Feature 1 |
| `POST` | `/vehicleScheduling/logout` | Yes | Invalidate the current session token | Feature 1 |

## Conventions

- Flat JSON responses (no `{ success, data }` envelope).
- Errors: `{ "message": "..." }`.
- Authenticated routes: `Authorization: Bearer <token>`.
- The bearer token is a JWT and must match a non-expired row in `sessions`.

## Login

`POST /vehicleScheduling/login`

```json
{
  "credential": "<Google ID token>"
}
```

A `role` field in the body is ignored. The stored user row decides `role`.

**201** when the Google account creates a new `requestor`. **200** when an existing user signs in, including the first Google sign-in for a seeded `system_admin` or `maintenance` user. A stored legacy `admin` is saved as `system_admin` on that sign-in and the response role is `system_admin`.

```json
{
  "userId": 1,
  "email": "jdoe@eagles.oc.edu",
  "fName": "Jane",
  "lName": "Doe",
  "role": "requestor",
  "areaId": null,
  "areaName": null,
  "token": "<jwt>"
}
```

`role` is `requestor`, `system_admin`, `area_admin`, or `maintenance`. `areaId` and `areaName` are the assigned area for an `area_admin` and null otherwise. `role`, `areaId`, and `areaName` in the request body are ignored.

An area admin response looks like:

```json
{
  "userId": 4,
  "email": "athletics-admin@eagles.oc.edu",
  "fName": "Avery",
  "lName": "Coach",
  "role": "area_admin",
  "areaId": 1,
  "areaName": "Athletics",
  "token": "<jwt>"
}
```

| Status | Body | When |
|--------|------|------|
| `401` | `{ "message": "Google sign-in failed" }` | Credential missing or not a verifiable Google ID token, or the profile has no first and last name |
| `401` | `{ "message": "Only an OC Google account can sign in." }` | Verified account email is not `@eagles.oc.edu` |
| `500` | `{ "message": "Sign-in could not be completed." }` | Unexpected server error |

## Logout

`POST /vehicleScheduling/logout`

Header: `Authorization: Bearer <token>`

**200** `{ "message": "Signed out." }` and the matching `sessions` row is deleted.

| Status | Body | When |
|--------|------|------|
| `401` | `{ "message": "Unauthorized! No token provided." }` | Missing `Authorization: Bearer` token |
| `401` | `{ "message": "Unauthorized! Invalid or expired token." }` | JWT invalid, session missing, or `expirationDate` in the past |
| `500` | `{ "message": "Sign-out could not be completed." }` | Unexpected server error |

Authenticated handlers set `req.user` from the session's user:

```json
{ "id": 1, "role": "system_admin", "areaId": null, "areaName": null }
```

There is no admin-only HTTP route in this feature. Later routes should use the middleware in `backend/app/authorization/authorization.js` instead of comparing `role` to `admin`.

| Middleware | Who passes | Failure |
|------------|------------|---------|
| `requireSystemAdmin` | `system_admin`, and legacy `admin` | `403` `{ "message": "System admin role required." }` |
| `requireAnyAdmin` | system admins and `area_admin` | `403` `{ "message": "Admin role required." }` |
| `requireAreaAccess(area)` | system admins for every area; an `area_admin` only when every supplied id or name matches their area | `403` `{ "message": "You do not have access to this area." }` |

Each middleware returns `401` `{ "message": "Unauthorized! No token provided." }` when `req.user` is missing. `area` may be an id, a name, `{ id, name }`, or a function of `req`. A numeric string is an id. Matching area names are case-insensitive. The same predicates are `isSystemAdmin`, `isAnyAdmin`, and `canAccessArea` on the server and in `frontend/src/config/roles.js`.
