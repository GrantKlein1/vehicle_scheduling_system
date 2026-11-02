# Feature: Destination Management

**Feature ID:** 4
**Branch pattern:** `feature/4-destination-management`
**Status:** Draft
**Created:** 2026-11-01
**Input:** Any signed-in user can view destinations and add one on one screen, using dialogs. A requestor can add a destination when they need one for a reservation. A requestor cannot update or delete a destination, and **Destination** is not in that user's menu.
**Depends on:** [Feature 1 — User Authentication](feature-1-user-auth.md)
**Related:** [ADR-0001](../docs/adr/0001-system-and-area-admins.md)

Roles are `requestor`, `system_admin`, `area_admin`, and `maintenance`. A legacy `admin` session is a system admin. A requestor can list destinations and create a destination. A requestor cannot update or delete one. A maintenance user can list, create, and update destinations, and cannot delete one. An area admin and a system admin can list, create, update, and delete destinations. Delete is limited to an admin (`isAnyAdmin`: `system_admin`, `area_admin`, or legacy `admin`). **Destination** is in the menu for a system admin, an area admin, and a maintenance user. It is hidden from a requestor and from a visitor with no session. A requestor still opens `/destination`, sees the list, and can add a destination. See [ADR-0001](../docs/adr/0001-system-and-area-admins.md) for the role names. This feature does not limit destinations to `isSystemAdmin`.

---

## User Stories

### US-4.1: View Destination List Page
**As a** signed-in user
**I want to** select **Destination** from the navigation menu
**So that** I can open the destination list

**Priority:** P1
**Independent test:** Sign in as a system admin, click **Destination**, and confirm the browser lands on `/destination`. Repeat as an area admin and a maintenance user. Sign in as a requestor, open `/destination` directly, and confirm the list is shown.
**Acceptance scenarios:** see ### US-4.1 under Acceptance Criteria

### US-4.2: Create Destination
**As a** signed-in user
**I want to** create a destination in a dialog
**So that** it is added to the shared list, including when I am a requestor and need a new place for a reservation

**Priority:** P1
**Independent test:** Sign in as a requestor, open the dialog, submit a valid destination, and confirm it appears in the table
**Acceptance scenarios:** see ### US-4.2 under Acceptance Criteria

### US-4.3: Row Action Icons
**As a** signed-in system admin or area admin
**I want to** see Edit and Delete on each destination row
**So that** I can change or remove that destination, while a maintenance user can change one and cannot remove one, and a requestor can do neither

**Priority:** P1
**Independent test:** Sign in as a system admin and confirm every destination row shows Edit and Delete. Sign in as a maintenance user and confirm Edit is shown and Delete is not. Sign in as a requestor and confirm those actions are not shown.
**Acceptance scenarios:** see ### US-4.3 under Acceptance Criteria

### US-4.4: Edit Destination
**As a** signed-in system admin, area admin, or maintenance user
**I want to** update a destination's address
**So that** the list stays accurate

**Priority:** P2
**Independent test:** Sign in as a system admin, change a destination's city, and confirm the table shows the new city
**Acceptance scenarios:** see ### US-4.4 under Acceptance Criteria

### US-4.5: Delete Destination
**As a** signed-in system admin or area admin
**I want to** delete a destination after I confirm
**So that** a place that is no longer used is removed

**Priority:** P2
**Independent test:** Sign in as a system admin, confirm delete, and verify the destination is gone from the table
**Acceptance scenarios:** see ### US-4.5 under Acceptance Criteria

### US-4.6: Role-Based Menu Access
**As the** application
**I want to** show **Destination** to a system admin, an area admin, and a maintenance user
**So that** a requestor does not open the destination screen from the menu

**Priority:** P1
**Independent test:** Sign in as a system admin and confirm **Destination** is in the menu. Sign in as a requestor and confirm it is not.
**Acceptance scenarios:** see ### US-4.6 under Acceptance Criteria

### US-4.7: Role-Based Access Control
**As the** application
**I want to** let a requestor list and create destinations, let a maintenance user list, create, and update them, and let an admin list, create, update, and delete them
**So that** a requestor can add a destination when reserving, a maintenance user can correct one, and only an admin can remove one

