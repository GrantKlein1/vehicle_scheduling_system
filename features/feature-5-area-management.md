# Feature: Area Management

**Feature ID:** 5
**Branch pattern:** `feature/5-area-management`
**Status:** Ready
**Created:** 2026-10-27
**Input:** An admin maintains a shared area catalog on one screen. Each area has an area name, area logo, and notification email. An area is not owned by a user.
**Depends on:** [Feature 1 — User Authentication & Session Management](feature-1-user-auth.md)
**Related:** [features/reference/behavior.md](reference/behavior.md), [features/feature-2-vehicle-management.md](feature-2-vehicle-management.md), [features/feature-7-email-management.md](feature-7-email-management.md)

This feature provides the catalog of campus operational areas (e.g., Athletics, Support Central, Maintenance) used for vehicle assignment and automated reservation notification emails. It adds the **Area** item to `MenuBar` for administrators only.

---

## User Stories

### US-5.1: View Area List Page
**As a** signed-in admin  
**I want to** select **Area** from the navigation menu  
**So that** I can open the area management screen  

**Priority:** P1  
**Independent test:** Click **Area** in `MenuBar` as an admin and confirm the browser navigates to `/area`  
**Acceptance scenarios:** see ### US-5.1 under Acceptance Criteria  

### US-5.2: Create Area
**As a** signed-in admin  
**I want to** create a new campus area in a dialog  
**So that** vehicles and reservations can be associated with that area and its contact email  

**Priority:** P1  
**Independent test:** Open the **+ Add Area** dialog, submit a valid name, logo, and notification email, and verify the new area appears in the area catalog list  
**Acceptance scenarios:** see ### US-5.2 under Acceptance Criteria  

### US-5.3: Read Area Catalog
**As a** signed-in admin  
**I want to** view all areas in the catalog  
**So that** I can review each department's details and notification email  

**Priority:** P1  
**Independent test:** Confirm the area screen displays all areas returned by the API, ordered alphabetically by name  
**Acceptance scenarios:** see ### US-5.3 under Acceptance Criteria  

### US-5.4: Row Action Icons
**As a** signed-in admin  
**I want to** see Edit and Delete action buttons for a selected area  
**So that** I can modify or remove that area's record  

**Priority:** P1  
**Independent test:** Select an area in the list and verify the detail view displays functional Edit and Delete action controls  
**Acceptance scenarios:** see ### US-5.4 under Acceptance Criteria  

### US-5.5: Edit Area
**As a** signed-in admin  
**I want to** update an area's name, logo, or notification email  
**So that** department reorganizations and email contact changes are kept current  

**Priority:** P2  
**Independent test:** Open the Edit Area dialog, change the name and notification email, and verify the list and detail panel reflect the changes  
**Acceptance scenarios:** see ### US-5.5 under Acceptance Criteria  

### US-5.6: Delete Area
**As a** signed-in admin  
**I want to** delete an area after confirming in a dialog  
**So that** obsolete or unused areas can be removed from the catalog  

**Priority:** P2  
**Independent test:** Select an area with no vehicle assignments, confirm deletion in the confirmation dialog, and verify it is removed from the list  
**Acceptance scenarios:** see ### US-5.6 under Acceptance Criteria  

### US-5.7: Role-Based Access Control
**As the** application  
**I want to** restrict area management endpoints and the Area navigation item to administrators only  
**So that** requestors and maintenance staff cannot view or alter area records  

**Priority:** P1  
**Independent test:** Attempt to access area endpoints with requestor or maintenance tokens and verify HTTP `403` responses; confirm **Area** is hidden in their `MenuBar`  
**Acceptance scenarios:** see ### US-5.7 under Acceptance Criteria  

---

## Requirements

### Functional Requirements

