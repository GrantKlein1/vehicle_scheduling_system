# Feature: User Authentication & Session Management

**Feature ID:** 1
**Branch pattern:** `feature/1-user-auth`
**Status:** Ready
**Created:** 2026-09-23
**Input:** Multi-user authentication via Google sign in with an OC account and get a session

---

## User Stories

### US-1.1: Register a new account with Google OAuth
**As a** new user  
**I want to** create an account via Google with my OC email and password  
**So that** I can sign in and do the activities allowed for my role

**Priority:** P1  
**Independent test:** Submit valid registration and land on protected home with `user` with their role in `localStorage`  
**Acceptance scenarios:** see ### US-1.1 under Acceptance Criteria

### US-1.2: An existing user signs in with Google
**As a** registered user  
**I want to** sign in with via Google with my OC email and password  
**So that** I can access the application dashboard securely

**Priority:** P1  
**Independent test:** Sign in with known credentials and receive session token + redirect to home  
**Acceptance scenarios:** see ### US-1.2 under Acceptance Criteria

### US-1.3: Stay signed in across page loads
**As a** signed-in user  
**I want** my session to persist in the browser  
**So that** I do not have to sign in again every time I refresh the page

**Priority:** P1  
**Independent test:** Refresh or revisit protected route with valid `localStorage` session — no re-login  
**Acceptance scenarios:** see ### US-1.3 under Acceptance Criteria

### US-1.4: Sign out
**As a** signed-in user  
**I want to** sign out  
**So that** no one else can use my account on a shared device

**Priority:** P2  
**Independent test:** Sign out from `MenuBar` clears server session and `localStorage`; user lands on login  
**Acceptance scenarios:** see ### US-1.4 under Acceptance Criteria

### US-1.5: Block unauthenticated access
**As the** application  
**I want to** require a valid session for all non-auth screens  
**So that** protected screens and APIs are only available with a valid session

**Priority:** P1  
**Independent test:** Navigate to protected route without session → redirect to login; API without token → `401`  
**Acceptance scenarios:** see ### US-1.5 under Acceptance Criteria

### US-1.6: Role-based MenuBar
**As a** signed-in user  
**I want** the `MenuBar` to show **Sign out** and only the nav items allowed for my `role`  
**So that** I can leave the session and I do not see tools for other roles

**Priority:** P1  
**Independent test:** After login, `MenuBar` is visible with **Sign out**; a `requestor` does not see admin nav items  
**Acceptance scenarios:** see ### US-1.6 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: The login page only offers the option of Google sign in
- **FR-002**: The backend accepts the Google credential, verifies it and rejects an invalid credential.
- **FR-003**: Only an OC Google account can complete sign in
- **FR-004**: Sessions MUST use a **JWT + Session table** pattern: token stored server-side; client sends `Authorization: Bearer <token>`. Successful registration MUST create a session and return the same payload as login, with HTTP `201`.
- **FR-005**: Session lifetime MUST be **24 hours** from creation.
- **FR-006**: Login MUST reuse a non-expired session for the same user (`userId`) when one already exists.
- **FR-007**: Allowed roles are `requestor`, `admin`, and `maintenance`. The database seed inserts exactly two users when those emails are not already present: `admin@eagles.oc.edu` (`fName` `Admin`, `lName` `User`, `role` `admin`, `googleSub` null) and `maint@eagles.oc.edu` (`fName` `Maintenance`, `lName` `User`, `role` `maintenance`, `googleSub` null). Sign-in does not change `role`. This feature has no screen for changing a role. Automated tests insert the users they need and do not depend on these two rows.
- **FR-008**: Every authenticated request MUST resolve to exactly one user via `req.user.id` from the session token (foundation for later features that need the signed-in user).
- **FR-010**: This feature MUST **introduce** `MenuBar` in `App.vue` (`<MenuBar />` above `<v-main>`). `MenuBar` MUST be visible on `login` and `home`.
- **FR-011**: `MenuBar` MUST show the signed-in user's name and **Sign out** on every page while a session exists, for every role. When there is no session, the name and **Sign out** MUST be hidden. A signed-in user who opens `login` MUST be redirected to `home`.
- **FR-012**: `MenuBar` nav items MUST be filtered by the signed-in user's `role` from the `users` table / `localStorage` `user` payload. An item is shown only when `user.role` is in that item's allowed roles. Feature 1 ships **Sign out** for every authenticated role and no catalog links.
- **FR-013**: Sign-in finds a user by `googleSub`. If none exists, it finds a user by email. A found row is reused and its `role` is kept. If that row's `googleSub` is null, it is set from the Google credential. If no row is found, a new user is created with `role` `requestor`.
- **FR-014**: On sign-in, `fName` and `lName` come from the Google profile. A new user's email comes from the Google profile. A seeded user's email is the match key and is not replaced.
---

