# Feature: Area Management

**Feature ID:** 5
**Branch pattern:** `feature/5-area-management`
**Status:** Ready
**Created:** 2026-10-27
**Input:** A system admin maintains a shared area catalog on one screen, including assigning and removing area administrators for each area. Each area has an area name, area logo, and notification email. Area admins belong to an area and cannot create, edit, or delete areas. An area is not owned by a user.
**Depends on:** [Feature 1 — User Authentication & Session Management](feature-1-user-auth.md)
**Related:** [docs/adr/0001-system-and-area-admins.md](../docs/adr/0001-system-and-area-admins.md), [features/reference/behavior.md](reference/behavior.md), [features/feature-2-vehicle-management.md](feature-2-vehicle-management.md), [features/feature-6-reservation-management.md](feature-6-reservation-management.md), [features/feature-7-email-management.md](feature-7-email-management.md)

This feature provides the catalog of campus operational areas (e.g., Athletics, Support Central, Maintenance) used for vehicle assignment, driver oversight, and automated reservation notifications. It enables a `system_admin` to manage areas and assign or remove `area_admin` users directly in the UI instead of via database commands. It adds the **Area** item to `MenuBar` for system administrators only.

---

## User Stories

### US-5.1: View Area List Page
**As a** signed-in system admin  
**I want to** select **Area** from the navigation menu  
**So that** I can open the area management screen  

**Priority:** P1  
**Independent test:** Click **Area** in `MenuBar` as a system admin and confirm the browser navigates to `/area`  
**Acceptance scenarios:** see ### US-5.1 under Acceptance Criteria  

### US-5.2: Create Area
**As a** signed-in system admin  
**I want to** create a new campus area in a dialog  
**So that** vehicles, area admins, and reservations can be associated with that department and contact email  

**Priority:** P1  
**Independent test:** Open the **+ Add Area** dialog, submit a valid name, logo, and notification email, and verify the new area appears in the area catalog list  
**Acceptance scenarios:** see ### US-5.2 under Acceptance Criteria  

### US-5.3: Read Area Catalog
**As a** signed-in system admin  
**I want to** view all areas in the catalog  
**So that** I can review each department's details, logo, notification email, and assigned area admins  

**Priority:** P1  
**Independent test:** Confirm the area screen displays all areas returned by the API, ordered alphabetically by name  
**Acceptance scenarios:** see ### US-5.3 under Acceptance Criteria  

### US-5.4: Row Action Icons
**As a** signed-in system admin  
**I want to** see Edit and Delete action buttons for a selected area  
**So that** I can modify or remove that area's record  

**Priority:** P1  
**Independent test:** Select an area in the list and verify the detail view displays functional Edit and Delete action controls  
**Acceptance scenarios:** see ### US-5.4 under Acceptance Criteria  

### US-5.5: Edit Area
**As a** signed-in system admin  
**I want to** update an area's name, logo, or notification email  
**So that** department reorganizations and email contact changes are kept current  

**Priority:** P2  
**Independent test:** Open the Edit Area dialog, change the name and notification email, and verify the list and detail panel reflect the changes  
**Acceptance scenarios:** see ### US-5.5 under Acceptance Criteria  

### US-5.6: Delete Area
**As a** signed-in system admin  
**I want to** delete an area after confirming in a dialog  
**So that** obsolete or unused areas can be removed from the catalog  

**Priority:** P2  
**Independent test:** Select an area with no vehicle assignments or assigned area admins, confirm deletion in the confirmation dialog, and verify it is removed from the list  
**Acceptance scenarios:** see ### US-5.6 under Acceptance Criteria  

### US-5.7: Role-Based Access Control
**As the** application  
**I want to** restrict area management endpoints and the Area navigation item to system administrators only, while area administrators cannot modify or manage areas  
**So that** requestors, maintenance users, and area admins cannot alter the campus area catalog  

**Priority:** P1  
**Independent test:** Attempt to access area endpoints with `area_admin`, `requestor`, or `maintenance` tokens and verify HTTP `403` responses; confirm **Area** is hidden in their `MenuBar`  
**Acceptance scenarios:** see ### US-5.7 under Acceptance Criteria  

### US-5.8: Manage Area Administrators
**As a** signed-in system admin  
**I want to** view, assign, and remove area administrators under each area in the detail view  
**So that** I can grant or revoke area admin privileges for users without needing SQL database updates  

