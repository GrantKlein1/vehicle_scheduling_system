# Feature: Driver Management

**Feature ID:** 3
**Branch pattern:** `feature/3-driver-management`
**Status:** Ready
**Created:** 2026-10-23
**Input:** A signed-in system admin or area admin maintains a list of drivers on a single view via dialogs.
**Depends on:** [Feature 1 — User Authentication](feature-1-user-auth.md)

A system admin is `system_admin`. A legacy `admin` session is a system admin. An area admin is `area_admin`, assigned to one area, and can list, create, update, and delete every driver. See [ADR-0001](../docs/adr/0001-system-and-area-admins.md).

---

## User Stories

### US-3.1: View Driver List Page
**As a** signed-in system admin, area admin, and maintenance
**I want to** select "Driver" from the navigation menu
**So that** I can access the driver management screen
 
**Priority:** P1
**Independent test:** Verify clicking "Driver" in MenuBar redirects to /driver view
**Acceptance scenarios:** See ### US-3.1 under Acceptance Criteria

### US-3.2: Create Driver
**As a** signed-in system admin or area admin
**I want to** create a new driver using a modal dialog
**So that** it is added to the list of valid drivers

**Priority:** P1
**Independent test:** Open modal, submit valid driver details, and check if it appears in the table
**Acceptance scenarios:** see ### US-3.2 under Acceptance Criteria


### US-3.3: Row Action Icons
**As a** signed-in system admin or area admin
**I want to** see Edit and Delete icons on each row in the driver table
**So that** I can trigger actions directly for a specific driver

**Priority:** P1
**Independent test:** Verify row action buttons are rendered for every driver entry
**Acceptance scenarios:** see ### US-3.3 under Acceptance Criteria

### US-3.4: Edit Driver
**As a** signed-in system admin or area admin
**I want** to update an existing driver's details
**So that** the driver information remains accurate

**Priority:** P2
**Independent test:** Edit the driver license expiration date and approved date, and confirm the list shows the new date and the status derived from the approved date
**Acceptance scenarios:** see ### US-3.4 under Acceptance Criteria

### US-3.5: Delete Driver
**As a** signed-in system admin or area admin
**I want** to delete a driver after confirmation
**So that** obsolete drivers are removed from the system

**Priority:** P2
**Independent test:** Delete a driver via confirmation dialog and verify its removal
**Acceptance scenarios:** see ### US-3.5 under Acceptance Criteria

### US-3.6: Role-Based Menu Access
**As the** the application
**I want** to show **Driver** to a system admin, an area admin, and a maintenance user
**So that** a requestor does not open the driver screen from the menu

**Priority:** P1
**Independent test:** Sign in as an area admin and confirm **Driver** is in the menu. Sign in as a requestor and confirm it is not.
**Acceptance scenarios:** see ### US-3.6 under Acceptance Criteria

### US-3.7: Role-Based Access Control
**As the** the application
**I want** to restrict driver list changes to a system admin or an area admin
**So that** a maintenance user and a requestor cannot change drivers

