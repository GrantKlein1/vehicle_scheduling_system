# Feature: Admin Page

**Feature ID:** 8
**Branch pattern:** `feature-8-admin-page`
**Status:** Ready
**Created:** 2026-03-30
**Input:** Dedicated administrative schedule and management interface accessible exclusively to admin users for overseeing system resources, schedules, and administrative controls
**Depends on:** [Feature 1 — User Authentication](feature-1-user-auth.md)
**Related:** `features/reference/api.md`, `features/reference/data-model.md`, `features/reference/behavior.md`

---

## User Stories

### US-8.1: Access Admin Page restricted by role

**As an** admin user
**I want to** access a dedicated admin page/schedule view
**So that** I can oversee all system reservations, schedules, and administrative controls securely

**Priority:** P1
**Independent test:** Log in as an admin, navigate to `/admin`, and view the admin schedule interface successfully
**Acceptance scenarios:** see ### US-8.1 under Acceptance Criteria

### US-8.2: Block non-admin access to Admin Page

**As a** requestor or maintenance user
**I want to** be prevented from accessing the admin page
**So that** regular users and maintenance staff cannot view or alter administrative schedules/controls

**Priority:** P1
**Independent test:** Attempt to navigate to `/admin` as a requestor or maintenance user -> redirected or blocked with `403` Forbidden
**Acceptance scenarios:** see ### US-8.2 under Acceptance Criteria

### US-8.3: Admin MenuBar integration

**As an** admin user
**I want** the `MenuBar` to include the Admin navigation link
**So that** I can easily switch to the admin schedule view from any page in the application

**Priority:** P1
**Independent test:** After logging in as admin, the `MenuBar` displays the Admin link; clicking it routes to `/admin`
**Acceptance scenarios:** see ### US-8.3 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-801**: The application MUST provide a protected route and view for the admin page/schedule (route name `admin`, path `/admin`).
- **FR-802**: Access to the `admin` route and its backing APIs MUST be strictly restricted to users with the `admin` role. Any attempt by a non-admin user (requestor, maintenance) MUST be rejected with HTTP `403`.
- **FR-803**: Unauthenticated requests to admin endpoints MUST return HTTP `401`.
- **FR-804**: Feature 8 MUST add the **Admin** nav item to the existing `MenuBar` exclusively for users with the `admin` role. Requestors and maintenance users MUST NOT see the Admin link.
- **FR-805**: The admin page MUST display the comprehensive system schedule / administrative overview as specified by product requirements.

---

## Assumptions

- Only users with the `admin` role can access the admin page and associated admin schedule APIs.
- `MenuBar` is already introduced in Feature 1 and updated by intermediate features; Feature 8 appends the Admin nav item for admins.
- Backend middleware will verify both authentication (valid token) and authorization (`role === 'admin'`).

---

## Edge Cases

- A requestor or maintenance user manually types the URL `/admin` → redirected away or shown an unauthorized error message, and backend API returns `403`.
- An unauthenticated user accesses `/admin` or admin APIs → redirected to login / API returns `401`.

---

## Success Criteria

- **SC-801**: Every Gherkin scenario in this feature has at least one automated test before merge.
- **SC-802**: An admin user can successfully navigate to the admin page via the `MenuBar` and view the admin schedule.
- **SC-803**: Non-admin users are successfully blocked from viewing the admin page or calling admin endpoints.
- **SC-804**: `npm test` passes with backend and frontend coverage for admin role checks and page rendering.
---

## Data Ownership & Isolation

Admin APIs and views allow administrative oversight across system schedules and resources per product authorization rules. Non-admin roles have zero access to admin data endpoints.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /vehicle-t4/admin/schedule` (or matching admin endpoint) is restricted exclusively to authenticated users with `role === 'admin'`. |
| **Write/Access scope** | `403` returned if authenticated user lacks the `admin` role. `401` returned if unauthenticated. |
| **UI scope** | Admin page and **Admin** nav item in `MenuBar` render only when `user.role === 'admin'`. |

---

## Key Entities

- **Admin Schedule / View**: The primary dashboard interface for administrators to monitor system-wide activities.
- **User Role**: Verified via session token/payload to enforce administrative restrictions.

---

## API Requirements

Mount prefix: `/vehicle-t4` (see `backend/server.js`). Flat JSON; errors `{ "message": "…" }`. Do not wrap in `{ success, data }`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/vehicle-t4/admin/schedule` | Yes (admin) | Retrieve comprehensive schedule data for the admin view |

