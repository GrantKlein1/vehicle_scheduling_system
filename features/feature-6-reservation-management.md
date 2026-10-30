# Feature: Reservation Management

**Feature ID:** 6
**Branch pattern:** `feature/6-reservation-management`
**Status:** Ready
**Created:** 2026-10-29
**Input:** Requestors submit vehicle reservations that verify vehicle availability and driver category approval. Administrators approve or deny pending requests, and requestors or administrators can cancel active reservations.
**Depends on:** [Feature 1 — User Authentication & Session Management](feature-1-user-auth.md), [Feature 2 — Vehicle Management](feature-2-vehicle-management.md)
**Related:** [features/feature-7-email-management.md](feature-7-email-management.md), [features/feature-8-admin-page.md](feature-8-admin-page.md), [features/reference/behavior.md](reference/behavior.md)

This feature implements vehicle reservation booking, conflict checking, driver qualification validation, administrative approval/denial workflows, cancellation handling, and reservation text summary generation. It adds the **Reservation** item to `MenuBar` for requestors and administrators.

---

## User Stories

### US-6.1: View Reservations List
**As a** signed-in requestor or administrator  
**I want to** select **Reservation** from the navigation menu  
**So that** I can open the reservations screen and view requests and their current statuses  

**Priority:** P1  
**Independent test:** Click **Reservation** in `MenuBar` as a requestor to see personal reservations, or as an admin to see all reservations across the campus fleet  
**Acceptance scenarios:** see ### US-6.1 under Acceptance Criteria  

### US-6.2: Submit Reservation Request
**As a** signed-in requestor  
**I want to** submit a request for a vehicle reservation specifying destination, start and end dates/times, and driver  
**So that** the system checks vehicle availability and driver approval, then creates a pending reservation  

**Priority:** P1  
**Independent test:** Submit a valid reservation request for an available vehicle and approved driver; verify a `pending` reservation is created with HTTP `201`  
**Acceptance scenarios:** see ### US-6.2 under Acceptance Criteria  

### US-6.3: View Reservation Details
**As a** signed-in requestor or administrator  
**I want to** view full details of a reservation  
**So that** I can review vehicle assignment, schedule, driver details, destination, and status history  

**Priority:** P1  
**Independent test:** Open a reservation record to inspect its vehicle, times, driver, purpose, passengers, and current status; verify non-owners cannot view it  
**Acceptance scenarios:** see ### US-6.3 under Acceptance Criteria  

### US-6.4: Approve Reservation
**As a** signed-in administrator  
**I want to** approve a pending reservation  
**So that** the vehicle request is confirmed for the trip  

**Priority:** P1  
**Independent test:** Approve a `pending` reservation as an admin; verify status transitions to `approved` with HTTP `200`  
**Acceptance scenarios:** see ### US-6.4 under Acceptance Criteria  

### US-6.5: Deny Reservation
**As a** signed-in administrator  
**I want to** deny a pending reservation and provide a reason  
**So that** the requestor knows the vehicle request was rejected and why  

**Priority:** P1  
**Independent test:** Deny a `pending` reservation with a required reason string; verify status transitions to `denied` with HTTP `200` and stores the reason  
**Acceptance scenarios:** see ### US-6.5 under Acceptance Criteria  

### US-6.6: Cancel Reservation
**As a** signed-in requestor or administrator  
**I want to** cancel an existing reservation that has not already been denied or cancelled  
**So that** the reserved vehicle is released for other users  

**Priority:** P1  
**Independent test:** Cancel a `pending` or `approved` reservation; verify status transitions to `cancelled` with HTTP `200` and the vehicle becomes available  
**Acceptance scenarios:** see ### US-6.6 under Acceptance Criteria  

### US-6.7: Generate Reservation Text Summary File
**As the** application  
**I want to** create a text file containing the formatted details of each accepted reservation  
**So that** reservation records are preserved in text format and available for subsequent email dispatch  

**Priority:** P1  
**Independent test:** Submit a reservation and verify a text summary file with requestor, vehicle, dates, and destination details is written to storage  
**Acceptance scenarios:** see ### US-6.7 under Acceptance Criteria  

