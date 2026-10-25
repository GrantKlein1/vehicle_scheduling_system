# Feature: Email Management

**Feature ID:** 7
**Branch pattern:** `feature/7-email-management`
**Status:** Ready
**Created:** 2026-10-24
**Input:** Send a recorded email when a vehicle reservation is submitted, approved, denied, or cancelled
**Depends on:** [Feature 1 — User Authentication & Session Management](feature-1-user-auth.md), [Feature 6 — Reservation Management](feature-6-reservation-management.md)
**Related:** [features/reference/behavior.md](reference/behavior.md)

This feature sends reservation email and adds no `MenuBar` item. It does not create vehicles, drivers, destinations, areas, or reservations.

---

## User Stories

### US-7.1: Email the requestor and administrators when a reservation is submitted
**As a** requestor  
**I want** a confirmation emailed to me and a notice emailed to every administrator when I submit a vehicle reservation  
**So that** I have a record of the request and an administrator knows it is waiting for approval

**Priority:** P1  
**Independent test:** Submit a pending reservation and find one `sent` email for the requestor and one `sent` email for each `admin` user  
**Acceptance scenarios:** see ### US-7.1 under Acceptance Criteria

### US-7.2: Email the requestor and driver when a reservation is approved
**As a** requestor  
**I want** an approval email, and I want the assigned driver emailed when the reservation has a driver email  
**So that** the people making the trip know the vehicle request was approved

**Priority:** P1  
**Independent test:** Approve a pending reservation that has a driver email and find `sent` rows for the requestor and the driver only  
**Acceptance scenarios:** see ### US-7.2 under Acceptance Criteria

### US-7.3: Email the requestor when a reservation is denied
**As a** requestor  
**I want** a denial email that includes the administrator's reason  
**So that** I know the vehicle request was denied and why

**Priority:** P1  
**Independent test:** Deny a pending reservation with a reason and find one `sent` email to the requestor whose body contains that reason  
**Acceptance scenarios:** see ### US-7.3 under Acceptance Criteria

### US-7.4: Email the other parties when a reservation is cancelled
**As a** requestor or administrator  
**I want** the people who did not cancel the reservation to be emailed  
**So that** an administrator, requestor, or assigned driver is not left expecting a trip that was cancelled

**Priority:** P1  
**Independent test:** Cancel as the requestor and find emails to each administrator and the driver; cancel as an administrator and find emails to the requestor and the driver  
**Acceptance scenarios:** see ### US-7.4 under Acceptance Criteria

### US-7.5: Keep the reservation when email cannot be sent
**As the** application  
**I want** each reservation email recorded, and a mail failure kept on that record  
**So that** a mail problem does not undo a submitted, approved, denied, or cancelled reservation

**Priority:** P1  
**Independent test:** Force the mail transport to fail, still receive the reservation success status, and read an email row with status `failed`  
**Acceptance scenarios:** see ### US-7.5 under Acceptance Criteria

### US-7.6: Keep email records private and out of the menu
**As the** application  
**I want** email records readable only by an administrator or the requestor who owns the reservation, with no **Email** item in `MenuBar`  
**So that** one person cannot read another person's reservation notices