**Priority:** P1
**Independent test:** Sign in as a maintenance user and as a requestor and confirm the forbidden calls return 403
**Acceptance scenarios:** see ### US-3.7 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001:** Every driver endpoint MUST require authentication (`authenticate` middleware).
- **FR-002:** An authenticated system admin or `area_admin` MUST be able to list drivers, create a driver, update a driver, and delete a driver. `system_admin` and a legacy `admin` are system admins (`isSystemAdmin`). An `area_admin` passes `isAnyAdmin`.
- **FR-003:** An authenticated `maintenance` user or `requestor` MUST be able to list every driver. An `area_admin` list is the same full list and MUST NOT be limited to that admin's area. `POST`, `PUT`, and `DELETE` MUST succeed for a system admin or an `area_admin`.
- **FR-004:** A `maintenance` or `requestor` user who calls `POST`, `PUT`, or `DELETE` MUST receive HTTP `403` with `{ "message": "Admin role required." }`.
- **FR-005:** A driver MUST NOT have a `userId`. A driver is a catalog row, not a user account. A `userId` in the request body MUST be ignored and MUST NOT be stored.
- **FR-006:** Every input string MUST be trimmed. A required string that is missing, empty, or whitespace-only MUST be rejected with HTTP `400`.
- **FR-007:** A request with no token MUST return HTTP `401` with `{ "message": "Unauthorized! No token provided." }`. A request with an invalid or expired token MUST return HTTP `401` with `{ "message": "Unauthorized! Invalid or expired token." }`. A visitor with no session who opens `/driver` MUST be redirected to `/login`. A signed-in `requestor` who opens `/driver` MUST be redirected to home. A signed-in `area_admin` who opens `/driver` MUST stay on the driver list.
- **FR-008:** `GET /api/driver/drivers` MUST return every driver, ordered by `lastName` ascending, then `firstName` ascending, then `id` ascending.
- **FR-009:** `firstName`, `lastName`, `driverLicenseNumber`, `insuranceProvider`, and `insuranceNumber` MUST be required strings. `lastName` MUST be at most 50 characters. A missing or blank value MUST return HTTP `400`. A `lastName` longer than 50 characters MUST return HTTP `400` with `{ "message": "Last Name cannot exceed 50 characters." }`. `lastName` is not unique. `status` MUST be `valid` or `expired` and MUST be set from `approvedDate`, not from the request. It is `valid` before the calendar date one year after `approvedDate`, and `expired` on that anniversary and after. A `status` in the body MUST be ignored. Listing drivers, and startup, MUST store the current status when a saved row is out of date.
- **FR-010:** `driverLicenseExpDate` and `approvedDate` MUST be required real calendar dates in `YYYY-MM-DD` form. A missing or invalid date MUST return HTTP `400`.
- **FR-011:** `POST /api/driver/drivers` MUST return HTTP `201` and the saved driver, including `id`, and MUST NOT include `userId`. `PUT /api/driver/drivers/:driverId` MUST return HTTP `200` with `{ "message": "Driver was updated successfully." }`. `DELETE /api/driver/drivers/:driverId` MUST return HTTP `200` with `{ "message": "Driver was deleted successfully." }`. Update and delete of an id that does not exist MUST return HTTP `404` with `{ "message": "Driver with id=<driverId> not found." }`.
- **FR-012:** This feature MUST add **Driver** to the existing `MenuBar` for a system admin, an `area_admin`, and `maintenance`, with path `/driver`. Allowed roles are `admin`, `system_admin`, `area_admin`, and `maintenance`. It MUST NOT create a second `MenuBar`. **Driver** MUST be hidden when there is no session and hidden for `requestor`.
- **FR-013:** Create, edit, and delete MUST happen in dialogs on `/driver`. **Add Driver** opens the create dialog. Each driver row MUST show **Edit** and **Delete** for a system admin or an `area_admin`, and MUST NOT show them for `maintenance`. A required field left blank MUST show **Required field** and MUST NOT call the API. Delete MUST ask for confirmation before `DELETE` is sent. Cancel MUST leave the driver in the list.
- **FR-014:** After a successful create, the new driver MUST appear in the table and the screen MUST show the snackbar **Driver added successfully!** After a successful update or delete, the table MUST show the new data or the removal.

## Assumptions

- Feature 1 user authentication is merged and active on `dev`. Roles are `requestor`, `system_admin`, `area_admin`, and `maintenance`. A legacy `admin` is a system admin. An `area_admin` is assigned to one area and can list, create, update, and delete every driver.
- The `MenuBar` component exists and supports conditional rendering based on user role.
- Drivers represent a list rather than user-based resources.
- Driver interactions use modal dialogs on a single view (`Drivers.vue`) rather than split-scren views.
- Feature 6 (Reservation) will associate `driverId` with reservations at a larger stage.

---

## Edge Cases

- A required field left blank on the form shows **Required field** and does not call the API.
- A required string that is missing, empty, or whitespace-only: HTTP `400`. No driver is stored. Input strings are trimmed before they are stored.
- `lastName` longer than 50 characters: HTTP `400` with `"Last Name cannot exceed 50 characters."`. `lastName` is not unique, so two drivers may share one.
- `driverLicenseExpDate` or `approvedDate` missing or not a real calendar date in `YYYY-MM-DD` form, such as `2030-13-40`: HTTP `400`. No driver is stored.
- A `status` sent on create or update, including a value such as `suspended`, is ignored. The stored status comes from `approvedDate`. The driver form does not ask for a status.
- Update or delete of an id that does not exist: HTTP `404` with `"Driver with id=<driverId> not found."`.
- A `maintenance` create, update, or delete of a driver: HTTP `403` with `"Admin role required."`. That user can still list every driver.
- A `requestor` create, update, or delete of a driver: HTTP `403` with `"Admin role required."`. That user can still list every driver.
- No session on `/driver`: redirect to `/login`. A driver API call with no token: HTTP `401` with `"Unauthorized! No token provided."`. An invalid or expired token: HTTP `401` with `"Unauthorized! Invalid or expired token."`.
- A signed-in `requestor` opening `/driver`: redirect to home. **Driver** is not in that user's `MenuBar`.
- An `area_admin` list is every driver, not only drivers for that admin's area. Create, update, and delete succeed for that role.
- Cancelling a delete leaves the driver in the list and does not call `DELETE`.
- A `userId` sent with a create or update is dropped. The stored row and the response have no `userId`.

## Success criteria