### US-6.8: Role-Based Access Control & Ownership Isolation
**As the** application  
**I want to** restrict reservation approvals and denials to administrators, and prevent cross-requestor data leaks  
**So that** requestors can only view and cancel their own requests, and maintenance staff cannot access reservation management  

**Priority:** P1  
**Independent test:** Attempt to approve/deny as a requestor (returns HTTP `403`); attempt to fetch another user's reservation as a requestor or maintenance user (returns HTTP `404`)  
**Acceptance scenarios:** see ### US-6.8 under Acceptance Criteria  

---

## Requirements

### Functional Requirements

- **FR-001:** Every reservation endpoint MUST require authentication (`authenticate` middleware).
- **FR-002:** An authenticated `requestor` or `admin` MUST be able to list reservations at `GET /vehicleScheduling/reservations`. A `requestor` MUST receive only their own reservations (`requestorId === req.user.id`). An `admin` MUST receive all reservations. A `maintenance` user MUST receive HTTP `403` with `{ "message": "Admin role required." }` or `404` when fetching individual records.
- **FR-003:** `POST /vehicleScheduling/reservations` MUST allow an authenticated `requestor` or `admin` to create a reservation. The created reservation status MUST be `pending`. `requestorId` MUST be set from `req.user.id`. The endpoint MUST return HTTP `201`.
- **FR-004:** Required fields for creating a reservation are `vehicleId`, `destinationName`, `start`, and `end`. `start` and `end` MUST be valid wall-clock datetimes formatted as `YYYY-MM-DD HH:mm` (or ISO 8601 strings). `end` MUST be chronologically after `start`. If `end <= start`, the API MUST return HTTP `400` with `{ "message": "End time must be after start time." }`. A `start` time prior to the current wall-clock datetime MUST return HTTP `400` with `{ "message": "Reservation start time cannot be in the past." }`.
- **FR-005:** **Vehicle availability conflict check:** Before creating a reservation, the system MUST verify that the requested vehicle (`vehicleId`) is not already reserved during the requested time window (`start` to `end`) on any reservation with status `pending` or `approved`. If an overlapping active reservation exists for that vehicle, the API MUST reject the request with HTTP `400` and `{ "message": "The requested vehicle is not available for the selected dates." }`.
- **FR-006:** **Driver authorization check:** When a driver is specified on a reservation, the driver MUST be approved to drive the category of the requested vehicle (`vehicles.category`: `Golf Cart`, `Truck`, `Car`, or `Van`). If the selected driver is not approved for that vehicle type, the API MUST reject the request with HTTP `400` and `{ "message": "Driver is not approved to drive this vehicle type." }`.
- **FR-007:** Reservation creation MUST snapshot `vehicleName` (e.g. `{year} {make} {model}`) from the referenced vehicle onto the reservation row. Optional fields supported on create: `areaName`, `purpose`, `driverName`, `driverEmail`, `passengers`, and requestor `notes`.
- **FR-008:** `POST /vehicleScheduling/reservations/:id/approve` MUST be restricted to `admin` (`req.user.role === "admin"`). It MUST succeed only when the reservation status is currently `pending`, setting status to `approved` and returning HTTP `200`. Calling approve on a reservation whose status is not `pending` MUST return HTTP `400` with `{ "message": "This reservation cannot be approved." }`.
- **FR-009:** `POST /vehicleScheduling/reservations/:id/deny` MUST be restricted to `admin` (`req.user.role === "admin"`). The request body MUST include a non-blank `reason` string (`{ "reason": "..." }`). A missing or whitespace-only reason MUST return HTTP `400` with `{ "message": "A denial reason is required." }`. It MUST succeed only when status is currently `pending`, setting status to `denied`, recording `denialReason`, and returning HTTP `200`. Calling deny on a reservation whose status is not `pending` MUST return HTTP `400` with `{ "message": "This reservation cannot be denied." }`.
- **FR-010:** `POST /vehicleScheduling/reservations/:id/cancel` MUST be callable by the owning requestor (`reservation.requestorId === req.user.id`) or any `admin`. It MUST succeed only when the reservation status is `pending` or `approved`, setting status to `cancelled` and returning HTTP `200`. Calling cancel on a reservation whose status is `denied` or `cancelled` MUST return HTTP `400` with `{ "message": "This reservation cannot be cancelled." }`.
- **FR-011:** **Reservation summary file generation:** Upon successful creation of a reservation (`201`), the system MUST write a text file containing the formatted reservation details to server storage (e.g. `storage/reservations/reservation-<id>.txt`), recording requestor name, destination, vehicle name, start, end, driver, and area.
- **FR-012:** `GET /vehicleScheduling/reservations/:id` MUST return the reservation object with HTTP `200` if the caller is an `admin` or the owning `requestor`. Any other authenticated caller, or an unknown reservation id, MUST return HTTP `404` with `{ "message": "Reservation not found." }`.
- **FR-013:** Unauthenticated requests to any reservation endpoint MUST return HTTP `401` using standard Feature 1 messages (`"Unauthorized! No token provided."` or `"Unauthorized! Invalid or expired token."`).
- **FR-014:** Navigation: This feature MUST add **Reservation** to `MenuBar` for `requestor` and `admin` roles only. **Reservation** MUST NOT be visible to `maintenance` or unauthenticated visitors.