**Priority:** P1  
**Independent test:** A different requestor or a `maintenance` user receives `404` for the email list; `MenuBar` does not show **Email**  
**Acceptance scenarios:** see ### US-7.6 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: This feature sends email only after Feature 6 accepts one of these reservation transitions: submit (`pending`), approve, deny, or cancel. Sign-in, vehicle edits, driver edits, destination edits, and area edits send no email.
- **FR-002**: Recipients come from the reservation and the `users` table. A recipient list in the request body is ignored.
- **FR-003**: Submit emails the reservation's requestor and every user whose `role` is `admin`, one row per admin ordered by `users.id` ascending. A driver is not a submit recipient.
- **FR-004**: Approve emails the requestor. When the reservation has a non-blank driver email, approve also emails that driver. Administrators are not approval recipients.
- **FR-005**: Deny emails the requestor only. The body includes the denial reason. Administrators and the driver are not denial recipients.
- **FR-006**: A requestor cancellation emails every `admin` user and, when a driver email is present, the driver. It does not email the requestor.
- **FR-007**: An administrator cancellation emails the requestor and, when a driver email is present, the driver. It does not email administrators.
- **FR-008**: A user with `role` `maintenance` is never a recipient. A driver is a recipient only when that reservation has a non-blank driver email. A blank driver email skips the driver and is not a failure.
- **FR-009**: Each recipient produces one `emails` row. Recipient order on a success response is requestor, then administrators by `users.id` ascending, then driver.
- **FR-010**: The From address is `vehicle-scheduling@eagles.oc.edu` with display name **Vehicle Scheduling**. The stored `fromEmail` is `vehicle-scheduling@eagles.oc.edu`.
- **FR-011**: Subjects are exactly `Vehicle request submitted`, `Vehicle request approved`, `Vehicle request denied`, `Vehicle request cancelled`, or, for the driver on approval only, `You are assigned to a vehicle request`.
- **FR-012**: The body is plain text, lines joined by `\n`, using the templates in **Email body templates**. Start and end print as `YYYY-MM-DD HH:mm` from the reservation's stored wall-clock time. A blank area omits the `Area:` line. A blank purpose omits the `Purpose:` line.
- **FR-013**: Sending is synchronous and finishes before the reservation response is returned. Feature 6's success status stays `201` for submit and `200` for approve, deny, and cancel. This feature adds an `emails` array to that response and does not wrap it in an envelope.
- **FR-014**: One transport failure marks that recipient `failed` with `errorMessage` `Mail could not be sent.` Other recipients for the same transition are still sent. The reservation response remains the Feature 6 success status.
- **FR-015**: A refused transition creates no email row. Approving a reservation that is not `pending` returns `400` with `{ "message": "This reservation cannot be approved." }`. Denying a reservation that is not `pending` returns `400` with `{ "message": "This reservation cannot be denied." }`. A denial whose reason is missing or blank returns `400` with `{ "message": "A denial reason is required." }`. Cancelling a `denied` or `cancelled` reservation returns `400` with `{ "message": "This reservation cannot be cancelled." }`.
- **FR-016**: `GET /vehicleScheduling/reservations/:id/emails` requires a session. An administrator may list any reservation's emails. A requestor may list emails only when `reservation.requestorId` is `req.user.id`. Any other authenticated caller, and any unknown reservation, receives `404` with `{ "message": "Reservation not found." }`.
- **FR-017**: Email rows are append-only. This feature provides no update or delete route.
- **FR-018**: This feature adds no route and no `MenuBar` item. **Email** is hidden for `requestor`, `admin`, and `maintenance`.
- **FR-019**: Automated tests use a fake mail transport. They must not open a network connection to a mail server.

---

## Assumptions

- Feature 1 is already implemented: Google sign-in, roles `requestor`, `admin`, and `maintenance`, and `Authorization: Bearer <token>`.
- Feature 6 owns the `reservations` table and these transitions. Feature 7 does not create that table and does not add reservation screens.
  - `POST /vehicleScheduling/reservations` creates a `pending` reservation for the signed-in requestor and returns `201`.
  - `POST /vehicleScheduling/reservations/:id/approve` is admin-only, succeeds only from `pending`, and returns `200`.
  - `POST /vehicleScheduling/reservations/:id/deny` is admin-only, body `{ "reason": "..." }`, succeeds only from `pending` with a non-blank reason, and returns `200`.
  - `POST /vehicleScheduling/reservations/:id/cancel` may be called by that reservation's requestor or by an administrator, succeeds from `pending` or `approved`, and returns `200`.
- A reservation has one requestor, one vehicle name, one destination name, one start, one end, an optional area name, an optional purpose, and an optional driver name plus driver email.
- Feature 6 stores `requestorId`. The requestor's `fName`, `lName`, and `email` come from that user's row at send time.
- Vehicle, driver, destination, and area catalog rules stay in Features 2–5. This feature prints the names and the driver email Feature 6 already stored on the reservation.
- There is no background mail queue and no resend action.
- The refusal messages in **FR-015** are the contract Feature 6 uses for those four cases. Other reservation validation stays in Feature 6. Any non-success response from Feature 6 still creates no email row.

## Edge Cases