**Priority:** P1  
**Independent test:** Select an area, assign an existing user by email/ID as an area admin for that area, verify their assignment in the list, and remove their assignment  
**Acceptance scenarios:** see ### US-5.8 under Acceptance Criteria  

---

## Requirements

### Functional Requirements

- **FR-001:** Every area endpoint MUST require authentication (`authenticate` middleware).
- **FR-002:** An authenticated `system_admin` MUST be able to list areas, fetch one area, create an area, update an area, delete an area, list area admins, assign an area admin, and remove an area admin.
- **FR-003:** `POST`, `GET`, `PUT`, and `DELETE` on `/api/area/areas` and `/api/area/areas/:areaId` (and sub-routes) MUST succeed only when `isSystemAdmin(req.user)` is true (`requireSystemAdmin` middleware). A user with role `area_admin`, `maintenance`, or `requestor` who calls any area management endpoint MUST receive HTTP `403` with `{ "message": "System admin role required." }`.
- **FR-004:** **Area admin boundary:** An `area_admin` belongs to one area (`users.areaId`). Area admins MUST NOT create, edit, or delete areas, and MUST NOT assign or remove area admins. They have no write or management access to the area catalog.
- **FR-005:** An area MUST NOT have a `userId`. A `userId` in an area create or update request body MUST be ignored and MUST NOT be stored.
- **FR-006:** Every input string MUST be trimmed. A required string that is missing, empty, or whitespace-only MUST be rejected with HTTP `400`.
- **FR-007:** A request with no token MUST return HTTP `401` with `{ "message": "Unauthorized! No token provided." }`. A request with an invalid or expired token MUST return HTTP `401` with `{ "message": "Unauthorized! Invalid or expired token." }`. A visitor with no session who opens `/area` MUST be redirected to `/login`. A signed-in `area_admin`, `requestor`, or `maintenance` user who opens `/area` MUST be redirected to home.
- **FR-008:** `GET /api/area/areas` MUST return areas ordered by `name` ascending, then `id` ascending.
- **FR-009:** `name` MUST be a required string of at most 50 characters and MUST be unique. A duplicate `name` (case-insensitive after trim) MUST return HTTP `400` with `{ "message": "Area name already exists." }`.
- **FR-010:** `notificationEmail` MUST be a required string of at most 255 characters and MUST match a valid email format (`^[^\s@]+@[^\s@]+\.[^\s@]+$`). A missing or whitespace-only email MUST return HTTP `400` with `{ "message": "Notification email cannot be empty." }`. An invalid email format MUST return HTTP `400` with `{ "message": "Notification email must be a valid email address." }`.
- **FR-011:** `logo` MUST be an optional string of at most 255 characters representing a logo image filename, URL, or asset path. If omitted, empty, or whitespace-only, it MUST be stored as `null`.
- **FR-012:** An area cannot be deleted if it is currently assigned to one or more vehicles in the catalog (`vehicles.areaAssigned = area.name`) or if it currently has assigned area admins (`users.areaId = area.id`). Attempting to delete an assigned area MUST return HTTP `400` with `{ "message": "Cannot delete area currently assigned to vehicles or area admins." }`.
- **FR-013:** **Area Administrator Assignment:**
  - `GET /api/area/areas/:areaId/admins` MUST list all users assigned to that area (`role === "area_admin"` and `areaId === area.id`), returning `id`, `fName`, `lName`, `email`, and `role`.
  - `POST /api/area/areas/:areaId/admins` MUST accept `{ "userId": <integer> }` or `{ "email": "<email>" }`. If the user exists, the system MUST set their `role` to `area_admin` and their `areaId` to `:areaId`. If the user does not exist, return HTTP `404` with `{ "message": "User not found." }`. If the user is already an area admin for this area, return HTTP `400` with `{ "message": "User is already an area admin for this area." }`.
  - `DELETE /api/area/areas/:areaId/admins/:userId` MUST remove the area admin assignment, resetting the user's `role` to `requestor` and `areaId` to `null`. If the user is not an area admin for that area, return HTTP `404` with `{ "message": "Area admin assignment not found." }`.
- **FR-014:** This feature MUST add **Area** to the existing `MenuBar` for `system_admin` only. It MUST NOT create a second `MenuBar`. **Area** MUST NOT be shown to `area_admin`, `requestor`, or `maintenance`.
- **FR-015:** Seeded areas (`Athletics`, `Support Central`, and `Maintenance`) established on initial database sync MUST be preserved, and Feature 5 extends the existing `areas` table with `logo` and `notificationEmail` columns.