## Assumptions

- Google is the only way to sign in with an OC account.
- Single browser `localStorage` session per device (no multi-tab sync beyond shared storage).
- Product roles are `requestor`, `admin`, and `maintenance`. The same Google sign-in is used for every role.
- Exactly one `admin` and one `maintenance` user are seeded, with `googleSub` null until that person signs in. Their OC emails are `admin@eagles.oc.edu` and `maint@eagles.oc.edu`.
- A Google account that matches no existing `googleSub` or email is created as a `requestor`.
- `role` stays whatever is stored on the user row. Changing who is `admin` or `maintenance` is a database change.
- An approved driver is a Feature 3 record, not a login role.
- Feature 1 delivers auth, a minimal protected home, and `MenuBar` (**Sign out** only). Later features add their own nav items.

## Edge Cases

- Missing token on a protected API → API returns `401` with `{ "message": "Google sign-in could not be verified." }. Expired or revoked token → `API returns `401` with `{ "message": "Google sign-in could not be verified." }`. The frontend clears `localStorage` key `user` and redirects to login.
- Backend rejects the credential given by Google results in user being redirected to login page.
- Second or many sign-ins with the same Google subject or the same email do not create another user.
- A seeded admin or maintenance user signing in for the first time binds `googleSub` on the existing row and keeps the seeded `role`.
- A `role` sent by the client is ignored. The stored row decides the role. A new row is always `requestor`.
- A later sign-in does not change `role`.
- Closing or canceling Google sign in results in no credential being sent, no API call is made and no user is created or logged in and the user stays on login.

## Success Criteria

- **SC-001**: Every Gherkin scenario in this feature has at least one automated test before merge.
- **SC-002**: A new user can register, sign in, reach the protected home page, and sign out from `MenuBar` via Google in one manual pass.
- **SC-003**: `npm test` passes with backend auth and frontend router/login/`MenuBar` coverage.
- **SC-004**: `MenuBar` is visible on the login page; **Sign out** appears after a session exists and is hidden when there is no session.

---

## Data Ownership & Isolation (foundation)

Feature 1 establishes identity. Later features decide which data a signed-in user may see or change.

- Every authenticated request resolves to exactly one user (`req.user.id`).
- No API in this feature returns another user's profile or session.
- This feature does not scope vehicles, drivers, or other catalog data. Those features define their own access rules.

---

## API Requirements

| Method | Endpoint                      | Auth | Purpose                                 |
| ------ | ----------------------------- | ---- | --------------------------------------- |
| `POST` | `/vehicle-t4/login`    | No   | Authenticate and return session payload |
| `POST` | `/vehicle-t4/logout`   | Yes  | Invalidate current session token        |

**Login / register success response from Google** (flat JSON, no envelope):

```json
{
  "userId": 1,
  "email": "jdoe@example.com",
  "fName": "Jane",
  "lName": "Doe",
  "role": "requestor",
  "token": "<jwt>"
}
```

**Creating a new user:** 201
**Signing in as an existing user, including a seeded user's first Google sign-in:** 200

`role` is the value stored on that user row: `requestor`, `admin`, or `maintenance`.
**Error response:** `{ "message": "Human-readable explanation." }` with appropriate HTTP status.