- A reservation with no driver email produces no driver row on approve or cancel.
- A deployment with two `admin` users produces two admin rows on submit and on requestor cancellation.
- A deployment with no `admin` user still emails the requestor on submit. That absence is not an error.
- The mail transport fails for one recipient and succeeds for another. The reservation still succeeds. Only the failed recipient is `failed`.
- The whole transport fails. The reservation still succeeds. Every recipient row for that transition is `failed` with `Mail could not be sent.`
- Approve, deny, or cancel is refused. No email row is written.
- A request body includes `recipients` or `to`. Those fields do not change who is emailed.
- Another requestor, a `maintenance` user, or an unknown reservation id lists emails → `404` `{ "message": "Reservation not found." }`.
- A missing or expired token on the email list → the Feature 1 `401` messages.
- Area or purpose is blank → that line is left out of the body. The approval email to the requestor still includes `Driver: No driver assigned.` when no driver name is stored.

## Success Criteria

- **SC-001**: Every Gherkin scenario in this feature has at least one automated test before merge.
- **SC-002**: Submitting, approving, denying, and cancelling a reservation writes the recipient rows and subjects in this spec, checked through the API without a real mail server.
- **SC-003**: `npm test` passes, including `backend/tests/emails.test.js` and the Feature 7 `MenuBar` cases.
- **SC-004**: `MenuBar` shows no **Email** item for `requestor`, `admin`, or `maintenance`.

---

## Data Ownership & Isolation

Email rows belong to a reservation. The reservation belongs to one requestor (`requestorId`).

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /vehicleScheduling/reservations/:id/emails` returns that reservation's rows for an `admin`, or for the requestor who owns it |
| **Write scope** | Rows are created only by an accepted submit, approve, deny, or cancel. Clients do not post an email body or a recipient list |
| **Create scope** | One row per server-chosen recipient for that accepted transition |
| **Cross-user access** | Another requestor, `maintenance`, or an unknown reservation → `404` `{ "message": "Reservation not found." }` |
| **UI scope** | This feature has no page. `MenuBar` has no **Email** item. The API is the only way to read these rows |
| **Implementation** | Recipient selection and the ownership check live in one email service. Controllers do not each build their own recipient list |

---

## API Requirements

Feature 6 owns the four reservation transitions. Feature 7 adds the send side effect and the `emails` array. Feature 7 adds one read route.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/vehicleScheduling/reservations` | Yes, `requestor` | Feature 6 creates a `pending` reservation. Feature 7 then sends submit email |
| `POST` | `/vehicleScheduling/reservations/:id/approve` | Yes, `admin` | Feature 6 approves. Feature 7 then sends approval email |
| `POST` | `/vehicleScheduling/reservations/:id/deny` | Yes, `admin` | Feature 6 denies. Feature 7 then sends denial email |
| `POST` | `/vehicleScheduling/reservations/:id/cancel` | Yes, owning `requestor` or `admin` | Feature 6 cancels. Feature 7 then sends cancellation email |
| `GET` | `/vehicleScheduling/reservations/:id/emails` | Yes, owning `requestor` or `admin` | List email rows for that reservation |

**Deny request body:**

```json
{ "reason": "The van is already booked." }
```

**Submit success** (`201`) includes:

```json
{
  "emails": [
    {
      "id": 1,
      "reservationId": 10,
      "event": "submitted",
      "recipientEmail": "jdoe@eagles.oc.edu",
      "recipientRole": "requestor",
      "status": "sent"
    },
    {
      "id": 2,
      "reservationId": 10,
      "event": "submitted",
      "recipientEmail": "admin@eagles.oc.edu",
      "recipientRole": "admin",
      "status": "sent"
    }
  ]
}
```

Approve, deny, and cancel use the same `emails` object shape on their `200` body. `event` is `approved`, `denied`, or `cancelled`. The reservation fields Feature 6 already returns stay in place.

**List success** (`200`), oldest `sentAt` first and then `id` ascending:

```json
[
  {
    "id": 1,
    "reservationId": 10,
    "event": "submitted",
    "recipientEmail": "jdoe@eagles.oc.edu",
    "recipientRole": "requestor",
    "fromEmail": "vehicle-scheduling@eagles.oc.edu",
    "subject": "Vehicle request submitted",
    "body": "Your vehicle request was submitted and is waiting for approval.\nRequestor: Jane Doe\nDestination: Edmond High School\nVehicle: Campus Van\nStart: 2026-11-02 08:00\nEnd: 2026-11-02 12:00",
    "status": "sent",
    "errorMessage": null,
    "sentAt": "2026-10-24T18:00:00.000Z"
  }
]
```

