# Feature: Course Management

**Feature ID:** 3
**Branch pattern:** `feature/3-driver-management`
**Status:** Ready
**Created:** 2026-10-23
**Input:** Logged-in admin maintains a list of drivers on a single view via dialogs; drivers are users with valid credentials.
**Depends on:** [Feature 1 — User Authentication](feature-1-user-auth.md)

---

## User Stories

### US-3.1: View Driver List Page

**As a** singed-in admin
**I want to** select "Driver" from the navigation menu
**So that** I can access the driver management screen
 
**Priority:** P1
**Independent test:** Verify clicking "Driver" in MenuBar redirects to /driver view
**Acceptance scenarios:** See ### US-3.1 under Acceptance Criteria

### US-3.2: Create Driver

**As a** signed-in admin
**I want to** create a new driver using a modal dialog
**So that** it is added to the list of valid drivers

**Priority:** P1
**Independent test:** Open modal, submit valid driver details, and check if it appears in the table
**Acceptance scenarios:** see ### US-3.2 under Acceptance Criteria


### US-3.3: Row Action Icons

**As a** signed-in admin
**I want to** see Edit and Delete icons on each row in the driver table
**So that** I can trigger actions directly for a specific driver

**Priority:** P1
**Independent test:** Verify row action buttons are rendered for every driver entry
**Acceptance scenarios:** see ### US-3.3 under Acceptance Criteria

### US-3.4: Edit Driver
**As a** signed-in admin
**I want** to update an existing driver's details
**So that** the driver information remains accurate

**Priority:** P2
**Independent test:** Edit driver liscense expiration date/status and confirm changes persist in the list
**Acceptance scenarios:** see ### US-3.4 under Acceptance Criteria

### US-3.5: Delete Driver

**As a** signed-in admin
**I want** to delete a driver after confirmation
**So that** obsolete drivers are removed from the system

**Priority:** P2
**Independent test:** Delete a driver via confirmation dialog and verify its removal
**Acceptance scenarios:** see ### US-3.5 under Acceptance Criteria

### US-3.6: Role-Based Menu Access

**As** the application
**I want** to restrict Driver visibility exclusively to admin and maintenance
**So that** maintenance or requestor users cannot modify the driver management view

**Priority:** P1
**Independent test:** Sign in as requestor to ensure "Driver" menu is disabled
**Acceptance scenarios:** see ### US-3.6 under Acceptance Criteria

### US-3.7: Role-Based Access Control

**As** the application
**I want** to restrict Driver list modifications exclusively to admin
**So that** maintenance or requestor users cannot modify the driver management view

**Priority:** P1
**Independent test:** Sign in as maintenance or requestor to ensure editing or deleting a "Driver" yields a 403
**Acceptance scenarios:** see ### US-3.7 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001:** All driver endpoints MUST require authentication (`authenticate` middleware). 
- **FR-002:** `GET /vehicle-t4/drivers` MUST be accessible by any authenticated user.
-**FR-003:**  `POST`, `PUT`, and `DELETE` endpoints MUST be restricted strictly to users with `req.user.role === "admin"`.
-**FR-004:** Drivers MUST be stored as a list of approved drivers without a `userId` field.
-**FR-005:** If a `Maintenance` or `Requestor` user attempts a `POST`, `PUT`, or `DELETE` request, the API MUST return HTTP status `403 Forbidden` with `{ "message": "Admin role required." }`.
-**FR-006:** All input strings MUST be trimmed. Submissions containing empty or whitespace-only strings for required fields MUST be rejected with HTTP `400 Bad Request`.
-**FR-007:** Requests without a valid session token MUST yield HTTP `401 Unauthorized`. Unauthenticated route navigation to `/driver` MUST redirect to `/login`.
-**FR-008:** The driver list MUST be sorted alphabetically by `lastName` by default.
-**FR-009:** `lastName` MUST be required, and max 50 characters long. Duplicate or overlay long values MUST return HTTP `400 Bad Request`.

## Assumptions

- Feature 1 user authentication is merged and active on `dev`.
- The `MenuBar` component exists and supports conditional rendering based on user role.
- Drivers represent a list rather than user-based resources.
- Driver interactions use modal dialogs on a single view (`Drivers.vue`) rather than split-scren views.
- Feature 6 (Reservation) will associate `driverId` with reservations at a larger stage.

---

## Edge Cases

