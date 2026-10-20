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

**201** when the Google account creates a new `requestor`. **200** when an existing user signs in, including the first Google sign-in for a seeded `admin` or `maintenance` user.

```json
{
  "userId": 1,
  "email": "jdoe@eagles.oc.edu",
  "fName": "Jane",
  "lName": "Doe",
  "role": "requestor",
  "token": "<jwt>"
}
```

`role` is `requestor`, `admin`, or `maintenance`.

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

Authenticated handlers set `req.user.id` from the session's user.
