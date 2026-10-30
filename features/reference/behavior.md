# Behavior & Rules Reference

**Living snapshot** of product rules currently implemented through Feature 3.

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
| Sign-in finds a user by `googleSub`, then by email | `POST /vehicle-t4/login` | Feature 1 |
| No matching user creates a `requestor` and returns `201` | Login controller | Feature 1 |
| An existing user, including a seeded system admin or maintenance user, is reused and returns `200` | Login controller | Feature 1 |
| A null `googleSub` is set from the Google credential; an existing `googleSub` is left in place | Login controller | Feature 1 |
| `fName` and `lName` are updated from the Google profile on every successful sign-in | Login controller | Feature 1 |
| Email is set from Google only for a new user. An existing email is not replaced | Login controller | Feature 1 |
| A client-supplied `role`, `areaId`, or `areaName` is ignored. Sign-in does not change `role` except the legacy rewrite below | Login controller writes `requestor` and `areaId` null only on create | Feature 1 |
| Seeded `admin@eagles.oc.edu` (`system_admin`) and `maint@eagles.oc.edu` are inserted when missing. Existing rows are left as they are | `db.prepareAdminTypes()` after sync, outside tests | Feature 1 |
| Placeholder areas `Athletics`, `Support Central`, and `Maintenance` are inserted when the name is missing | `db.seedAreas()` inside `prepareAdminTypes` | Admin types |
| A stored `role` of `admin` becomes `system_admin` with `areaId` null | `migrateLegacyAdmins` on startup, and again on that user's next sign-in | Admin types |
| `system_admin` has the access the old `admin` role had. `area_admin` is assigned to one existing area and is not a full-access admin | `isSystemAdmin`, `isAnyAdmin`, `canAccessArea` | Admin types |
| An `area_admin` save requires `areaId` of an existing area. Any other role is saved with `areaId` null | `users` `beforeValidate` hook | Admin types |
| Closing or canceling Google yields no credential, so no login request is sent | `GoogleSignIn` returns before `loginWithGoogle` | Feature 1 |

## Sessions

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Session is a JWT plus a `sessions` row | Login creates or reuses the row; client stores the login JSON in `localStorage` key `user` | Feature 1 |
| Lifetime is 24 hours from creation | `expirationDate` and JWT `expiresIn` | Feature 1 |
| Login reuses a non-expired session for the same `userId` | `getOrCreateSession` | Feature 1 |
| Authenticated requests send `Authorization: Bearer <token>` | Axios request interceptor | Feature 1 |
| Every authenticated request resolves `req.user.id`, `role`, `areaId`, and `areaName` | `authenticate` | Feature 1, admin types |
| Missing bearer token is `401` `{ "message": "Unauthorized! No token provided." }` | `authenticate` | Feature 1 |
| Expired, revoked, or invalid token is `401` `{ "message": "Unauthorized! Invalid or expired token." }` | `authenticate` | Feature 1 |
| That `401` clears `localStorage` `user` and sends the user to `login` | Axios response interceptor, except the login request itself | Feature 1 |
| Sign out deletes the current session row, removes `user` from `localStorage`, and opens `login` | `POST /vehicle-t4/logout` and `MenuBar` | Feature 1 |

## Screens

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| `MenuBar` is mounted above `<v-main>` and is visible on `login` and `home` | `App.vue` | Feature 1 |
| No session: `MenuBar` has no **Sign out** and no catalog links | `MenuBar` | Feature 1 |
| Session on `home`: `MenuBar` shows the user's name, role label, and **Sign out** | `MenuBar` | Feature 1, admin types |
| Role labels are **System Admin** (including legacy `admin`), **Area Admin · {area name}**, **Maintenance**, and **Requestor** | `formatRoleLabel` | Admin types |
| A nav item is shown when `roleMatchesNav` matches the signed-in role. `admin` and `system_admin` match system admins only. `area_admin` matches area admins only | `roleMatchesNav` | Feature 1, admin types |
| A signed-in user who opens `login` is redirected to `home` | Router `beforeEach` | Feature 1 |
| `home` without a session redirects to `login` | Router `beforeEach` | Feature 1 |
| Home shows `Welcome, {first name}.` | `Home.vue` | Feature 1 |
| Failed Google sign-in stays on the login page and shows `<v-alert type="error">` | `GoogleSignIn.vue` | Feature 1 |
| Login shows Google's **Sign in with Google** button. A progress indicator is shown while the login request is in flight | `GoogleSignIn.vue` | Feature 1 |
| **Vehicle** is in `MenuBar` for `admin`, `system_admin`, and `maintenance`, and opens `/vehicle`. An area admin does not see it | `MenuBar` | Feature 2, admin types |
| A signed-out menu and a `requestor` menu do not show **Vehicle** | `MenuBar` | Feature 2 |
| `/vehicle` without a session redirects to `login` | Router `beforeEach` | Feature 2 |
| A signed-in `requestor` who opens `/vehicle` is redirected to `home` | Router `beforeEach` | Feature 2 |
| **Driver** is in `MenuBar` for `admin`, `system_admin`, `area_admin`, and `maintenance`, and opens `/driver` | `MenuBar` | Feature 3 |
| A signed-out menu and a `requestor` menu do not show **Driver** | `MenuBar` | Feature 3 |
| `/driver` without a session redirects to `login` | Router `beforeEach` | Feature 3 |
| A signed-in `requestor` who opens `/driver` is redirected to `home`. A system admin, area admin, or maintenance user stays on the driver list | Router `beforeEach` | Feature 3 |