- Missing required fields: triggers client-side validation ("Required field") without making API calls.
- Duplicate `courseNumber`: API returns HTTP `400 Bad Request` with `"Course number already exists"`.
- Invalid ID on Update/Delete: API returns HTTP `404 Not Found` with `"Course with id= not found."`.
- Faculty Mutation Attempt: API returns HTTP `403 Forbbiden`.
- Unauthenticated Access: Direct navigation to `/course` redirects to `/login`; API calls return HTTP `401`.

## Success criteria

- **SC-001**: Every Gherkin scenario is covered by automated unit/integration tests.
- **SC-002**: Admin can perform complete CRUD operations on drivers within a single screen using dialogs.
- **SC-003**: Maintenance or Requestor users can perform GET requests but don't have mutation access.
- **SC-004**: All test suites (`npm test`) pass completely without failiures.

## Data Ownership & Isolation

Drivers belong to a list and are not tied to individual user accounts (`userId` is not present in the course schema). Admin manage list entries, while mainenance users have read-only access, and requestors have no access.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /vehicle/drivers` returns all drivers and is accessible by any authenticated user. |
| **Write scope** | `PUT` / `DELETE` `/vehicle/drivers/:driverId` succeed only when `req.user.role === "admin"`. Maintenance or Requestor mutation attempts return `403`. |
| **Create scope** | `POST /vehicle/drivers` requires a valid admin session (`req.user.role === "admin"`). Driver data is saved without a `userId` owner field. |
| **Cross-user access** | Any admin can update or delete drivers in the list. No `userId` validation exists for driver rows. |
| **UI scope** | `Driver.vue` view and `Driver` option in `MenuBar` render exclusively when logged in as `admin` or `maintenance`. |
| **Implementation** | `authenticate` middleware in `backend/app/routes/` verifies session. Role check confirms `req.user.role === "admin"` for mutations (`POST`, `PUT`, `DELETE`). |

---

## Key Entities



---

## API Requirements

Mount prefix: `/driver` (see `backend/server.js`). Flat JSON; errors `{ "message": "..." }`. Do not wrap in `{ success, data }`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/vehicle/drivers` | Yes (`admin`) | Create a driver |
| `GET` | `/vehicle/drivers` | Yes | List all drivers, sorted by `lastName` ascending |
| `PUT` | `/vehicle/drivers/:driverId` | Yes (`admin`) | Update a driver |
| `DELETE` | `/vehicle/drivers/:driverId` | Yes (`admin`) | Delete a driver |

### Create – `POST /vehicle/drivers`



---

## Screen Requirements



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
| `Status`               | STRING     | Required       |

### Associations

- `Driver` hasMany `Reservations` – `onDelete: CASCADE` (child CRUD is Feature 6)
- `Reservations` belongsTo `Driver`

---

## Acceptance Criteria (Gherkin)

### US-3.1 – View Driver List Page

#### Scenario: Signed-in faculty navigates to course page

- **Given** I am signed in as a faculty
- **When** I select **Course** from the navigation menu
- **Then** I am redirected to the `/course` view
- **And** the course management screen is displayed

#### Scenario: Signed-in faculty navigates to course page

- **Given** I am signed in as a faculty
- **When** I select **Course** from the navigation menu
- **Then** I am redirected to the `/course` view
- **And** the course management screen is displayed

#### Scenario: Signed-in student navigates to course page

- **Given** I am signed in as a student
- **When** I select **Course** from the navigation menu
- **Then** I am redirected to the `/course` view
- **And** the course management screen is displayed

---

### US-3.2 – Create Driver

#### Scenario: Signed-in admin creates a new driver

- **Given** I am signed in as a admin on the driver page
- **When** I click **Add Driver**
- **Then** the driver modal dialog opens
- **When** I enter driver first name `Jaxen`, last name `Roden`, drivers license number `11111111`, drivers license expiration date `2030-09-20`, insurance number `11111111`, insurance provider `root`, approved date `2026-10-28`, and status `valid`
- **And** I click **Save**
- **Then** `POST /vehicle/drivers` returns `201` with a course whose `lastName` is `Roden`
- **And** `Jaxen Roden - Valid` appears in the driver table
- **And** I see a snackbar **`Driver added successfully!`**

#### Scenario: Create without course number is rejected

- **Given** I am signed in as a faculty
- **When** I send `POST /course/courses` with a body missing `courseNumber`
- **Then** the API returns `400` with `{ "message": "Course Number cannot be empty for course!" }`

#### Scenario: Create without course name is rejected