**Priority:** P1
**Independent test:** Sign in as a requestor and confirm list and create succeed, and update and delete return 403. Sign in as a maintenance user and confirm list, create, and update succeed, and delete returns 403. Sign in as an area admin and a system admin and confirm each can list, create, update, and delete. Confirm a call with no token returns 401.
**Acceptance scenarios:** see ### US-4.7 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001:** Every destination endpoint MUST require authentication (`authenticate` middleware).
- **FR-002:** An authenticated `system_admin`, `area_admin`, or legacy `admin` MUST be able to list destinations, create a destination, update a destination, and delete a destination. An authenticated `maintenance` user MUST be able to list destinations, create a destination, and update a destination, and MUST NOT be able to delete a destination. An authenticated `requestor` MUST be able to list destinations and create a destination.
- **FR-003:** A `requestor` who calls `PUT /api/vehicle/destinations/:destinationId` or `DELETE /api/vehicle/destinations/:destinationId` MUST receive HTTP `403` with `{ "message": "Requestors cannot update or delete destinations." }`. The destination MUST be unchanged. A `requestor` list or create MUST NOT receive `403`.
- **FR-004:** A destination MUST NOT have a `userId`. A destination is a catalog row, not a user account. A `userId` in the request body MUST be ignored and MUST NOT be stored.
- **FR-005:** Every input string MUST be trimmed. A required value that is missing, not a string, empty, or whitespace-only MUST be rejected with HTTP `400`. Treat a non-string the way `trimmedString` in `backend/app/controllers/vehicle.controller.js` does: it is an empty string. Check fields in this order and return the first error: `name`, `addressLine1`, `addressLine2`, `city`, `state`, `zip`.
- **FR-006:** A request with no token MUST return HTTP `401` with `{ "message": "Unauthorized! No token provided." }`. A request with an invalid or expired token MUST return HTTP `401` with `{ "message": "Unauthorized! Invalid or expired token." }`. Register `{ path: "/destination", name: "destinations", component: Destinations }` in `frontend/src/router.js` before the `/:pathMatch(.*)*` redirect to `home`. A visitor with no session who opens `/destination` MUST be redirected to `/login`. A signed-in user who opens `/destination` MUST stay on the destination list. Do not copy the `vehicles` check in `beforeEach`: that check sends a signed-in `requestor` or `area_admin` to `home`.
- **FR-007:** `GET /api/vehicle/destinations` MUST return every destination, ordered by `name` ascending, then `city` ascending, then `id` ascending.
- **FR-008:** `name`, `addressLine1`, `city`, `state`, and `zip` MUST be required. `addressLine2` MUST be optional. A missing or blank `addressLine2` MUST be stored as `null`.
- **FR-009:** `name` and `addressLine1` MUST be at most 100 characters. `addressLine2`, when present, MUST be at most 100 characters. `city` MUST be at most 50 characters. A longer value MUST return HTTP `400` with the message in the API error table. None of these fields is unique.
- **FR-010:** `state` MUST be exactly two letters. It MUST be stored uppercase. A missing value or a value that is not two letters MUST return HTTP `400` with `{ "message": "State must be a 2-letter abbreviation." }`.
- **FR-011:** `zip` MUST match `^\d{5}(-\d{4})?$` after trim. A missing value or a value that does not match MUST return HTTP `400` with `{ "message": "Zip must be 5 digits or ZIP+4." }`.
- **FR-012:** `POST /api/vehicle/destinations` MUST return HTTP `201` and the saved destination: `id`, `name`, `addressLine1`, `addressLine2`, `city`, `state`, `zip`, `createdAt`, and `updatedAt`. It MUST NOT include `userId`. Build that object in the controller the way `vehicleJson` does. `PUT /api/vehicle/destinations/:destinationId` MUST return HTTP `200` with `{ "message": "Destination was updated successfully." }`. `DELETE /api/vehicle/destinations/:destinationId` MUST return HTTP `200` with `{ "message": "Destination was deleted successfully." }`. Update and delete of an id that does not exist, including a non-integer id, MUST return HTTP `404` with `{ "message": "Destination with id=<destinationId> not found." }`, using the raw path param the way `findVehicle` does. A `requestor` receives `403` before that lookup on update and delete. A `maintenance` user receives `403` before that lookup on delete.
- **FR-013:** This feature MUST add one item to the existing `navItems` array in `frontend/src/components/MenuBar.vue`, after **Vehicle**: `{ title: "Destination", to: { name: "destinations" }, roles: ["admin", "system_admin", "area_admin", "maintenance"] }`. Visibility uses `roleMatchesNav`. A list of only `admin` or `system_admin` hides the item from an area admin, so `area_admin` MUST be in `roles`. It MUST NOT create a second `MenuBar`. **Destination** MUST be hidden when there is no session and hidden for `requestor`. Hiding the menu item MUST NOT block a requestor from `/destination` or from list and create.
- **FR-014:** Create, edit, and delete MUST happen in dialogs on `/destination`. The page heading is **Destinations**. **Add Destination** opens the create dialog for every signed-in user, including a requestor. Do not hide it with the `isAdmin` check in `Vehicles.vue` (`admin` and `system_admin` only). The create dialog title is **Add Destination** and its submit button is **Save**. The edit dialog submit button is **Update Destination**. Both dialogs have **Close**, which does not call the API. Each row MUST show a pencil icon button (`mdi-pencil`, `aria-label` **Edit**) when `isSystemAdmin`, `isAreaAdmin`, or `role === "maintenance"` from `frontend/src/config/roles.js`. Each row MUST show a trash icon button (`mdi-delete`, `aria-label` **Delete**) when `isAnyAdmin` (`isSystemAdmin` or `isAreaAdmin`), including a legacy `admin`. A `maintenance` user MUST NOT see **Delete**. A requestor MUST NOT see **Edit** or **Delete**. A required field left blank MUST show **Required field** and MUST NOT call the API. **Delete** opens a dialog titled **Delete this destination?** with **Cancel** and **Delete**. **Cancel** does not call `DELETE`. **Delete** sends it. An API error shows that response `message` in an error snackbar and leaves the row unchanged. HTTP `401` already clears the session in the `apiClient` interceptor and opens `login`; a `403` MUST NOT sign the user out.
- **FR-015:** After a successful create, the new destination MUST appear in the table and the screen MUST show the snackbar **Destination added successfully!** After a successful update or delete, the table MUST show the new data or the removal.
- **FR-016:** A `maintenance` user who calls `DELETE /api/vehicle/destinations/:destinationId` MUST receive HTTP `403` with `{ "message": "Maintenance cannot delete destinations." }`. The destination MUST be unchanged, including when the id does not exist. Role is checked before the id lookup. A `maintenance` list, create, or update MUST NOT receive `403`.

## Assumptions

- Feature 1 user authentication is merged and active on `dev`. Roles are `requestor`, `system_admin`, `area_admin`, and `maintenance`. A legacy `admin` is a system admin (`isSystemAdmin`). A requestor can list and create destinations. A maintenance user can list, create, and update destinations, and cannot delete one. A system admin, an area admin, and a legacy `admin` can list, create, update, and delete destinations.
- The `MenuBar` component exists. **Destination** is the next `navItems` entry after **Vehicle**, with `to: { name: "destinations" }` and roles `admin`, `system_admin`, `area_admin`, and `maintenance`. `roleMatchesNav` shows it to a system admin, a legacy `admin`, an area admin, and a maintenance user. A requestor does not see that item. A requestor can still open `/destination`, list destinations, and create a destination.
- An `area_admin` user row must have an `areaId` for an existing area. `db.user.create({ role: "area_admin" })` throws. Backend tests use `createArea`, then `createUser({ role: "area_admin", areaId })` from `backend/tests/helpers.js`.
- `db.user.create({ role: "admin" })` rewrites the role to `system_admin` in the user model's `beforeValidate` hook. A test of the stored legacy role uses `insertLegacyAdmin` from that same helpers file.
- `frontend/tests/MenuBar.test.js` still asserts that **Destination** is absent for a system admin, a legacy `admin`, an area admin, and a maintenance user, and that an admin's menu labels are exactly `["Vehicle", "Sign out"]`. This feature updates those assertions. Requestor and signed-out assertions that **Destination** is absent stay. `createTestRouter` in `frontend/tests/testUtils.js` only registers `home`, `login`, and `vehicles`. A test that navigates to `{ name: "destinations" }` on that router needs the destination route added there. Guard tests import `frontend/src/router.js`, the same way `frontend/tests/router.test.js` covers `/vehicle`.
- Destinations are one shared catalog. They are not private to the user who created them, and they are not scoped to an area. A requestor who adds a destination while preparing a reservation adds it for every user.
- Address Line 2 is the only optional field. A blank Address Line 2 is stored as `null`.
- `name` is not unique. Two destinations may share a name.
- `state` is a two-letter abbreviation. This feature does not check it against a list of US states.
- `zip` is a US ZIP code: five digits, or five digits, a hyphen, and four digits.
- Destination interactions use dialogs on a single view (`Destinations.vue`).
- Feature 6 (Reservation) will associate `destinationId` with reservations later. This feature does not create reservation rows.