---

## Screen Requirements

### [View: Login Page] — route name `login`

- Auth form with `MenuBar` visible (this feature introduces `MenuBar`; do not hide it on login). The app bar stays empty when nobody is signed in. The product name lives on this page, not in `MenuBar`.
- Centered `v-card` (max width about 440px) on the theme surface, filling the space under the app bar. No split panel, email form, or register link.
- Card contents, top to bottom: an `mdi-car` icon in a `primary-container` avatar; eyebrow **Oklahoma Christian**; title **Vehicle Scheduling**; body **Sign in with your OC Google account.**; the Google sign-in action; footnote **Use an @eagles.oc.edu account. The first sign-in creates your account.**
- Primary action: Google's official **Sign in with Google** button (`google.accounts.id.renderButton`). A progress indicator is shown while the login request is in flight. There is no separate register screen and no link that switches between sign-in and registration. The first successful Google sign-in creates the account. The button is not placed in `v-card-title`.
- Inline error via `<v-alert type="error" class="w-100">` on failed login, above the Google button and spanning the card.

### [View: Home placeholder] — route name `home`

- Minimal protected landing page shown after successful login or registration. This is **not** the vehicle list (`/vehicle` is Feature 2) or the driver list (`/driver` is Feature 3).
- Displays **"Welcome, {first name}."** using the signed-in user's first name.
- No on-page **Sign out** button — sign-out is only in `MenuBar`.

**App chrome**

- **Introduce** `MenuBar` in this feature. Mount it in `App.vue` (`<MenuBar />` above `<v-main>`).
- `MenuBar` is visible on `login` and `home`.
- No session: `MenuBar` shows with no catalog items and no **Sign out**.
- A session shows the signed-in user's name and **Sign out** on every page, plus only the nav items allowed for `user.role`. Nav items share one size and sit in a centered group with the same gap. The name and **Sign out** stay on the right.
- Feature 1 catalog items: none. Later features add one item each: **Vehicle** (Feature 2, `admin` and `maintenance`), **Driver** (Feature 3, `admin`), **Destination** (Feature 4, `admin`), **Area** (Feature 5, `admin`), **Reservation** (Feature 6, `requestor` and `admin`). Feature 8 adds the admin schedule for `admin`. Feature 7 sends email and adds no nav item.

---

## Key Entities

- **User**: account with name, email, and role (`requestor`, `admin`, or `maintenance`). A seeded admin or maintenance user exists before a Google subject. After the first successful sign-in, the account is identified by Google subject.
- **Session**: server-side record tying a JWT token to a user; expires after 24 hours.

---

## Data Model Requirements

### `users` table

| Field         | Type        | Rules                              |
| ------------- | ----------- | ---------------------------------- |
| `id`          | INTEGER PK  | Auto-increment                     |
| `fName`       | STRING      | Required                           |
| `lName`       | STRING      | Required                           |
| `email`       | STRING      | Required, unique                   |
| `googleSub`   | STRING(255) | Unique, nullable until the first successful sign-in. Required after `googleSub` is bound. Seed rows start as null. |
| `role`        | STRING(20)  | `requestor`, `admin`, or `maintenance`. Seeded rows keep `admin` or `maintenance`. A user created at sign-in is `requestor`. Sign-in does not change `role`. A client-supplied role is ignored. |

### `sessions` table

| Field            | Type       | Rules                           |
| ---------------- | ---------- | ------------------------------- |
| `id`             | INTEGER PK | Auto-increment                  |
| `token`          | STRING     | Required                        |
| `email`          | STRING     | Required; copy of the user's email. Reuse looks up `userId`, not email |
| `expirationDate` | DATE       | Required                        |
| `userId`         | INTEGER FK | Required, references `users.id` |

---

## Acceptance Criteria (Gherkin)

### US-1.1 — Registration

#### Scenario: First Google Sign in