---

## Assumptions

- Feature 1 sessions, roles (`requestor`, `system_admin`, `area_admin`, `maintenance`), and `MenuBar` are in place (per ADR-0001).
- Areas are a shared system catalog. They are not private to the user who created them.
- Catalog create, edit, delete, and area admin assignments happen on a single view (`/area`).
- `users.areaId` holds the assigned area for users with `role = "area_admin"`.
- Feature 2 vehicles store `areaAssigned` as a string matching an area's `name`.
- Feature 6 allows reservations to specify an optional area name, and Feature 7 uses the area's `notificationEmail` for custom pickup instructions.

---

## Edge Cases

- A required field left blank on the form shows **Required field** and does not call the API.
- Duplicate `name`: HTTP `400` with `"Area name already exists."`.
- An invalid email for `notificationEmail`: HTTP `400` with `"Notification email must be a valid email address."`.
- Blank `logo`: stored as `null` and displayed in the UI with a default campus area icon (`mdi-domain`).
- Fetch, update, or delete for an `areaId` that does not exist: HTTP `404` with `"Area with id=<areaId> not found."`.
- Attempting to delete an area whose name is currently set on an existing vehicle or has assigned area admins: HTTP `400` with `"Cannot delete area currently assigned to vehicles or area admins."`.
- An `area_admin`, `maintenance`, or `requestor` call to any area endpoint: HTTP `403` with `"System admin role required."`.
- No session on `/area`: redirect to `/login`. An area API call with no token: HTTP `401`.
- A signed-in `area_admin`, `requestor`, or `maintenance` user opening `/area`: redirect to home. **Area** is not in their `MenuBar`.
- Attempting to assign a non-existent user as an area admin: HTTP `404` with `"User not found."`.
- Assigning a user who is already an area admin for that area: HTTP `400` with `"User is already an area admin for this area."`.

---

## Success Criteria

- **SC-001:** Every Gherkin scenario is covered by an automated test in the Test Coverage Map.
- **SC-002:** A system admin can create, view, update, and delete an area on one screen using dialogs.
- **SC-003:** A system admin can view, assign, and remove area admins for an area from the UI without manual SQL updates.
- **SC-004:** An area admin cannot access area management endpoints or the Area navigation item (`403 System admin role required.`).
- **SC-005:** **Area** is visible in `MenuBar` only for `system_admin`.
- **SC-006:** `npm test` passes, including `backend/tests/areas.test.js` and frontend tests.

---

## Data Ownership & Isolation

Areas are a shared system catalog. They have no `userId` and are not owned by an individual user. Area administrators belong to an area (`users.areaId = area.id`).

| Rule | Requirement |
|------|-------------|
| **Read scope** | `system_admin` can list all areas, fetch any area, and list area admins |
| **Write scope** | `system_admin` only. Area admins, requestors, and maintenance users receive `403` |
| **Create scope** | `system_admin` only. Non-system admins receive `403` |
| **Area admin role** | Belong to one area; cannot create, modify, or delete areas, nor assign/remove area admins |
| **Cross-user access** | Not applicable; catalog data is shared. Non-system admin calls return `403` |
| **UI scope** | The `/area` route and `MenuBar` item are accessible to `system_admin` only |
| **Implementation** | Role validation via `authenticate` and `requireSystemAdmin` middleware |

---

## API Requirements