---

## Edge Cases

- A required field left blank on the form shows **Required field** and does not call the API. Address Line 2 may be left blank.
- A required value that is missing, not a string, empty, or whitespace-only: HTTP `400` with the message in the API error table. No destination is stored. Input strings are trimmed before they are stored. The first failing field is the one reported.
- `name` or `addressLine1` longer than 100 characters, `addressLine2` longer than 100 characters, or `city` longer than 50 characters: HTTP `400` with the length message in the API error table.
- `state` missing or not exactly two letters, such as `Oklahoma` or `1K`: HTTP `400` with `"State must be a 2-letter abbreviation."`. `ok` is stored as `OK`.
- `zip` missing or not five digits or ZIP+4, such as `7301` or `73013-12`: HTTP `400` with `"Zip must be 5 digits or ZIP+4."`.
- Two destinations may share a `name`.
- Update or delete of an id that does not exist, or that is not an integer: HTTP `404` with `"Destination with id=<destinationId> not found."`. The message uses the raw path param. A requestor still receives `403` before that lookup on update and delete. A maintenance user still receives `403` before that lookup on delete.
- A signed-in `requestor` can list and create destinations. A requestor `PUT` or `DELETE` returns HTTP `403` with `"Requestors cannot update or delete destinations."` and leaves the destination unchanged, including when the id does not exist.
- A signed-in `maintenance` user can list, create, and update destinations. A maintenance `DELETE` returns HTTP `403` with `"Maintenance cannot delete destinations."` and leaves the destination unchanged, including when the id does not exist.
- A signed-in `area_admin`, `system_admin`, or legacy `admin` can list, create, update, and delete destinations.
- No session on `/destination`: redirect to `/login`. A destination API call with no token: HTTP `401` with `"Unauthorized! No token provided."`. An invalid or expired token: HTTP `401` with `"Unauthorized! Invalid or expired token."`.
- A signed-in requestor, area admin, maintenance user, or system admin opening `/destination` stays on the destination list. **Destination** is in the menu for an area admin, a maintenance user, and a system admin. It is not in a requestor's menu.
- Cancelling a delete leaves the destination in the list and does not call `DELETE`.
- A `userId` sent with a create or update is dropped. The stored row and the response have no `userId`.

## Success Criteria

- **SC-001:** Every Gherkin scenario is covered by an automated test in the Test Coverage Map.
- **SC-002:** A requestor can view and create a destination on one screen, using the add dialog. A maintenance user can also update a destination on that screen and cannot delete one. A system admin and an area admin can also update and delete a destination on that screen.
- **SC-003:** A requestor can list and create destinations and cannot update or delete them. A maintenance user can list, create, and update destinations and cannot delete them. An area admin and a system admin can list, create, update, and delete destinations. A requestor does not see **Destination** in the menu. A visitor with no session cannot open the screen.
- **SC-004:** `npm test` passes.

## Data Ownership & Isolation

Destinations belong to one shared catalog. There is no `userId` on a destination. Every signed-in user can read every row. A requestor can create a row and cannot update or delete one. A maintenance user can create and update a row and cannot delete one. Only an admin can delete a row. The catalog is not filtered by role or area.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/vehicle/destinations` returns every destination to any authenticated user. The rows are not filtered by role or area. |
| **Write scope** | `PUT /api/vehicle/destinations/:destinationId` succeeds for a `system_admin`, `area_admin`, `maintenance` user, and legacy `admin`. `DELETE /api/vehicle/destinations/:destinationId` succeeds for a `system_admin`, `area_admin`, and legacy `admin`. A `requestor` receives `403` on update and delete, and the row is unchanged. A `maintenance` user receives `403` on delete, and the row is unchanged. |
| **Create scope** | `POST /api/vehicle/destinations` succeeds for any authenticated user, including a requestor adding a place for a reservation. The row is saved with no `userId`. |
| **Cross-role access** | A `requestor` can list and create. A `requestor` cannot update or delete. A `maintenance` user can list, create, and update, and cannot delete. A `system_admin`, `area_admin`, or legacy `admin` can list, create, update, and delete. |
| **UI scope** | `Destinations.vue` and **Add Destination** render for every signed-in user, including a requestor. **Edit** renders when `isSystemAdmin`, `isAreaAdmin`, or the role is `maintenance`, and does not render for `requestor`. **Delete** renders when `isAnyAdmin` and does not render for `maintenance` or `requestor`. The **Destination** item in `MenuBar` uses `roleMatchesNav` with `admin`, `system_admin`, `area_admin`, and `maintenance`. |
| **Implementation** | `authenticate` runs first. `GET` and `POST` use no other role middleware. `PUT` returns `403` when `req.user.role === "requestor"`, before the id lookup. `DELETE` returns `403` for a `requestor`, then `403` for `maintenance`, before the id lookup. Update and delete do not use `requireSystemAdmin`, `requireAdmin`, `requireAnyAdmin`, or `requireFleetAccess`. |

---

## Key Entities

- **Destination**: one shared catalog row with no `userId`. It has a name, address line 1, an optional address line 2, city, state, and zip. Name and address line 1 are at most 100 characters. Address line 2, when present, is at most 100 characters. City is at most 50 characters. State is a two-letter abbreviation stored uppercase. Zip is five digits or ZIP+4. Name is not unique.
- **User / Session**: required for `/destination` and every destination endpoint. Roles are `requestor`, `system_admin`, `area_admin`, and `maintenance` (Feature 1). A legacy `admin` is a system admin. A requestor lists and creates destinations. A maintenance user lists, creates, and updates destinations, and cannot delete one. A system admin, an area admin, and a legacy `admin` list, create, update, and delete every destination.
- **Reservation**: a later trip row that will reference `destinationId` (Feature 6). This feature does not create reservation rows.

---

## API Requirements

`backend/server.js` mounts `apiRouter` at `/api` and again at `/vehicle-t4`. `backend/app/routes/index.js` already mounts the vehicle router with `apiRouter.use("/vehicle", vehicleRoutes)`. Add the destination paths on that existing router in `backend/app/routes/vehicle.routes.js`. Do not add a second `apiRouter.use`, and do not add a `/destination` or `/api/destination` prefix. Router paths are `/destinations` and `/destinations/:destinationId`. Tests call the full path the same way `backend/tests/vehicles.test.js` calls `/api/vehicle/vehicles`: `GET /api/vehicle/destinations` and `PUT /api/vehicle/destinations/1`.

Handlers live in `backend/app/controllers/destination.controller.js`. `GET` and `POST` use `authenticate` only. `PUT` uses `authenticate`, then returns `403` when `req.user.role === "requestor"`, before loading the row. `DELETE` uses `authenticate`, then returns `403` when `req.user.role === "requestor"`, then returns `403` when `req.user.role === "maintenance"`, before loading the row. Do not use `requireSystemAdmin`, `requireAdmin`, `requireAnyAdmin`, or `requireFleetAccess` on these routes. `requireAnyAdmin` would block a maintenance update, and its `403` body is `{ "message": "Admin role required." }` instead of the messages in **FR-003** and **FR-016**. `requireAdmin` and `requireSystemAdmin` block an area admin. A legacy `admin` is not a requestor or a maintenance user, so the role checks allow that role to update and delete. Do not gate update with `isSystemAdmin`: that helper blocks an area admin and a maintenance user. Do not gate delete with `isSystemAdmin`: that helper blocks an area admin. Gate delete with `isAnyAdmin` after the requestor and maintenance messages, or reject those two roles explicitly. **Edit** uses `isSystemAdmin`, `isAreaAdmin`, and `maintenance`. **Delete** uses `isAnyAdmin`. The menu uses `roleMatchesNav`.

The catalog client is the named export `{ apiClient }` from `frontend/src/services/services.js`, which `frontend/src/services/vehicleServices.js` uses. The default export of `services.js` is the scheduling client for `login` and `logout` only. In dev, `apiClient` uses `http://localhost:3200/api/`. Deployed, its base is `/vehicle-t4/`, and that prefix also mounts `apiRouter`. Add `frontend/src/services/destinationServices.js` and call `vehicle/destinations` with no leading slash, the same way vehicles call `vehicle/vehicles`.