- **Given** I am on the login page
- **And** no user exists with Google subject `google-sub-jane`
- **And** `jdoe@eagles.oc.edu` 
- **When** I complete **Google Sign in** with and OC account whose `sub` is `google-sub-jane`, email is `jdoe@eagles.oc.edu`, and name is Jane Doe
- **Then** the API returns `201` with a user payload including `userId`, `email`, `fname`, `lname`, `token`, and `role`
- **And** `role` is `requestor`
- **And** one user row is stored with `googleSub` `google-sub-jane`, `email` `jdoe@eagles.oc.edu`, `fname` `Jane`, and `lName` `Doe`
- **And** a session row is created for that user
- **And** I am redirected to the home page
- **And** my session is stored in `localStorage` under the key `user`

#### Scenario: Seeded admin sign-in binds Google subject

- **Given** I am on the login page
- **And** a user exists with email `admin@eagles.oc.edu`, `fName` `Admin`, `lName` `User`, `role` `admin`, and `googleSub` null
- **And** no user exists with Google subject `google-sub-admin`
- **When** I complete **Google Sign in** with an OC account whose `sub` is `google-sub-admin`, email is `admin@eagles.oc.edu`, and name is Alex Admin
- **Then** the API returns `200`
- **And** the existing user row is reused
- **And** `googleSub` is `google-sub-admin`
- **And** `role` is `admin`
- **And** `fName` is `Alex` and `lName` is `Admin`
- **And** no second user row is inserted

#### Scenario: Seeded maintenance sign-in binds Google subject

- **Given** I am on the login page
- **And** a user exists with email `maint@eagles.oc.edu`, `fName` `Maintenance`, `lName` `User`, `role` `maintenance`, and `googleSub` null
- **And** no user exists with Google subject `google-sub-maint`
- **When** I complete **Google Sign in** with an OC account whose `sub` is `google-sub-maint`, email is `maint@eagles.oc.edu`, and name is Morgan Maint
- **Then** the API returns `200`
- **And** the existing user row is reused
- **And** `googleSub` is `google-sub-maint`
- **And** `role` is `maintenance`
- **And** `fName` is `Morgan` and `lName` is `Maint`
- **And** no second user row is inserted

#### Scenario: Client-supplied role is ignored

- **Given** I am on the login page
- **And** no user exists with Google subject `google-sub-jane`
- **And** `jdoe@eagles.oc.edu`
- **When** I complete **Google Sign in** for that account and the login request includes `"role": "admin"`
- **Then** the API returns `201`
- **And** the stored `role` is `requestor`
- **And** the response `role` is `requestor`

### US-1.2 — Returning Google sign-in

#### Scenario: Returning Google sign-in reuses the user

- **Given** I am on the login page
- **And** a user already exists with `googleSub` `google-sub-jane` and `role` `requestor`
- **When** I complete **Google Sign in** with that same Google subject
- **Then** the API returns `200` with `userId`, `email`, `fname`, `lname`, `token`, and `role`
- **And** `role` is `requestor`
- **And** the existing user row is reused
- **And** no second user row is inserted
- **And** a session row is created or reused for that user
- **And** I am redirected to the home page
- **And** my session is stored in `localStorage` under the key `user`

#### Scenario: Returning sign-in keeps the stored role

- **Given** a user already exists with `googleSub` `google-sub-admin`, email `admin@eagles.oc.edu`, and `role` `admin`
- **When** I complete **Google Sign in** with that same Google subject
- **Then** the API returns `200`
- **And** the existing user row is reused
- **And** `role` is `admin`
- **And** no second user row is inserted

#### Scenario: Invalid Google credential stays on login

- **Given** I am on the login page
- **When** **Google Sign in** returns a credential the backend cannot verify
- **Then** the API returns `401` with `{ "message": "Google sign-in failed"}`
- **And** I remain on the login page
- **And** the error is displayed in a `v-alert type="error">`
- **And** no user row is created
---

### US-1.3 — Stay signed in across page loads

#### Scenario: Signed-in user visits login page

- **Given** I have a valid session in `localStorage`
- **When** I navigate to the login page
- **Then** I am redirected to the home page