- **SC-001**: Every Gherkin scenario is covered by automated unit/integration tests.
- **SC-002**: A system admin or an area admin can perform complete CRUD operations on drivers within a single screen using dialogs.
- **SC-003**: A maintenance user and a requestor can list every driver and cannot create, update, or delete one.
- **SC-004**: All test suites (`npm test`) pass completely without failiures.

## Data Ownership & Isolation

Drivers belong to a list and are not tied to individual user accounts (`userId` is not present in the driver schema). A system admin or an area admin manages every list entry. A maintenance user and a requestor have read-only access to every driver.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /vehicle/drivers` returns all drivers to an authenticated system admin, `area_admin`, `maintenance` user, or `requestor`. The rows are not filtered by the caller's area or role. |
| **Write scope** | `PUT` / `DELETE` `/vehicle/drivers/:driverId` succeed for a system admin or an `area_admin`. A `maintenance` user or `requestor` receives `403`. |
| **Create scope** | `POST /vehicle/drivers` succeeds for a system admin or an `area_admin`. Driver data is saved without a `userId` owner field. |
| **Cross-user access** | Any system admin or area admin can update or delete any driver in the list. No `userId` validation exists for driver rows. |
| **UI scope** | `Driver.vue` view and `Driver` option in `MenuBar` render for a system admin, an `area_admin`, or a `maintenance` user. **Add Driver**, **Edit**, and **Delete** render for a system admin or an `area_admin`. |
| **Implementation** | `authenticate` middleware in `backend/app/routes/` verifies session. Mutations (`POST`, `PUT`, `DELETE`) use `isAnyAdmin`. List allows any authenticated role. |

---

## Key Entities

- **Driver**: one shared catalog row with no `userId`. It has a first name, last name, driver license number, driver license expiration date, insurance provider, insurance number, approved date, and status. Status is `valid` or `expired`. Last name is at most 50 characters and is not unique. The two dates are real calendar dates in `YYYY-MM-DD` form.
- **User / Session**: required for `/driver` and every driver endpoint. Roles are `requestor`, `system_admin`, `area_admin`, and `maintenance` (Feature 1). A system admin or an area admin creates, updates, and deletes every driver. A maintenance user or a requestor reads every driver and cannot change drivers.
- **Reservation**: a later trip row that will reference `driverId` (Feature 6). This feature does not create reservation rows.

---

## API Requirements

Mount prefix: `/driver` (see `backend/server.js`). Flat JSON; errors `{ "message": "..." }`. Do not wrap in `{ success, data }`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/vehicle/drivers` | system admin, `area_admin` | Create a driver |
| `GET` | `/vehicle/drivers` | any authenticated role | List all drivers, sorted by `lastName` ascending |
| `PUT` | `/vehicle/drivers/:driverId` | system admin, `area_admin` | Update a driver |
| `DELETE` | `/vehicle/drivers/:driverId` | system admin, `area_admin` | Delete a driver |

### Create – `POST /vehicle/drivers`

Acceptance criteria call this `POST /api/driver/drivers`.

**Request body:**

```json
{
  "firstName": "Jaxen",
  "lastName": "Roden",
  "driverLicenseNumber": "11111111",
  "driverLicenseExpDate": "2030-09-20",
  "insuranceProvider": "root",
  "insuranceNumber": "11111111",
  "approvedDate": "2026-10-28"
}
```

Every string is trimmed before it is stored. A `userId` property in the body is ignored and is not stored.

**Success** (`201`): the saved driver, including `id` and the fields above. The response does not include `userId`.

**Errors (`400`):**

| Condition | Result |
|-----------|--------|
| A required string is missing, empty, or whitespace-only | HTTP `400`. No driver is stored. |
| `lastName` is longer than 50 characters | HTTP `400` with `{ "message": "Last Name cannot exceed 50 characters." }`. No driver is stored. |
| `driverLicenseExpDate` or `approvedDate` is missing or is not a real calendar date in `YYYY-MM-DD` form | HTTP `400`. No driver is stored. |
| `status` is included in the body | The value is ignored. Status is stored from `approvedDate`. |

`lastName` is not unique.

**Forbidden:** `403` `{ "message": "Admin role required." }` when the caller is `maintenance` or `requestor`.

**Unauthorized:** `401` `{ "message": "Unauthorized! No token provided." }` when no token is sent. `401` `{ "message": "Unauthorized! Invalid or expired token." }` when the token is invalid or expired.

### List all – `GET /api/driver/drivers`

**Success** (`200`): a JSON array of every driver, ordered by `lastName` ascending, then `firstName` ascending, then `id` ascending. Each item has the same fields as the create success body. Any authenticated role may call this, including a `requestor`. The array is not filtered by the caller's area or role.

**Unauthorized:** the same `401` messages as create.

### Update – `PUT /api/driver/drivers/:driverId`

