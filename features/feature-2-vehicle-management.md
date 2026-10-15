# Feature: Vehicle Management

**Feature ID:** 2
**Branch pattern:** `feature/2-vehicle-management`
**Status:** Draft
**Created:** 2026-10-03
**Input:** Logged-in admin maintains a shared catalog of vehicles on a single view via dialogs; vehicles are not tied to a userId
**Depends on:** [Feature 1 — User Authentication](feature-1-user-auth.md)

---

## User Stories

### US-3.1: View Vehicle List Page

**As a** singed-in admin
**I want to** select "Vehicle" from the navigation menu
**So that** I can access the vehicle management screen
 
**Priority:** P1
**Independent test:** Verify clicking "Vehicle" in MenuBar redirects to /course view
**Acceptance scenarios:** See ### US-3.1 under Acceptance Criteria

### US-3.2: Create Vehicle

**As a** signed-in admin
**I want to** create a new vehicle using a modal dialog
**So that** it is added to the shared application catalog

**Priority:** P1
**Independent test:** Open modal, submit valid vehicle details, and check if it appears in the table
**Acceptance scenarios:** see ### US-3.2 under Acceptance Criteria


### US-3.3: Read Vehicle Catalog

**As a** signed-in admin
**I want to** view the list of all vehicles in the catalog
**So that** I can review existing vehicle details

**Priority:** P1
**Independent test:** Verify that vehicles returned by API are listed in the data table
**Acceptance scenarios:** see ### US-3.3 under Acceptance Criteria

### US-3.4: Row Action Icons

**As a** signed-in admin
**I want to** see Edit and Delete icons on each row in the vehicle table
**So that** I can trigger actions directly for a specific vehicle

**Priority:** P1
**Independent test:** Verify row action buttons are rendered for every vehicle entry
**Acceptance scenarios:** see ### US-3.4 under Acceptance Criteria

### US-3.5: Edit Vehicle
**As a** signed-in admin
**I want** to update an existing vehicle's details
**So that** the catalog information remains accurate

**Priority:** P2
**Independent test:** Edit vehicle information and confirm changes persist in the list
**Acceptance scenarios:** see ### US-3.5 under Acceptance Criteria

### US-3.6: Delete vehicle

**As a** signed-in admin
**I want** to delete a vehicle after confirmation
**So that** obsolete vehicles are removed from the system

**Priority:** P2
**Independent test:** Delete a vehicle via confirmation dialog and verify its removal
**Acceptance scenarios:** see ### US-3.6 under Acceptance Criteria

### US-3.7: Role-Based Access Control

**As** the application
**I want** to restrict vehicle catalog modifications and menu visibility exclusively to admins
**So that** student users cannot modify or see the course management view

**Priority:** P1
**Independent test:** Sign in as maintenance AND requestor to ensure editing or deleting a "Vehicle" yields a 403
**Acceptance scenarios:** see ### US-3.7 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001:** All vehicle endpoints MUST require authentication (`authenticate` middleware). 
- **FR-002:** `GET`, `POST`, `PUT`, and `DELETE` MUST be accessible by any authenticated admin user.
- **FR-003:** `GET`, `POST`, `PUT`, and `DELETE` endpoints MUST be restricted strictly to users with `req.user.role === "admin"`.
- **FR-004:** Vehicles MUST be stored as a shared catalog without a `userId` field. Any `userId` supplied in the request body MUST be ignored.
- **FR-005:** If a `maintenance` or `requestor` user attempts a `GET`, `POST`, `PUT`, or `DELETE` request, the API MUST return HTTP status `403 Forbidden` with `{ "message": "Admin role required." }`.
- **FR-006:** All input strings MUST be trimmed. Submissions containing empty or whitespace-only strings for required fields MUST be rejected with HTTP `400 Bad Request`.
- **FR-007:** Requests without a valid session token MUST yield HTTP `401 Unauthorized`. Unauthenticated route navigation to `/vehicle` MUST redirect to `/login`.
- **FR-008:** The vehicle list MUST be sorted alphabetically by `Make` by default.
- **FR-009:** `LicensePlateNumber` MUST be required, unique, and max 10 characters long. Duplicate or overly long values MUST return HTTP `400 Bad Request`.
- **FR-010:** `VIN` MUST be required, unique, and max 20 characters long. Duplicate or overly long values MUST return HTTP `400 Bad Request`.

## Assumptions