A reservation with no email rows returns `200` and `[]`.

**Error response:** `{ "message": "Human-readable explanation." }`

| Status | Body | When |
|--------|------|------|
| `400` | `{ "message": "This reservation cannot be approved." }` | Approve when status is not `pending`. No email row |
| `400` | `{ "message": "This reservation cannot be denied." }` | Deny when status is not `pending`. No email row |
| `400` | `{ "message": "A denial reason is required." }` | Deny reason missing or blank. No email row |
| `400` | `{ "message": "This reservation cannot be cancelled." }` | Cancel when status is `denied` or `cancelled`. No email row |
| `401` | `{ "message": "Unauthorized! No token provided." }` | Missing bearer token |
| `401` | `{ "message": "Unauthorized! Invalid or expired token." }` | Expired, revoked, or invalid token |
| `404` | `{ "message": "Reservation not found." }` | Unknown reservation, another requestor's reservation, or a `maintenance` caller |

---

## Screen Requirements

This feature adds no view and no route.

**App chrome**

- Do not add **Email** to `MenuBar`.
- `requestor`, `admin`, and `maintenance` do not see **Email**.
- Existing Feature 1 items stay as they are. **Sign out** remains the Feature 1 action. Catalog items from Features 2–6 and the Feature 8 schedule are unchanged by this feature.

---

## Key Entities

- **Reservation**: a vehicle request owned by one requestor. Feature 6 stores it. This feature reads `requestorId`, vehicle name, destination name, start, end, optional area name, optional purpose, optional driver name, and optional driver email.
- **User**: the Feature 1 account. Requestor and administrator recipients use the user's `email`, `fName`, `lName`, and `role`.
- **Email**: one recorded message to one recipient for one reservation event (`submitted`, `approved`, `denied`, or `cancelled`).

---

## Data Model Requirements

### Reservation fields this feature reads

Feature 6 owns the `reservations` table. Feature 7 requires these facts on that reservation and does not add the table:

| Fact | Rules |
|------|-------|
| `id` | Integer primary key |
| `requestorId` | Required, references `users.id` |
| `status` | `pending` after submit; later `approved`, `denied`, or `cancelled` |
| `vehicleName` | Required string copied onto the reservation |
| `destinationName` | Required string |
| `areaName` | Optional string |
| `purpose` | Optional string |
| `driverName` | Optional string |
| `driverEmail` | Optional string. Blank means no driver recipient |
| `start` | Required wall-clock datetime, printed `YYYY-MM-DD HH:mm` |
| `end` | Required wall-clock datetime, printed `YYYY-MM-DD HH:mm` |

The requestor's name and email are read from `users` through `requestorId` at send time.

### `emails` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `reservationId` | INTEGER FK | Required, references `reservations.id` |
| `event` | STRING(20) | Required. `submitted`, `approved`, `denied`, or `cancelled` |
| `recipientEmail` | STRING | Required. Address the message was addressed to |
| `recipientRole` | STRING(20) | Required. `requestor`, `admin`, or `driver` |
| `fromEmail` | STRING | Required. Always `vehicle-scheduling@eagles.oc.edu` |
| `subject` | STRING(255) | Required. One of the **FR-011** subjects |
| `body` | TEXT | Required. Rendered template |
| `status` | STRING(20) | Required. `sent` or `failed` |
| `errorMessage` | STRING(255) | Null when `sent`. `Mail could not be sent.` when `failed` |
| `sentAt` | DATE | Required. Time the row was written. Sequelize `DATE` |

No `createdAt` or `updatedAt`.

### Associations

| From | To | Relationship | On delete |
|------|----|--------------|-----------|
| `reservations` | `emails` | one-to-many (`emails.reservationId`) | CASCADE |
| `emails` | `users` | none | Recipient identity is the stored address and `recipientRole`, not a user foreign key |

### Email body templates

Lines use `\n`. Omit a line when its value is blank, except `Driver:` on the requestor approval body.

**Requestor, submitted.** Subject `Vehicle request submitted`.

```text
Your vehicle request was submitted and is waiting for approval.
Requestor: Jane Doe
Destination: Edmond High School
Area: Metro
Vehicle: Campus Van
Purpose: Campus visit
Start: 2026-11-02 08:00
End: 2026-11-02 12:00
```