## Vehicles

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Vehicles are one shared catalog and have no `userId` | `vehicles` table and create/update ignore `userId` | Feature 2 |
| `admin` can list, fetch, create, update, and delete vehicles | Vehicle routes | Feature 2 |
| `maintenance` can list, fetch, and append logs, and cannot create, update, or delete a vehicle | `requireFleetAccess` and `requireAdmin` | Feature 2 |
| A `requestor` receives `403` `{ "message": "Admin role required." }` on every vehicle route | `requireFleetAccess` | Feature 2 |
| Catalog writes by `maintenance` return `403` `{ "message": "Admin role required." }` | `requireAdmin` | Feature 2 |
| The vehicle list is ordered by make, then model, then id | `GET /api/vehicle/vehicles` | Feature 2 |
| Mileage and service logs are appended and ordered by date, then id. A service date and service performed are not edited later. Comments on a service can be set at creation and updated later | Log routes and `GET` one vehicle | Feature 2 |
| A new mileage reading must be greater than the highest mileage already logged for that vehicle | Mileage log route and the mileage form | Feature 2 |
| Service performed is any non-blank text up to 80 characters. The form lists common repairs and also accepts a typed custom service. **Log service** asks for an optional comment before the service is saved. Comments are text up to 500 characters and can also be changed from an outlined button on the service row | Service log route, comment update route, and the service form | Feature 2 |
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
| A `purchasedDate` after the server's local calendar date returns `Date cannot be in the future.` The current day is accepted. The form shows the same message and does not call the API | Vehicle create/update and the Add and Edit dialogs | Feature 2 |
| An empty catalog shows **No vehicles yet.** A load failure shows the API message in an error alert | `Vehicles.vue` | Feature 2 |
| A vehicle status is `available`, `checked_out`, `in_repair`, or `out_of_service`. New vehicles, and rows with a blank status, are `available`. Create and update accept a status; omitting it on update keeps the stored value. The vehicle list, detail panel, and add/edit dialog show the status and do not edit it | Vehicle model, create/update, and `Vehicles.vue` | Vehicle status |
| Create, update, delete, and log success use the snackbar text from the Feature 2 screen spec. Failures show the API `message` | `Vehicles.vue` | Feature 2 |

## Drivers

| Rule | Enforcement | Introduced |
|------|-------------|------------|
| Drivers are one shared catalog and have no `userId` | `drivers` table and create/update ignore `userId` | Feature 3 |
| A system admin or an `area_admin` can list, create, update, and delete every driver. The list is not limited to the caller's area | `requireAnyAdmin` on writes and `GET /api/driver/drivers` | Feature 3 |
| A `maintenance` user or `requestor` can list every driver and receives `403` `{ "message": "Admin role required." }` on create, update, and delete | Driver routes | Feature 3 |
| The driver list is ordered by last name, then first name, then id. `lastName` is not unique and is at most 50 characters | `GET /api/driver/drivers` and driver validation | Feature 3 |
| Required strings are trimmed. A missing, empty, or whitespace-only required string is rejected. A `lastName` longer than 50 characters returns `Last Name cannot exceed 50 characters.` | Driver create/update | Feature 3 |
| `driverLicenseExpDate` and `approvedDate` must be real `YYYY-MM-DD` dates | Driver create/update | Feature 3 |
| A driver status is `valid` or `expired`, set from `approvedDate`. It stays `valid` until the calendar date one year later, and becomes `expired` on that anniversary. A status sent with create or update is ignored. The add and edit dialogs do not ask for a status | Driver create/update, list refresh, and `Drivers.vue` | Feature 3 |
| The driver screen shows **Add Driver**, **Edit**, and **Delete** for a system admin or an `area_admin`. A maintenance user sees the list and does not see those actions | `Drivers.vue` | Feature 3 |
| Create, edit, and delete happen in dialogs on `/driver`. A blank required field shows **Required field** and does not call the API. **Cancel** on delete leaves the driver in the list | `Drivers.vue` | Feature 3 |
| A successful create shows the snackbar **Driver added successfully!** and the new row. A successful update or delete refreshes the table | `Drivers.vue` | Feature 3 |