- Feature 1 user authentication is merged and active on `dev`.
- The `MenuBar` component exists and supports conditional rendering based on user role.
- Vehicles represent a shared global catalog rather than user-based resources.
- Vehicle interactions use modal dialogs on a single view (`Courses.vue`) rather than split-scren views.
- Feature 6 (Reservations) will associate `vehicleId` with a specific reservation when they are made and select that vehicle.

---

## Edge Cases

- Missing required fields: triggers client-side validation ("Required field") without making API calls.
- Duplicate `VIN`: API returns HTTP `400 Bad Request` with `"VIN already exists"`.
- Duplicate `LicensePlateNumber`: API returns HTTP `400 Bad Request` with `"License Plate Number already exists"`.
- Invalid ID on Update/Delete: API returns HTTP `404 Not Found` with `"Vehicle with id= not found."`.
- Admin Mutation Attempt: API returns HTTP `403 Forbbiden`.
- Unauthenticated Access: Direct navigation to `/vehicle` redirects to `/login`; API calls return HTTP `401`.

## Success criteria

- **SC-001**: Every Gherkin scenario is covered by automated unit/integration tests.
- **SC-002**: Admin can perform complete CRUD operations on courses within a single screen using dialogs.
- **SC-003**: Maintenance and Requestor users cannot perform GET, POST, PUT, DELETE requests on vehicles.
- **SC-004**: All test suites (`npm test`) pass completely without failiures.

## Data Ownership & Isolation

Vehicle belong to a global shared catalog and are not tied to individual user accounts (`userId` is not present in the vehicle schema). Admin manage catalog entries.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /vehicle/vehicles` returns all shared courses and is accessible by any authenticated admin user (`admin`). |
| **Write scope** | `PUT` / `DELETE` `/vehicle/vehicles/:vehicleId` succeed only when `req.user.role === "admin"`. Maintenance and Requestor mutation attempts return `403`. |
| **Create scope** | `POST /vehicle/vehicles` requires a valid faculty session (`req.user.role === "admin"`). Vehicle data is saved without a `userId` owner field. |
| **Cross-user access** | Any admin can update or delete courses in the shared catalog. No `userId` validation exists for admin rows. |
| **UI scope** | `Vehicles.vue` view and `Vehicles` option in `MenuBar` render exclusively when logged in as `admin`. |
| **Implementation** | `authenticate` middleware in `backend/app/routes/` verifies session. Role check confirms `req.user.role === "admin"` for any action (`GET`, `POST`, `PUT`, `DELETE`). |

---

## Key Entities

- **Vehicle**: shared vehicle row in global catalog (no `userId` owner); has Make (combo box with std list), Model (combo box with std list), Year, VIN, Purchased Date, Mileage Log (date, current mileage), Service Log (date, service performed), Color, Number of passengers (capacity), License Plate Number, License Plate Expiration Month, Area Assigned, Car Type (SUV, Golf Cart, etc… for Driver approval list)
- **User / Session**: required for vehicle list view navigation, modal CRUD and read actions (`admin` role), and role checks (Feature 1).

---

## API Requirements

Mount prefix: `/vehicle` (see `backend/server.js`). Flat JSON; errors `{ "message": "..." }`. Do not wrap in `{ success, data }`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/vehicle/vehicles` | Yes (`admin`) | Create a vehicle |
| `GET` | `/vehicle/vehicles` | Yes | List all vehicles, sorted by `Make` ascending |
| `GET` | `/vehicle/vehicles/:vehicleId` | Yes | Fetch one vehicle |
| `PUT` | `/vehicle/vehicles/:vehicleId` | Yes (`admin`) | Update a vehicle |
| `DELETE` | `/vehicle/vehicles/:vehicleId` | Yes (`admin`) | Delete a vehicle |

### Create – `POST /vehicle/vehicles`

**Request body:**

```json
{
  "courseNumber": "CS101",
  "courseName": "Introduction to Computer Science",
  "courseDescription": "Basic programming concepts.",
  "courseTerm": "Fall/Spring/Summer/Winter",
  "sections": "{[sectionsHere]}"
}
```

**Success** (`201`): course row JSON including `id`, `courseNumber`, `courseName`, `courseDescription`, `courseTerm`, `sections`, timestamps.

**Errors (`400`):**

| Condition | `message` |
|-----------|-----------|
| Missing `courseNumber` | `Course Number cannot be empty for course!` |
| Missing `courseName` | `Course Name cannot be empty for course!` |
| Missing `courseTerm` | `Course Term cannot be empty for course!` |
| Duplicate `courseNumber` | `Course number already exists.` |