- **FR-001:** Every area endpoint MUST require authentication (`authenticate` middleware).
- **FR-002:** An authenticated `admin` MUST be able to list areas, fetch one area, create an area, update an area, and delete an area.
- **FR-003:** `POST`, `GET`, `PUT`, and `DELETE` on `/api/area/areas` and `/api/area/areas/:areaId` MUST succeed only when `req.user.role === "admin"`. A `maintenance` or `requestor` user who calls any area endpoint MUST receive HTTP `403` with `{ "message": "Admin role required." }`.
- **FR-004:** An area MUST NOT have a `userId`. A `userId` in the request body MUST be ignored and MUST NOT be stored.
- **FR-005:** Every input string MUST be trimmed. A required string that is missing, empty, or whitespace-only MUST be rejected with HTTP `400`.
- **FR-006:** A request with no token MUST return HTTP `401` with `{ "message": "Unauthorized! No token provided." }`. A request with an invalid or expired token MUST return HTTP `401` with `{ "message": "Unauthorized! Invalid or expired token." }`. A visitor with no session who opens `/area` MUST be redirected to `/login`. A signed-in `requestor` or `maintenance` user who opens `/area` MUST be redirected to home.
- **FR-007:** `GET /api/area/areas` MUST return areas ordered by `name` ascending, then `id` ascending.
- **FR-008:** `name` MUST be a required string of at most 50 characters and MUST be unique. A duplicate `name` (case-insensitive after trim) MUST return HTTP `400` with `{ "message": "Area name already exists." }`.
- **FR-009:** `notificationEmail` MUST be a required string of at most 255 characters and MUST match a valid email format (`^[^\s@]+@[^\s@]+\.[^\s@]+$`). A missing or whitespace-only email MUST return HTTP `400` with `{ "message": "Notification email cannot be empty." }`. An invalid email format MUST return HTTP `400` with `{ "message": "Notification email must be a valid email address." }`.
- **FR-010:** `logo` MUST be an optional string of at most 255 characters representing a logo image filename, URL, or asset path. If omitted, empty, or whitespace-only, it MUST be stored as `null`.
- **FR-011:** An area cannot be deleted if it is currently assigned to one or more vehicles in the catalog (`vehicles.areaAssigned = area.name`). Attempting to delete an assigned area MUST return HTTP `400` with `{ "message": "Cannot delete area currently assigned to vehicles." }`.
- **FR-012:** This feature MUST add **Area** to the existing `MenuBar` for `admin` only. It MUST NOT create a second `MenuBar`. **Area** MUST NOT be shown to `requestor` or `maintenance`.
- **FR-013:** Initial database setup or seed SHOULD ensure standard OC campus areas (`Athletics`, `Support Central`, and `Maintenance`) exist with valid notification emails if not already present.

---

## Assumptions

- Feature 1 sessions, roles (`requestor`, `admin`, `maintenance`), and `MenuBar` are already in place.
- Areas are a shared catalog. They are not private to the user who created them.
- Catalog create, edit, and delete happen in dialogs on a single view (`/area`).
- Feature 2 vehicles store `areaAssigned` as a string matching an area's `name`.
- Feature 6 will allow reservations to specify an optional area name, and Feature 7 uses the area's `notificationEmail` or area settings for custom pick-up instructions.
- This feature does not create vehicles, drivers, destinations, or reservations.

---

## Edge Cases

- A required field left blank on the form shows **Required field** and does not call the API.
- Duplicate `name`: HTTP `400` with `"Area name already exists."`.
- An invalid email for `notificationEmail` (e.g., missing `@` or domain): HTTP `400` with `"Notification email must be a valid email address."`.
- Blank `logo`: stored as `null` and displayed in the UI with a default campus area icon (`mdi-domain`).
- An area name longer than 50 characters: HTTP `400` with `"Area name cannot exceed 50 characters."`.
- An email longer than 255 characters: HTTP `400` with `"Notification email cannot exceed 255 characters."`.
- A logo longer than 255 characters: HTTP `400` with `"Logo cannot exceed 255 characters."`.
- Fetch, update, or delete for an `areaId` that does not exist: HTTP `404` with `"Area with id=<areaId> not found."`.
- Attempting to delete an area whose name is currently set on an existing vehicle in `vehicles.areaAssigned`: HTTP `400` with `"Cannot delete area currently assigned to vehicles."`.
- A `maintenance` or `requestor` call to any area endpoint: HTTP `403` with `"Admin role required."`.
- No session on `/area`: redirect to `/login`. An area API call with no token: HTTP `401`.
- A signed-in `requestor` or `maintenance` user opening `/area`: redirect to home. **Area** is not in their `MenuBar`.
- A `userId` sent with a create or update request is dropped. The stored row has no `userId`.