#### Scenario: API request includes session token

- **Given** I am signed in as a user with role `requestor`
- **When** the frontend makes an authenticated API request
- **Then** the request includes header `Authorization: Bearer <token>`

#### Scenario: Expired or invalid session token

- **Given** I am signed in as a user with role `requestor`
- **And** my session token is expired or revoked
- **When** the frontend makes an authenticated API request
- **Then** the API returns `401` with `{ "message": "Unauthorized! Invalid or expired token." }`
- **And** `localStorage` key `user` is cleared
- **And** I am redirected to the login page

---

### US-1.4 — Sign out

#### Scenario: User signs out

- **Given** I am signed in as a user with role `requestor`
- **And** I am on the home page
- **When** I click **Sign out** in the `MenuBar`
- **Then** the API invalidates my session token on the server
- **And** `localStorage` key `user` is removed
- **And** I am redirected to the login page
- **And** `MenuBar` is still visible
- **And** **Sign out** is not shown

---

### US-1.5 — Block unauthenticated access

#### Scenario: Unauthenticated user accesses a protected route

- **Given** I have no session in `localStorage`
- **When** I navigate directly to the home page
- **Then** I am redirected to the login page
- **And** a protected API request with no token returns `401` with `{ "message": "Unauthorized! No token provided." }`

---

### US-1.6 — Role-based MenuBar

#### Scenario: MenuBar is visible on the login page

- **Given** I have no session in `localStorage`
- **When** I am on the login page
- **Then** the `MenuBar` is displayed
- **And** **Sign out** is not shown
- **And** **Vehicle**, **Driver**, **Destination**, **Area**, and **Reservation** are not shown

#### Scenario: Signed-in user sees Sign out in MenuBar

- **Given** I am signed in as a user with role `requestor`
- **When** I view the home page
- **Then** the `MenuBar` is displayed
- **And** **Sign out** is shown
- **And** the signed-in user's name is shown

#### Scenario: Requestor MenuBar in Feature 1 has Sign out but no catalog links yet

- **Given** I am signed in as a user with role `requestor`
- **When** I view the `MenuBar`
- **Then** **Sign out** is shown
- **And** **Vehicle** is not shown
- **And** **Driver** is not shown
- **And** **Destination** is not shown
- **And** **Area** is not shown
- **And** **Reservation** is not shown

#### Scenario: Admin MenuBar in Feature 1 has Sign out but no catalog links yet

- **Given** I am signed in as a user with role `admin`
- **When** I view the `MenuBar`
- **Then** **Sign out** is shown
- **And** **Vehicle** is not shown
- **And** **Driver** is not shown
- **And** **Destination** is not shown
- **And** **Area** is not shown
- **And** **Reservation** is not shown

#### Scenario: Maintenance MenuBar in Feature 1 has Sign out but no catalog links yet

- **Given** I am signed in as a user with role `maintenance`
- **When** I view the `MenuBar`
- **Then** **Sign out** is shown
- **And** **Vehicle** is not shown
- **And** **Driver** is not shown
- **And** **Destination** is not shown
- **And** **Area** is not shown
- **And** **Reservation** is not shown

---

## Test Coverage Map

Each scenario above must map to at least one automated test.