**Unauthorized:** `401` when the Bearer token is missing or invalid.

### List all – `GET /course/courses`

**Success** (`200`): JSON array of all courses, ordered by `courseName` ASC.

### Get one – `GET /course/courses/:courseId`

**Success** (`200`): JSON **array** of matching courses (running controller uses `findAll`). The editor reads `response.data[0]`.

### Update – `PUT /course/courses/:courseId`

**Request body:** course fields to change (at least `courseNumber`, `courseName`, `courseDescription`, `courseTerm` as edited on screen).

**Success:** `{ "message": "Course was updated successfully." }`

**Not found / not owned:** `404` `{ "message": "Cannot find Course with id=." }`

### Delete – `DELETE /course/courses/:courseId`

**Success:** `{ "message": "Course was deleted successfully!" }`

**Not found / not owned:** `404` `{ "message": "Cannot find Course with id=." }`

**Error response (all):** `{ "message": "Human-readable explanation." }`

---

## Screen Requirements

Follow [ui-style-system.mdc](../.cursor/rules/ui-style-system.mdc) for theme tokens. Labels below match the running Course UI.

### [View: Course list] – route name `courses` (`/courses`)

Feature 1 already specifies who may open this screen and the list navigation. This feature adds signed-in create, edit, and delete actions for `faculty` role.

**Shell**

- Heading: **Courses**
- Primary action: **Add Course** (`v-if="user && user.role === 'faculty'"`) – faculty role only
- **Error:** snackbar with API `message`
- No empty-state copy in the running view – do not invent one

**Course cards** (`CourseCardComponent`)

- Show **courseNumber**, **courseName**, **courseTerm** and **courseDescription**
- Click the card to expand/collapse details. Expanded section rows are display-only here; add/edit/delete of section rows is Feature 5
- Pencil icon (`mdi-pencil`) opens **Edit Course** modal or navigates to `editCourse` with that course's `id`; `aria-label`: **Edit course**
- Trash icon (`mdi-delete`) prompts delete confirmation and removes course on success; `aria-label`: **Delete course**

**Add Course dialog** (`v-dialog`)

- Title: **Add Course**
- Fields: **Course Number**, **Course Name**, **Description**, **courseTerm**
- Actions: **Close**, **Add Course**
- On success: close dialog, refresh list, snackbar **`{courseName} added successfully!`**
- On failure: error snackbar with API `message`

### [View: Edit course] – route name `editCourse` (`/course/:id`)

Session required (Feature 1). This feature owns the course **metadata** form only.

- Heading: **Edit Course**
- Fields: **Course Number**, **Course Name**, **Description**, **courseTerm**
- Primary action: **Update Course**
- On success: snackbar **`{courseName} updated successfully!`**, then reload the course
- On failure: error snackbar with API `message`
- **Sections** cards, **Add** / pencil / trash on those rows are Feature 5

### App chrome

- MenuBar **Courses** already routes here (Feature 1). This feature does not add nav items.

---

## Data Model Requirements

### `courses` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `courseNumber` | STRING | Required |
| `courseName` | STRING | Required |
| `courseDescription` | STRING | Optional |
| `courseTerm` | STRING | Required |

### Associations

- `Course` hasMany `Section` – `onDelete: CASCADE` (child CRUD is Feature 5)
- `Section` belongsTo `Course`

---

## Acceptance Criteria (Gherkin)

### US-3.1 – View Course List Page

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

### US-3.2 – Create Course

#### Scenario: Signed-in faculty creates a new course

- **Given** I am signed in as a faculty on the course page
- **When** I click **Add Course**
- **Then** the course modal dialog opens
- **When** I enter course number `CS101`, course name `Intro to CS`, course description `Basic concepts`, term `Spring`
- **And** I click **Save**
- **Then** `POST /course/courses` returns `201` with a course whose `courseNumber` is `CS101`
- **And** `Intro to CS` appears in the course table
- **And** I see a snackbar **`Intro to CS added successfully!`**

#### Scenario: Create without course number is rejected

- **Given** I am signed in as a faculty
- **When** I send `POST /course/courses` with a body missing `courseNumber`
- **Then** the API returns `400` with `{ "message": "Course Number cannot be empty for course!" }`

#### Scenario: Create without course name is rejected

