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