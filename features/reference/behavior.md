# Behavior & Rules Reference

**Living snapshot** of product rules currently implemented for Feature 1.

These files answer: *"What rules does the app enforce right now?"*  
They do **not** authorize new scope — implement only from `features/feature-*.md`.

| File | Role |
|------|------|
| [api.md](./api.md) | Routes / payloads |
| [data-model.md](./data-model.md) | Tables / columns |
| **This file** | Ownership, validation, session, and UI rules |

## Identity

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Google is the only sign-in method | The login page offers **Google Sign in** only. There is no register screen | Feature 1 |
| Only an `@eagles.oc.edu` Google account can finish sign-in | `verifyGoogleCredential` rejects other emails with `401` | Feature 1 |
| Sign-in finds a user by `googleSub`, then by email | `POST /vehicleScheduling/login` | Feature 1 |
| No matching user creates a `requestor` and returns `201` | Login controller | Feature 1 |
| An existing user, including a seeded admin or maintenance user, is reused and returns `200` | Login controller | Feature 1 |
| A null `googleSub` is set from the Google credential; an existing `googleSub` is left in place | Login controller | Feature 1 |
| `fName` and `lName` are updated from the Google profile on every successful sign-in | Login controller | Feature 1 |
| Email is set from Google only for a new user. An existing email is not replaced | Login controller | Feature 1 |
| A client-supplied `role` is ignored. Sign-in does not change `role` | Login controller writes `requestor` only on create | Feature 1 |
| Seeded `admin@eagles.oc.edu` and `maint@eagles.oc.edu` are inserted when missing | `db.seedRoleUsers()` after sync, outside tests | Feature 1 |
| Closing or canceling Google yields no credential, so no login request is sent | `GoogleSignIn` returns before `loginWithGoogle` | Feature 1 |

## Sessions

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Session is a JWT plus a `sessions` row | Login creates or reuses the row; client stores the login JSON in `localStorage` key `user` | Feature 1 |
| Lifetime is 24 hours from creation | `expirationDate` and JWT `expiresIn` | Feature 1 |
| Login reuses a non-expired session for the same `userId` | `getOrCreateSession` | Feature 1 |
| Authenticated requests send `Authorization: Bearer <token>` | Axios request interceptor | Feature 1 |
| Every authenticated request resolves `req.user.id` | `authenticate` | Feature 1 |
| Missing bearer token is `401` `{ "message": "Unauthorized! No token provided." }` | `authenticate` | Feature 1 |
| Expired, revoked, or invalid token is `401` `{ "message": "Unauthorized! Invalid or expired token." }` | `authenticate` | Feature 1 |
| That `401` clears `localStorage` `user` and sends the user to `login` | Axios response interceptor, except the login request itself | Feature 1 |
| Sign out deletes the current session row, removes `user` from `localStorage`, and opens `login` | `POST /vehicleScheduling/logout` and `MenuBar` | Feature 1 |

## Screens

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| `MenuBar` is mounted above `<v-main>` and is visible on `login` and `home` | `App.vue` | Feature 1 |
| No session: `MenuBar` has no **Sign out** and no catalog links | `MenuBar` | Feature 1 |
| Session on `home`: `MenuBar` shows the user's name and **Sign out** | `MenuBar` | Feature 1 |
| Feature 1 has no catalog nav items | `navItems` is empty; items are shown only when `user.role` is allowed | Feature 1 |
| A signed-in user who opens `login` is redirected to `home` | Router `beforeEach` | Feature 1 |
| `home` without a session redirects to `login` | Router `beforeEach` | Feature 1 |
| Home shows `Welcome, {first name}.` | `Home.vue` | Feature 1 |
| Failed Google sign-in stays on the login page and shows `<v-alert type="error">` | `GoogleSignIn.vue` | Feature 1 |
| Login shows Google's **Sign in with Google** button. A progress indicator is shown while the login request is in flight | `GoogleSignIn.vue` | Feature 1 |