**Request body:** the same fields as create. A `userId` or `status` in the body is ignored. Validation matches create, including trim, the 50-character `lastName` limit, and real `YYYY-MM-DD` dates. `status` is recalculated from `approvedDate`.

**Success** (`200`): `{ "message": "Driver was updated successfully." }`

**Not found:** `404` `{ "message": "Driver with id=<driverId> not found." }`

**Forbidden:** `403` `{ "message": "Admin role required." }` when the caller is `maintenance` or `requestor`. The driver list is unchanged.

### Delete – `DELETE /api/driver/drivers/:driverId`

**Success** (`200`): `{ "message": "Driver was deleted successfully." }`

**Not found:** `404` `{ "message": "Driver with id=<driverId> not found." }`

**Forbidden:** `403` `{ "message": "Admin role required." }` when the caller is `maintenance` or `requestor`. The driver list is unchanged.

---

## Screen Requirements

Route name `drivers`, path `/driver`. One view, `Drivers.vue`. Create, edit, and delete use dialogs on this view.

### [View: Driver list] — route name `drivers` (`/driver`)

**Shell**

- A system admin, an `area_admin`, or a `maintenance` user who selects **Driver** in the navigation menu lands on `/driver` and sees every driver.
- System admin or area admin primary action: **Add Driver**. A maintenance user does not see **Add Driver**.
- A visitor with no session who opens `/driver` is redirected to `/login`. A signed-in `requestor` who opens `/driver` is redirected to home.

**Driver table**

- One row per driver, in API order (`lastName`, then `firstName`, then `id`).
- Each row shows the driver name, the driver license expiration date, and the status.
- After a successful create, the new driver appears in the table. After a successful update, the row shows the new data. After a successful delete, the row is gone.
- System admin or area admin row actions: **Edit** and **Delete** on every driver row. A maintenance user does not see **Edit** or **Delete**.

**Add Driver dialog**

- **Add Driver** opens the dialog. Title: **Add Driver**.
- Fields: **First Name**, **Last Name**, **Driver License Number**, **Driver License Expiration Date**, **Insurance Provider**, **Insurance Number**, and **Approved Date**. The two date fields are dates. Status is not a field. The dialog says status is set from the approved date and becomes expired one year later.
- A required field left blank shows **Required field** and does not call the API.
- Action: **Save**.
- On success: the new driver appears in the table and the screen shows the snackbar **`Driver added successfully!`**

**Edit Driver dialog**

- **Edit** on a row opens the edit driver dialog, filled with that driver.
- The system admin or area admin can change the driver license expiration date and the approved date. Status is not edited. Changing the approved date changes the stored status to match that date.
- Action: **Update Driver**.
- On success: the table shows the new expiration date and status.

**Delete dialog**

- **Delete** on a row opens a confirmation dialog before `DELETE` is sent.
- **Cancel** closes the dialog, does not call `DELETE`, and leaves the driver in the table.
- Confirming the deletion removes that driver from the table.

### App chrome

- MenuBar **Drivers** already routes here (Feature 1). This feature does not add nav items.

---

## Data Model Requirements

### `drivers` table

| Field                  | Type       | Rules          |
|------------------------|------------|----------------|
| `id`                   | INTEGER PK | Auto-increment |
| `firstName`            | STRING     | Required       |
| `lastName`             | STRING     | Required       |
| `driverLicenseNumber`  | STRING     | Required       |
| `driverLicenseExpDate` | DATE       | Required       |
| `insuranceProvider`    | STRING     | Requried       |
| `insuranceNumber`      | STRING     | Requried       |
| `approvedDate`         | DATE       | Required       |
| `status`               | STRING     | Required. `valid` or `expired`, derived from `approvedDate` |

### Associations

- `Driver` hasMany `Reservations` – `onDelete: CASCADE` (child CRUD is Feature 6)
- `Reservations` belongsTo `Driver`

---

## Acceptance Criteria (Gherkin)

### US-3.1 — View Driver List Page

#### Scenario: Signed-in system admin navigates to the driver page
- **Given** I am signed in as a system admin
- **When** I select **Driver** from the navigation menu
- **Then** I am on `/driver`
- **And** the driver list is displayed
- **And** **Add Driver** is displayed

#### Scenario: Signed-in maintenance user navigates to the driver page
- **Given** I am signed in as a maintenance user
- **When** I select **Driver** from the navigation menu
- **Then** I am on `/driver`
- **And** the driver list is displayed
- **And** **Add Driver** is not displayed

#### Scenario: Signed-in area admin navigates to the driver page
- **Given** I am signed in as an area admin
- **When** I select **Driver** from the navigation menu
- **Then** I am on `/driver`
- **And** the driver list is displayed
- **And** **Add Driver** is displayed