**Administrator, submitted.** Subject `Vehicle request submitted`.

```text
A vehicle request is waiting for your approval.
Requestor: Jane Doe
Email: jdoe@eagles.oc.edu
Destination: Edmond High School
Area: Metro
Vehicle: Campus Van
Purpose: Campus visit
Start: 2026-11-02 08:00
End: 2026-11-02 12:00
```

**Requestor, approved.** Subject `Vehicle request approved`. With no driver name, the driver line is `Driver: No driver assigned.`

```text
Your vehicle request was approved.
Destination: Edmond High School
Area: Metro
Vehicle: Campus Van
Driver: Sam Driver
Purpose: Campus visit
Start: 2026-11-02 08:00
End: 2026-11-02 12:00
```

**Driver, approved.** Subject `You are assigned to a vehicle request`.

```text
You are the driver for this vehicle request.
Requestor: Jane Doe
Destination: Edmond High School
Area: Metro
Vehicle: Campus Van
Purpose: Campus visit
Start: 2026-11-02 08:00
End: 2026-11-02 12:00
```

**Requestor, denied.** Subject `Vehicle request denied`.

```text
Your vehicle request was denied.
Reason: The van is already booked.
Destination: Edmond High School
Area: Metro
Vehicle: Campus Van
Purpose: Campus visit
Start: 2026-11-02 08:00
End: 2026-11-02 12:00
```

**Requestor cancelled.** Subject `Vehicle request cancelled`. Sent to each administrator and to the driver when a driver email exists.

```text
The requestor cancelled this vehicle request.
Requestor: Jane Doe
Destination: Edmond High School
Area: Metro
Vehicle: Campus Van
Purpose: Campus visit
Start: 2026-11-02 08:00
End: 2026-11-02 12:00
```

**Administrator cancelled.** Subject `Vehicle request cancelled`. Sent to the requestor and to the driver when a driver email exists.

```text
An administrator cancelled this vehicle request.
Requestor: Jane Doe
Destination: Edmond High School
Area: Metro
Vehicle: Campus Van
Purpose: Campus visit
Start: 2026-11-02 08:00
End: 2026-11-02 12:00
```

---

## Acceptance Criteria (Gherkin)

Shared reservation facts, unless a scenario says otherwise: requestor Jane Doe, `jdoe@eagles.oc.edu`, role `requestor`; one administrator `admin@eagles.oc.edu`; vehicle `Campus Van`; destination `Edmond High School`; area `Metro`; purpose `Campus visit`; start `2026-11-02 08:00`; end `2026-11-02 12:00`; driver Sam Driver, `sdriver@eagles.oc.edu`.

### US-7.1 — Email the requestor and administrators when a reservation is submitted

#### Scenario: Submitted reservation emails the requestor and each admin

- **Given** I am signed in as Jane Doe
- **And** an administrator exists with email `admin@eagles.oc.edu`
- **When** I submit a reservation with the shared reservation facts
- **Then** the API returns `201`
- **And** the response `emails` array has the requestor first and that administrator second
- **And** both rows have `event` `submitted` and `status` `sent`
- **And** the requestor row's `recipientEmail` is `jdoe@eagles.oc.edu` and `recipientRole` is `requestor`
- **And** the administrator row's `recipientEmail` is `admin@eagles.oc.edu` and `recipientRole` is `admin`
- **And** both rows have `subject` `Vehicle request submitted` and `fromEmail` `vehicle-scheduling@eagles.oc.edu`
- **And** the requestor body equals the requestor submitted template for the shared facts
- **And** the administrator body equals the administrator submitted template for the shared facts
- **And** no row has `recipientRole` `driver`

#### Scenario: Submitted reservation emails every admin

- **Given** I am signed in as Jane Doe
- **And** administrators exist with emails `admin@eagles.oc.edu` and `second.admin@eagles.oc.edu`, and the second administrator has the higher `users.id`
- **When** I submit a reservation with the shared reservation facts
- **Then** the API returns `201`
- **And** three email rows are stored
- **And** the response order is Jane Doe, then `admin@eagles.oc.edu`, then `second.admin@eagles.oc.edu`
- **And** both administrator rows have `recipientRole` `admin`, `event` `submitted`, and `status` `sent`