Responses are flat JSON. Errors are `{ "message": "..." }`. Do not wrap success or errors in `{ success, data }`. A created destination and each list item has `id`, `name`, `addressLine1`, `addressLine2`, `city`, `state`, `zip`, `createdAt`, and `updatedAt`, and no `userId`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/vehicle/destinations` | any signed-in user | Create a destination |
| `GET` | `/api/vehicle/destinations` | any signed-in user | List all destinations, ordered by `name`, then `city`, then `id` |
| `PUT` | `/api/vehicle/destinations/:destinationId` | system admin, area admin, maintenance, or legacy `admin` | Update a destination |
| `DELETE` | `/api/vehicle/destinations/:destinationId` | system admin, area admin, or legacy `admin` | Delete a destination |

### Create – `POST /api/vehicle/destinations`

**Request body:**

```json
{
  "name": "Garvey Center",
  "addressLine1": "2501 E Memorial Rd",
  "addressLine2": "Suite 100",
  "city": "Edmond",
  "state": "OK",
  "zip": "73013"
}
```

Every string is trimmed before it is stored. `state` is stored uppercase. A blank or omitted `addressLine2` is stored as `null`. A `userId` property in the body is ignored and is not stored.

**Success** (`201`): the saved destination, including `id`, the fields above, `createdAt`, and `updatedAt`. `addressLine2` is `null` when it was blank or omitted, and the key is present. The response does not include `userId`.

**Errors (`400`):**

| Condition | `message` |
|-----------|-----------|
| Missing or blank `name` | `Name cannot be empty.` |
| `name` longer than 100 characters | `Name cannot exceed 100 characters.` |
| Missing or blank `addressLine1` | `Address Line 1 cannot be empty.` |
| `addressLine1` longer than 100 characters | `Address Line 1 cannot exceed 100 characters.` |
| `addressLine2` longer than 100 characters | `Address Line 2 cannot exceed 100 characters.` |
| Missing or blank `city` | `City cannot be empty.` |
| `city` longer than 50 characters | `City cannot exceed 50 characters.` |
| Missing `state`, or `state` is not exactly two letters | `State must be a 2-letter abbreviation.` |
| Missing `zip`, or `zip` does not match `^\d{5}(-\d{4})?$` | `Zip must be 5 digits or ZIP+4.` |

`name` is not unique. A blank `addressLine2` is not an error.

**Caller:** any signed-in role may call this endpoint, including `requestor`, `area_admin`, `maintenance`, `system_admin`, and legacy `admin`. Role is not a reason to return `403`.

**Unauthorized:** `401` `{ "message": "Unauthorized! No token provided." }` when no token is sent. `401` `{ "message": "Unauthorized! Invalid or expired token." }` when the token is invalid or expired.

### List all – `GET /api/vehicle/destinations`

**Success** (`200`): a JSON array of every destination, ordered by `name` ascending, then `city` ascending, then `id` ascending. Each item has the same fields as the create success body. The array is not filtered by area.

**Caller and unauthorized:** the same caller rule and `401` messages as create.

### Update – `PUT /api/vehicle/destinations/:destinationId`

**Request body:** the same fields as create. A `userId` in the body is ignored. Validation matches create, including trim, length limits, uppercase `state`, optional `addressLine2`, and zip format.

**Success** (`200`): `{ "message": "Destination was updated successfully." }`

**Not found:** `404` `{ "message": "Destination with id=<destinationId> not found." }` A non-integer `:destinationId` uses this same `404`. The message keeps the raw path param.

**Caller:** a signed-in area admin, maintenance user, system admin, or legacy `admin` can update a destination. A `requestor` receives `403` `{ "message": "Requestors cannot update or delete destinations." }`. The destination is unchanged. Role is checked before the id, so a missing or non-integer id also returns `403` for a requestor.

### Delete – `DELETE /api/vehicle/destinations/:destinationId`

**Success** (`200`): `{ "message": "Destination was deleted successfully." }`

**Not found:** `404` `{ "message": "Destination with id=<destinationId> not found." }` A non-integer `:destinationId` uses this same `404`. The message keeps the raw path param.

**Caller:** a signed-in area admin, system admin, or legacy `admin` can delete a destination. A `requestor` receives `403` `{ "message": "Requestors cannot update or delete destinations." }`. A `maintenance` user receives `403` `{ "message": "Maintenance cannot delete destinations." }`. The destination is unchanged. Role is checked before the id, so a missing or non-integer id also returns `403` for a requestor and for a maintenance user. Check the requestor role first so a requestor still receives the requestor message.

---

## Screen Requirements

Route name `destinations`, path `/destination`, view `frontend/src/views/Destinations.vue`. Register that route in `frontend/src/router.js` before the catch-all redirect. Create, edit, and delete use dialogs on this view.

### [View: Destination list] — route name `destinations` (`/destination`)

**Shell**

- Page heading: **Destinations**.
- A system admin or an area admin who selects **Destination** in the navigation menu lands on `/destination` and sees every destination, **Add Destination**, **Edit**, and **Delete**. A maintenance user who selects **Destination** lands on `/destination` and sees every destination, **Add Destination**, and **Edit**, and does not see **Delete**. A requestor does not see **Destination** in the menu. A requestor who opens `/destination` sees the list and **Add Destination**, and does not see **Edit** or **Delete**.
- Primary action: **Add Destination**, shown for every signed-in role. The vehicle screen hides **Add Vehicle** unless the role is `admin` or `system_admin`. This screen does not.
- A visitor with no session who opens `/destination` is redirected to `/login`. A signed-in user who opens `/destination` stays on the destination list, including a `requestor` and an `area_admin`.

**Destination table**

- One row per destination, in API order (`name`, then `city`, then `id`).
- Each row shows the name, address line 1, city, state, and zip. Address line 2 is shown when it is present.
- After a successful create, the new destination appears in the table. After a successful update, the row shows the new data. After a successful delete, the row is gone.
- Row actions use the same icon buttons as the vehicle screen: a pencil (`mdi-pencil`, `aria-label` **Edit**) on every destination row for a system admin (including a legacy `admin` through `isSystemAdmin`), an area admin, and a maintenance user. A trash can (`mdi-delete`, `aria-label` **Delete**) on every destination row for a system admin and an area admin. A maintenance user does not see **Delete**. A requestor does not see **Edit** or **Delete**.

**Add Destination dialog**

- **Add Destination** opens the dialog. Title: **Add Destination**.
- Fields: **Name**, **Address Line 1**, **Address Line 2**, **City**, **State**, and **Zip**. Address Line 2 is optional. The other fields are required.
- A required field left blank shows **Required field** and does not call the API.
- Actions: **Close**, **Save**. **Close** does not call the API.
- On success: the new destination appears in the table and the screen shows the snackbar **`Destination added successfully!`**
- On API failure: an error snackbar shows the response `message`, and the dialog stays open.

**Edit Destination dialog**

- **Edit** on a row opens the edit destination dialog, filled with that destination.
- A system admin, an area admin, or a maintenance user can change any field. A requestor does not open this dialog.
- Actions: **Close**, **Update Destination**. **Close** does not call the API.
- On success: the table shows the new values.
- On API failure: an error snackbar shows the response `message`, and the row stays as it was.

**Delete dialog**

- **Delete** on a row opens a dialog titled **Delete this destination?** before `DELETE` is sent.
- Actions: **Cancel**, **Delete**.
- **Cancel** closes the dialog, does not call `DELETE`, and leaves the destination in the table.
- **Delete** removes that destination from the table.
- On API failure: an error snackbar shows the response `message`, and the destination stays in the table.

### App chrome

- This feature adds **Destination** to the existing `navItems` in `MenuBar.vue`, after **Vehicle**: `to: { name: "destinations" }`, roles `admin`, `system_admin`, `area_admin`, and `maintenance`. It does not add a second `MenuBar`. **Destination** is hidden for a requestor and when there is no session.

---

## Data Model Requirements

### `destinations` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING(100) | Required. Trimmed. Not unique. |
| `addressLine1` | STRING(100) | Required. Trimmed. |
| `addressLine2` | STRING(100) | Optional. Trimmed. Blank stored as `null`. |
| `city` | STRING(50) | Required. Trimmed. |
| `state` | STRING(2) | Required. Exactly two letters. Stored uppercase. |
| `zip` | STRING(10) | Required. Trimmed. Matches `^\d{5}(-\d{4})?$`. |

`backend/app/models/destination.model.js` uses the same factory shape as `vehicle.model.js`: `sequelize.define("destination", { ... }, { tableName: "destinations" })`. Register it as `db.destination` in `backend/app/models/index.js`. Leave timestamps on. Do not copy `timestamps: false` from `area.model.js`. The controller response includes `createdAt` and `updatedAt`.

### Associations

Do not add a `Reservation` association in this feature. `models/index.js` only associates models that are already registered, and `db.reservation` does not exist. This feature does not create the `reservations` table. Feature 6 adds `Reservation` belongsTo `Destination`.

---

## Acceptance Criteria (Gherkin)

### US-4.1 — View Destination List Page

#### Scenario: Requestor opens the destination page
- **Given** I am signed in as a requestor
- **When** I open `/destination`
- **Then** I am on `/destination`
- **And** the destination list is displayed
- **And** **Add Destination** is displayed
- **And** **Edit** and **Delete** are not displayed

#### Scenario: System admin navigates to the destination page
- **Given** I am signed in as a system admin
- **When** I select **Destination** from the navigation menu
- **Then** I am on `/destination`
- **And** the destination list is displayed
- **And** **Add Destination**, **Edit**, and **Delete** are displayed

#### Scenario: Area admin navigates to the destination page
- **Given** I am signed in as an area admin
- **When** I select **Destination** from the navigation menu
- **Then** I am on `/destination`
- **And** the destination list is displayed
- **And** **Add Destination**, **Edit**, and **Delete** are displayed

#### Scenario: Maintenance user navigates to the destination page
- **Given** I am signed in as a maintenance user
- **When** I select **Destination** from the navigation menu
- **Then** I am on `/destination`
- **And** the destination list is displayed
- **And** **Add Destination** and **Edit** are displayed
- **And** **Delete** is not displayed

#### Scenario: Destination list is sorted by name
- **Given** I am signed in as a requestor
- **And** destinations `Garvey Center` and `Chapel` exist
- **When** I send `GET /api/vehicle/destinations`
- **Then** the API returns `200`
- **And** `Chapel` comes before `Garvey Center`

#### Scenario: Destinations that share a name are sorted by city
- **Given** I am signed in as a requestor
- **And** a destination named `Field House` in `Yukon` exists
- **And** a destination named `Field House` in `Edmond` exists
- **When** I send `GET /api/vehicle/destinations`
- **Then** the API returns `200`
- **And** `Field House` in `Edmond` comes before `Field House` in `Yukon`

---

### US-4.2 — Create Destination

#### Scenario: Requestor creates a new destination
- **Given** I am signed in as a requestor on the destination page
- **When** I click **Add Destination**
- **Then** the **Add Destination** dialog opens
- **When** I enter name `Garvey Center`, address line 1 `2501 E Memorial Rd`, address line 2 `Suite 100`, city `Edmond`, state `OK`, and zip `73013`
- **And** I click **Save**
- **Then** `POST /api/vehicle/destinations` returns `201`
- **And** the saved destination has `name` `Garvey Center`, `city` `Edmond`, and `state` `OK`
- **And** the response has no `userId`
- **And** `Garvey Center` appears in the destination table
- **And** I see a snackbar **`Destination added successfully!`**

#### Scenario: Create without address line 2 stores null
- **Given** I am signed in as a requestor
- **When** I send `POST /api/vehicle/destinations` with name `Chapel`, address line 1 `2501 E Memorial Rd`, city `Edmond`, state `OK`, zip `73013`, and no `addressLine2`
- **Then** the API returns `201`
- **And** the saved destination has `addressLine2` `null`

#### Scenario: Create without name is rejected
- **Given** I am signed in as a requestor
- **When** I send `POST /api/vehicle/destinations` with a destination body whose `name` is missing
- **Then** the API returns `400` with `{ "message": "Name cannot be empty." }`
- **And** no destination is stored

#### Scenario: Create with a name that is too long is rejected
- **Given** I am signed in as a requestor
- **When** I send `POST /api/vehicle/destinations` with a valid destination body whose `name` is 101 characters
- **Then** the API returns `400` with `{ "message": "Name cannot exceed 100 characters." }`
- **And** no destination is stored

#### Scenario: Create with an invalid state is rejected
- **Given** I am signed in as a requestor
- **When** I send `POST /api/vehicle/destinations` with a valid destination body whose `state` is `Oklahoma`
- **Then** the API returns `400` with `{ "message": "State must be a 2-letter abbreviation." }`
- **And** no destination is stored

#### Scenario: Create with an invalid zip is rejected
- **Given** I am signed in as a requestor
- **When** I send `POST /api/vehicle/destinations` with a valid destination body whose `zip` is `7301`
- **Then** the API returns `400` with `{ "message": "Zip must be 5 digits or ZIP+4." }`
- **And** no destination is stored

#### Scenario: State is stored uppercase
- **Given** I am signed in as a requestor
- **When** I send `POST /api/vehicle/destinations` with a valid destination body whose `state` is `ok`
- **Then** the API returns `201`
- **And** the saved destination has `state` `OK`

#### Scenario: Zip plus four is accepted
- **Given** I am signed in as a requestor
- **When** I send `POST /api/vehicle/destinations` with a valid destination body whose `zip` is `73013-1234`
- **Then** the API returns `201`
- **And** the saved destination has `zip` `73013-1234`

#### Scenario: Two destinations may share a name
- **Given** I am signed in as a requestor
- **And** a destination named `Field House` in `Edmond` exists
- **When** I send `POST /api/vehicle/destinations` for `Field House` in `Yukon`
- **Then** the API returns `201`

#### Scenario: Supplied userId is ignored
- **Given** I am signed in as a requestor
- **When** I send `POST /api/vehicle/destinations` with a valid destination body and `"userId": 99`
- **Then** the API returns `201`
- **And** the response has no `userId`
- **And** the stored destination row has no `userId`

#### Scenario: Input strings are trimmed
- **Given** I am signed in as a requestor
- **When** I send `POST /api/vehicle/destinations` with a valid destination body whose `name` is ` Garvey Center `
- **Then** the API returns `201`
- **And** the saved destination has `name` `Garvey Center`

#### Scenario: Empty required field shows Required field
- **Given** I am signed in as a requestor
- **And** the **Add Destination** dialog is open
- **When** I leave **Name** blank
- **And** I click **Save**
- **Then** I see **Required field**
- **And** `POST /api/vehicle/destinations` is not called

---

### US-4.3 — Row Action Icons

#### Scenario: Row action buttons visible for a system admin
- **Given** I am signed in as a system admin on the destination page
- **And** at least one destination is listed
- **When** I view the destination table
- **Then** I see **Edit** and **Delete** on each destination row

#### Scenario: Requestor does not see Edit or Delete
- **Given** I am signed in as a requestor on the destination page
- **And** at least one destination is listed
- **When** I view the destination table
- **Then** I do not see **Edit** or **Delete**
- **And** I see **Add Destination**

#### Scenario: Maintenance user sees Edit and does not see Delete
- **Given** I am signed in as a maintenance user on the destination page
- **And** at least one destination is listed
- **When** I view the destination table
- **Then** I see **Edit** on each destination row
- **And** I do not see **Delete**

---

### US-4.4 — Edit Destination

#### Scenario: System admin updates destination details
- **Given** I am signed in as a system admin on the destination page
- **And** destination `Garvey Center` exists in `Edmond`
- **When** I click **Edit** on `Garvey Center`
- **Then** the edit destination dialog opens
- **When** I change the city to `Oklahoma City` and zip to `73101`
- **And** I click **Update Destination**
- **Then** `PUT /api/vehicle/destinations/:destinationId` returns `200` with `{ "message": "Destination was updated successfully." }`
- **And** the table shows `Garvey Center` in `Oklahoma City` with zip `73101`

#### Scenario: Update of an unknown destination is rejected
- **Given** I am signed in as a system admin
- **When** I send `PUT /api/vehicle/destinations/9999` with a valid destination body
- **Then** the API returns `404` with `{ "message": "Destination with id=9999 not found." }`

---

### US-4.5 — Delete Destination

#### Scenario: System admin deletes a destination with confirmation
- **Given** I am signed in as a system admin on the destination page
- **And** destination `Chapel` exists
- **When** I click **Delete** on `Chapel`
- **Then** a dialog titled **Delete this destination?** is displayed
- **When** I click **Delete**
- **Then** `DELETE /api/vehicle/destinations/:destinationId` returns `200` with `{ "message": "Destination was deleted successfully." }`
- **And** `Chapel` is not in the destination table

#### Scenario: Cancelled delete leaves the destination
- **Given** I am signed in as a system admin on the destination page
- **And** destination `Chapel` exists
- **And** the **Delete this destination?** dialog is open for `Chapel`
- **When** I click **Cancel**
- **Then** `DELETE` is not called
- **And** `Chapel` remains in the destination table

#### Scenario: Delete of an unknown destination is rejected
- **Given** I am signed in as a system admin
- **When** I send `DELETE /api/vehicle/destinations/9999`
- **Then** the API returns `404` with `{ "message": "Destination with id=9999 not found." }`

---

### US-4.6 — Role-Based Menu Access

#### Scenario: System admin sees Destination in the menu
- **Given** I am signed in as a system admin
- **When** I view the navigation menu
- **Then** I see **Destination**

#### Scenario: Area admin sees Destination in the menu
- **Given** I am signed in as an area admin
- **When** I view the navigation menu
- **Then** I see **Destination**

#### Scenario: Maintenance user sees Destination in the menu
- **Given** I am signed in as a maintenance user
- **When** I view the navigation menu
- **Then** I see **Destination**

#### Scenario: Requestor does not see Destination in the menu
- **Given** I am signed in as a requestor
- **When** I view the navigation menu
- **Then** I do not see **Destination**

#### Scenario: Signed-out menu does not show Destination
- **Given** I am not signed in
- **When** I view the navigation menu
- **Then** I do not see **Destination**

---

### US-4.7 — Role-Based Access Control

#### Scenario: Requestor can list and create a destination but cannot update or delete
- **Given** I am signed in as a requestor
- **When** I open `/destination`
- **Then** I stay on `/destination`
- **When** I send `POST /api/vehicle/destinations` with a valid destination body
- **Then** the API returns `201`
- **When** I send `GET /api/vehicle/destinations`
- **Then** the API returns `200`
- **And** the created destination is in the list
- **When** I send `PUT /api/vehicle/destinations/1` with a valid destination body
- **Then** the API returns `403` with `{ "message": "Requestors cannot update or delete destinations." }`
- **And** the destination is unchanged
- **When** I send `DELETE /api/vehicle/destinations/1`
- **Then** the API returns `403` with `{ "message": "Requestors cannot update or delete destinations." }`
- **And** the destination remains in the list

#### Scenario: Area admin can list, create, update, and delete a destination
- **Given** I am signed in as an area admin
- **When** I open `/destination`
- **Then** I stay on `/destination`
- **When** I send `POST /api/vehicle/destinations` with a valid destination body
- **Then** the API returns `201`
- **When** I send `GET /api/vehicle/destinations`
- **Then** the API returns `200`
- **And** the created destination is in the list
- **When** I send `PUT /api/vehicle/destinations/1` with a valid destination body
- **Then** the API returns `200` with `{ "message": "Destination was updated successfully." }`
- **When** I send `DELETE /api/vehicle/destinations/1`
- **Then** the API returns `200` with `{ "message": "Destination was deleted successfully." }`

#### Scenario: Maintenance user can list, create, and update a destination but cannot delete
- **Given** I am signed in as a maintenance user
- **When** I open `/destination`
- **Then** I stay on `/destination`
- **When** I send `POST /api/vehicle/destinations` with a valid destination body
- **Then** the API returns `201`
- **When** I send `GET /api/vehicle/destinations`
- **Then** the API returns `200`
- **And** the created destination is in the list
- **When** I send `PUT /api/vehicle/destinations/1` with a valid destination body
- **Then** the API returns `200` with `{ "message": "Destination was updated successfully." }`
- **When** I send `DELETE /api/vehicle/destinations/1`
- **Then** the API returns `403` with `{ "message": "Maintenance cannot delete destinations." }`
- **And** the destination remains in the list

#### Scenario: System admin can list, create, update, and delete a destination
- **Given** I am signed in as a system admin
- **When** I open `/destination`
- **Then** I stay on `/destination`
- **When** I send `POST /api/vehicle/destinations` with a valid destination body
- **Then** the API returns `201`
- **When** I send `GET /api/vehicle/destinations`
- **Then** the API returns `200`
- **And** the created destination is in the list
- **When** I send `PUT /api/vehicle/destinations/1` with a valid destination body
- **Then** the API returns `200` with `{ "message": "Destination was updated successfully." }`
- **When** I send `DELETE /api/vehicle/destinations/1`
- **Then** the API returns `200` with `{ "message": "Destination was deleted successfully." }`

#### Scenario: Legacy admin can update and delete a destination
- **Given** I am signed in with stored role `admin`
- **And** destination id `1` exists
- **When** I send `PUT /api/vehicle/destinations/1` with a valid destination body
- **Then** the API returns `200` with `{ "message": "Destination was updated successfully." }`
- **When** I send `DELETE /api/vehicle/destinations/1`
- **Then** the API returns `200` with `{ "message": "Destination was deleted successfully." }`

#### Scenario: A requestor's destination is in the shared list
- **Given** a requestor has created destination `Chapel`
- **When** I sign in as a system admin and send `GET /api/vehicle/destinations`
- **Then** the API returns `200`
- **And** `Chapel` is in the list

#### Scenario: Unauthenticated visit to the destination page redirects to login
- **Given** I am not signed in
- **When** I open `/destination`
- **Then** I am redirected to `/login`
- **When** I send `GET /api/vehicle/destinations` with no token
- **Then** the API returns `401` with `{ "message": "Unauthorized! No token provided." }`

#### Scenario: Invalid token is rejected
- **Given** I send `GET /api/vehicle/destinations` with an invalid token
- **Then** the API returns `401` with `{ "message": "Unauthorized! Invalid or expired token." }`

---

## Test Coverage Map

Each Gherkin scenario above maps to at least one automated test. A requestor can list and create destinations and cannot update or delete them. A maintenance user can list, create, and update destinations and cannot delete them. A system admin and an area admin can list, create, update, and delete destinations. A visitor with no session cannot.

| Story | Scenario | Test file | Test name |
| ----- | -------- | --------- | --------- |
| US-4.1 | Requestor opens the destination page | `frontend/tests/DestinationList.test.js` | `Requestor opens the destination page` |
| US-4.1 | System admin navigates to the destination page | `frontend/tests/DestinationList.test.js` | `System admin navigates to the destination page` |
| US-4.1 | Area admin navigates to the destination page | `frontend/tests/DestinationList.test.js` | `Area admin navigates to the destination page` |
| US-4.1 | Maintenance user navigates to the destination page | `frontend/tests/DestinationList.test.js` | `Maintenance user navigates to the destination page` |
| US-4.1 | Destination list is sorted by name | `backend/tests/destinations.test.js` | `Destination list is sorted by name` |
| US-4.1 | Destinations that share a name are sorted by city | `backend/tests/destinations.test.js` | `Destinations that share a name are sorted by city` |
| US-4.2 | Requestor creates a new destination | `backend/tests/destinations.test.js`, `frontend/tests/DestinationList.test.js` | `Requestor creates a new destination` |
| US-4.2 | Create without address line 2 stores null | `backend/tests/destinations.test.js` | `Create without address line 2 stores null` |
| US-4.2 | Create without name is rejected | `backend/tests/destinations.test.js` | `Create without name is rejected` |
| US-4.2 | Create with a name that is too long is rejected | `backend/tests/destinations.test.js` | `Create with a name that is too long is rejected` |
| US-4.2 | Create with an invalid state is rejected | `backend/tests/destinations.test.js` | `Create with an invalid state is rejected` |
| US-4.2 | Create with an invalid zip is rejected | `backend/tests/destinations.test.js` | `Create with an invalid zip is rejected` |
| US-4.2 | State is stored uppercase | `backend/tests/destinations.test.js` | `State is stored uppercase` |
| US-4.2 | Zip plus four is accepted | `backend/tests/destinations.test.js` | `Zip plus four is accepted` |
| US-4.2 | Two destinations may share a name | `backend/tests/destinations.test.js` | `Two destinations may share a name` |
| US-4.2 | Supplied userId is ignored | `backend/tests/destinations.test.js` | `Supplied userId is ignored` |
| US-4.2 | Input strings are trimmed | `backend/tests/destinations.test.js` | `Input strings are trimmed` |
| US-4.2 | Empty required field shows Required field | `frontend/tests/DestinationList.test.js` | `Empty required field shows Required field` |
| US-4.3 | Row action buttons visible for a system admin | `frontend/tests/DestinationList.test.js` | `Row action buttons visible for a system admin` |
| US-4.3 | Requestor does not see Edit or Delete | `frontend/tests/DestinationList.test.js` | `Requestor does not see Edit or Delete` |
| US-4.3 | Maintenance user sees Edit and does not see Delete | `frontend/tests/DestinationList.test.js` | `Maintenance user sees Edit and does not see Delete` |
| US-4.4 | System admin updates destination details | `backend/tests/destinations.test.js`, `frontend/tests/DestinationList.test.js` | `System admin updates destination details` |
| US-4.4 | Update of an unknown destination is rejected | `backend/tests/destinations.test.js` | `Update of an unknown destination is rejected` |
| US-4.5 | System admin deletes a destination with confirmation | `backend/tests/destinations.test.js`, `frontend/tests/DestinationList.test.js` | `System admin deletes a destination with confirmation` |
| US-4.5 | Cancelled delete leaves the destination | `frontend/tests/DestinationList.test.js` | `Cancelled delete leaves the destination` |
| US-4.5 | Delete of an unknown destination is rejected | `backend/tests/destinations.test.js` | `Delete of an unknown destination is rejected` |
| US-4.6 | System admin sees Destination in the menu | `frontend/tests/MenuBar.test.js` | `System admin sees Destination in the menu` |
| US-4.6 | Area admin sees Destination in the menu | `frontend/tests/MenuBar.test.js` | `Area admin sees Destination in the menu` |
| US-4.6 | Maintenance user sees Destination in the menu | `frontend/tests/MenuBar.test.js` | `Maintenance user sees Destination in the menu` |
| US-4.6 | Requestor does not see Destination in the menu | `frontend/tests/MenuBar.test.js` | `Requestor does not see Destination in the menu` |
| US-4.6 | Signed-out menu does not show Destination | `frontend/tests/MenuBar.test.js` | `Signed-out menu does not show Destination` |
| US-4.7 | Requestor can list and create a destination but cannot update or delete | `backend/tests/destinations.test.js`, `frontend/tests/router.test.js` | `Requestor can list and create a destination but cannot update or delete` |
| US-4.7 | Area admin can list, create, update, and delete a destination | `backend/tests/destinations.test.js`, `frontend/tests/router.test.js` | `Area admin can list, create, update, and delete a destination` |
| US-4.7 | Maintenance user can list, create, and update a destination but cannot delete | `backend/tests/destinations.test.js`, `frontend/tests/router.test.js` | `Maintenance user can list, create, and update a destination but cannot delete` |
| US-4.7 | System admin can list, create, update, and delete a destination | `backend/tests/destinations.test.js`, `frontend/tests/router.test.js` | `System admin can list, create, update, and delete a destination` |
| US-4.7 | Legacy admin can update and delete a destination | `backend/tests/destinations.test.js` | `Legacy admin can update and delete a destination` |
| US-4.7 | A requestor's destination is in the shared list | `backend/tests/destinations.test.js` | `A requestor's destination is in the shared list` |
| US-4.7 | Unauthenticated visit to the destination page redirects to login | `backend/tests/destinations.test.js`, `frontend/tests/router.test.js` | `Unauthenticated visit to the destination page redirects to login` |
| US-4.7 | Invalid token is rejected | `backend/tests/destinations.test.js` | `Invalid token is rejected` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 4 from @features/feature-4-destination-management.md on branch `feature/4-destination-management`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

