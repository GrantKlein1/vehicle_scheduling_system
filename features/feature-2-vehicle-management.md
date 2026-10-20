# Feature: Vehicle Management

**Feature ID:** 2
**Branch pattern:** `feature/2-vehicle-management`
**Status:** Ready
**Created:** 2026-10-03
**Input:** An admin keeps a shared vehicle catalog on one screen. A maintenance user can view that catalog and record mileage and services. A vehicle is not owned by a user.
**Depends on:** Feature 1 — User Authentication

---

## User Stories

### US-2.1: View Vehicle List Page

**As a** signed-in admin or maintenance user
**I want to** select **Vehicle** from the navigation menu
**So that** I can open the vehicle screen

**Priority:** P1
**Independent test:** Click **Vehicle** in `MenuBar` and confirm the browser lands on `/vehicle`
**Acceptance scenarios:** see ### US-2.1 under Acceptance Criteria

### US-2.2: Create Vehicle

**As a** signed-in admin
**I want to** create a vehicle in a dialog
**So that** it is added to the shared catalog

**Priority:** P1
**Independent test:** Open the dialog, submit a valid vehicle, and confirm it appears in the vehicle list
**Acceptance scenarios:** see ### US-2.2 under Acceptance Criteria

### US-2.3: Read Vehicle Catalog

**As a** signed-in admin or maintenance user
**I want to** see every vehicle in the catalog
**So that** I can review the fleet

**Priority:** P1
**Independent test:** Confirm the vehicle list shows the vehicles returned by the API, in make order
**Acceptance scenarios:** see ### US-2.3 under Acceptance Criteria

### US-2.4: Row Action Icons

**As a** signed-in admin
**I want to** see Edit and Delete on the selected vehicle
**So that** I can change or remove that vehicle

**Priority:** P1
**Independent test:** Confirm the selected vehicle's detail panel shows Edit and Delete for an admin, and does not for maintenance
**Acceptance scenarios:** see ### US-2.4 under Acceptance Criteria

### US-2.5: Edit Vehicle

**As a** signed-in admin
**I want to** update a vehicle's details
**So that** the catalog stays accurate

**Priority:** P2
**Independent test:** Change a vehicle and confirm the detail panel shows the new values
**Acceptance scenarios:** see ### US-2.5 under Acceptance Criteria

### US-2.6: Delete Vehicle

**As a** signed-in admin
**I want to** delete a vehicle after I confirm
**So that** a vehicle that is no longer in the fleet is removed

**Priority:** P2
**Independent test:** Confirm delete and verify the vehicle is gone from the vehicle list
**Acceptance scenarios:** see ### US-2.6 under Acceptance Criteria

### US-2.7: Role-Based Access Control

**As the** application
**I want to** keep catalog create, update, and delete limited to admins, and keep the vehicle screen limited to admins and maintenance users
**So that** a requestor cannot see or change the fleet, and a maintenance user cannot add, edit, or remove a vehicle

**Priority:** P1
**Independent test:** Sign in as a requestor and as a maintenance user and confirm the forbidden calls return 403
**Acceptance scenarios:** see ### US-2.7 under Acceptance Criteria

### US-2.8: Log Mileage and Service

**As a** signed-in maintenance user
**I want to** record a mileage reading and a service on a vehicle
**So that** the fleet's mileage and service history stays current

**Priority:** P1
**Independent test:** Log a mileage reading and an oil change on a vehicle and confirm both appear on that vehicle
**Acceptance scenarios:** see ### US-2.8 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001:** Every vehicle endpoint MUST require authentication (`authenticate` middleware).
- **FR-002:** An authenticated `admin` MUST be able to list vehicles, fetch one vehicle, create a vehicle, update a vehicle, and delete a vehicle.
- **FR-003:** `POST`, `PUT`, and `DELETE` on a vehicle MUST succeed only when `req.user.role === "admin"`. A `maintenance` user who calls those endpoints MUST receive HTTP `403` with `{ "message": "Admin role required." }`.
- **FR-004:** An authenticated `admin` or `maintenance` user MUST be able to list vehicles, fetch one vehicle, append a mileage log, and append a service log.
- **FR-005:** A `requestor` who calls any vehicle endpoint MUST receive HTTP `403` with `{ "message": "Admin role required." }`.
- **FR-006:** A vehicle MUST NOT have a `userId`. A `userId` in the request body MUST be ignored and MUST NOT be stored.
- **FR-007:** Every input string MUST be trimmed. A required string that is missing, empty, or whitespace-only MUST be rejected with HTTP `400`.
- **FR-008:** A request with no token MUST return HTTP `401` with `{ "message": "Unauthorized! No token provided." }`. A request with an invalid or expired token MUST return HTTP `401` with `{ "message": "Unauthorized! Invalid or expired token." }`. A visitor with no session who opens `/vehicle` MUST be redirected to `/login`. A signed-in `requestor` who opens `/vehicle` MUST be redirected to home.
- **FR-009:** `GET /api/vehicle/vehicles` MUST return vehicles ordered by `make` ascending, then `model` ascending, then `id` ascending.
- **FR-010:** For `Truck`, `Car`, and `Van`, `licensePlateNumber` MUST be required, unique, and at most 10 characters, and `licensePlateExpirationMonth` MUST be an integer from 1 through 12. A duplicate plate, a longer plate, or a missing plate or month MUST return HTTP `400`. A `Golf Cart` MUST store both fields as `null`.
- **FR-011:** For `Truck`, `Car`, and `Van`, `vin` MUST be required, unique, and at most 20 characters. A duplicate or longer value MUST return HTTP `400`. A `Golf Cart` MUST store `vin` as `null`. Values sent for `vin`, `licensePlateNumber`, or `licensePlateExpirationMonth` on a golf cart MUST be discarded.
- **FR-012:** `category` MUST be exactly one of `Golf Cart`, `Truck`, `Car`, or `Van`. `make` and `model` MUST be required strings of at most 40 characters. They are not limited to the standard list. The standard list is the suggestion list in the Make and Model combo boxes.
- **FR-013:** `areaAssigned` MUST be exactly one of `Athletics`, `Support Central`, or `Maintenance`.
- **FR-014:** `servicePerformed` MUST be exactly one of `Repair`, `Oil change`, or `Tire replacement`. Mileage and service rows are append-only in this feature.
- **FR-015:** Deleting a vehicle MUST delete that vehicle's mileage logs and service logs.
- **FR-016:** This feature MUST add **Vehicle** to the existing `MenuBar` for `admin` and `maintenance` only. It MUST NOT create a second `MenuBar`.