| Story  | Scenario                                                            | Test file                                                             | Test name                                                            |
| ------ | ------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| US-1.1 | First Google Sign in                                                | `backend/tests/auth.test.js`, `frontend/tests/Login.test.js`          | `First Google Sign in`                                               |
| US-1.1 | Seeded admin sign-in binds Google subject                            | `backend/tests/auth.test.js`                                          | `Seeded admin sign-in binds Google subject`                           |
| US-1.1 | Seeded maintenance sign-in binds Google subject                      | `backend/tests/auth.test.js`                                          | `Seeded maintenance sign-in binds Google subject`                     |
| US-1.1 | Client-supplied role is ignored                                     | `backend/tests/auth.test.js`                                          | `Client-supplied role is ignored`                                    |
| US-1.2 | Returning Google sign-in reuses the user                            | `backend/tests/auth.test.js`                                          | `Returning Google sign-in reuses the user`                           |
| US-1.2 | Returning sign-in keeps the stored role                             | `backend/tests/auth.test.js`                                          | `Returning sign-in keeps the stored role`                            |
| US-1.2 | Invalid Google credential stays on login                            | `backend/tests/auth.test.js`, `frontend/tests/Login.test.js`          | `Invalid Google credential stays on login`                           |
| US-1.3 | Signed-in user visits login page                                    | `frontend/tests/router.test.js`                                       | `Signed-in user visits login page`                                    |
| US-1.3 | API request includes session token                                  | `backend/tests/authenticate.test.js`                                  | `API request includes session token`                                  |
| US-1.3 | Expired or invalid session token                                    | `backend/tests/authenticate.test.js`                                  | `Expired or invalid session token`                                    |
| US-1.4 | User signs out                                                      | `backend/tests/auth.test.js`, `frontend/tests/MenuBar.test.js`        | `User signs out`                                                      |
| US-1.5 | Unauthenticated user accesses a protected route                     | `backend/tests/authenticate.test.js`, `frontend/tests/router.test.js` | `Unauthenticated user accesses a protected route`                     |
| US-1.6 | MenuBar is visible on the login page                                | `frontend/tests/MenuBar.test.js`                                      | `MenuBar is visible on the login page`                                |
| US-1.6 | Signed-in user sees Sign out in MenuBar                             | `frontend/tests/MenuBar.test.js`                                      | `Signed-in user sees Sign out in MenuBar`                             |
| US-1.6 | Requestor MenuBar in Feature 1 has Sign out but no catalog links yet | `frontend/tests/MenuBar.test.js`                                     | `Requestor MenuBar in Feature 1 has Sign out but no catalog links yet` |
| US-1.6 | Admin MenuBar in Feature 1 has Sign out but no catalog links yet     | `frontend/tests/MenuBar.test.js`                                     | `Admin MenuBar in Feature 1 has Sign out but no catalog links yet`     |
| US-1.6 | Maintenance MenuBar in Feature 1 has Sign out but no catalog links yet | `frontend/tests/MenuBar.test.js`                                  | `Maintenance MenuBar in Feature 1 has Sign out but no catalog links yet` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 1 from @features/feature-1-user-auth.md on branch `feature/1-user-auth`.

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
- [ ] **Success Criteria (SC-00N)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Password reset
- A screen for changing a user's role
- Username and password login
- Vehicle CRUD / **Vehicle** nav item ([Feature 2](feature-2-vehicle-management.md))
- Driver CRUD / **Driver** nav item ([Feature 3](feature-3-driver-management.md))
- Destination CRUD / **Destination** nav item ([Feature 4](feature-4-destination-management.md))
- Area CRUD / **Area** nav item ([Feature 5](feature-5-area-management.md))
- Reservation CRUD / **Reservation** nav item ([Feature 6](feature-6-reservation-management.md))
- Reservation email ([Feature 7](feature-7-email-management.md))
- Admin schedule ([Feature 8](feature-8-admin-page.md))

---

## Delivered to Feature 2

- `MenuBar` exists in `App.vue`, visible on `login` and `home`, with **Sign out** when a session exists and items filtered by `user.role`.
- Feature 2 adds **Vehicle** (allowed roles `admin` and `maintenance`) to this `MenuBar`; it MUST NOT create a second `MenuBar`.
- Feature 3 adds **Driver** (allowed role `admin`) to this `MenuBar`.
- Feature 4 adds **Destination** (allowed role `admin`) to this `MenuBar`.
- Feature 5 adds **Area** (allowed role `admin`) to this `MenuBar`.
- Feature 6 adds **Reservation** (allowed roles `requestor` and `admin`) to this `MenuBar`.
- Feature 7 sends reservation email and adds no `MenuBar` item.
- Feature 8 adds the admin schedule (allowed role `admin`) to this `MenuBar`.