All endpoints are mounted at `/api/area`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/area/areas` | `system_admin` | Create a new area in the catalog |
| `GET` | `/api/area/areas` | `system_admin` | List all areas ordered by name ascending, then id ascending |
| `GET` | `/api/area/areas/:areaId` | `system_admin` | Fetch one area by ID |
| `PUT` | `/api/area/areas/:areaId` | `system_admin` | Update an area by ID |
| `DELETE` | `/api/area/areas/:areaId` | `system_admin` | Delete an area by ID |
| `GET` | `/api/area/areas/:areaId/admins` | `system_admin` | List area admins assigned to this area |
| `POST` | `/api/area/areas/:areaId/admins` | `system_admin` | Assign a user as an area admin for this area |
| `DELETE` | `/api/area/areas/:areaId/admins/:userId` | `system_admin` | Remove an area admin assignment (reverts user to `requestor`) |

### Create — `POST /api/area/areas`

**Request body:**

```json
{
  "name": "Athletics",
  "logo": "athletics-logo.png",
  "notificationEmail": "athletics-transport@eagles.oc.edu"
}
```

A `userId` property in the body is ignored.

**Success** (`201`): the saved area JSON, including `id`, the fields above, `createdAt`, and `updatedAt`.

```json
{
  "id": 1,
  "name": "Athletics",
  "logo": "athletics-logo.png",
  "notificationEmail": "athletics-transport@eagles.oc.edu",
  "createdAt": "2026-10-27T12:00:00.000Z",
  "updatedAt": "2026-10-27T12:00:00.000Z"
}
```

**Errors (`400`):**

| Condition | `message` |
|-----------|-----------|
| Missing or blank `name` | `Area name cannot be empty.` |
| `name` longer than 50 characters | `Area name cannot exceed 50 characters.` |
| Duplicate `name` (case-insensitive after trim) | `Area name already exists.` |
| Missing or blank `notificationEmail` | `Notification email cannot be empty.` |
| `notificationEmail` not matching email pattern | `Notification email must be a valid email address.` |
| `notificationEmail` longer than 255 characters | `Notification email cannot exceed 255 characters.` |
| `logo` longer than 255 characters | `Logo cannot exceed 255 characters.` |

**Forbidden (`403`):** `{ "message": "System admin role required." }` when caller is `area_admin`, `maintenance`, or `requestor`.

---

### List all — `GET /api/area/areas`

**Success** (`200`): a JSON array of areas, ordered by `name` ASC, then `id` ASC.

---

### Fetch one — `GET /api/area/areas/:areaId`

**Success** (`200`): one area object.

**Not found (`404`):** `{ "message": "Area with id=<areaId> not found." }`

---

### Update — `PUT /api/area/areas/:areaId`

**Request body:**

```json
{
  "name": "Athletics Department",
  "logo": "athletics-new.png",
  "notificationEmail": "athletics@eagles.oc.edu"
}
```

Validation messages match the create table.

**Success** (`200`): `{ "message": "Area was updated successfully." }`

**Not found (`404`):** `{ "message": "Area with id=<areaId> not found." }`

---

### Delete — `DELETE /api/area/areas/:areaId`

**Success** (`200`): `{ "message": "Area was deleted successfully!" }`

**Conflict (`400`):** `{ "message": "Cannot delete area currently assigned to vehicles or area admins." }` when any vehicle has `vehicles.areaAssigned = area.name` or any user has `users.areaId = area.id`.

**Not found (`404`):** `{ "message": "Area with id=<areaId> not found." }`

---

### Manage Area Admins

#### List Admins — `GET /api/area/areas/:areaId/admins`

**Success (`200`):**

```json
[
  {
    "id": 5,
    "fName": "Coach",
    "lName": "Smith",
    "email": "csmith@eagles.oc.edu",
    "role": "area_admin",
    "areaId": 1
  }
]
```

#### Assign Admin — `POST /api/area/areas/:areaId/admins`

**Request body:**

```json
{
  "email": "csmith@eagles.oc.edu"
}
```
*(or `{ "userId": 5 }`)*

**Success (`200`):**

```json
{
  "message": "User assigned as area admin successfully.",
  "user": {
    "id": 5,
    "fName": "Coach",
    "lName": "Smith",
    "email": "csmith@eagles.oc.edu",
    "role": "area_admin",
    "areaId": 1
  }
}
```

**Errors:**
- User not found: `404` `{ "message": "User not found." }`
- Already assigned to this area: `400` `{ "message": "User is already an area admin for this area." }`
- Caller not system admin: `403` `{ "message": "System admin role required." }`

#### Remove Admin — `DELETE /api/area/areas/:areaId/admins/:userId`

**Success (`200`):** `{ "message": "Area admin removed successfully." }`

**Errors:**
- User is not an area admin for this area: `404` `{ "message": "Area admin assignment not found." }`
- Caller not system admin: `403` `{ "message": "System admin role required." }`

---

## Screen Requirements

### [View: Areas] — route `/area`, route name `areas`

- **Page Title:** **Areas** (or **Area Management**)
- **Access:** `system_admin` only. Unauthenticated redirects to `/login`. `area_admin`, `requestor`, or `maintenance` redirects to `/`.
- **Primary CTA:** **+ Add Area** (`oc-cta`) positioned above the list/search bar.
- **Search field:** Labeled **Search areas**. Filters the displayed area list in real-time by matching against `name` and `notificationEmail` case-insensitively.
- **Layout:** Two-column split layout:
  - **Left column (Catalog list):**
    - One list item per area in API order.
    - Each item displays an area icon (`mdi-domain`) or thumbnail logo, the title `{name}`, and the subtitle `{notificationEmail}`.
    - Clicking an item selects it and updates the detail panel on the right.
    - The first area is selected by default on load.
  - **Right column (Detail panel):**
    - Header showing area icon/logo, `{name}`, and action buttons:
      - **Edit area** button (opens Edit dialog).
      - **Delete area** button (opens Delete confirmation dialog).
    - Details card displaying:
      - **Area Name:** `{name}`
      - **Notification Email:** `{notificationEmail}`
      - **Area Logo:** displays the logo image if present, or **No logo provided** placeholder.
      - **Created:** formatted date string.
    - **Area Administrators Section:**
      - Header: **Area Administrators** with a **+ Assign Area Admin** button.
      - Table or list of assigned area admins displaying Name, Email, and a **Remove** icon action (`mdi-close` / `mdi-delete`).
      - Empty state when no admins are assigned: **No area administrators assigned.**
- **Dialogs:**
  1. **Add Area Dialog:** Name, Notification Email, Area Logo. Actions: Cancel, Save Area.
  2. **Edit Area Dialog:** Pre-populated fields. Actions: Cancel, Save Changes.
  3. **Delete Area Dialog:** "Are you sure you want to delete {name}?" Actions: Cancel, Delete.
  4. **Assign Area Admin Dialog:**
     - Title: **Assign Area Administrator**
     - Input: User selection dropdown or email search input.
     - Actions: **Cancel**, **Assign Admin** (`oc-cta`).
  5. **Remove Area Admin Confirmation Dialog:**
     - Title: **Remove Area Administrator**
     - Copy: **Are you sure you want to remove {name} as an administrator for {area}?**
     - Actions: **Cancel**, **Remove** (color `error`).

### App Chrome

- Add **Area** to `MenuBar.vue` in the centered navigation group.
- Shown ONLY when `currentUser.role === 'system_admin'` (or legacy `admin`).
- Hidden for `area_admin`, `requestor`, and `maintenance`.

---

## Key Entities

- **Area**: An operational division within Oklahoma Christian University (e.g., Athletics, Support Central, Maintenance). Owns name, logo, and notification email.
- **User**: An OC user account. When assigned as an area admin, has `role = "area_admin"` and `areaId = area.id`.

---

## Data Model Requirements

### `areas` table

Feature 5 extends the baseline `areas` table with `logo` and `notificationEmail`:

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING(50) | Required, unique. Trimmed string |
| `logo` | STRING(255) | Nullable. Trimmed string or `null` |
| `notificationEmail` | STRING(255) | Required. Valid email format |
| `createdAt` | DATE | Managed by Sequelize |
| `updatedAt` | DATE | Managed by Sequelize |

### `users` table relationship

| Field | Type | Rules |
|-------|------|-------|
| `areaId` | INTEGER FK | References `areas.id`. Populated when `role === "area_admin"` |

### Associations

| From | To | Relationship | On delete |
|------|----|--------------|-----------|
| `areas` | `users` | one-to-many (`users.areaId`) | RESTRICT |
| `areas` | `vehicles` | one-to-many (logical via `vehicles.areaAssigned = areas.name`) | RESTRICT |

---

## Acceptance Criteria (Gherkin)

Shared baseline facts: System Administrator `admin@eagles.oc.edu` signed in with role `system_admin`; Area Administrator `coach@eagles.oc.edu` with role `area_admin` assigned to `Athletics`; Maintenance user `maint@eagles.oc.edu` with role `maintenance`; Requestor `jdoe@eagles.oc.edu` with role `requestor`.

### US-5.1 — View Area List Page

#### Scenario: System admin views Area in MenuBar and navigates to areas
* **Given** I am signed in as a system admin
* **When** I view the `MenuBar`
* **Then** **Area** is visible
* **When** I click **Area**
* **Then** the browser navigates to `/area`
* **And** the page title displays **Areas**

#### Scenario: Unauthenticated visitor is redirected to login
* **Given** I am not signed in
* **When** I navigate to `/area`
* **Then** I am redirected to `/login`

#### Scenario: Non-system admin user is redirected to home
* **Given** I am signed in as an area admin, requestor, or maintenance user
* **When** I navigate to `/area`
* **Then** I am redirected to `/`
* **And** **Area** is not visible in `MenuBar`

---

### US-5.2 — Create Area

#### Scenario: System admin creates a valid area
* **Given** I am signed in as a system admin on `/area`
* **When** I click **+ Add Area**
* **And** I enter area name `Biology`, notification email `biology@eagles.oc.edu`, and logo `biology.png`
* **And** I click **Save Area**
* **Then** the API returns `201`
* **And** the dialog closes
* **And** the area catalog list displays `Biology` with email `biology@eagles.oc.edu`
* **And** a success snackbar displays **Area was created successfully.**

#### Scenario: Create area with optional logo omitted
* **Given** I am signed in as a system admin on `/area`
* **When** I click **+ Add Area**
* **And** I enter area name `Engineering` and notification email `engineering@eagles.oc.edu` and leave logo blank
* **And** I click **Save Area**
* **Then** the API returns `201`
* **And** the stored area has `logo` as `null`

#### Scenario: Create area with missing name is rejected
* **Given** I am signed in as a system admin
* **When** I submit `POST /api/area/areas` with a blank `name` and valid `notificationEmail`
* **Then** the API returns `400` with `{ "message": "Area name cannot be empty." }`

#### Scenario: Create area with invalid email is rejected
* **Given** I am signed in as a system admin
* **When** I submit `POST /api/area/areas` with name `Campus Police` and notification email `not-an-email`
* **Then** the API returns `400` with `{ "message": "Notification email must be a valid email address." }`

#### Scenario: Create area with duplicate name is rejected
* **Given** an area exists with name `Athletics`
* **When** I submit `POST /api/area/areas` with name `Athletics` and email `other@eagles.oc.edu`
* **Then** the API returns `400` with `{ "message": "Area name already exists." }`

---

### US-5.3 — Read Area Catalog

#### Scenario: System admin reads area list in alphabetical order
* **Given** areas exist with names `Support Central`, `Athletics`, and `Maintenance`
* **When** I request `GET /api/area/areas`
* **Then** the API returns `200`
* **And** the areas in the response are ordered `Athletics`, then `Maintenance`, then `Support Central`

#### Scenario: Empty catalog displays empty state
* **Given** no areas exist in the catalog
* **When** I view the `/area` screen
* **Then** the screen displays **No areas yet.**

#### Scenario: Search filters area list
* **Given** areas exist with names `Athletics` (`athletics@eagles.oc.edu`) and `Maintenance` (`maint@eagles.oc.edu`)
* **When** I type `ath` in the **Search areas** input
* **Then** `Athletics` is shown in the list
* **And** `Maintenance` is hidden

---

### US-5.4 — Row Action Icons

#### Scenario: System admin sees Edit and Delete action controls
* **Given** an area `Athletics` exists
* **When** I view `Athletics` in the `/area` detail panel
* **Then** the **Edit area** button is visible
* **And** the **Delete area** button is visible

---

### US-5.5 — Edit Area

#### Scenario: System admin updates area details
* **Given** an area exists with name `Athletics` and email `athletics@eagles.oc.edu`
* **When** I open the Edit dialog for `Athletics`
* **And** I change the notification email to `new-athletics@eagles.oc.edu`
* **And** I click **Save Changes**
* **Then** the API returns `200` with `{ "message": "Area was updated successfully." }`
* **And** the detail panel reflects the updated email `new-athletics@eagles.oc.edu`
* **And** a success snackbar displays **Area was updated successfully.**

#### Scenario: Edit area with duplicate name of another area is rejected
* **Given** areas exist with names `Athletics` and `Maintenance`
* **When** I edit `Maintenance` and change its name to `Athletics`
* **Then** the API returns `400` with `{ "message": "Area name already exists." }`

#### Scenario: Edit non-existent area returns 404
* **When** I send `PUT /api/area/areas/999` with valid area fields
* **Then** the API returns `404` with `{ "message": "Area with id=999 not found." }`

---

### US-5.6 — Delete Area

#### Scenario: System admin deletes an unassigned area after confirmation
* **Given** an area exists with name `Temporary Area` with no vehicles and no assigned area admins
* **When** I click **Delete area** for `Temporary Area`
* **Then** a confirmation dialog opens with **Are you sure you want to delete Temporary Area?**
* **When** I click **Delete** in the confirmation dialog
* **Then** the API returns `200` with `{ "message": "Area was deleted successfully!" }`
* **And** `Temporary Area` is removed from the catalog list

#### Scenario: Cancel delete keeps area
* **Given** an area exists with name `Athletics`
* **When** I click **Delete area** for `Athletics`
* **And** I click **Cancel** in the confirmation dialog
* **Then** the dialog closes
* **And** `Athletics` remains in the area catalog list

#### Scenario: Deleting area assigned to vehicles or area admins is rejected
* **Given** an area exists with name `Athletics` and an area admin is assigned to `Athletics`
* **When** I send `DELETE /api/area/areas/:areaId` for `Athletics`
* **Then** the API returns `400` with `{ "message": "Cannot delete area currently assigned to vehicles or area admins." }`

#### Scenario: Delete non-existent area returns 404
* **When** I send `DELETE /api/area/areas/999`
* **Then** the API returns `404` with `{ "message": "Area with id=999 not found." }`

---

### US-5.7 — Role-Based Access Control

#### Scenario: Area admin cannot call area endpoints
* **Given** I am signed in as an area admin
* **When** I send `GET /api/area/areas`, `POST /api/area/areas`, `PUT /api/area/areas/1`, or `DELETE /api/area/areas/1`
* **Then** each response status is `403` with `{ "message": "System admin role required." }`

#### Scenario: Requestor cannot call area endpoints
* **Given** I am signed in as a requestor
* **When** I send `GET /api/area/areas` or `POST /api/area/areas`
* **Then** the response status is `403` with `{ "message": "System admin role required." }`

#### Scenario: Maintenance user cannot call area endpoints
* **Given** I am signed in as a maintenance user
* **When** I send `GET /api/area/areas` or `POST /api/area/areas`
* **Then** the response status is `403` with `{ "message": "System admin role required." }`

#### Scenario: Unauthenticated request returns 401
* **Given** no authorization token is provided
* **When** I send `GET /api/area/areas`
* **Then** the API returns `401` with `{ "message": "Unauthorized! No token provided." }`

---

### US-5.8 — Manage Area Administrators

#### Scenario: System admin views area admins for an area
* **Given** user `Coach Smith` (`csmith@eagles.oc.edu`) is an area admin for `Athletics`
* **When** I request `GET /api/area/areas/:athleticsId/admins`
* **Then** the API returns `200` with a list containing Coach Smith

#### Scenario: System admin assigns a user as an area admin
* **Given** user Jane Doe has role `requestor`
* **When** I submit `POST /api/area/areas/:athleticsId/admins` with body `{ "email": "jdoe@eagles.oc.edu" }`
* **Then** the API returns `200`
* **And** Jane Doe's role becomes `area_admin` with `areaId` set to `Athletics`
* **And** the Area Administrators section in the UI displays Jane Doe

#### Scenario: Assigning non-existent user returns 404
* **When** I submit `POST /api/area/areas/:athleticsId/admins` with body `{ "email": "unknown@eagles.oc.edu" }`
* **Then** the API returns `404` with `{ "message": "User not found." }`

#### Scenario: Assigning already assigned user returns 400
* **Given** Jane Doe is already an area admin for `Athletics`
* **When** I submit `POST /api/area/areas/:athleticsId/admins` with body `{ "email": "jdoe@eagles.oc.edu" }`
* **Then** the API returns `400` with `{ "message": "User is already an area admin for this area." }`

#### Scenario: System admin removes an area admin
* **Given** Jane Doe is an area admin for `Athletics`
* **When** I submit `DELETE /api/area/areas/:athleticsId/admins/:janeUserId`
* **Then** the API returns `200` with `{ "message": "Area admin removed successfully." }`
* **And** Jane Doe's role becomes `requestor` and `areaId` becomes `null`
* **And** Jane Doe is removed from the area's administrators list

---

## Test Coverage Map

Each scenario above maps to at least one automated test.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-5.1 | System admin views Area in MenuBar and navigates to areas | `frontend/tests/MenuBar.test.js` | `System admin views Area in MenuBar and navigates to areas` |
| US-5.1 | Unauthenticated visitor is redirected to login | `frontend/tests/Areas.test.js` | `Unauthenticated visitor is redirected to login` |
| US-5.1 | Non-system admin user is redirected to home | `frontend/tests/Areas.test.js` | `Non-system admin user is redirected to home` |
| US-5.2 | System admin creates a valid area | `backend/tests/areas.test.js` | `System admin creates a valid area` |
| US-5.2 | Create area with optional logo omitted | `backend/tests/areas.test.js` | `Create area with optional logo omitted` |
| US-5.2 | Create area with missing name is rejected | `backend/tests/areas.test.js` | `Create area with missing name is rejected` |
| US-5.2 | Create area with invalid email is rejected | `backend/tests/areas.test.js` | `Create area with invalid email is rejected` |
| US-5.2 | Create area with duplicate name is rejected | `backend/tests/areas.test.js` | `Create area with duplicate name is rejected` |
| US-5.3 | System admin reads area list in alphabetical order | `backend/tests/areas.test.js` | `System admin reads area list in alphabetical order` |
| US-5.3 | Empty catalog displays empty state | `frontend/tests/Areas.test.js` | `Empty catalog displays empty state` |
| US-5.3 | Search filters area list | `frontend/tests/Areas.test.js` | `Search filters area list` |
| US-5.4 | System admin sees Edit and Delete action controls | `frontend/tests/Areas.test.js` | `System admin sees Edit and Delete action controls` |
| US-5.5 | System admin updates area details | `backend/tests/areas.test.js` | `System admin updates area details` |
| US-5.5 | Edit area with duplicate name of another area is rejected | `backend/tests/areas.test.js` | `Edit area with duplicate name of another area is rejected` |
| US-5.5 | Edit non-existent area returns 404 | `backend/tests/areas.test.js` | `Edit non-existent area returns 404` |
| US-5.6 | System admin deletes an unassigned area after confirmation | `backend/tests/areas.test.js` | `System admin deletes an unassigned area after confirmation` |
| US-5.6 | Cancel delete keeps area | `frontend/tests/Areas.test.js` | `Cancel delete keeps area` |
| US-5.6 | Deleting area assigned to vehicles or area admins is rejected | `backend/tests/areas.test.js` | `Deleting area assigned to vehicles or area admins is rejected` |
| US-5.6 | Delete non-existent area returns 404 | `backend/tests/areas.test.js` | `Delete non-existent area returns 404` |
| US-5.7 | Area admin cannot call area endpoints | `backend/tests/areas.test.js` | `Area admin cannot call area endpoints` |
| US-5.7 | Requestor cannot call area endpoints | `backend/tests/areas.test.js` | `Requestor cannot call area endpoints` |
| US-5.7 | Maintenance user cannot call area endpoints | `backend/tests/areas.test.js` | `Maintenance user cannot call area endpoints` |
| US-5.7 | Unauthenticated request returns 401 | `backend/tests/areas.test.js` | `Unauthenticated request returns 401` |
| US-5.8 | System admin views area admins for an area | `backend/tests/areas.test.js` | `System admin views area admins for an area` |
| US-5.8 | System admin assigns a user as an area admin | `backend/tests/areas.test.js` | `System admin assigns a user as an area admin` |
| US-5.8 | Assigning non-existent user returns 404 | `backend/tests/areas.test.js` | `Assigning non-existent user returns 404` |
| US-5.8 | Assigning already assigned user returns 400 | `backend/tests/areas.test.js` | `Assigning already assigned user returns 400` |
| US-5.8 | System admin removes an area admin | `backend/tests/areas.test.js` | `System admin removes an area admin` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 5 from @features/feature-5-area-management.md on branch `feature/5-area-management`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-00N** satisfied)
- [ ] **Success Criteria (SC-00N)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (schema added)
- [ ] `features/reference/api.md` updated (endpoints added)
- [ ] `features/reference/behavior.md` updated (product rules added)

---

## Out of Scope

- Vehicle assignment and vehicle catalog CRUD ([Feature 2](feature-2-vehicle-management.md))
- Driver approvals and driver catalog CRUD ([Feature 3](feature-3-driver-management.md))
- Destination catalog CRUD ([Feature 4](feature-4-destination-management.md))
- Reservation booking and approval workflow ([Feature 6](feature-6-reservation-management.md))
- Email dispatch and template rendering ([Feature 7](feature-7-email-management.md))
- Weekly calendar schedule for administrators ([Feature 8](feature-8-admin-page.md))

---

## Delivered to Feature 6 & Feature 7

- Feature 5 establishes the authoritative list of campus areas (`name`), logos, notification emails, and area administrator assignments (`users.areaId`).
- Feature 6 reservations associate a vehicle request with an area, allowing `area_admin` users to oversee reservations for their department.
- Feature 7 uses the area's record to route area-specific pickup/return instructions and notifications.