#### Scenario: Area admin sees every driver
- **Given** I am signed in as an area admin assigned to `Athletics`
- **And** drivers `Jaxen Roden` and `Amy Adams` exist
- **When** I send `GET /api/driver/drivers`
- **Then** the API returns `200`
- **And** both `Jaxen Roden` and `Amy Adams` are returned

#### Scenario: Driver list is sorted by last name
- **Given** I am signed in as a system admin
- **And** drivers `Jaxen Roden` and `Amy Adams` exist
- **When** I send `GET /api/driver/drivers`
- **Then** the API returns `200`
- **And** `Amy Adams` comes before `Jaxen Roden`

#### Scenario: Drivers who share a last name are sorted by first name
- **Given** I am signed in as a system admin
- **And** drivers `Jaxen Roden` and `Amy Roden` exist
- **When** I send `GET /api/driver/drivers`
- **Then** the API returns `200`
- **And** `Amy Roden` comes before `Jaxen Roden`

---

### US-3.2 — Create Driver

#### Scenario: Signed-in system admin creates a new driver
- **Given** I am signed in as a system admin on the driver page
- **When** I click **Add Driver**
- **Then** the **Add Driver** dialog opens
- **When** I enter first name `Jaxen`, last name `Roden`, driver license number `11111111`, driver license expiration date `2030-09-20`, insurance provider `root`, insurance number `11111111`, and approved date `2026-10-28`
- **And** I click **Save**
- **Then** `POST /api/driver/drivers` returns `201`
- **And** the saved driver has `lastName` `Roden` and `status` `valid`
- **And** the response has no `userId`
- **And** `Jaxen Roden` appears in the driver table with status `valid`
- **And** I see a snackbar **`Driver added successfully!`**

#### Scenario: Signed-in area admin creates a new driver
- **Given** I am signed in as an area admin on the driver page
- **When** I click **Add Driver**
- **Then** the **Add Driver** dialog opens
- **When** I enter first name `Amy`, last name `Adams`, driver license number `22222222`, driver license expiration date `2030-09-20`, insurance provider `root`, insurance number `22222222`, and approved date `2026-10-28`
- **And** I click **Save**
- **Then** `POST /api/driver/drivers` returns `201`
- **And** the saved driver has `lastName` `Adams` and `status` `valid`
- **And** the response has no `userId`
- **And** `Amy Adams` appears in the driver table with status `valid`
- **And** I see a snackbar **`Driver added successfully!`**

#### Scenario: Create without last name is rejected
- **Given** I am signed in as a system admin
- **When** I send `POST /api/driver/drivers` with a driver body whose `lastName` is missing
- **Then** the API returns `400`
- **And** no driver is stored

#### Scenario: Create with a last name that is too long is rejected
- **Given** I am signed in as a system admin
- **When** I send `POST /api/driver/drivers` with a valid driver body whose `lastName` is 51 characters
- **Then** the API returns `400` with `{ "message": "Last Name cannot exceed 50 characters." }`
- **And** no driver is stored

#### Scenario: Create with an invalid expiration date is rejected
- **Given** I am signed in as a system admin
- **When** I send `POST /api/driver/drivers` with a valid driver body whose `driverLicenseExpDate` is `2030-13-40`
- **Then** the API returns `400`
- **And** no driver is stored

#### Scenario: Supplied status is ignored
- **Given** I am signed in as a system admin
- **When** I send `POST /api/driver/drivers` with a valid driver body whose `status` is `suspended` and whose `approvedDate` is today
- **Then** the API returns `201`
- **And** the saved driver has `status` `valid`

#### Scenario: Driver status expires one year after the approved date
- **Given** I am signed in as a system admin
- **When** I send `POST /api/driver/drivers` with a valid driver body whose `approvedDate` is two years ago
- **Then** the API returns `201`
- **And** the saved driver has `status` `expired`
- **When** I send `POST /api/driver/drivers` with a valid driver body whose `approvedDate` is today and whose `status` is `expired`
- **Then** the API returns `201`
- **And** the saved driver has `status` `valid`

#### Scenario: Listing drivers refreshes a status that has reached its anniversary
- **Given** I am signed in as a system admin
- **And** a driver exists with `status` `valid` and an `approvedDate` two years ago
- **When** I send `GET /api/driver/drivers`
- **Then** the API returns `200`
- **And** that driver has `status` `expired`

#### Scenario: Two drivers may share a last name
- **Given** I am signed in as a system admin
- **And** a driver `Jaxen Roden` exists
- **When** I send `POST /api/driver/drivers` for `Amy Roden` with a different `driverLicenseNumber`
- **Then** the API returns `201`

#### Scenario: Supplied userId is ignored
- **Given** I am signed in as a system admin
- **When** I send `POST /api/driver/drivers` with a valid driver body and `"userId": 99`
- **Then** the API returns `201`
- **And** the response has no `userId`
- **And** the stored driver row has no `userId`