- [x] Backend and frontend implemented per this spec (**FR-00N** satisfied)
- [x] **Success Criteria (SC-00N)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Vehicle CRUD / **Vehicle** nav item ([Feature 2](feature-2-vehicle-management.md))
- Driver CRUD / **Driver** nav item ([Feature 3](feature-3-driver-management.md))
- Area CRUD / **Area** nav item ([Feature 5](feature-5-area-management.md))
- Reservation CRUD / **Reservation** nav item ([Feature 6](feature-6-reservation-management.md))
- Email ([Feature 7](feature-7-email-management.md))
- Admin page ([Feature 8](feature-8-admin-page.md))
- Geocoding, maps, and address verification beyond the field rules in this spec
- A list of valid US state abbreviations

---

## Delivered to later features

- A destination is a catalog row (`name`, `addressLine1`, `addressLine2`, `city`, `state`, `zip`) with no `userId`. A requestor lists and creates destinations and cannot update or delete them. A maintenance user lists, creates, and updates destinations and cannot delete them. A system admin, an area admin, and a legacy `admin` list, create, update, and delete every destination. A destination added by a requestor is in the shared list.
- **Destination** in `MenuBar` routes a system admin, a legacy `admin`, an area admin, and a maintenance user to `/destination`. The `navItems` entry uses `to: { name: "destinations" }` and roles `admin`, `system_admin`, `area_admin`, and `maintenance`. A requestor does not see **Destination**. This feature does not add a second `MenuBar`.
- Feature 6 adds **Reservation** and owns reservation rows that reference `destinationId`.