#### Scenario: Client-supplied recipients are ignored

- **Given** I am signed in as Jane Doe
- **And** an administrator exists with email `admin@eagles.oc.edu`
- **When** I submit a reservation with the shared reservation facts and the body also includes `"recipients": ["other@eagles.oc.edu"]`
- **Then** the API returns `201`
- **And** no email row has `recipientEmail` `other@eagles.oc.edu`
- **And** the recipients are Jane Doe and `admin@eagles.oc.edu` only

---

### US-7.2 — Email the requestor and driver when a reservation is approved

#### Scenario: Approved reservation emails the requestor and the driver

- **Given** I am signed in as an administrator
- **And** Jane Doe has a `pending` reservation with the shared reservation facts, including driver email `sdriver@eagles.oc.edu`
- **When** I approve that reservation
- **Then** the API returns `200`
- **And** two email rows are stored with `event` `approved` and `status` `sent`
- **And** the first row's `recipientEmail` is `jdoe@eagles.oc.edu`, `recipientRole` is `requestor`, and `subject` is `Vehicle request approved`
- **And** the requestor body equals the requestor approved template, including `Driver: Sam Driver`
- **And** the second row's `recipientEmail` is `sdriver@eagles.oc.edu`, `recipientRole` is `driver`, and `subject` is `You are assigned to a vehicle request`
- **And** the driver body equals the driver approved template
- **And** no row has `recipientRole` `admin`

#### Scenario: Approved reservation with no driver email skips the driver

- **Given** I am signed in as an administrator
- **And** Jane Doe has a `pending` reservation with the shared reservation facts except the driver email is blank and the driver name is blank
- **When** I approve that reservation
- **Then** the API returns `200`
- **And** one email row is stored
- **And** that row's `recipientEmail` is `jdoe@eagles.oc.edu` and `status` is `sent`
- **And** the body contains `Driver: No driver assigned.`
- **And** no row has `recipientRole` `driver`

---

### US-7.3 — Email the requestor when a reservation is denied

#### Scenario: Denied reservation emails the requestor with the reason

- **Given** I am signed in as an administrator
- **And** Jane Doe has a `pending` reservation with the shared reservation facts
- **When** I deny that reservation with reason `The van is already booked.`
- **Then** the API returns `200`
- **And** one email row is stored with `event` `denied`, `status` `sent`, `recipientEmail` `jdoe@eagles.oc.edu`, and `recipientRole` `requestor`
- **And** the `subject` is `Vehicle request denied`
- **And** the body equals the requestor denied template, including `Reason: The van is already booked.`
- **And** no row has `recipientRole` `admin` or `driver`

#### Scenario: Rejected denial sends no email

- **Given** I am signed in as an administrator
- **And** Jane Doe has a `pending` reservation
- **When** I deny that reservation with a blank reason
- **Then** the API returns `400` with `{ "message": "A denial reason is required." }`
- **And** no email row is stored for that reservation

---

### US-7.4 — Email the other parties when a reservation is cancelled

#### Scenario: Requestor cancellation emails admins and the driver

- **Given** I am signed in as Jane Doe
- **And** I own a `pending` reservation with the shared reservation facts
- **And** an administrator exists with email `admin@eagles.oc.edu`
- **When** I cancel that reservation
- **Then** the API returns `200`
- **And** two email rows are stored with `event` `cancelled` and `status` `sent`
- **And** the first row's `recipientEmail` is `admin@eagles.oc.edu` and `recipientRole` is `admin`
- **And** the second row's `recipientEmail` is `sdriver@eagles.oc.edu` and `recipientRole` is `driver`
- **And** both bodies equal the requestor-cancelled template
- **And** both subjects are `Vehicle request cancelled`
- **And** no row has `recipientEmail` `jdoe@eagles.oc.edu`

#### Scenario: Admin cancellation emails the requestor and the driver

- **Given** I am signed in as an administrator
- **And** Jane Doe has an `approved` reservation with the shared reservation facts
- **When** I cancel that reservation
- **Then** the API returns `200`
- **And** two email rows are stored with `event` `cancelled` and `status` `sent`
- **And** the first row's `recipientEmail` is `jdoe@eagles.oc.edu` and `recipientRole` is `requestor`
- **And** the second row's `recipientEmail` is `sdriver@eagles.oc.edu` and `recipientRole` is `driver`
- **And** both bodies equal the administrator-cancelled template
- **And** no row has `recipientRole` `admin`