---

## Success Criteria

- **SC-001:** Every Gherkin scenario is covered by an automated test in the Test Coverage Map.
- **SC-002:** An admin can create, view, update, and delete an area on one screen using dialogs.
- **SC-003:** A requestor or maintenance user cannot access area endpoints (receives `403`).
- **SC-004:** **Area** is visible in `MenuBar` only for `admin`.
- **SC-005:** `npm test` passes, including `backend/tests/areas.test.js` and frontend tests.

---

## Data Ownership & Isolation

Areas are a shared system catalog. They have no `userId` and are not owned by an individual user.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `admin` can list all areas and fetch any area by ID |
| **Write scope** | `admin` only. Requestors and maintenance users receive `403` |
| **Create scope** | `admin` only. Requestors and maintenance users receive `403` |
| **Cross-user access** | Not applicable; catalog data is shared among admins. Non-admin calls return `403` |
| **UI scope** | The `/area` route and `MenuBar` item are accessible to `admin` only |
| **Implementation** | Role validation via `authenticate` and `requireAdmin` middleware |

---

## API Requirements

All endpoints are mounted at `/api/area`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/area/areas` | `admin` | Create a new area in the catalog |
| `GET` | `/api/area/areas` | `admin` | List all areas ordered by name ascending, then id ascending |
| `GET` | `/api/area/areas/:areaId` | `admin` | Fetch one area by ID |
| `PUT` | `/api/area/areas/:areaId` | `admin` | Update an area by ID |
| `DELETE` | `/api/area/areas/:areaId` | `admin` | Delete an area by ID |

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

**Forbidden (`403`):** `{ "message": "Admin role required." }` when caller is `maintenance` or `requestor`.

**Unauthorized (`401`):** when Bearer token is missing or invalid.

---

### List all — `GET /api/area/areas`

**Success** (`200`): a JSON array of areas, ordered by `name` ASC, then `id` ASC.

```json
[
  {
    "id": 1,
    "name": "Athletics",
    "logo": "athletics-logo.png",
    "notificationEmail": "athletics-transport@eagles.oc.edu",
    "createdAt": "2026-10-27T12:00:00.000Z",
    "updatedAt": "2026-10-27T12:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Maintenance",
    "logo": null,
    "notificationEmail": "maintenance-fleet@eagles.oc.edu",
    "createdAt": "2026-10-27T12:00:00.000Z",
    "updatedAt": "2026-10-27T12:00:00.000Z"
  }
]
```

---

### Get one — `GET /api/area/areas/:areaId`

**Success** (`200`): one area object.

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

Validation messages match the create table. A duplicate `name` is reported only when another area already has that name.

**Success** (`200`): `{ "message": "Area was updated successfully." }`

**Not found (`404`):** `{ "message": "Area with id=<areaId> not found." }`

---

### Delete — `DELETE /api/area/areas/:areaId`

**Success** (`200`): `{ "message": "Area was deleted successfully!" }`

**Conflict (`400`):** `{ "message": "Cannot delete area currently assigned to vehicles." }` when any vehicle has `vehicles.areaAssigned = area.name`.

**Not found (`404`):** `{ "message": "Area with id=<areaId> not found." }`

---

## Screen Requirements

### [View: Areas] — route `/area`, route name `areas`

- **Page Title:** **Areas** (or **Area Management**)
- **Access:** `admin` only. Unauthenticated redirects to `/login`. `requestor` or `maintenance` redirects to `/`.
- **Primary CTA:** **+ Add Area** (`oc-cta`) positioned above the list/search bar.
- **Search field:** Labeled **Search areas**. Filters the displayed area list in real-time by matching against `name` and `notificationEmail` case-insensitively.
- **Layout:** Two-column split layout (matching `Vehicles.vue`):
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
- **Empty state:** **No areas yet.** when the catalog is empty; **No areas match your search.** when a filter yields no results.
- **Loading state:** Progress circular / skeleton loader while fetching.
- **Error state:** `<v-alert type="error">` displaying API error message if loading fails.
- **Snackbars:**
  - Create success: **Area was created successfully.**
  - Update success: **Area was updated successfully.**
  - Delete success: **Area was deleted successfully!**
  - Failure: shows the error `message` from the API response.

### Dialogs

1. **Add Area Dialog**
   - Title: **Add Area**
   - Inputs:
     - **Area Name** (`name`, text, required, max 50 chars).
     - **Notification Email** (`notificationEmail`, text, required, max 255 chars).
     - **Area Logo** (`logo`, text, optional, max 255 chars, placeholder: e.g. `athletics-logo.png` or URL).
   - Validation: client validation prevents submit if required fields are missing or email is malformed.
   - Actions: **Cancel** (closes dialog), **Save Area** (primary submit).

2. **Edit Area Dialog**
   - Title: **Edit Area**
   - Inputs: same fields as Add Area, pre-populated with selected area data.
   - Actions: **Cancel**, **Save Changes**.

3. **Delete Confirmation Dialog**
   - Title: **Delete Area**
   - Message: **Are you sure you want to delete {name}?**
   - Actions: **Cancel**, **Delete** (color `error`).

### App Chrome

- Add **Area** to `MenuBar.vue` in the centered navigation group.
- Shown ONLY when `currentUser.role === 'admin'`.
- Hidden for `requestor` and `maintenance`.

---

## Key Entities

- **Area**: An operational division or department within Oklahoma Christian University (e.g., Athletics, Support Central, Maintenance).
  - Owns an area name, an optional logo image reference, and an administrative notification email address.
  - Referenced by vehicles (`vehicles.areaAssigned`) and upcoming reservation notifications.

---

## Data Model Requirements

### `areas` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING(50) | Required, unique. Trimmed string |
| `logo` | STRING(255) | Nullable. Trimmed string or `null` |
| `notificationEmail` | STRING(255) | Required. Valid email format |
| `createdAt` | DATE | Managed by Sequelize |
| `updatedAt` | DATE | Managed by Sequelize |

There is no `userId` column.

### Associations

| From | To | Relationship | On delete |
|------|----|--------------|-----------|
| `areas` | `vehicles` | one-to-many (logical via `vehicles.areaAssigned = areas.name`) | RESTRICT (deletion blocked if vehicles reference area) |

---

## Acceptance Criteria (Gherkin)

Shared baseline facts: Administrator `admin@eagles.oc.edu` signed in with role `admin`; Maintenance user `maint@eagles.oc.edu` with role `maintenance`; Requestor `jdoe@eagles.oc.edu` with role `requestor`.

### US-5.1 — View Area List Page

#### Scenario: Admin views Area in MenuBar and navigates to areas
* **Given** I am signed in as an administrator
* **When** I view the `MenuBar`
* **Then** **Area** is visible
* **When** I click **Area**
* **Then** the browser navigates to `/area`
* **And** the page title displays **Areas**

#### Scenario: Unauthenticated visitor is redirected to login
* **Given** I am not signed in
* **When** I navigate to `/area`
* **Then** I am redirected to `/login`

#### Scenario: Non-admin user is redirected to home
* **Given** I am signed in as a requestor or maintenance user
* **When** I navigate to `/area`
* **Then** I am redirected to `/`
* **And** **Area** is not visible in `MenuBar`

---

### US-5.2 — Create Area

#### Scenario: Admin creates a valid area
* **Given** I am signed in as an administrator on `/area`
* **When** I click **+ Add Area**
* **And** I enter area name `Athletics`, notification email `athletics@eagles.oc.edu`, and logo `athletics.png`
* **And** I click **Save Area**
* **Then** the API returns `201`
* **And** the dialog closes
* **And** the area catalog list displays `Athletics` with email `athletics@eagles.oc.edu`
* **And** a success snackbar displays **Area was created successfully.**

#### Scenario: Create area with optional logo omitted
* **Given** I am signed in as an administrator on `/area`
* **When** I click **+ Add Area**
* **And** I enter area name `Support Central` and notification email `support@eagles.oc.edu` and leave logo blank
* **And** I click **Save Area**
* **Then** the API returns `201`
* **And** the stored area has `logo` as `null`
* **And** the UI detail panel displays a default area icon

#### Scenario: Create area with missing name is rejected
* **Given** I am signed in as an administrator
* **When** I submit `POST /api/area/areas` with a blank `name` and valid `notificationEmail`
* **Then** the API returns `400` with `{ "message": "Area name cannot be empty." }`

#### Scenario: Create area with invalid email is rejected
* **Given** I am signed in as an administrator
* **When** I submit `POST /api/area/areas` with name `Campus Police` and notification email `not-an-email`
* **Then** the API returns `400` with `{ "message": "Notification email must be a valid email address." }`

#### Scenario: Create area with duplicate name is rejected
* **Given** an area exists with name `Athletics`
* **When** I submit `POST /api/area/areas` with name `Athletics` and email `other@eagles.oc.edu`
* **Then** the API returns `400` with `{ "message": "Area name already exists." }`

---

### US-5.3 — Read Area Catalog

#### Scenario: Admin reads area list in alphabetical order
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

#### Scenario: Admin sees Edit and Delete action controls
* **Given** an area `Athletics` exists
* **When** I view `Athletics` in the `/area` detail panel
* **Then** the **Edit area** button is visible
* **And** the **Delete area** button is visible

---

### US-5.5 — Edit Area

#### Scenario: Admin updates area details
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

#### Scenario: Admin deletes an unassigned area after confirmation
* **Given** an area exists with name `Temporary Area` and no vehicles are assigned to it
* **When** I click **Delete area** for `Temporary Area`
* **Then** a confirmation dialog opens with **Are you sure you want to delete Temporary Area?**
* **When** I click **Delete** in the confirmation dialog
* **Then** the API returns `200` with `{ "message": "Area was deleted successfully!" }`
* **And** `Temporary Area` is removed from the catalog list
* **And** a success snackbar displays **Area was deleted successfully!**

#### Scenario: Cancel delete keeps area
* **Given** an area exists with name `Athletics`
* **When** I click **Delete area** for `Athletics`
* **And** I click **Cancel** in the confirmation dialog
* **Then** the dialog closes
* **And** `Athletics` remains in the area catalog list

#### Scenario: Deleting area assigned to vehicles is rejected
* **Given** an area exists with name `Athletics`
* **And** a vehicle exists with `areaAssigned` equal to `Athletics`
* **When** I send `DELETE /api/area/areas/:areaId` for `Athletics`
* **Then** the API returns `400` with `{ "message": "Cannot delete area currently assigned to vehicles." }`
* **And** the area remains in the database

#### Scenario: Delete non-existent area returns 404
* **When** I send `DELETE /api/area/areas/999`
* **Then** the API returns `404` with `{ "message": "Area with id=999 not found." }`

---

### US-5.7 — Role-Based Access Control

#### Scenario: Requestor cannot call area endpoints
* **Given** I am signed in as a requestor
* **When** I send `GET /api/area/areas`, `POST /api/area/areas`, `PUT /api/area/areas/1`, or `DELETE /api/area/areas/1`
* **Then** each response status is `403` with `{ "message": "Admin role required." }`

#### Scenario: Maintenance user cannot call area endpoints
* **Given** I am signed in as a maintenance user
* **When** I send `GET /api/area/areas`, `POST /api/area/areas`, `PUT /api/area/areas/1`, or `DELETE /api/area/areas/1`
* **Then** each response status is `403` with `{ "message": "Admin role required." }`

#### Scenario: Unauthenticated request returns 401
* **Given** no authorization token is provided
* **When** I send `GET /api/area/areas`
* **Then** the API returns `401` with `{ "message": "Unauthorized! No token provided." }`

---

## Test Coverage Map

Each scenario above maps to at least one automated test.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-5.1 | Admin views Area in MenuBar and navigates to areas | `frontend/tests/MenuBar.test.js` | `Admin views Area in MenuBar and navigates to areas` |
| US-5.1 | Unauthenticated visitor is redirected to login | `frontend/tests/Areas.test.js` | `Unauthenticated visitor is redirected to login` |
| US-5.1 | Non-admin user is redirected to home | `frontend/tests/Areas.test.js` | `Non-admin user is redirected to home` |
| US-5.2 | Admin creates a valid area | `backend/tests/areas.test.js` | `Admin creates a valid area` |
| US-5.2 | Create area with optional logo omitted | `backend/tests/areas.test.js` | `Create area with optional logo omitted` |
| US-5.2 | Create area with missing name is rejected | `backend/tests/areas.test.js` | `Create area with missing name is rejected` |
| US-5.2 | Create area with invalid email is rejected | `backend/tests/areas.test.js` | `Create area with invalid email is rejected` |
| US-5.2 | Create area with duplicate name is rejected | `backend/tests/areas.test.js` | `Create area with duplicate name is rejected` |
| US-5.3 | Admin reads area list in alphabetical order | `backend/tests/areas.test.js` | `Admin reads area list in alphabetical order` |
| US-5.3 | Empty catalog displays empty state | `frontend/tests/Areas.test.js` | `Empty catalog displays empty state` |
| US-5.3 | Search filters area list | `frontend/tests/Areas.test.js` | `Search filters area list` |
| US-5.4 | Admin sees Edit and Delete action controls | `frontend/tests/Areas.test.js` | `Admin sees Edit and Delete action controls` |
| US-5.5 | Admin updates area details | `backend/tests/areas.test.js` | `Admin updates area details` |
| US-5.5 | Edit area with duplicate name of another area is rejected | `backend/tests/areas.test.js` | `Edit area with duplicate name of another area is rejected` |
| US-5.5 | Edit non-existent area returns 404 | `backend/tests/areas.test.js` | `Edit non-existent area returns 404` |
| US-5.6 | Admin deletes an unassigned area after confirmation | `backend/tests/areas.test.js` | `Admin deletes an unassigned area after confirmation` |
| US-5.6 | Cancel delete keeps area | `frontend/tests/Areas.test.js` | `Cancel delete keeps area` |
| US-5.6 | Deleting area assigned to vehicles is rejected | `backend/tests/areas.test.js` | `Deleting area assigned to vehicles is rejected` |
| US-5.6 | Delete non-existent area returns 404 | `backend/tests/areas.test.js` | `Delete non-existent area returns 404` |
| US-5.7 | Requestor cannot call area endpoints | `backend/tests/areas.test.js` | `Requestor cannot call area endpoints` |
| US-5.7 | Maintenance user cannot call area endpoints | `backend/tests/areas.test.js` | `Maintenance user cannot call area endpoints` |
| US-5.7 | Unauthenticated request returns 401 | `backend/tests/areas.test.js` | `Unauthenticated request returns 401` |

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

- Feature 5 establishes the authoritative list of campus areas (`name`), their logos, and administrative contact emails (`notificationEmail`).
- Feature 6 reservations associate a vehicle request with an area.
- Feature 7 uses the area's record to route area-specific pickup/return instructions and notifications.