#### Scenario: Input strings are trimmed
- **Given** I am signed in as a system admin
- **When** I send `POST /api/driver/drivers` with a valid driver body whose `firstName` is ` Jaxen `
- **Then** the API returns `201`
- **And** the saved driver has `firstName` `Jaxen`

#### Scenario: Empty required field shows Required field
- **Given** I am signed in as a system admin
- **And** the **Add Driver** dialog is open
- **When** I leave **Last Name** blank
- **And** I click **Save**
- **Then** I see **Required field**
- **And** `POST /api/driver/drivers` is not called

---

### US-3.3 — Row Action Icons

#### Scenario: Row action buttons visible for system admin
- **Given** I am signed in as a system admin on the driver page
- **And** at least one driver is listed
- **When** I view the driver table
- **Then** I see **Edit** and **Delete** on each driver row

#### Scenario: Maintenance row has no edit or delete
- **Given** I am signed in as a maintenance user on the driver page
- **And** at least one driver is listed
- **When** I view the driver table
- **Then** I do not see **Edit** or **Delete**

#### Scenario: Area admin row shows edit and delete
- **Given** I am signed in as an area admin on the driver page
- **And** at least one driver is listed
- **When** I view the driver table
- **Then** I see **Edit** and **Delete** on each driver row

---

### US-3.4 — Edit Driver

#### Scenario: Signed-in system admin updates driver details
- **Given** I am signed in as a system admin on the driver page
- **And** driver `Jaxen Roden` exists with driver license expiration date `2030-09-20` and status `valid`
- **When** I click **Edit** on `Jaxen Roden`
- **Then** the edit driver dialog opens
- **When** I change the driver license expiration date to `2031-01-15` and the approved date to two years ago
- **And** I click **Update Driver**
- **Then** `PUT /api/driver/drivers/:driverId` returns `{ "message": "Driver was updated successfully." }`
- **And** `Jaxen Roden` shows expiration date `2031-01-15` and status `expired` in the driver table

#### Scenario: Signed-in area admin updates driver details
- **Given** I am signed in as an area admin on the driver page
- **And** driver `Amy Adams` exists with driver license expiration date `2030-09-20` and status `valid`
- **When** I click **Edit** on `Amy Adams`
- **Then** the edit driver dialog opens
- **When** I change the driver license expiration date to `2031-01-15` and the approved date to two years ago
- **And** I click **Update Driver**
- **Then** `PUT /api/driver/drivers/:driverId` returns `{ "message": "Driver was updated successfully." }`
- **And** `Amy Adams` shows expiration date `2031-01-15` and status `expired` in the driver table

#### Scenario: Update of an unknown driver is rejected
- **Given** I am signed in as a system admin
- **When** I send `PUT /api/driver/drivers/9999` with a valid driver body
- **Then** the API returns `404` with `{ "message": "Driver with id=9999 not found." }`

---

### US-3.5 — Delete Driver

#### Scenario: Signed-in system admin deletes a driver with confirmation
- **Given** I am signed in as a system admin on the driver page
- **And** driver `Jaxen Roden` exists
- **When** I click **Delete** on `Jaxen Roden`
- **Then** a confirmation dialog is displayed
- **When** I confirm the deletion
- **Then** `DELETE /api/driver/drivers/:driverId` returns `{ "message": "Driver was deleted successfully." }`
- **And** `Jaxen Roden` is removed from the driver table

#### Scenario: Signed-in area admin deletes a driver with confirmation
- **Given** I am signed in as an area admin on the driver page
- **And** driver `Amy Adams` exists
- **When** I click **Delete** on `Amy Adams`
- **Then** a confirmation dialog is displayed
- **When** I confirm the deletion
- **Then** `DELETE /api/driver/drivers/:driverId` returns `{ "message": "Driver was deleted successfully." }`
- **And** `Amy Adams` is removed from the driver table

#### Scenario: Cancelled delete leaves the driver
- **Given** I am signed in as a system admin on the driver page
- **And** driver `Jaxen Roden` exists
- **When** I click **Delete** on `Jaxen Roden`
- **And** I click **Cancel**
- **Then** `Jaxen Roden` remains in the driver table
- **And** `DELETE /api/driver/drivers/:driverId` is not called

#### Scenario: Delete of an unknown driver is rejected
- **Given** I am signed in as a system admin
- **When** I send `DELETE /api/driver/drivers/9999`
- **Then** the API returns `404` with `{ "message": "Driver with id=9999 not found." }`

---

### US-3.6 — Role-Based Menu Access

#### Scenario: Requestor does not see Driver in the menu
- **Given** I am signed in as a requestor
- **When** I view the navigation menu
- **Then** **Driver** is not shown