- **Given** I am signed in as a faculty
- **When** I send `POST /course/courses` with a body missing `courseName`
- **Then** the API returns `400` with `{ "message": "Course Name cannot be empty for course!" }`

---

### US-3.3 – Read Course Catalog

#### Scenario: Signed-in faculty views courses catalog

- **Given** I am signed in as a faculty
- **When** I open the course management page
- **Then** `GET /course/courses` is called
- **And** all courses returned by the API are listed in the data table

---

### US-3.4 – Row Action Icons

#### Scenario: Row action buttons visible for faculty

- **Given** I am signed in as a faculty on the course page
- **When** I view the course data table
- **Then** I see **Edit** (pencil icon) and **Delete** (trash icon) buttons rendered on each course row

---

### US-3.5 – Edit Course

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

### US-3.6 – Delete Course

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

### US-3.7 – Role-Based Access Control

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

---

## Test Coverage Map

Each Gherkin scenario above maps to at least one automated test. Faculty creates, updates, and deletes courses. Signed-in students and faculty can open **Course** and read the catalog. A student `POST`, `PUT`, or `DELETE` returns `403`.

| Story | Scenario | Test file | Test name |
| ----- | -------- | --------- | --------- |
| US–3.1 | Signed-in faculty navigates to course page | `frontend/tests/CourseList.test.js` | `Signed-in faculty navigates to course page` |
| US–3.1 | Signed-in student navigates to course page | `frontend/tests/CourseList.test.js` | `Signed-in student navigates to course page` |
| US–3.2 | Signed-in faculty creates a new course | `backend/tests/courses.test.js`, `frontend/tests/CourseList.test.js` | `Signed-in faculty creates a new course` |
| US–3.2 | Create without course number is rejected | `backend/tests/courses.test.js` | `Create without course number is rejected` |
| US–3.2 | Create without course name is rejected | `backend/tests/courses.test.js` | `Create without course name is rejected` |
| US–3.3 | Signed-in faculty views courses catalog | `backend/tests/courses.test.js`, `frontend/tests/CourseList.test.js` | `Signed-in faculty views courses catalog` |
| US–3.4 | Row action buttons visible for faculty | `frontend/tests/CourseList.test.js` | `Row action buttons visible for faculty` |
| US–3.5 | Signed-in faculty updates course details | `backend/tests/courses.test.js`, `frontend/tests/CourseList.test.js` | `Signed-in faculty updates course details` |
| US–3.6 | Signed-in faculty deletes a course with confirmation | `backend/tests/courses.test.js`, `frontend/tests/CourseList.test.js` | `Signed-in faculty deletes a course with confirmation` |
| US–3.7 | Student user edit access restricted | `backend/tests/courses.test.js`, `frontend/tests/CourseList.test.js` | `Student user edit access restricted` |
| US–3.7 | Student user GET access | `backend/tests/courses.test.js` | `Student user GET access` |
| US–3.7 | Student user view list of courses access | `backend/tests/courses.test.js`, `frontend/tests/CourseList.test.js` | `Student user view list of courses access` |


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

- Faculty CRUD / **Faculty** nav item ([Feature 4](feature-4-faculty-management.md))
- Section CRUD / **Section** nav item ([Feature 5](feature-5-section-management.md))
- Enrollment CRUD / **Enrollment** nav item ([Feature 6](feature-6-enrollment-management.md))
- Student course listing / **Student Course Listing** nav item ([Feature 7](feature-7-student-course-listing.md))
- Section student listing / **Section Student Listing** nav item ([Feature 8](feature-8-section-student-listing.md))

---

## Delivered to later features

- A course is a shared catalog row (`courseNumber`, `courseName`, `courseDescription`, `courseTerm`) with no `userId`. Faculty create, update, and delete it. Any signed-in student or faculty can read it.
- **Course** in `MenuBar` routes signed-in students and faculty to `/course`. This feature does not add a second `MenuBar`.
- Feature 4 adds **Faculty** (allowed role `faculty`) to this `MenuBar`.
- Feature 5 adds **Section** (allowed role `faculty`) to this `MenuBar` and owns section rows on a course.
- Feature 6 adds **Enrollment** (allowed role `faculty` and `student`) to this `MenuBar`.
- Feature 7 adds **Student Course Listing** (allowed role `faculty`) to this `MenuBar`.
- Feature 8 adds **Section Student Listing** (allowed role `faculty`) to this `MenuBar`.
