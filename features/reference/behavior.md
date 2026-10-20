# Behavior & Rules Reference

**Living snapshot** of product rules currently implemented through Feature 2.

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
| Every authenticated request resolves `req.user.id` and `req.user.role` | `authenticate` | Feature 1, role added in Feature 2 |
| Missing bearer token is `401` `{ "message": "Unauthorized! No token provided." }` | `authenticate` | Feature 1 |
| Expired, revoked, or invalid token is `401` `{ "message": "Unauthorized! Invalid or expired token." }` | `authenticate` | Feature 1 |
| That `401` clears `localStorage` `user` and sends the user to `login` | Axios response interceptor, except the login request itself | Feature 1 |
| Sign out deletes the current session row, removes `user` from `localStorage`, and opens `login` | `POST /vehicleScheduling/logout` and `MenuBar` | Feature 1 |

## Screens

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| `MenuBar` is mounted above `<v-main>` and is visible on `login` and `home` | `App.vue` | Feature 1 |
| No session: `MenuBar` has no **Sign out** and no catalog links | `MenuBar` | Feature 1 |
| A signed-in session shows the user's name and **Sign out** on every page | `MenuBar` | Feature 1 |
| Nav items share one size and sit in a centered group with the same gap; the name and **Sign out** stay on the right | `MenuBar` | Feature 1 |
| Catalog nav items are shown only when `user.role` is allowed | `MenuBar` `navItems` | Feature 1 |
| A signed-in user who opens `login` is redirected to `home` | Router `beforeEach` | Feature 1 |
| `home` without a session redirects to `login` | Router `beforeEach` | Feature 1 |
| Home shows `Welcome, {first name}.` | `Home.vue` | Feature 1 |
| Failed Google sign-in stays on the login page and shows `<v-alert type="error">` | `GoogleSignIn.vue` | Feature 1 |
| Login shows Google's **Sign in with Google** button. A progress indicator is shown while the login request is in flight | `GoogleSignIn.vue` | Feature 1 |
| **Vehicle** is in `MenuBar` for `admin` and `maintenance` and opens `/vehicle` | `MenuBar` | Feature 2 |
| A signed-out menu and a `requestor` menu do not show **Vehicle** | `MenuBar` | Feature 2 |
| `/vehicle` without a session redirects to `login` | Router `beforeEach` | Feature 2 |
| A signed-in `requestor` who opens `/vehicle` is redirected to `home` | Router `beforeEach` | Feature 2 |

## Vehicles

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Vehicles are one shared catalog and have no `userId` | `vehicles` table and create/update ignore `userId` | Feature 2 |
| `admin` can list, fetch, create, update, and delete vehicles | Vehicle routes | Feature 2 |
| `maintenance` can list, fetch, and append logs, and cannot create, update, or delete a vehicle | `requireFleetAccess` and `requireAdmin` | Feature 2 |
| A `requestor` receives `403` `{ "message": "Admin role required." }` on every vehicle route | `requireFleetAccess` | Feature 2 |
| Catalog writes by `maintenance` return `403` `{ "message": "Admin role required." }` | `requireAdmin` | Feature 2 |
| The vehicle list is ordered by make, then model, then id | `GET /api/vehicle/vehicles` | Feature 2 |
| Mileage and service logs are append-only and ordered by date, then id | Log create routes and `GET` one vehicle | Feature 2 |
| Deleting a vehicle deletes its mileage logs and service logs | Delete handler and `onDelete: CASCADE` | Feature 2 |
| `make` and `model` may be values outside the standard suggestion list | API stores any non-blank make and model | Feature 2 |
| The vehicle screen shows **Add Vehicle**, **Edit vehicle**, and **Delete vehicle** for `admin` only | `Vehicles.vue` | Feature 2 |
| The vehicle screen shows a searchable list and a detail panel for the selected vehicle (first vehicle auto-selected). Mileage and service are logged inline in the panel. | `Vehicles.vue` | Feature 2 |
| **Log mileage** and **Log service** are available to `admin` and `maintenance` | `Vehicles.vue` | Feature 2 |
| A blank required field shows **Required field** and does not call the API | Vehicle dialogs and inline log forms | Feature 2 |
| Choosing **Golf Cart** hides **VIN**, **License Plate Number**, and **License Plate Expiration Month**. The API stores those fields as `null` | `Vehicles.vue` and vehicle create/update | Feature 2 |
| Leaving a field shows that field's validation message under the field. A year outside 1950 through 2027 shows **Year must be from 1950 through 2027.** The same field messages apply to make, model, VIN, date, color, passengers, license plate, expiration month, area, mileage, and service | Vehicle dialogs and inline log forms | Feature 2 |
| For `Truck`, `Car`, and `Van`, `vin` must match `^[A-HJ-NPR-Z0-9]{17}$`. A mismatch returns `VIN must be a valid 17-character VIN.` The form shows the same message and does not call the API | Vehicle create/update and the Add and Edit dialogs | Feature 2 |
| For `Truck`, `Car`, and `Van`, `licensePlateNumber` must match `^[A-Z0-9]{2,8}$`. A mismatch returns `License Plate Number must be 2 to 8 letters or digits.` The form shows the same message and does not call the API | Vehicle create/update and the Add and Edit dialogs | Feature 2 |
| A mileage or service `entryDate` after the server's local calendar date returns `Date cannot be in the future.` The current day is accepted. The form shows the same message and does not call the API | Mileage and service log routes and the inline log forms | Feature 2 |
| An empty catalog shows **No vehicles yet.** A load failure shows the API message in an error alert | `Vehicles.vue` | Feature 2 |
| Create, update, delete, and log success use the snackbar text from the Feature 2 screen spec. Failures show the API `message` | `Vehicles.vue` | Feature 2 |