- **Given** I am signed in as a faculty
- **When** I send `POST /course/courses` with a body missing `courseName`
- **Then** the API returns `400` with `{ "message": "Course Name cannot be empty for course!" }`

---

### US-3.3 – Row Action Icons

#### Scenario: Row action buttons visible for faculty

- **Given** I am signed in as a faculty on the course page
- **When** I view the course data table
- **Then** I see **Edit** (pencil icon) and **Delete** (trash icon) buttons rendered on each course row

---

### US-3.4 – Edit Driver

#### Scenario: Signed-in faculty updates course details

- **Given** I am signed in as a faculty on the course page
- **And** a course `Intro to CS` exists with term `Spring`
- **When** I click the **Edit** icon on `Intro to CS`
- **Then** the edit course modal dialog opens
- **When** I change term to `Fall`
- **And** I click **Update Course**
- **Then** `PUT /course/courses/:courseId` returns `{ "message": "Course was updated successfully." }`
- **And** `Intro to CS` shows updated term of `Fall` in the data table
- **And** I see a snackbar **`Intro to CS updated successfully!`**

---

### US-3.5 – Delete Driver

#### Scenario: Signed-in faculty deletes a course with confirmation

- **Given** I am signed in as a faculty on the course page
- **And** a course `Intro to CS` exists in the table
- **When** I click the **Delete** icon on `Intro to CS`
- **Then** a deletion confirmation dialog appears
- **When** I confirm the deletion
- **Then** `DELETE /course/courses/:courseId` returns `200`
- **And** `Intro to CS` is removed from the course table
- **And** I see a snackbar **`Course deleted successfully!`**

---

### US-3.6 – Role-Based Menu Access

#### Scenario: Student user edit access restricted

- **Given** I am signed in as student
- **When** I view the navigation menu
- **Then** the **Course** option is there
- **When** I send a direct `POST /course/courses`, `PUT /course/courses/:id`, or `DELETE /course/courses/:id` request
- **Then** the API returns `403` Forbidden
- **And** course catalog data remains unchanged

#### Scenario: Student user GET access 

- **Given** I am signed in as student
- **When** I view the navigation menu
- **Then** the **Course** option is there
- **When** I send a direct `GET /course/courses` or `GET /course/courses/:id` request
- **Then** the API returns `200` with the data
- **And** course catalog data remains unchanged

#### Scenario: Student user view list of courses access 

- **Given** I am signed in as student
- **When** I click the **Course** option on the navigation menu
- **Then** the list of courses is viewable
- **When** I send a direct `GET /course/courses` or `GET /course/courses/:id` request
- **Then** the API returns `200` with the data
- **And** course catalog data remains unchanged

### US-3.7 – Role-Based Access Control



---

## Test Coverage Map

Each Gherkin scenario above maps to at least one automated test. Admin creates, updates, and deletes courses. Signed-in admin or maintenance can open **Driver** and read the list. A requester `POST`, `PUT`, or `DELETE` returns `403`. A requester can `GET` the list.

| Story | Scenario | Test file | Test name |
| ----- | -------- | --------- | --------- |



---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 3 from @features/feature-3-course-management.md on branch `feature/3-course-management`.

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
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Destination CRUD / **Destination** nav item ([Feature 4](feature-4-destination-management.md))
- Area CRUD / **Area** nav item ([Feature 5](feature-5-area-management.md))
- Reservation CRUD / **Reservation** nav item ([Feature 6](feature-6-reservation-management.md))
- Email CRUD / **Email** nav item ([Feature 7](feature-7-email.management.md))
- Admin Page / **Admin Page** nav item ([Feature 8](feature-8-admin-page.md))

---

## Delivered to later features

- A driver is a list row (`firstName`, `lastName`, `driverLicenseNumber`, `driverLicenseExpDate`, `insuranceProvider`, `insuranceNumber`, `approvedDate`, `status`) with no `userId`. Admin create, update, and delete it. Any signed-in user can read it.
- **Driver** in `MenuBar` routes signed-in users to `/driver`. This feature does not add a second `MenuBar`.
- Feature 4 adds **Destination** (allowed role `admin`) to this `MenuBar`.
- Feature 5 adds **Area** (allowed role `admin`) to this `MenuBar`.
- Feature 6 adds **Reservation** (allowed role `requestor`) to this `MenuBar` and owns reservation rows in driver.
- Feature 7 adds **Email** (allowed role `admin`) to this `MenuBar`.
- Feature 8 adds **Admin Page** (allowed role `admin`) to this `MenuBar`.