#### Scenario: Area admin sees Driver in the menu
- **Given** I am signed in as an area admin
- **When** I view the navigation menu
- **Then** **Driver** is shown

#### Scenario: Signed-out menu does not show Driver
- **Given** I have no session
- **When** I view the navigation menu
- **Then** **Driver** is not shown

---

### US-3.7 — Role-Based Access Control

#### Scenario: Requestor can list drivers but cannot change them
- **Given** I am signed in as a requestor
- **And** drivers `Jaxen Roden` and `Amy Adams` exist
- **When** I navigate directly to `/driver`
- **Then** I am redirected to home
- **When** I send `POST /api/driver/drivers`, `PUT /api/driver/drivers/1`, or `DELETE /api/driver/drivers/1`
- **Then** each response is `403` with `{ "message": "Admin role required." }`
- **And** the driver list is unchanged
- **When** I send `GET /api/driver/drivers`
- **Then** the API returns `200`
- **And** both `Jaxen Roden` and `Amy Adams` are returned

#### Scenario: Maintenance cannot create, update, or delete a driver
- **Given** I am signed in as a maintenance user
- **When** I send `POST /api/driver/drivers`, `PUT /api/driver/drivers/1`, or `DELETE /api/driver/drivers/1`
- **Then** each response is `403` with `{ "message": "Admin role required." }`
- **And** the driver list is unchanged
- **When** I send `GET /api/driver/drivers`
- **Then** the API returns `200`

#### Scenario: Unauthenticated visit to the driver page redirects to login
- **Given** I have no session
- **When** I navigate directly to `/driver`
- **Then** I am redirected to `/login`
- **When** I send `GET /api/driver/drivers` with no token
- **Then** the API returns `401` with `{ "message": "Unauthorized! No token provided." }`

#### Scenario: Invalid token is rejected
- **Given** I send `GET /api/driver/drivers` with an invalid token
- **Then** the API returns `401` with `{ "message": "Unauthorized! Invalid or expired token." }`

---

## Test Coverage Map

Each Gherkin scenario above maps to at least one automated test. A system admin or an area admin creates, updates, and deletes drivers. A system admin, an area admin, or a maintenance user can open **Driver** and read every driver. A requestor or a maintenance user receives `403` on driver create, update, and delete, and can read every driver.