---

## Assumptions

- Feature 1 authentication, session tokens, and roles (`requestor`, `admin`, `maintenance`) are in place.
- Feature 2 vehicles exist and provide `id`, `category`, `make`, `model`, `year`, and `areaAssigned`.
- Feature 3 driver approval lists record approved vehicle categories for drivers (or driver approval records).
- Feature 4 destinations provide destination names.
- Feature 5 areas provide area names.
- Feature 7 hooks into submit (`201`), approve (`200`), deny (`200`), and cancel (`200`) to dispatch email notices without changing Feature 6's primary response contracts.
- There is no direct edit route for an already submitted reservation; changes are handled by cancelling and re-submitting.

---

## Edge Cases

- `end` equals or precedes `start`: HTTP `400` `{ "message": "End time must be after start time." }`.
- `start` is in the past: HTTP `400` `{ "message": "Reservation start time cannot be in the past." }`.
- Vehicle already booked in conflicting timeframe: HTTP `400` `{ "message": "The requested vehicle is not available for the selected dates." }`.
- Driver not authorized for vehicle category: HTTP `400` `{ "message": "Driver is not approved to drive this vehicle type." }`.
- Blank or missing destination: HTTP `400` `{ "message": "Destination cannot be empty." }`.
- Non-admin calling approve or deny: HTTP `403` `{ "message": "Admin role required." }`.
- Approving a reservation that is already approved, denied, or cancelled: HTTP `400` `{ "message": "This reservation cannot be approved." }`.
- Denying a reservation that is already approved, denied, or cancelled: HTTP `400` `{ "message": "This reservation cannot be denied." }`.
- Denying without a reason: HTTP `400` `{ "message": "A denial reason is required." }`.
- Cancelling a reservation that is already denied or cancelled: HTTP `400` `{ "message": "This reservation cannot be cancelled." }`.
- A requestor attempting to view or cancel another requestor's reservation: HTTP `404` `{ "message": "Reservation not found." }`.
- Maintenance user opening `/reservations`: redirected to `/`.

---

## Success Criteria

- **SC-001:** Every Gherkin scenario in this feature maps to at least one automated test in the Test Coverage Map.
- **SC-002:** Requestors can create pending reservations, view their own reservations, and cancel their pending or approved reservations.
- **SC-003:** Admins can view all reservations, approve pending reservations, deny pending reservations with a reason, and cancel any active reservation.
- **SC-004:** Conflicting vehicle bookings and unapproved driver assignments are prevented with HTTP `400`.
- **SC-005:** A text summary file is generated upon reservation creation.
- **SC-006:** `npm test` passes.

---

## Data Ownership & Isolation

Reservations belong to the requestor who created them (`requestorId`).