#### Scenario: Cancellation with no driver emails only the required people

- **Given** I am signed in as Jane Doe
- **And** I own an `approved` reservation with the shared reservation facts except the driver email is blank
- **And** an administrator exists with email `admin@eagles.oc.edu`
- **When** I cancel that reservation
- **Then** the API returns `200`
- **And** one email row is stored
- **And** that row's `recipientEmail` is `admin@eagles.oc.edu` and `recipientRole` is `admin`
- **And** no row has `recipientRole` `driver`

---

### US-7.5 — Keep the reservation when email cannot be sent

#### Scenario: Mail failure still accepts the reservation and records failed

- **Given** I am signed in as Jane Doe
- **And** an administrator exists with email `admin@eagles.oc.edu`
- **And** the mail transport fails for every recipient
- **When** I submit a reservation with the shared reservation facts
- **Then** the API returns `201`
- **And** the reservation is stored with status `pending`
- **And** the requestor and administrator email rows are stored with `status` `failed` and `errorMessage` `Mail could not be sent.`

#### Scenario: One recipient fails and the other is sent

- **Given** I am signed in as Jane Doe
- **And** an administrator exists with email `admin@eagles.oc.edu`
- **And** the mail transport fails only for `admin@eagles.oc.edu`
- **When** I submit a reservation with the shared reservation facts
- **Then** the API returns `201`
- **And** the requestor row has `status` `sent` and `errorMessage` null
- **And** the administrator row has `status` `failed` and `errorMessage` `Mail could not be sent.`

#### Scenario: Rejected transition records no email

- **Given** I am signed in as an administrator
- **And** Jane Doe has an `approved` reservation
- **When** I approve that reservation again
- **Then** the API returns `400` with `{ "message": "This reservation cannot be approved." }`
- **And** no email row is stored for that second approval

#### Scenario: Owner can list emails for the reservation

- **Given** Jane Doe submitted a reservation and the submit emails were stored
- **When** Jane Doe requests `GET /vehicleScheduling/reservations/:id/emails`
- **Then** the API returns `200`
- **And** the list includes `subject`, `body`, `fromEmail`, `status`, `errorMessage`, and `sentAt` for each stored row
- **And** the rows are ordered by `sentAt` ascending, then `id` ascending

#### Scenario: Email records cannot be changed or deleted

- **Given** I am signed in as an administrator
- **And** an email row exists for a reservation
- **When** I send `PUT /vehicleScheduling/reservations/:id/emails/:emailId` or `DELETE /vehicleScheduling/reservations/:id/emails/:emailId`
- **Then** the API returns `404`
- **And** the email row is unchanged

---

### US-7.6 — Keep email records private and out of the menu

#### Scenario: Another requestor cannot list the emails

- **Given** Jane Doe owns a reservation that has email rows
- **And** I am signed in as a different requestor
- **When** I request `GET /vehicleScheduling/reservations/:id/emails` for Jane's reservation
- **Then** the API returns `404` with `{ "message": "Reservation not found." }`

#### Scenario: Maintenance cannot list the emails

- **Given** a reservation has email rows
- **And** I am signed in as a user with role `maintenance`
- **When** I request `GET /vehicleScheduling/reservations/:id/emails` for that reservation
- **Then** the API returns `404` with `{ "message": "Reservation not found." }`

#### Scenario: Missing token cannot list the emails

- **Given** a reservation has email rows
- **When** I request `GET /vehicleScheduling/reservations/:id/emails` with no bearer token
- **Then** the API returns `401` with `{ "message": "Unauthorized! No token provided." }`

#### Scenario: Requestor MenuBar has no Email item

- **Given** I am signed in as a user with role `requestor`
- **When** I view the `MenuBar`
- **Then** **Email** is not shown

#### Scenario: Admin MenuBar has no Email item

- **Given** I am signed in as a user with role `admin`
- **When** I view the `MenuBar`
- **Then** **Email** is not shown

#### Scenario: Maintenance MenuBar has no Email item

- **Given** I am signed in as a user with role `maintenance`
- **When** I view the `MenuBar`
- **Then** **Email** is not shown

---