## Assumptions

- Feature 1 sessions, roles (`requestor`, `admin`, `maintenance`), and `MenuBar` are already in place.
- Vehicles are one shared catalog. They are not private to the user who created them.
- Catalog create, edit, and delete happen in dialogs on a single view (`/vehicle`).
- Each vehicle has one category. Feature 3 uses that category when it records which vehicle types a driver is approved to drive. This feature does not create drivers.
- Feature 5 will own area name, logo, and notification email. This feature stores only the area name on the vehicle.
- Feature 6 will store `vehicleId` on a reservation when a vehicle is assigned. This feature does not create reservations.
- A maintenance user can read the whole fleet. The list is not filtered by `areaAssigned`.
- Trip problem notices (Low Gas, Dirty, Maintenance needed) are not a vehicle-catalog record. They belong to later reservation and admin-queue work.

---

## Edge Cases

- A required field left blank on the form shows **Required field** and does not call the API.
- Duplicate `vin`: HTTP `400` with `"VIN already exists."`. Empty `vin` values on golf carts do not count as duplicates.
- Duplicate `licensePlateNumber`: HTTP `400` with `"License Plate Number already exists."`. Empty plate values on golf carts do not count as duplicates.
- A `Golf Cart` is stored with `vin`, `licensePlateNumber`, and `licensePlateExpirationMonth` set to `null`, even when the request includes those fields.
- A `make` or `model` that is not on the standard list is stored. The API does not reject it for being off the list.
- `year`, `passengerCapacity`, `licensePlateExpirationMonth`, `purchasedDate`, `color`, or `areaAssigned` outside the rules in the API error table: HTTP `400`.
- Update, delete, or log for an id that does not exist: HTTP `404` with `"Vehicle with id=<vehicleId> not found."`.
- A `maintenance` create, update, or delete of a vehicle: HTTP `403` with `"Admin role required."`.
- A `requestor` call to any vehicle endpoint: HTTP `403` with `"Admin role required."`.
- No session on `/vehicle`: redirect to `/login`. A vehicle API call with no token: HTTP `401`.
- A signed-in `requestor` opening `/vehicle`: redirect to home. **Vehicle** is not in that user's `MenuBar`.
- A `userId` sent with a create or update is dropped. The stored row has no `userId`.

## Success Criteria

- **SC-001:** Every Gherkin scenario is covered by an automated test in the Test Coverage Map.
- **SC-002:** An admin can create, view, update, and delete a vehicle on one screen, using dialogs.
- **SC-003:** A requestor cannot call vehicle endpoints. A maintenance user cannot create, update, or delete a vehicle.
- **SC-004:** An admin or a maintenance user can list vehicles and append a mileage log and a service log.
- **SC-005:** `npm test` passes.

## Data Ownership & Isolation

Vehicles belong to one shared catalog. There is no `userId` on a vehicle. Admins change catalog rows. Admins and maintenance users read the catalog and append logs.

| Rule | Requirement |
|------|-------------|
| **Read scope** | `GET /api/vehicle/vehicles` and `GET /api/vehicle/vehicles/:vehicleId` return the shared catalog to an authenticated `admin` or `maintenance` user. |
| **Write scope** | `PUT` and `DELETE` `/api/vehicle/vehicles/:vehicleId` succeed only when `req.user.role === "admin"`. |
| **Create scope** | `POST /api/vehicle/vehicles` succeeds only when `req.user.role === "admin"`. The row is saved with no `userId`. |
| **Log scope** | `POST` mileage and service logs succeed for `admin` and `maintenance`. They append a row for that `vehicleId`. |
| **Requestor access** | Any vehicle endpoint returns `403` with `{ "message": "Admin role required." }`. |
| **Maintenance catalog changes** | `POST`, `PUT`, and `DELETE` on a vehicle return `403` with `{ "message": "Admin role required." }`. |
| **UI scope** | `Vehicles.vue` and the **Vehicle** `MenuBar` item render for `admin` and `maintenance` only. Add, Edit, and Delete render for `admin` only. |
| **Implementation** | `authenticate` runs first. Role checks use `req.user.role`. |

---

## Key Entities

- **Vehicle**: one shared catalog row (no `userId`). Fields: category, make, model, year, VIN, purchased date, color, passenger capacity, license plate number, license plate expiration month, area assigned. Category is exactly one of Golf Cart, Truck, Car, or Van.
- **Mileage log**: a date and a current mileage for one vehicle.
- **Service log**: a date and a service performed for one vehicle. The service is Repair, Oil change, or Tire replacement.
- **User / Session**: required for navigation and API calls. Roles are `admin`, `maintenance`, and `requestor` (Feature 1).

---

## API Requirements

`backend/server.js` mounts routers at `/api`. This feature registers a vehicle router so the paths below are the full HTTP paths. Responses are flat JSON. Errors are `{ "message": "..." }`. Do not wrap success or errors in `{ success, data }`.