| Story | Scenario | Test file | Test name |
| ----- | -------- | --------- | --------- |
| US-3.1 | Signed-in system admin navigates to the driver page | `frontend/tests/DriverList.test.js` | `Signed-in system admin navigates to the driver page` |
| US-3.1 | Signed-in maintenance user navigates to the driver page | `frontend/tests/DriverList.test.js` | `Signed-in maintenance user navigates to the driver page` |
| US-3.1 | Signed-in area admin navigates to the driver page | `frontend/tests/DriverList.test.js` | `Signed-in area admin navigates to the driver page` |
| US-3.1 | Area admin sees every driver | `backend/tests/drivers.test.js` | `Area admin sees every driver` |
| US-3.1 | Driver list is sorted by last name | `backend/tests/drivers.test.js` | `Driver list is sorted by last name` |
| US-3.1 | Drivers who share a last name are sorted by first name | `backend/tests/drivers.test.js` | `Drivers who share a last name are sorted by first name` |
| US-3.2 | Signed-in system admin creates a new driver | `backend/tests/drivers.test.js`, `frontend/tests/DriverList.test.js` | `Signed-in system admin creates a new driver` |
| US-3.2 | Signed-in area admin creates a new driver | `backend/tests/drivers.test.js`, `frontend/tests/DriverList.test.js` | `Signed-in area admin creates a new driver` |
| US-3.2 | Create without last name is rejected | `backend/tests/drivers.test.js` | `Create without last name is rejected` |
| US-3.2 | Create with a last name that is too long is rejected | `backend/tests/drivers.test.js` | `Create with a last name that is too long is rejected` |
| US-3.2 | Create with an invalid expiration date is rejected | `backend/tests/drivers.test.js` | `Create with an invalid expiration date is rejected` |
| US-3.2 | Supplied status is ignored | `backend/tests/drivers.test.js` | `Supplied status is ignored` |
| US-3.2 | Driver status expires one year after the approved date | `backend/tests/drivers.test.js` | `Driver status expires one year after the approved date` |
| US-3.2 | Listing drivers refreshes a status that has reached its anniversary | `backend/tests/drivers.test.js` | `Listing drivers refreshes a status that has reached its anniversary` |
| US-3.2 | Two drivers may share a last name | `backend/tests/drivers.test.js` | `Two drivers may share a last name` |
| US-3.2 | Supplied userId is ignored | `backend/tests/drivers.test.js` | `Supplied userId is ignored` |
| US-3.2 | Input strings are trimmed | `backend/tests/drivers.test.js` | `Input strings are trimmed` |
| US-3.2 | Empty required field shows Required field | `frontend/tests/DriverList.test.js` | `Empty required field shows Required field` |
| US-3.3 | Row action buttons visible for system admin | `frontend/tests/DriverList.test.js` | `Row action buttons visible for system admin` |
| US-3.3 | Maintenance row has no edit or delete | `frontend/tests/DriverList.test.js` | `Maintenance row has no edit or delete` |
| US-3.3 | Area admin row shows edit and delete | `frontend/tests/DriverList.test.js` | `Area admin row shows edit and delete` |
| US-3.4 | Signed-in system admin updates driver details | `backend/tests/drivers.test.js`, `frontend/tests/DriverList.test.js` | `Signed-in system admin updates driver details` |
| US-3.4 | Signed-in area admin updates driver details | `backend/tests/drivers.test.js`, `frontend/tests/DriverList.test.js` | `Signed-in area admin updates driver details` |
| US-3.4 | Update of an unknown driver is rejected | `backend/tests/drivers.test.js` | `Update of an unknown driver is rejected` |
| US-3.5 | Signed-in system admin deletes a driver with confirmation | `backend/tests/drivers.test.js`, `frontend/tests/DriverList.test.js` | `Signed-in system admin deletes a driver with confirmation` |
| US-3.5 | Signed-in area admin deletes a driver with confirmation | `backend/tests/drivers.test.js`, `frontend/tests/DriverList.test.js` | `Signed-in area admin deletes a driver with confirmation` |
| US-3.5 | Cancelled delete leaves the driver | `frontend/tests/DriverList.test.js` | `Cancelled delete leaves the driver` |
| US-3.5 | Delete of an unknown driver is rejected | `backend/tests/drivers.test.js` | `Delete of an unknown driver is rejected` |
| US-3.6 | Requestor does not see Driver in the menu | `frontend/tests/MenuBar.test.js` | `Requestor does not see Driver in the menu` |
| US-3.6 | Area admin sees Driver in the menu | `frontend/tests/MenuBar.test.js` | `Area admin sees Driver in the menu` |
| US-3.6 | Signed-out menu does not show Driver | `frontend/tests/MenuBar.test.js` | `Signed-out menu does not show Driver` |
| US-3.7 | Requestor can list drivers but cannot change them | `backend/tests/drivers.test.js`, `frontend/tests/DriverList.test.js` | `Requestor can list drivers but cannot change them` |
| US-3.7 | Maintenance cannot create, update, or delete a driver | `backend/tests/drivers.test.js` | `Maintenance cannot create, update, or delete a driver` |
| US-3.7 | Unauthenticated visit to the driver page redirects to login | `backend/tests/drivers.test.js`, `frontend/tests/router.test.js` | `Unauthenticated visit to the driver page redirects to login` |
| US-3.7 | Invalid token is rejected | `backend/tests/drivers.test.js` | `Invalid token is rejected` |



---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 3 from @features/feature-3-driver-management.md on branch `feature/3-driver-management`.

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

- Destination CRUD / **Destination** nav item ([Feature 4](feature-4-destination-management.md))
- Area CRUD / **Area** nav item ([Feature 5](feature-5-area-management.md))
- Reservation CRUD / **Reservation** nav item ([Feature 6](feature-6-reservation-management.md))
- Email CRUD / **Email** nav item ([Feature 7](feature-7-email.management.md))
- Admin Page / **Admin Page** nav item ([Feature 8](feature-8-admin-page.md))

---

## Delivered to later features

- A driver is a list row (`firstName`, `lastName`, `driverLicenseNumber`, `driverLicenseExpDate`, `insuranceProvider`, `insuranceNumber`, `approvedDate`, `status`) with no `userId`. `status` is `valid` or `expired`. A system admin or an area admin creates, updates, and deletes every driver. A maintenance user or a requestor can read every driver.
- **Driver** in `MenuBar` routes a system admin, an area admin, and a maintenance user to `/driver`. Allowed roles are `admin`, `system_admin`, `area_admin`, and `maintenance`. This feature does not add a second `MenuBar`.
- Feature 4 adds **Destination** (allowed role `system_admin`) to this `MenuBar`.
- Feature 5 adds **Area** (allowed role `system_admin`) to this `MenuBar`.
- Feature 6 adds **Reservation** (allowed roles `requestor` and `system_admin`) to this `MenuBar` and owns reservation rows in driver.
- Feature 7 adds **Email** (allowed role `system_admin`) to this `MenuBar`.
- Feature 8 adds **Admin Page** (allowed role `system_admin`) to this `MenuBar`. Area-scoped access for an `area_admin` uses `canAccessArea` for that user's area.