## Test Coverage Map

Each scenario above must map to at least one automated test.

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-7.1 | Submitted reservation emails the requestor and each admin | `backend/tests/emails.test.js` | `Submitted reservation emails the requestor and each admin` |
| US-7.1 | Submitted reservation emails every admin | `backend/tests/emails.test.js` | `Submitted reservation emails every admin` |
| US-7.1 | Client-supplied recipients are ignored | `backend/tests/emails.test.js` | `Client-supplied recipients are ignored` |
| US-7.2 | Approved reservation emails the requestor and the driver | `backend/tests/emails.test.js` | `Approved reservation emails the requestor and the driver` |
| US-7.2 | Approved reservation with no driver email skips the driver | `backend/tests/emails.test.js` | `Approved reservation with no driver email skips the driver` |
| US-7.3 | Denied reservation emails the requestor with the reason | `backend/tests/emails.test.js` | `Denied reservation emails the requestor with the reason` |
| US-7.3 | Rejected denial sends no email | `backend/tests/emails.test.js` | `Rejected denial sends no email` |
| US-7.4 | Requestor cancellation emails admins and the driver | `backend/tests/emails.test.js` | `Requestor cancellation emails admins and the driver` |
| US-7.4 | Admin cancellation emails the requestor and the driver | `backend/tests/emails.test.js` | `Admin cancellation emails the requestor and the driver` |
| US-7.4 | Cancellation with no driver emails only the required people | `backend/tests/emails.test.js` | `Cancellation with no driver emails only the required people` |
| US-7.5 | Mail failure still accepts the reservation and records failed | `backend/tests/emails.test.js` | `Mail failure still accepts the reservation and records failed` |
| US-7.5 | One recipient fails and the other is sent | `backend/tests/emails.test.js` | `One recipient fails and the other is sent` |
| US-7.5 | Rejected transition records no email | `backend/tests/emails.test.js` | `Rejected transition records no email` |
| US-7.5 | Owner can list emails for the reservation | `backend/tests/emails.test.js` | `Owner can list emails for the reservation` |
| US-7.5 | Email records cannot be changed or deleted | `backend/tests/emails.test.js` | `Email records cannot be changed or deleted` |
| US-7.6 | Another requestor cannot list the emails | `backend/tests/emails.test.js` | `Another requestor cannot list the emails` |
| US-7.6 | Maintenance cannot list the emails | `backend/tests/emails.test.js` | `Maintenance cannot list the emails` |
| US-7.6 | Missing token cannot list the emails | `backend/tests/emails.test.js` | `Missing token cannot list the emails` |
| US-7.6 | Requestor MenuBar has no Email item | `frontend/tests/MenuBar.test.js` | `Requestor MenuBar has no Email item` |
| US-7.6 | Admin MenuBar has no Email item | `frontend/tests/MenuBar.test.js` | `Admin MenuBar has no Email item` |
| US-7.6 | Maintenance MenuBar has no Email item | `frontend/tests/MenuBar.test.js` | `Maintenance MenuBar has no Email item` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 7 from @features/feature-7-email-management.md on branch `feature/7-email-management`.

Implement only after Feature 6 reservation transitions exist on this branch. Feature 7 must not create the reservations table, reservation screens, or a second MenuBar.
Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Use a fake mail transport in tests. Do not send real email.
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

- A page, dialog, or `MenuBar` item for reading or composing email
- Choosing recipients, editing a template, or resending a failed email
- Sign-in mail, password mail, and mail to `maintenance` because of that role
- Vehicle CRUD ([Feature 2](feature-2-vehicle-management.md))
- Driver CRUD ([Feature 3](feature-3-driver-management.md))
- Destination CRUD ([Feature 4](feature-4-destination-management.md))
- Area CRUD ([Feature 5](feature-5-area-management.md))
- Reservation screens and reservation rules other than the four refusal messages in **FR-015** ([Feature 6](feature-6-reservation-management.md))
- The admin schedule ([Feature 8](feature-8-admin-page.md))

---

## Delivered to Feature 8

- Reservation email is already sent and stored by Feature 7. Feature 8 does not add another mail sender.
- Feature 8 does not add an **Email** `MenuBar` item.
- Feature 8 may show a reservation on the admin schedule. It does not change who receives submit, approval, denial, or cancellation email.
