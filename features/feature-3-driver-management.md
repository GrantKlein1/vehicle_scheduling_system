# Feature: Course Management

**Feature ID:** 3
**Branch pattern:** `feature/3-driver-management`
**Status:** done
**Created:** 2026-10-23
**Input:** Logged-in admin maintains a list of drivers on a single view via dialogs; drivers are users with valid credentials.
**Depends on:** [Feature 1 — User Authentication](feature-1-user-auth.md), [Feature 2 - Vehicle Management](feature-2-vehicle-management)

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

### US-3.6: Role-Based Access Control

**As** the application
**I want** to restrict Driver catalog modifications and menu visibility exclusively to admin
**So that** maintenance or requestor users cannot modify the driver management view

**Priority:** P1
**Independent test:** Sign in as maintenance or requestor to ensure editing or deleting a "Driver" yields a 403
**Acceptance scenarios:** see ### US-3.6 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001:** All driver endpoints MUST require authentication (`authenticate` middleware). 
- **FR-002:** `GET /vehicle-t4/drivers` MUST be accessible by any authenticated user (`Admin` and `Maintenance`).
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
- Courses represent a shared global catalog rather than user-based resources.
- Course interactions use modal dialogs on a single view (`Courses.vue`) rather than split-scren views.
- Feature 5 (Sections) will associate `courseId` with sections at a larger stage.

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
- **SC-003**: Maintenance users can perform GET requests but don't have mutation access.
- **SC-004**: Requestor users cannot perform CRUD operations on drivers.
- **SC-005**: All test suites (`npm test`) pass completely without failiures.

## Data Ownership & Isolation

Courses belong to a global shared catalog and are not tied to individual user accounts (`userId` is not present in the course schema). Faculty manage catalog entries, while student users have read-only access.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /course/courses` returns all shared courses and is accessible by any authenticated user (`faculty` or `student`). |
| **Write scope** | `PUT` / `DELETE` `/course/courses/:courseId` succeed only when `req.user.role === "faculty"`. Student mutation attempts return `403`. |
| **Create scope** | `POST /course/courses` requires a valid faculty session (`req.user.role === "faculty"`). Course data is saved without a `userId` owner field. |
| **Cross-user access** | Any faculty can update or delete courses in the shared catalog. No `userId` validation exists for course rows. |
| **UI scope** | `Courses.vue` view and `Course` option in `MenuBar` render exclusively when logged in as `faculty`. |
| **Implementation** | `authenticate` middleware in `backend/app/routes/` verifies session. Role check confirms `req.user.role === "faculty"` for mutations (`POST`, `PUT`, `DELETE`). |

---

## Key Entities

- **Course**: shared course row in global catalog (no `userId` owner); has `courseNumber`, `courseName`, `courseDescription`, `courseSemesters`, `courseFrequency`, `courseHours`, and `courseDept`; may have section rows (Feature 5).
- **User / Session**: required for course list view navigation, modal CRUD actions (`faculty` role), and role checks (Feature 1).

---

## API Requirements

Mount prefix: `/course` (see `backend/server.js`). Flat JSON; errors `{ "message": "..." }`. Do not wrap in `{ success, data }`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/course/courses` | Yes (`faculty`) | Create a course |
| `GET` | `/course/courses` | Yes | List all courses, sorted by `courseName` ascending |
| `GET` | `/course/courses/:courseId` | Yes | Fetch one course |
| `PUT` | `/course/courses/:courseId` | Yes (`faculty`) | Update a course |
| `DELETE` | `/course/courses/:courseId` | Yes (`faculty`) | Delete a course |

### Create – `POST /course/courses`

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