The error tables in this section are normative for HTTP `400` responses. Gherkin below covers a representative set of those rows.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/vehicle/vehicles` | `admin` | Create a vehicle |
| `GET` | `/api/vehicle/vehicles` | `admin`, `maintenance` | List all vehicles |
| `GET` | `/api/vehicle/vehicles/:vehicleId` | `admin`, `maintenance` | Fetch one vehicle, including logs |
| `PUT` | `/api/vehicle/vehicles/:vehicleId` | `admin` | Update a vehicle |
| `DELETE` | `/api/vehicle/vehicles/:vehicleId` | `admin` | Delete a vehicle and its logs |
| `POST` | `/api/vehicle/vehicles/:vehicleId/mileage-logs` | `admin`, `maintenance` | Append a mileage log |
| `POST` | `/api/vehicle/vehicles/:vehicleId/service-logs` | `admin`, `maintenance` | Append a service log |

### Create – `POST /api/vehicle/vehicles`

**Request body:**

```json
{
  "category": "Truck",
  "make": "Ford",
  "model": "F-150",
  "year": 2022,
  "vin": "1FTFW1E50NFA00001",
  "purchasedDate": "2022-06-01",
  "color": "White",
  "passengerCapacity": 5,
  "licensePlateNumber": "OC-1001",
  "licensePlateExpirationMonth": 6,
  "areaAssigned": "Athletics",
}
```

A `userId` property in the body is ignored.

**Success** (`201`): the saved vehicle JSON, including `id`, the fields above, `createdAt`, and `updatedAt`. The response does not include `userId`, `mileageLogs`, or `serviceLogs`.

**Errors (`400`):**

| Condition | `message` |
|-----------|-----------|
| Missing or blank `category` | `Category cannot be empty.` |
| `category` not one of the four values | `Category must be Golf Cart, Truck, Car, or Van.` |
| Missing or blank `make` | `Make cannot be empty.` |
| `make` longer than 40 characters | `Make cannot exceed 40 characters.` |
| Missing or blank `model` | `Model cannot be empty.` |
| `model` longer than 40 characters | `Model cannot exceed 40 characters.` |
| Missing `year`, or `year` not an integer from 1950 through 2027 | `Year must be from 1950 through 2027.` |
| Missing or blank `vin` when `category` is not `Golf Cart` | `VIN cannot be empty.` |
| `vin` longer than 20 characters when `category` is not `Golf Cart` | `VIN cannot exceed 20 characters.` |
| Duplicate `vin` | `VIN already exists.` |
| Missing, blank, or invalid `purchasedDate` | `Purchased Date must be a valid date.` |
| Missing or blank `color` | `Color cannot be empty.` |
| `color` longer than 30 characters | `Color cannot exceed 30 characters.` |
| Missing `passengerCapacity`, or not an integer from 1 through 15 | `Number of passengers must be from 1 through 15.` |
| Missing or blank `licensePlateNumber` when `category` is not `Golf Cart` | `License Plate Number cannot be empty.` |
| `licensePlateNumber` longer than 10 characters when `category` is not `Golf Cart` | `License Plate Number cannot exceed 10 characters.` |
| Duplicate `licensePlateNumber` | `License Plate Number already exists.` |
| Missing `licensePlateExpirationMonth`, or not an integer from 1 through 12, when `category` is not `Golf Cart` | `License Plate Expiration Month must be from 1 through 12.` |
| Missing or blank `areaAssigned` | `Area Assigned cannot be empty.` |
| `areaAssigned` not one of the three area names | `Area Assigned must be Athletics, Support Central, or Maintenance.` |

`purchasedDate` MUST be a real calendar date in `YYYY-MM-DD` form. Uniqueness of `vin` and `licensePlateNumber` is exact after trim, and it is case-sensitive. A `Golf Cart` stores `vin`, `licensePlateNumber`, and `licensePlateExpirationMonth` as `null`. Those nulls are not unique values, so more than one golf cart can omit them. Any values sent for those three fields on a golf cart are discarded.

**Forbidden:** `403` `{ "message": "Admin role required." }` when the caller is `maintenance` or `requestor`.

**Unauthorized:** `401` when the Bearer token is missing, invalid, or expired, using the Feature 1 messages in **FR-008**.

### List all – `GET /api/vehicle/vehicles`

**Success** (`200`): a JSON array of vehicles, ordered by `make` ASC, then `model` ASC, then `id` ASC. Each item has the same fields as the create success body. Logs are not included.

### Get one – `GET /api/vehicle/vehicles/:vehicleId`

**Success** (`200`): one vehicle object (not an array). It includes `mileageLogs` and `serviceLogs`, each ordered by `entryDate` ascending, then `id` ascending.

```json
{
  "id": 1,
  "category": "Truck",
  "make": "Ford",
  "model": "F-150",
  "year": 2022,
  "vin": "1FTFW1E50NFA00001",
  "purchasedDate": "2022-06-01",
  "color": "White",
  "passengerCapacity": 5,
  "licensePlateNumber": "OC-1001",
  "licensePlateExpirationMonth": 6,
  "areaAssigned": "Athletics",
  "mileageLogs": [
    { "id": 1, "vehicleId": 1, "entryDate": "2026-10-01", "currentMileage": 15000 }
  ],
  "serviceLogs": [
    { "id": 1, "vehicleId": 1, "entryDate": "2026-09-01", "servicePerformed": "Oil change" }
  ],
  "createdAt": "2026-10-15T12:00:00.000Z",
  "updatedAt": "2026-10-15T12:00:00.000Z"
}
```

**Not found:** `404` `{ "message": "Vehicle with id=<vehicleId> not found." }`

### Update – `PUT /api/vehicle/vehicles/:vehicleId`

**Request body:** the same fields as create. All of those fields are required on update. A `userId` in the body is ignored.

Validation messages match the create table. A duplicate `vin` or `licensePlateNumber` is reported only when another vehicle already has that value.

**Success** (`200`): `{ "message": "Vehicle was updated successfully." }`

**Not found:** `404` `{ "message": "Vehicle with id=<vehicleId> not found." }`

### Delete – `DELETE /api/vehicle/vehicles/:vehicleId`

**Success** (`200`): `{ "message": "Vehicle was deleted successfully!" }`

The vehicle row, its mileage logs, and its service logs are removed.

**Not found:** `404` `{ "message": "Vehicle with id=<vehicleId> not found." }`

### Log mileage – `POST /api/vehicle/vehicles/:vehicleId/mileage-logs`

**Request body:**

```json
{
  "entryDate": "2026-10-01",
  "currentMileage": 15000
}
```

**Success** (`201`):

```json
{
  "id": 1,
  "vehicleId": 1,
  "entryDate": "2026-10-01",
  "currentMileage": 15000
}
```

**Errors (`400`):**

| Condition | `message` |
|-----------|-----------|
| Missing, blank, or invalid `entryDate` | `Date must be a valid date.` |
| Missing `currentMileage`, or not an integer greater than or equal to 0 | `Current mileage must be zero or greater.` |

**Not found:** `404` `{ "message": "Vehicle with id=<vehicleId> not found." }`

### Log service – `POST /api/vehicle/vehicles/:vehicleId/service-logs`

**Request body:**

```json
{
  "entryDate": "2026-09-01",
  "servicePerformed": "Oil change"
}
```

**Success** (`201`):

```json
{
  "id": 1,
  "vehicleId": 1,
  "entryDate": "2026-09-01",
  "servicePerformed": "Oil change"
}
```

**Errors (`400`):**

| Condition | `message` |
|-----------|-----------|
| Missing, blank, or invalid `entryDate` | `Date must be a valid date.` |
| Missing or blank `servicePerformed` | `Service performed cannot be empty.` |
| `servicePerformed` not one of the three services | `Service performed must be Repair, Oil change, or Tire replacement.` |

**Not found:** `404` `{ "message": "Vehicle with id=<vehicleId> not found." }`

**Error response (all):** `{ "message": "Human-readable explanation." }`

---

## Screen Requirements

Route name `vehicles`, path `/vehicle`. One view, `Vehicles.vue`. Create, edit, and delete use `v-dialog` on this view. Mileage and service use inline forms in the detail panel.

### [View: Vehicle list] — route name `vehicles` (`/vehicle`)

**Shell**

- Heading: **Vehicles**
- Admin primary action: **Add Vehicle** (`v-if` the signed-in role is `admin`)
- Maintenance users do not see **Add Vehicle**
- Load failure: `<v-alert type="error">` with the API `message`
- Action success and action failure: a snackbar. Failure snackbars show the API `message`
- Empty catalog: **No vehicles yet.** is a single outlined card with centered text, in place of the two panes
- When vehicles exist, the page is a two-pane row: the vehicle list (`cols="12" md="4"`) and the vehicle detail panel (`cols="12" md="8"`). Below `md`, the list stacks above the detail panel at full width.

**Vehicle list**

- Search field labeled **Search vehicles**. It matches, case-insensitively, against year, make, model, category, license plate, area, and color.
- Caption under the search field: `{n} vehicles`, the filtered count.
- One list item per vehicle, in API order. Each item shows a category icon, the title `{year} {make} {model}`, and the subtitle `{licensePlateNumber or "No plate"} - {areaAssigned}`.
- The selected item is highlighted. Selecting an item loads that vehicle's detail panel. The first vehicle is selected automatically when the page loads.
- No search matches: **No vehicles match your search.**

**Vehicle detail panel**

- One outlined card for the selected vehicle. If nothing is selected: **Select a vehicle to see its details, mileage, and service.**
- Header: category icon, title `{year} {make} {model}`, chips for the category and the area assigned.
- Admin header actions: pencil icon (`mdi-pencil`) opens **Edit Vehicle** (`aria-label`: **Edit vehicle**) and trash icon (`mdi-delete`) opens the delete confirmation (`aria-label`: **Delete vehicle**). Maintenance users do not see these.
- Summary tiles:
  - **Current mileage**: the latest mileage reading as `{formatted mileage} mi`, with caption `as of {formatted date}`. No readings: **No readings yet**.
  - **Last service**: the latest service, with caption `on {formatted date}`. No services: **No services yet**.
- **Details** grid: Color, Passengers, Purchased, VIN, License plate, Plate expires. A Golf Cart shows **Not applicable** for VIN, License plate, and Plate expires.
- **Mileage log**: newest first, columns **Date** and **Mileage**. No rows: **No mileage readings yet.**
- **Service log**: newest first, columns **Date** and **Service**. No rows: **No services logged yet.**

**Inline log forms**

Both forms sit in the detail panel, above their history tables. Admin and maintenance both see them.

- Mileage fields: **Mileage date** (date, defaults to today), **Current mileage**. Action: **Log mileage** (`aria-label`: **Log mileage**).
- Service fields: **Service date** (date, defaults to today), **Service performed** (select: Repair, Oil change, Tire replacement). Action: **Log service** (`aria-label`: **Log service**).
- A blank required field shows **Required field** and does not call the API. Leaving a field shows that field's validation message under the field.
- On mileage success: refresh the selected vehicle's logs, reset the mileage form, snackbar **`Mileage logged successfully!`**.
- On service success: refresh the selected vehicle's logs, reset the service form, snackbar **`Service logged successfully!`**.
- On failure: error snackbar with the API `message`.

**Add Vehicle dialog**

- Title: **Add Vehicle**
- Fields stay the same and are grouped. **Vehicle**: **Category** and **Year**, **Make** and **Model**, **Color** and **Number of passengers**. **Registration**: **VIN** (full width), **License Plate Number** and **License Plate Expiration Month**. **Assignment**: **Area Assigned** and **Purchased Date**.
- When **Category** is **Golf Cart**, the **Registration** group is replaced by the note **Golf carts don't need a VIN or license plate.** Those three fields are hidden and are not required. Choosing **Golf Cart** clears any values already entered in those fields. The saved golf cart sends those three fields as `null`.
- **Category**, **License Plate Expiration Month**, and **Area Assigned** are selects. Month options are 1 through 12. Area options are Athletics, Support Central, and Maintenance. **License Plate Expiration Month** is shown only when the category is not **Golf Cart**.
- **Make** and **Model** are combo boxes. **Make** suggests the standard makes for the selected category. **Model** suggests the standard models for the selected category and the current make when that make is on the standard list. A typed make or model that is not on the list is accepted. If the typed make is not on the list, **Model** has no suggestions and the admin types the model.
- The other fields are inputs. **Purchased Date** is a date.
- A blank required field shows **Required field** and does not call the API.
- Actions: **Close**, **Add Vehicle**
- On success: close the dialog, refresh the list, snackbar **`Ford F-150 added successfully!`** using that vehicle's make and model (`{make} {model} added successfully!`)
- On failure: error snackbar with the API `message`

**Edit Vehicle dialog**

- Title: **Edit Vehicle**
- Same fields as Add Vehicle, filled with the selected vehicle. A stored make or model that is not on the standard list is shown as the current value.
- Actions: **Close**, **Update Vehicle**
- On success: close the dialog, refresh the list, snackbar **`{make} {model} updated successfully!`**
- On failure: error snackbar with the API `message`

**Delete dialog**

- Title: **Delete this vehicle?**
- Text: **This removes the vehicle and its mileage and service logs.**
- Actions: **Cancel**, **Delete**
- **Cancel** closes the dialog and leaves the vehicle in the list
- On success: close the dialog, refresh the list, snackbar **`Vehicle deleted successfully!`**
- On failure: error snackbar with the API `message`

### App chrome

- Add **Vehicle** to the Feature 1 `MenuBar`. Allowed roles: `admin` and `maintenance`. Path: `/vehicle`.
- Do not add a second `MenuBar`.
- A signed-out `MenuBar` still does not show **Vehicle**.
- A `requestor` `MenuBar` does not show **Vehicle**.
- Feature 1 tests that expect **Vehicle** to be hidden for `admin` and for `maintenance` are updated here so those roles see **Vehicle**. Tests that expect **Vehicle** to be hidden with no session, and hidden for `requestor`, stay as written.

---

## Data Model Requirements

### Standard make and model list

This list fills the **Make** and **Model** combo boxes. It is not the only data that can be stored. An admin can type any other make and any other model, and the API stores that text.

When the chosen make is on this list, **Model** suggests the models in that row. The same make may appear under more than one category. Ford under Truck suggests F-150 and Ranger. Ford under Car suggests Fusion. Ford under Van suggests Transit and E-Series. Those suggestions do not block a different model.

| Category | Make | Models |
|----------|------|--------|
| Golf Cart | Club Car | Onward, Villager |
| Golf Cart | EZ-GO | Liberty, Express |
| Golf Cart | Yamaha | Drive2, Concierge |
| Truck | Ford | F-150, Ranger |
| Truck | Chevrolet | Silverado, Colorado |
| Truck | Ram | 1500 |
| Truck | Toyota | Tacoma, Tundra |
| Car | Toyota | Camry, Corolla |
| Car | Honda | Civic, Accord |
| Car | Chevrolet | Malibu |
| Car | Ford | Fusion |
| Van | Ford | Transit, E-Series |
| Van | Chevrolet | Express |
| Van | Honda | Odyssey |
| Van | Ram | ProMaster |

### `vehicles` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `category` | STRING | Required. `Golf Cart`, `Truck`, `Car`, or `Van` |
| `make` | STRING(40) | Required. Any non-blank value. The standard list is a form suggestion, not a stored whitelist. |
| `model` | STRING(40) | Required. Any non-blank value. The standard list is a form suggestion, not a stored whitelist. |
| `year` | INTEGER | Required. 1950 through 2027 |
| `vin` | STRING(20) | Required and unique for `Truck`, `Car`, and `Van`. `null` for `Golf Cart` |
| `purchasedDate` | DATEONLY | Required. `YYYY-MM-DD` |
| `color` | STRING(30) | Required |
| `passengerCapacity` | INTEGER | Required. 1 through 15 |
| `licensePlateNumber` | STRING(10) | Required and unique for `Truck`, `Car`, and `Van`. `null` for `Golf Cart` |
| `licensePlateExpirationMonth` | INTEGER | Required, 1 through 12, for `Truck`, `Car`, and `Van`. `null` for `Golf Cart` |
| `areaAssigned` | STRING | Required. `Athletics`, `Support Central`, or `Maintenance` |
| `createdAt` | DATE | Set by the ORM |
| `updatedAt` | DATE | Set by the ORM |

There is no `userId` column.

### `mileage_logs` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `entryDate` | DATEONLY | Required. `YYYY-MM-DD` |
| `currentMileage` | INTEGER | Required. Integer greater than or equal to 0 |
| `vehicleId` | INTEGER FK | Required, references `vehicles.id` |

### `service_logs` table

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `entryDate` | DATEONLY | Required. `YYYY-MM-DD` |
| `servicePerformed` | STRING | Required. `Repair`, `Oil change`, or `Tire replacement` |
| `vehicleId` | INTEGER FK | Required, references `vehicles.id` |

### Associations

- `Vehicle` hasMany `MileageLog` – `onDelete: CASCADE`
- `Vehicle` hasMany `ServiceLog` – `onDelete: CASCADE`
- `MileageLog` belongsTo `Vehicle`
- `ServiceLog` belongsTo `Vehicle`

---

## Acceptance Criteria (Gherkin)

### US-2.1 — View Vehicle List Page

#### Scenario: Signed-in admin navigates to the vehicle page

- **Given** I am signed in as an admin
- **When** I select **Vehicle** from the navigation menu
- **Then** I am on `/vehicle`
- **And** the heading **Vehicles** is displayed
- **And** **Add Vehicle** is displayed

#### Scenario: Signed-in maintenance user navigates to the vehicle page

- **Given** I am signed in as a maintenance user
- **When** I select **Vehicle** from the navigation menu
- **Then** I am on `/vehicle`
- **And** the heading **Vehicles** is displayed
- **And** **Add Vehicle** is not displayed

#### Scenario: Requestor does not see Vehicle in the menu

- **Given** I am signed in as a requestor
- **When** I view the navigation menu
- **Then** **Vehicle** is not shown

---

### US-2.2 — Create Vehicle

#### Scenario: Signed-in admin creates a new vehicle

- **Given** I am signed in as an admin on the vehicle page
- **When** I click **Add Vehicle**
- **Then** the **Add Vehicle** dialog opens
- **When** I choose category `Truck`, make `Ford`, model `F-150`, year `2022`, VIN `1FTFW1E50NFA00001`, purchased date `2022-06-01`, color `White`, passengers `5`, license plate `OC-1001`, expiration month `6`, and area `Athletics`
- **And** I click **Add Vehicle**
- **Then** `POST /api/vehicle/vehicles` returns `201`
- **And** the saved vehicle has `make` `Ford`, `model` `F-150`, and `category` `Truck`
- **And** the response has no `userId`
- **And** `Ford F-150` appears in the vehicle list
- **And** I see a snackbar **`Ford F-150 added successfully!`**

#### Scenario: Golf cart is stored without VIN or license plate

- **Given** I am signed in as an admin
- **When** I send `POST /api/vehicle/vehicles` for a `Golf Cart`, including a `vin` and a license plate
- **Then** the API returns `201`
- **And** the saved vehicle has `vin`, `licensePlateNumber`, and `licensePlateExpirationMonth` set to `null`
- **And** a second golf cart with those fields omitted also returns `201`
- **When** I open **Add Vehicle** and choose category `Golf Cart`
- **Then** **VIN**, **License Plate Number**, and **License Plate Expiration Month** are not shown
- **And** I can add the golf cart without those fields

#### Scenario: Create without VIN is rejected

- **Given** I am signed in as an admin
- **When** I send `POST /api/vehicle/vehicles` with a valid vehicle body whose `vin` is missing
- **Then** the API returns `400` with `{ "message": "VIN cannot be empty." }`

#### Scenario: Create with a duplicate VIN is rejected

- **Given** I am signed in as an admin
- **And** a vehicle already exists with VIN `1FTFW1E50NFA00001`
- **When** I send `POST /api/vehicle/vehicles` with the same `vin` and a different `licensePlateNumber`
- **Then** the API returns `400` with `{ "message": "VIN already exists." }`

#### Scenario: Create with a duplicate license plate is rejected

- **Given** I am signed in as an admin
- **And** a vehicle already exists with license plate `OC-1001`
- **When** I send `POST /api/vehicle/vehicles` with the same `licensePlateNumber` and a different `vin`
- **Then** the API returns `400` with `{ "message": "License Plate Number already exists." }`

#### Scenario: Create with a make and model that are not on the standard list

- **Given** I am signed in as an admin
- **When** I send `POST /api/vehicle/vehicles` with a valid vehicle body whose `category` is `Car`, `make` is `Tesla`, and `model` is `Model 3`
- **Then** the API returns `201`
- **And** the saved vehicle has `make` `Tesla` and `model` `Model 3`

#### Scenario: Supplied userId is ignored

- **Given** I am signed in as an admin
- **When** I send `POST /api/vehicle/vehicles` with a valid vehicle body and `"userId": 99`
- **Then** the API returns `201`
- **And** the response has no `userId`
- **And** the stored vehicle row has no `userId`

#### Scenario: Empty required field shows Required field

- **Given** I am signed in as an admin
- **And** the **Add Vehicle** dialog is open
- **When** I leave **VIN** blank
- **And** I click **Add Vehicle**
- **Then** I see **Required field**
- **And** `POST /api/vehicle/vehicles` is not called

---

### US-2.3 — Read Vehicle Catalog

#### Scenario: Signed-in admin views the vehicle catalog

- **Given** I am signed in as an admin
- **And** a Chevrolet Malibu and a Ford F-150 exist
- **When** I open the vehicle page
- **Then** `GET /api/vehicle/vehicles` is called
- **And** both vehicles are listed in the vehicle list

#### Scenario: Vehicle list is sorted by make

- **Given** I am signed in as an admin
- **And** a Ford F-150 and a Chevrolet Malibu exist
- **When** I send `GET /api/vehicle/vehicles`
- **Then** the API returns `200`
- **And** the Chevrolet Malibu comes before the Ford F-150

#### Scenario: Maintenance views logs for a vehicle

- **Given** I am signed in as a maintenance user
- **And** vehicle `4` is a Ford F-150 with a mileage log of `15000` on `2026-10-01` and a service log `Oil change` on `2026-09-01`
- **When** I send `GET /api/vehicle/vehicles/4`
- **Then** the API returns `200`
- **And** the body includes that mileage log and that service log
- **When** I select the Ford F-150 in the vehicle list
- **Then** the detail panel shows mileage `15,000 mi` and service **Oil change**

---

### US-2.4 — Row Action Icons

#### Scenario: Row action buttons visible for admin

- **Given** I am signed in as an admin on the vehicle page
- **And** at least one vehicle is listed
- **When** I view the selected vehicle's detail panel
- **Then** I see **Edit vehicle** and **Delete vehicle**
- **And** I see **Log mileage** and **Log service**

#### Scenario: Maintenance row shows log actions only

- **Given** I am signed in as a maintenance user on the vehicle page
- **And** at least one vehicle is listed
- **When** I view the selected vehicle's detail panel
- **Then** I see **Log mileage** and **Log service**
- **And** I do not see **Edit vehicle** or **Delete vehicle**

---

### US-2.5 — Edit Vehicle

#### Scenario: Signed-in admin updates vehicle details

- **Given** I am signed in as an admin on the vehicle page
- **And** a Ford F-150 exists with color `White`
- **When** I click **Edit vehicle** in that vehicle's detail panel
- **Then** the **Edit Vehicle** dialog opens
- **When** I change color to `Blue`
- **And** I click **Update Vehicle**
- **Then** `PUT /api/vehicle/vehicles/:vehicleId` returns `{ "message": "Vehicle was updated successfully." }`
- **And** the Ford F-150 detail panel shows color `Blue`
- **And** I see a snackbar **`Ford F-150 updated successfully!`**

#### Scenario: Update of an unknown vehicle is rejected

- **Given** I am signed in as an admin
- **When** I send `PUT /api/vehicle/vehicles/9999` with a valid vehicle body
- **Then** the API returns `404` with `{ "message": "Vehicle with id=9999 not found." }`

---

### US-2.6 — Delete Vehicle

#### Scenario: Signed-in admin deletes a vehicle with confirmation

- **Given** I am signed in as an admin on the vehicle page
- **And** a Ford F-150 exists and has a mileage log and a service log
- **When** I click **Delete vehicle** in that vehicle's detail panel
- **Then** a dialog titled **Delete this vehicle?** is displayed
- **When** I click **Delete**
- **Then** `DELETE /api/vehicle/vehicles/:vehicleId` returns `{ "message": "Vehicle was deleted successfully!" }`
- **And** the Ford F-150 is removed from the vehicle list
- **And** that vehicle's mileage logs and service logs are removed
- **And** I see a snackbar **`Vehicle deleted successfully!`**

#### Scenario: Cancelled delete leaves the vehicle

- **Given** I am signed in as an admin on the vehicle page
- **And** a Ford F-150 exists
- **When** I click **Delete vehicle** in that vehicle's detail panel
- **And** I click **Cancel**
- **Then** the Ford F-150 remains in the vehicle list
- **And** `DELETE /api/vehicle/vehicles/:vehicleId` is not called

---

### US-2.7 — Role-Based Access Control

#### Scenario: Requestor vehicle access is restricted

- **Given** I am signed in as a requestor
- **When** I view the navigation menu
- **Then** **Vehicle** is not shown
- **When** I navigate directly to `/vehicle`
- **Then** I am redirected to home
- **When** I send `GET /api/vehicle/vehicles`, `POST /api/vehicle/vehicles`, `PUT /api/vehicle/vehicles/1`, `DELETE /api/vehicle/vehicles/1`, `POST /api/vehicle/vehicles/1/mileage-logs`, or `POST /api/vehicle/vehicles/1/service-logs`
- **Then** each response is `403` with `{ "message": "Admin role required." }`
- **And** the catalog is unchanged

#### Scenario: Maintenance cannot create, update, or delete a vehicle

- **Given** I am signed in as a maintenance user
- **When** I send `POST /api/vehicle/vehicles`, `PUT /api/vehicle/vehicles/1`, or `DELETE /api/vehicle/vehicles/1`
- **Then** each response is `403` with `{ "message": "Admin role required." }`
- **And** the catalog is unchanged
- **When** I send `GET /api/vehicle/vehicles`
- **Then** the API returns `200`

#### Scenario: Unauthenticated visit to the vehicle page redirects to login

- **Given** I have no session
- **When** I navigate directly to `/vehicle`
- **Then** I am redirected to `/login`
- **When** I send `GET /api/vehicle/vehicles` with no token
- **Then** the API returns `401` with `{ "message": "Unauthorized! No token provided." }`

---

### US-2.8 — Log Mileage and Service

#### Scenario: Maintenance logs mileage on a vehicle

- **Given** I am signed in as a maintenance user on the vehicle page
- **And** a Ford F-150 exists
- **When** I enter Mileage date `2026-10-01` and Current mileage `15000`
- **And** I click **Log mileage**
- **Then** `POST /api/vehicle/vehicles/:vehicleId/mileage-logs` returns `201` with `currentMileage` `15000`
- **And** I see a snackbar **`Mileage logged successfully!`**
- **And** the Mileage log shows `15,000 mi`

#### Scenario: Maintenance logs a service on a vehicle

- **Given** I am signed in as a maintenance user on the vehicle page
- **And** a Ford F-150 exists
- **When** I enter Service date `2026-09-01` and service **Oil change**
- **And** I click **Log service**
- **Then** `POST /api/vehicle/vehicles/:vehicleId/service-logs` returns `201` with `servicePerformed` `Oil change`
- **And** I see a snackbar **`Service logged successfully!`**
- **And** the Service log shows **Oil change**

#### Scenario: Mileage log without current mileage is rejected

- **Given** I am signed in as a maintenance user
- **And** vehicle `4` exists
- **When** I send `POST /api/vehicle/vehicles/4/mileage-logs` with `entryDate` `2026-10-01` and no `currentMileage`
- **Then** the API returns `400` with `{ "message": "Current mileage must be zero or greater." }`

#### Scenario: Service log with an unknown service is rejected

- **Given** I am signed in as a maintenance user
- **And** vehicle `4` exists
- **When** I send `POST /api/vehicle/vehicles/4/service-logs` with `entryDate` `2026-09-01` and `servicePerformed` `Inspection`
- **Then** the API returns `400` with `{ "message": "Service performed must be Repair, Oil change, or Tire replacement." }`

#### Scenario: Mileage log for an unknown vehicle is rejected

- **Given** I am signed in as a maintenance user
- **When** I send `POST /api/vehicle/vehicles/9999/mileage-logs` with `entryDate` `2026-10-01` and `currentMileage` `15000`
- **Then** the API returns `404` with `{ "message": "Vehicle with id=9999 not found." }`

#### Scenario: Requestor cannot log mileage

- **Given** I am signed in as a requestor
- **And** vehicle `4` exists
- **When** I send `POST /api/vehicle/vehicles/4/mileage-logs` with `entryDate` `2026-10-01` and `currentMileage` `15000`
- **Then** the API returns `403` with `{ "message": "Admin role required." }`
- **And** no mileage log is stored

---

## Test Coverage Map

Each Gherkin scenario above maps to at least one automated test. An admin creates, updates, and deletes vehicles. An admin or a maintenance user can read the catalog and append logs. A requestor receives `403` on every vehicle endpoint. A maintenance user receives `403` on vehicle create, update, and delete.

| Story | Scenario | Test file | Test name |
| ----- | -------- | --------- | --------- |
| US-2.1 | Signed-in admin navigates to the vehicle page | `frontend/tests/VehicleList.test.js` | `Signed-in admin navigates to the vehicle page` |
| US-2.1 | Signed-in maintenance user navigates to the vehicle page | `frontend/tests/VehicleList.test.js` | `Signed-in maintenance user navigates to the vehicle page` |
| US-2.1 | Requestor does not see Vehicle in the menu | `frontend/tests/MenuBar.test.js` | `Requestor does not see Vehicle in the menu` |
| US-2.2 | Signed-in admin creates a new vehicle | `backend/tests/vehicles.test.js`, `frontend/tests/VehicleList.test.js` | `Signed-in admin creates a new vehicle` |
| US-2.2 | Golf cart is stored without VIN or license plate | `backend/tests/vehicles.test.js`, `frontend/tests/VehicleList.test.js` | `Golf cart is stored without VIN or license plate`, `Golf cart form omits VIN and license plate` |
| US-2.2 | Create without VIN is rejected | `backend/tests/vehicles.test.js` | `Create without VIN is rejected` |
| US-2.2 | Create with a duplicate VIN is rejected | `backend/tests/vehicles.test.js` | `Create with a duplicate VIN is rejected` |
| US-2.2 | Create with a duplicate license plate is rejected | `backend/tests/vehicles.test.js` | `Create with a duplicate license plate is rejected` |
| US-2.2 | Create with a make and model that are not on the standard list | `backend/tests/vehicles.test.js` | `Create with a make and model that are not on the standard list` |
| US-2.2 | Supplied userId is ignored | `backend/tests/vehicles.test.js` | `Supplied userId is ignored` |
| US-2.2 | Empty required field shows Required field | `frontend/tests/VehicleList.test.js` | `Empty required field shows Required field` |
| US-2.3 | Signed-in admin views the vehicle catalog | `backend/tests/vehicles.test.js`, `frontend/tests/VehicleList.test.js` | `Signed-in admin views the vehicle catalog` |
| US-2.3 | Vehicle list is sorted by make | `backend/tests/vehicles.test.js` | `Vehicle list is sorted by make` |
| US-2.3 | Maintenance views logs for a vehicle | `backend/tests/vehicles.test.js`, `frontend/tests/VehicleList.test.js` | `Maintenance views logs for a vehicle` |
| US-2.4 | Row action buttons visible for admin | `frontend/tests/VehicleList.test.js` | `Row action buttons visible for admin` |
| US-2.4 | Maintenance row shows log actions only | `frontend/tests/VehicleList.test.js` | `Maintenance row shows log actions only` |
| US-2.5 | Signed-in admin updates vehicle details | `backend/tests/vehicles.test.js`, `frontend/tests/VehicleList.test.js` | `Signed-in admin updates vehicle details` |
| US-2.5 | Update of an unknown vehicle is rejected | `backend/tests/vehicles.test.js` | `Update of an unknown vehicle is rejected` |
| US-2.6 | Signed-in admin deletes a vehicle with confirmation | `backend/tests/vehicles.test.js`, `frontend/tests/VehicleList.test.js` | `Signed-in admin deletes a vehicle with confirmation` |
| US-2.6 | Cancelled delete leaves the vehicle | `frontend/tests/VehicleList.test.js` | `Cancelled delete leaves the vehicle` |
| US-2.7 | Requestor vehicle access is restricted | `backend/tests/vehicles.test.js`, `frontend/tests/VehicleList.test.js`, `frontend/tests/MenuBar.test.js` | `Requestor vehicle access is restricted` |
| US-2.7 | Maintenance cannot create, update, or delete a vehicle | `backend/tests/vehicles.test.js` | `Maintenance cannot create, update, or delete a vehicle` |
| US-2.7 | Unauthenticated visit to the vehicle page redirects to login | `backend/tests/vehicles.test.js`, `frontend/tests/router.test.js` | `Unauthenticated visit to the vehicle page redirects to login` |
| US-2.8 | Maintenance logs mileage on a vehicle | `backend/tests/vehicles.test.js`, `frontend/tests/VehicleList.test.js` | `Maintenance logs mileage on a vehicle` |
| US-2.8 | Maintenance logs a service on a vehicle | `backend/tests/vehicles.test.js`, `frontend/tests/VehicleList.test.js` | `Maintenance logs a service on a vehicle` |
| US-2.8 | Mileage log without current mileage is rejected | `backend/tests/vehicles.test.js` | `Mileage log without current mileage is rejected` |
| US-2.8 | Service log with an unknown service is rejected | `backend/tests/vehicles.test.js` | `Service log with an unknown service is rejected` |
| US-2.8 | Mileage log for an unknown vehicle is rejected | `backend/tests/vehicles.test.js` | `Mileage log for an unknown vehicle is rejected` |
| US-2.8 | Requestor cannot log mileage | `backend/tests/vehicles.test.js` | `Requestor cannot log mileage` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 2 from @features/feature-2-vehicle-management.md on branch `feature/2-vehicle-management`.

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
- [x] **Success Criteria (SC-00N)** met
- [x] All mapped tests pass (`npm test`)
- [x] Test Coverage Map complete
- [x] `features/reference/data-model.md` updated (if schema changed)
- [x] `features/reference/api.md` updated (if API changed)
- [x] `features/reference/behavior.md` updated (if product rules changed)

---

## Out of Scope

- Driver records and the approved-to-drive list ([Feature 3](feature-3-driver-management.md))
- Destination CRUD ([Feature 4](feature-4-destination-management.md))
- Area name, logo, and notification email CRUD ([Feature 5](feature-5-area-management.md))
- Reservation requests and assigning a vehicle to a trip ([Feature 6](feature-6-reservation-management.md))
- Requestor trip notices such as Low Gas, Dirty, and Maintenance needed ([Feature 6](feature-6-reservation-management.md))
- Reservation email ([Feature 7](feature-7-email-management.md))
- The admin weekly schedule and the queue of requests that need a vehicle or a check-in ([Feature 8](feature-8-admin-page.md))
- Editing or deleting a single mileage log or service log row

---

## Delivered to later features

- A vehicle is a shared catalog row with `category`, `make`, `model`, `year`, `vin`, `purchasedDate`, `color`, `passengerCapacity`, `licensePlateNumber`, `licensePlateExpirationMonth`, and `areaAssigned`. It has no `userId`.
- `category` is exactly one of `Golf Cart`, `Truck`, `Car`, or `Van`. Feature 3 uses those four values for what a driver is approved to drive.
- `areaAssigned` is `Athletics`, `Support Central`, or `Maintenance`. Feature 5 may replace that string with an area id. Until then, the vehicle stores the name.
- Mileage logs and service logs belong to a vehicle and are removed when the vehicle is deleted. Feature 6 can reference `vehicleId` when a reservation is assigned a vehicle.
- **Vehicle** in the existing `MenuBar` routes `admin` and `maintenance` users to `/vehicle`. This feature does not add a second `MenuBar`.