**Error responses:**
- Unauthorized: `401` with `{ "message": "Unauthorized" }`
- Forbidden (non-admin role): `403` with `{ "message": "Forbidden" }`

---

## Screen Requirements

### [View: Admin Page] — route name `admin` (`/admin`)

Accessible only to users with the `admin` role.

- **Heading**: Admin Page / Management
- **Content**: Displays the administrative schedule overview and management tools.
- **App chrome**: Standard application `MenuBar` at the top with the **Admin** navigation item visible only when `user.role === 'admin'`.

---

## Acceptance Criteria (Gherkin)

### US-8.1 — Access Admin Page restricted by role

#### Scenario: Admin successfully accesses the admin page

- **Given** I am signed in as a user with role `admin`
- **When** I navigate to the admin page (`/admin`)
- **Then** I am successfully shown the admin schedule interface
- **And** the API request to fetch admin data returns `200`

---

### US-8.2 — Block non-admin access to Admin Page

#### Scenario: Requestor is blocked from the admin page

- **Given** I am signed in as a user with role `requestor`
- **When** I attempt to navigate to `/admin`
- **Then** I am redirected or shown a forbidden message
- **And** any direct API call to admin endpoints returns `403`

#### Scenario: Maintenance is blocked from the admin page

- **Given** I am signed in as a user with role `maintenance`
- **When** I attempt to navigate to `/admin`
- **Then** I am redirected or shown a forbidden message
- **And** any direct API call to admin endpoints returns `403`

---

### US-8.3 — Admin MenuBar integration

#### Scenario: Admin sees Admin nav item in MenuBar

- **Given** I am signed in as a user with role `admin`
- **When** I view the `MenuBar`
- **Then** the **Admin** navigation item is displayed

#### Scenario: Non-admin does not see Admin nav item in MenuBar

- **Given** I am signed in as a user with role `requestor`
- **When** I view the `MenuBar`
- **Then** the **Admin** navigation item is **not** displayed

---

## Test Coverage Map

Each scenario above must map to at least one automated test.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-8.1 | Admin successfully accesses the admin page | `backend/tests/admin.test.js`, `frontend/tests/Admin.test.js` | `it("Admin successfully accesses the admin page")` |
| US-8.2 | Requestor is blocked from the admin page | `backend/tests/admin.test.js`, `frontend/tests/router.test.js` | `it("Requestor is blocked from the admin page")` |
| US-8.2 | Maintenance is blocked from the admin page | `backend/tests/admin.test.js`, `frontend/tests/router.test.js` | `it("Maintenance is blocked from the admin page")` |
| US-8.3 | Admin sees Admin nav item in MenuBar | `frontend/tests/MenuBar.test.js` | `it("Admin sees Admin nav item in MenuBar")` |
| US-8.3 | Non-admin does not see Admin nav item in MenuBar | `frontend/tests/MenuBar.test.js` | `it("Non-admin does not see Admin nav item in MenuBar")` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 8 from @features/feature-8-admin-page.md on branch `feature-8-admin-page`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.

**Reference updates for this feature:** `features/reference/api.md`,`features/reference/data-model.md`,`features/reference/behavior.md`

## Definition of Done

- [ ] Backend and frontend implemented per this spec (**FR-801**–**FR-805** satisfied)
- [ ] **Success Criteria (SC-801**–**SC-804)** met
- [ ] All mapped tests pass (`npm test`)
- [ ] Test Coverage Map complete
- [ ] `features/reference/data-model.md` updated (if schema changed)
- [ ] `features/reference/api.md` updated (if API changed)
- [ ] `features/reference/behavior.md` updated (if product rules changed)

## Out of Scope

- Modifying non-admin user roles directly from this page
- Changes to authentication mechanism ([Feature 1](./feature-1-user-auth.md))

## Delivered to Feature 8

- `MenuBar` includes the **Admin** navigation item for `admin` role users.
- Admin schedule view is fully functional at `/admin`.