| Rule | Requirement |
|------|-------------|
| **Read scope** | `requestor` sees only reservations where `requestorId === req.user.id`. `admin` sees all reservations |
| **Create scope** | Authenticated `requestor` or `admin`. `requestorId` is always set to `req.user.id` |
| **Update scope** | Status transitions only: `approve` and `deny` are admin-only; `cancel` is owning requestor or admin |
| **Cross-user access** | Accessing another requestor's reservation returns `404` `{ "message": "Reservation not found." }` (never `403`) |
| **Maintenance access** | Maintenance users have no access to reservations (`404` on detail, `403` on list/actions) |
| **UI scope** | The `/reservations` view displays personal reservations for requestors and all fleet reservations for admins |

---

## API Requirements

All endpoints are mounted at `/vehicleScheduling/reservations`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/vehicleScheduling/reservations` | `requestor`, `admin` | Create a `pending` reservation |
| `GET` | `/vehicleScheduling/reservations` | `requestor`, `admin` | List reservations (scoped by role) |
| `GET` | `/vehicleScheduling/reservations/:id` | `requestor` (owner), `admin` | Get full details of a reservation |
| `POST` | `/vehicleScheduling/reservations/:id/approve` | `admin` | Approve a pending reservation |
| `POST` | `/vehicleScheduling/reservations/:id/deny` | `admin` | Deny a pending reservation with reason |
| `POST` | `/vehicleScheduling/reservations/:id/cancel` | `requestor` (owner), `admin` | Cancel a pending or approved reservation |

### Create — `POST /vehicleScheduling/reservations`

**Request body:**

```json
{
  "vehicleId": 1,
  "destinationName": "Edmond High School",
  "start": "2026-11-02 08:00",
  "end": "2026-11-02 12:00",
  "areaName": "Metro",
  "purpose": "Campus visit",
  "driverName": "Sam Driver",
  "driverEmail": "sdriver@eagles.oc.edu",
  "passengers": 4,
  "notes": "Need key pickup at 07:45"
}
```

**Success response (`201`):**

```json
{
  "id": 10,
  "requestorId": 1,
  "status": "pending",
  "vehicleId": 1,
  "vehicleName": "Campus Van",
  "destinationName": "Edmond High School",
  "start": "2026-11-02 08:00",
  "end": "2026-11-02 12:00",
  "areaName": "Metro",
  "purpose": "Campus visit",
  "driverName": "Sam Driver",
  "driverEmail": "sdriver@eagles.oc.edu",
  "passengers": 4,
  "denialReason": null,
  "notes": "Need key pickup at 07:45",
  "createdAt": "2026-10-29T12:00:00.000Z",
  "updatedAt": "2026-10-29T12:00:00.000Z"
}
```

**Validation errors (`400`):**

| Condition | `message` |
|-----------|-----------|
| Missing `vehicleId` | `Vehicle is required.` |
| Missing or blank `destinationName` | `Destination cannot be empty.` |
| Missing `start` or `end` | `Start and end times are required.` |
| `end` <= `start` | `End time must be after start time.` |
| `start` in the past | `Reservation start time cannot be in the past.` |
| Vehicle already booked in time window | `The requested vehicle is not available for the selected dates.` |
| Driver not approved for vehicle category | `Driver is not approved to drive this vehicle type.` |

---

### List all — `GET /vehicleScheduling/reservations`

**Success (`200`):** A JSON array of reservations ordered by `start` descending, then `id` descending.

---

### Fetch one — `GET /vehicleScheduling/reservations/:id`

**Success (`200`):** A single reservation object.

**Not found (`404`):** `{ "message": "Reservation not found." }` (returned for missing IDs, other requestors' IDs, or maintenance callers).

---

### Approve — `POST /vehicleScheduling/reservations/:id/approve`

**Success (`200`):** The updated reservation JSON with `status: "approved"`.

**Errors:**
- Non-admin caller: `403` `{ "message": "Admin role required." }`
- Status not `pending`: `400` `{ "message": "This reservation cannot be approved." }`
- Unknown reservation: `404` `{ "message": "Reservation not found." }`

---

### Deny — `POST /vehicleScheduling/reservations/:id/deny`

**Request body:**

```json
{
  "reason": "The van is already booked."
}
```

**Success (`200`):** The updated reservation JSON with `status: "denied"` and `denialReason` set.

**Errors:**
- Missing or blank `reason`: `400` `{ "message": "A denial reason is required." }`
- Non-admin caller: `403` `{ "message": "Admin role required." }`
- Status not `pending`: `400` `{ "message": "This reservation cannot be denied." }`
- Unknown reservation: `404` `{ "message": "Reservation not found." }`

---

### Cancel — `POST /vehicleScheduling/reservations/:id/cancel`

**Success (`200`):** The updated reservation JSON with `status: "cancelled"`.

**Errors:**
- Status is already `denied` or `cancelled`: `400` `{ "message": "This reservation cannot be cancelled." }`
- Caller is another requestor or unknown reservation: `404` `{ "message": "Reservation not found." }`

---

## Screen Requirements

### [View: Reservations] — route `/reservations`, route name `reservations`

- **Page Title:** **Vehicle Reservations** (for admin) / **My Reservations** (for requestor)
- **Access:** `requestor` and `admin` only. Unauthenticated redirects to `/login`. `maintenance` redirects to `/`.
- **Primary CTA:** **+ Request Vehicle** (`oc-cta`) button opening the reservation creation dialog.
- **Search & Filters:**
  - Status filter chips: **All**, **Pending**, **Approved**, **Denied**, **Cancelled**.
  - Text search field: matches against destination, vehicle, driver name, and requestor name.
- **Layout (Split Master-Detail):**
  - **Left column (Reservation list):**
    - List of reservations ordered by date.
    - Each item displays: vehicle name, destination, date range (`YYYY-MM-DD HH:mm`), and status chip (`v-chip` color-coded: `pending` orange, `approved` green, `denied` red, `cancelled` grey).
    - Requestor name is displayed when signed in as admin.
    - Clicking an item selects it in the right-hand detail view.
  - **Right column (Detail panel):**
    - Status badge and reservation ID.
    - Reservation summary card:
      - **Vehicle:** `{vehicleName}`
      - **Destination:** `{destinationName}`
      - **Time:** `{start}` to `{end}`
      - **Area:** `{areaName or "None"}`
      - **Driver:** `{driverName} ({driverEmail})` or `No driver assigned`
      - **Passengers:** `{passengers}`
      - **Purpose:** `{purpose}`
      - **Notes:** `{notes}`
      - If `status === "denied"`: alert box displaying **Denial Reason:** `{denialReason}`.
    - Action controls:
      - When `status === "pending"` and caller is `admin`: **Approve** button (success color) and **Deny** button (error color).
      - When `status === "pending"` or `status === "approved"`, and caller is admin or owning requestor: **Cancel Reservation** button (outlined).
- **Empty state:** **No reservations yet.** / **No reservations match your filter.**
- **Dialogs:**
  1. **New Reservation Dialog:**
     - Inputs: Vehicle (select), Destination (text), Start Date & Time (datetime-picker), End Date & Time (datetime-picker), Area (select), Driver (select), Passengers (number), Purpose (text), Notes (textarea).
     - Submit button: **Submit Request** (`oc-cta`).
  2. **Deny Reservation Dialog:**
     - Text area: **Reason for denial** (required).
     - Actions: **Cancel**, **Confirm Denial** (color `error`).
  3. **Cancel Confirmation Dialog:**
     - Copy: **Are you sure you want to cancel this reservation?**
     - Actions: **Keep Reservation**, **Yes, Cancel** (color `error`).

---

## Key Entities

- **Reservation**: A vehicle booking request submitted by a user for a specific vehicle and time window.
- **User**: The account submitting the request (`requestorId`).
- **Vehicle**: The physical vehicle requested (`vehicleId`), categorized as Golf Cart, Truck, Car, or Van.
- **Driver**: The individual assigned to drive, whose approved vehicle types must include the vehicle's category.

---

## Data Model Requirements

### `reservations` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `requestorId` | INTEGER FK | Required, references `users.id` |
| `status` | STRING(20) | Required. `pending`, `approved`, `denied`, or `cancelled` |
| `vehicleId` | INTEGER FK | Required, references `vehicles.id` |
| `vehicleName` | STRING(100) | Required. Copied from vehicle make/model |
| `destinationName` | STRING(255) | Required |
| `start` | DATE | Required wall-clock datetime |
| `end` | DATE | Required wall-clock datetime |
| `areaName` | STRING(50) | Optional nullable string |
| `purpose` | STRING(255) | Optional nullable string |
| `driverName` | STRING(100) | Optional nullable string |
| `driverEmail` | STRING(255) | Optional nullable string |
| `passengers` | INTEGER | Optional integer, default 1 |
| `denialReason` | TEXT | Nullable. Populated when denied |
| `notes` | TEXT | Optional nullable string |
| `summaryFilePath` | STRING(255) | Nullable. Path to generated summary text file |
| `createdAt` | DATE | Managed by Sequelize |
| `updatedAt` | DATE | Managed by Sequelize |

### Associations

| From | To | Relationship | On delete |
|------|----|--------------|-----------|
| `users` | `reservations` | one-to-many (`reservations.requestorId`) | CASCADE |
| `vehicles` | `reservations` | one-to-many (`reservations.vehicleId`) | RESTRICT |

---

## Acceptance Criteria (Gherkin)

Shared facts: Jane Doe (`jdoe@eagles.oc.edu`, role `requestor`); Admin User (`admin@eagles.oc.edu`, role `admin`); Maintenance User (`maint@eagles.oc.edu`, role `maintenance`); Vehicle `Campus Van` (id `1`, category `Van`); Destination `Edmond High School`; Driver Sam Driver (`sdriver@eagles.oc.edu`, approved for `Van`).

### US-6.1 — View Reservations List

#### Scenario: Requestor sees only own reservations
* **Given** I am signed in as Jane Doe
* **And** reservations exist for Jane Doe and another requestor Bob
* **When** I view the `/reservations` page
* **Then** Jane's reservations are visible in the list
* **And** Bob's reservations are not visible

#### Scenario: Administrator sees all reservations
* **Given** I am signed in as an administrator
* **And** reservations exist for Jane Doe and Bob
* **When** I view the `/reservations` page
* **Then** reservations for both Jane Doe and Bob are visible in the list

#### Scenario: Maintenance user cannot access reservations
* **Given** I am signed in as a maintenance user
* **When** I view the `MenuBar`
* **Then** **Reservation** is not shown
* **When** I navigate to `/reservations`
* **Then** I am redirected to `/`

---

### US-6.2 — Submit Reservation Request

#### Scenario: Successful reservation submission
* **Given** I am signed in as Jane Doe
* **And** `Campus Van` has no conflicting reservations between `2026-11-02 08:00` and `2026-11-02 12:00`
* **And** driver Sam Driver is approved to drive `Van`
* **When** I submit a reservation for `Campus Van` to `Edmond High School` from `2026-11-02 08:00` to `2026-11-02 12:00` with driver Sam Driver
* **Then** the API returns `201`
* **And** the reservation is stored with status `pending`
* **And** `requestorId` matches Jane Doe's user ID

#### Scenario: End time before start time is rejected
* **Given** I am signed in as Jane Doe
* **When** I submit a reservation with start `2026-11-02 12:00` and end `2026-11-02 08:00`
* **Then** the API returns `400` with `{ "message": "End time must be after start time." }`

#### Scenario: Start time in the past is rejected
* **Given** I am signed in as Jane Doe
* **When** I submit a reservation with start `2020-01-01 08:00` and end `2020-01-01 12:00`
* **Then** the API returns `400` with `{ "message": "Reservation start time cannot be in the past." }`

#### Scenario: Conflicting vehicle reservation is rejected
* **Given** `Campus Van` already has an approved reservation from `2026-11-02 08:00` to `2026-11-02 12:00`
* **When** I submit a reservation for `Campus Van` from `2026-11-02 10:00` to `2026-11-02 14:00`
* **Then** the API returns `400` with `{ "message": "The requested vehicle is not available for the selected dates." }`

#### Scenario: Unapproved driver category is rejected
* **Given** driver Alex is only approved for `Golf Cart`
* **When** I submit a reservation for `Campus Van` (category `Van`) assigning driver Alex
* **Then** the API returns `400` with `{ "message": "Driver is not approved to drive this vehicle type." }`

---

### US-6.3 — View Reservation Details

#### Scenario: Owner reads own reservation details
* **Given** Jane Doe owns a reservation with id `10`
* **When** Jane Doe requests `GET /vehicleScheduling/reservations/10`
* **Then** the API returns `200` with the reservation details

#### Scenario: Other requestor receives 404 for reservation
* **Given** Jane Doe owns reservation `10`
* **When** another requestor requests `GET /vehicleScheduling/reservations/10`
* **Then** the API returns `404` with `{ "message": "Reservation not found." }`

---

### US-6.4 — Approve Reservation

#### Scenario: Administrator approves pending reservation
* **Given** I am signed in as an administrator
* **And** reservation `10` has status `pending`
* **When** I send `POST /vehicleScheduling/reservations/10/approve`
* **Then** the API returns `200`
* **And** reservation `10` has status `approved`

#### Scenario: Approving non-pending reservation is rejected
* **Given** I am signed in as an administrator
* **And** reservation `10` has status `approved`
* **When** I send `POST /vehicleScheduling/reservations/10/approve`
* **Then** the API returns `400` with `{ "message": "This reservation cannot be approved." }`

#### Scenario: Requestor cannot approve reservation
* **Given** I am signed in as a requestor
* **When** I send `POST /vehicleScheduling/reservations/10/approve`
* **Then** the API returns `403` with `{ "message": "Admin role required." }`

---

### US-6.5 — Deny Reservation

#### Scenario: Administrator denies pending reservation with reason
* **Given** I am signed in as an administrator
* **And** reservation `10` has status `pending`
* **When** I send `POST /vehicleScheduling/reservations/10/deny` with body `{ "reason": "The van is already booked." }`
* **Then** the API returns `200`
* **And** reservation `10` has status `denied`
* **And** `denialReason` is stored as `"The van is already booked."`

#### Scenario: Denying without reason is rejected
* **Given** I am signed in as an administrator
* **And** reservation `10` has status `pending`
* **When** I send `POST /vehicleScheduling/reservations/10/deny` with an empty reason
* **Then** the API returns `400` with `{ "message": "A denial reason is required." }`
* **And** reservation `10` remains `pending`

#### Scenario: Denying non-pending reservation is rejected
* **Given** I am signed in as an administrator
* **And** reservation `10` has status `cancelled`
* **When** I send `POST /vehicleScheduling/reservations/10/deny` with reason `"Already cancelled"`
* **Then** the API returns `400` with `{ "message": "This reservation cannot be denied." }`

---

### US-6.6 — Cancel Reservation

#### Scenario: Requestor cancels own pending reservation
* **Given** I am signed in as Jane Doe
* **And** I own reservation `10` with status `pending`
* **When** I send `POST /vehicleScheduling/reservations/10/cancel`
* **Then** the API returns `200`
* **And** reservation `10` has status `cancelled`

#### Scenario: Administrator cancels approved reservation
* **Given** I am signed in as an administrator
* **And** reservation `10` has status `approved`
* **When** I send `POST /vehicleScheduling/reservations/10/cancel`
* **Then** the API returns `200`
* **And** reservation `10` has status `cancelled`

#### Scenario: Cancelling already cancelled or denied reservation is rejected
* **Given** reservation `10` has status `cancelled`
* **When** I send `POST /vehicleScheduling/reservations/10/cancel`
* **Then** the API returns `400` with `{ "message": "This reservation cannot be cancelled." }`

---

### US-6.7 — Generate Reservation Text Summary File

#### Scenario: Text summary file created upon reservation creation
* **Given** Jane Doe submits a valid reservation
* **When** the reservation is accepted with status `201`
* **Then** a text file is created on the server
* **And** the text file contains the requestor name, vehicle name, destination, start time, and end time

---

### US-6.8 — Role-Based Access Control & Ownership Isolation

#### Scenario: Unauthenticated caller receives 401
* **Given** no bearer token is provided
* **When** I request `GET /vehicleScheduling/reservations`
* **Then** the API returns `401` with `{ "message": "Unauthorized! No token provided." }`

#### Scenario: Maintenance user receives 404 for individual reservation
* **Given** I am signed in as a maintenance user
* **When** I request `GET /vehicleScheduling/reservations/10`
* **Then** the API returns `404` with `{ "message": "Reservation not found." }`

---

## Test Coverage Map

Each scenario above maps to at least one automated test.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-6.1 | Requestor sees only own reservations | `backend/tests/reservations.test.js` | `Requestor sees only own reservations` |
| US-6.1 | Administrator sees all reservations | `backend/tests/reservations.test.js` | `Administrator sees all reservations` |
| US-6.1 | Maintenance user cannot access reservations | `frontend/tests/MenuBar.test.js` | `Maintenance user cannot access reservations` |
| US-6.2 | Successful reservation submission | `backend/tests/reservations.test.js` | `Successful reservation submission` |
| US-6.2 | End time before start time is rejected | `backend/tests/reservations.test.js` | `End time before start time is rejected` |
| US-6.2 | Start time in the past is rejected | `backend/tests/reservations.test.js` | `Start time in the past is rejected` |
| US-6.2 | Conflicting vehicle reservation is rejected | `backend/tests/reservations.test.js` | `Conflicting vehicle reservation is rejected` |
| US-6.2 | Unapproved driver category is rejected | `backend/tests/reservations.test.js` | `Unapproved driver category is rejected` |
| US-6.3 | Owner reads own reservation details | `backend/tests/reservations.test.js` | `Owner reads own reservation details` |
| US-6.3 | Other requestor receives 404 for reservation | `backend/tests/reservations.test.js` | `Other requestor receives 404 for reservation` |
| US-6.4 | Administrator approves pending reservation | `backend/tests/reservations.test.js` | `Administrator approves pending reservation` |
| US-6.4 | Approving non-pending reservation is rejected | `backend/tests/reservations.test.js` | `Approving non-pending reservation is rejected` |
| US-6.4 | Requestor cannot approve reservation | `backend/tests/reservations.test.js` | `Requestor cannot approve reservation` |
| US-6.5 | Administrator denies pending reservation with reason | `backend/tests/reservations.test.js` | `Administrator denies pending reservation with reason` |
| US-6.5 | Denying without reason is rejected | `backend/tests/reservations.test.js` | `Denying without reason is rejected` |
| US-6.5 | Denying non-pending reservation is rejected | `backend/tests/reservations.test.js` | `Denying non-pending reservation is rejected` |
| US-6.6 | Requestor cancels own pending reservation | `backend/tests/reservations.test.js` | `Requestor cancels own pending reservation` |
| US-6.6 | Administrator cancels approved reservation | `backend/tests/reservations.test.js` | `Administrator cancels approved reservation` |
| US-6.6 | Cancelling already cancelled or denied reservation is rejected | `backend/tests/reservations.test.js` | `Cancelling already cancelled or denied reservation is rejected` |
| US-6.7 | Text summary file created upon reservation creation | `backend/tests/reservations.test.js` | `Text summary file created upon reservation creation` |
| US-6.8 | Unauthenticated caller receives 401 | `backend/tests/reservations.test.js` | `Unauthenticated caller receives 401` |
| US-6.8 | Maintenance user receives 404 for individual reservation | `backend/tests/reservations.test.js` | `Maintenance user receives 404 for individual reservation` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 6 from @features/feature-6-reservation-management.md on branch `feature/6-reservation-management`.

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

- Email delivery and mail server dispatch ([Feature 7](feature-7-email-management.md))
- Weekly admin calendar schedule view ([Feature 8](feature-8-admin-page.md))
- Vehicle catalog CRUD ([Feature 2](feature-2-vehicle-management.md))
- Driver catalog CRUD ([Feature 3](feature-3-driver-management.md))
- Destination catalog CRUD ([Feature 4](feature-4-destination-management.md))
- Area catalog CRUD ([Feature 5](feature-5-area-management.md))

---

## Delivered to Feature 7 & Feature 8

- Feature 6 creates and manages the `reservations` table and executes the state transitions (`pending`, `approved`, `denied`, `cancelled`).
- Feature 7 listens/hooks into these transitions to send recorded emails without changing the reservation response payload shapes.
- Feature 8 displays approved and pending reservations on the weekly administrator schedule calendar.

