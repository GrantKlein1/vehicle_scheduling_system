# API Reference

**Status:** Feature 1 authentication, Feature 2 vehicle catalog, Feature 3 driver catalog, Feature 4 destination catalog, and Feature 5 area management are implemented.

API health stays on `/api/health`. Authentication routes are mounted at `/vehicle-t4`.

## Endpoints

| Method | Path | Auth | Purpose | Introduced |
|--------|------|------|---------|------------|
| `GET` | `/api/health` | No | Process health check | Starter |
| `POST` | `/vehicle-t4/login` | No | Verify a Google credential and return a session | Feature 1 |
| `POST` | `/vehicle-t4/logout` | Yes | Invalidate the current session token | Feature 1 |
| `POST` | `/api/vehicle/vehicles` | system admin, `area_admin` | Create a shared catalog vehicle. The list is not filtered by the caller's area | Feature 2 |
| `GET` | `/api/vehicle/vehicles` | system admin, `area_admin`, `maintenance` | List every vehicle by make, model, then id | Feature 2 |
| `GET` | `/api/vehicle/vehicles/:vehicleId` | system admin, `area_admin`, `maintenance` | Fetch one vehicle with mileage and service logs | Feature 2 |
| `PUT` | `/api/vehicle/vehicles/:vehicleId` | system admin, `area_admin` | Update a vehicle | Feature 2 |
| `DELETE` | `/api/vehicle/vehicles/:vehicleId` | system admin, `area_admin` | Delete a vehicle and its logs | Feature 2 |
| `POST` | `/api/vehicle/vehicles/:vehicleId/mileage-logs` | system admin, `area_admin`, `maintenance` | Append a mileage log | Feature 2 |
| `POST` | `/api/vehicle/vehicles/:vehicleId/service-logs` | system admin, `area_admin`, `maintenance` | Append a service log | Feature 2 |
| `PATCH` | `/api/vehicle/vehicles/:vehicleId/service-logs/:serviceLogId` | system admin, `area_admin`, `maintenance` | Update comments on a service log | Feature 2 |
| `POST` | `/api/driver/drivers` | system admin, `area_admin` | Create a driver | Feature 3 |
| `GET` | `/api/driver/drivers` | any authenticated role | List drivers by last name, first name, then id. System admin and `area_admin` receive every driver. `maintenance` and `requestor` receive `valid` drivers only | Feature 3 |
| `PUT` | `/api/driver/drivers/:driverId` | system admin, `area_admin` | Update a driver | Feature 3 |
| `DELETE` | `/api/driver/drivers/:driverId` | system admin, `area_admin` | Delete a driver | Feature 3 |
| `POST` | `/api/vehicle/destinations` | any authenticated role | Create a shared catalog destination | Feature 4 |
| `GET` | `/api/vehicle/destinations` | any authenticated role | List destinations by name, city, then id | Feature 4 |
| `PUT` | `/api/vehicle/destinations/:destinationId` | system admin, `area_admin`, `maintenance`, legacy `admin` | Update a destination | Feature 4 |
| `DELETE` | `/api/vehicle/destinations/:destinationId` | system admin, `area_admin`, legacy `admin` | Delete a destination | Feature 4 |
| `POST` | `/api/area/areas` | system admin | Create an area | Feature 5 |
| `GET` | `/api/area/areas` | system admin | List areas by name ascending, then id ascending | Feature 5 |
| `GET` | `/api/area/areas/:areaId` | system admin | Fetch a single area by id | Feature 5 |
| `PUT` | `/api/area/areas/:areaId` | system admin | Update an area | Feature 5 |
| `DELETE` | `/api/area/areas/:areaId` | system admin | Delete an unreferenced area | Feature 5 |
| `GET` | `/api/area/areas/:areaId/admins` | system admin | List users assigned as area admins for an area | Feature 5 |
| `POST` | `/api/area/areas/:areaId/admins` | system admin | Assign an existing user as an area admin for an area | Feature 5 |
| `DELETE` | `/api/area/areas/:areaId/admins/:userId` | system admin | Remove an area admin from an area (resets role to requestor) | Feature 5 |

## Conventions

- Flat JSON responses (no `{ success, data }` envelope).
- Errors: `{ "message": "..." }`.
- Authenticated routes: `Authorization: Bearer <token>`.
- The bearer token is a JWT and must match a non-expired row in `sessions`.

## Login

`POST /vehicle-t4/login`

```json
{
  "credential": "<Google ID token>"
}
```

A `role` field in the body is ignored. The stored user row decides `role`.

**201** when the Google account creates a new `requestor`. **200** when an existing user signs in, including the first Google sign-in for a seeded `system_admin` or `maintenance` user. A stored legacy `admin` is saved as `system_admin` on that sign-in and the response role is `system_admin`.

```json
{
  "userId": 1,
  "email": "jdoe@eagles.oc.edu",
  "fName": "Jane",
  "lName": "Doe",
  "role": "requestor",
  "areaId": null,
  "areaName": null,
  "token": "<jwt>"
}
```

`role` is `requestor`, `system_admin`, `area_admin`, or `maintenance`. `areaId` and `areaName` are the assigned area for an `area_admin` and null otherwise. `role`, `areaId`, and `areaName` in the request body are ignored.

An area admin response looks like:

```json
{
  "userId": 4,
  "email": "athletics-admin@eagles.oc.edu",
  "fName": "Avery",
  "lName": "Coach",
  "role": "area_admin",
  "areaId": 1,
  "areaName": "Athletics",
  "token": "<jwt>"
}
```

| Status | Body | When |
|--------|------|------|
| `401` | `{ "message": "Google sign-in failed" }` | Credential missing or not a verifiable Google ID token, or the profile has no first and last name |
| `401` | `{ "message": "Only an OC Google account can sign in." }` | Verified account email is not `@eagles.oc.edu` |
| `500` | `{ "message": "Sign-in could not be completed." }` | Unexpected server error |

## Logout

`POST /vehicle-t4/logout`

Header: `Authorization: Bearer <token>`

**200** `{ "message": "Signed out." }` and the matching `sessions` row is deleted.

| Status | Body | When |
|--------|------|------|
| `401` | `{ "message": "Unauthorized! No token provided." }` | Missing `Authorization: Bearer` token |
| `401` | `{ "message": "Unauthorized! Invalid or expired token." }` | JWT invalid, session missing, or `expirationDate` in the past |
| `500` | `{ "message": "Sign-out could not be completed." }` | Unexpected server error |

Authenticated handlers set `req.user` from the session's user:

```json
{ "id": 1, "role": "system_admin", "areaId": null, "areaName": null }
```

There is no admin-only HTTP route in this feature. Later routes should use the middleware in `backend/app/authorization/authorization.js` instead of comparing `role` to `admin`.

| Middleware | Who passes | Failure |
|------------|------------|---------|
| `requireSystemAdmin` | `system_admin`, and legacy `admin` | `403` `{ "message": "System admin role required." }` |
| `requireAnyAdmin` | system admins and `area_admin` | `403` `{ "message": "Admin role required." }` |
| `requireAreaAccess(area)` | system admins for every area; an `area_admin` only when every supplied id or name matches their area | `403` `{ "message": "You do not have access to this area." }` |

Each middleware returns `401` `{ "message": "Unauthorized! No token provided." }` when `req.user` is missing. `area` may be an id, a name, `{ id, name }`, or a function of `req`. A numeric string is an id. Matching area names are case-insensitive. The same predicates are `isSystemAdmin`, `isAnyAdmin`, and `canAccessArea` on the server and in `frontend/src/config/roles.js`.
Authenticated handlers set `req.user.id` and `req.user.role` from the session's user.

## Vehicles

Vehicle routes are mounted at `/api/vehicle`. Every vehicle route uses `authenticate`. A `requestor` receives `403` `{ "message": "Admin role required." }` on every vehicle route. A `maintenance` user receives that same `403` on `POST`, `PUT`, and `DELETE` `/api/vehicle/vehicles`. Those writes use `requireAnyAdmin`, so a system admin (`system_admin` or legacy `admin`) and an `area_admin` pass. List, fetch, mileage logs, service logs, and service comment updates use `requireFleetAccess` and are allowed for a system admin, an `area_admin`, and `maintenance`. The list is the whole fleet. It is not filtered by the area admin's area. An area admin can create, update, delete, and log a vehicle whose `areaAssigned` is not their area.

A `userId` in a create or update body is ignored. Responses do not include `userId`.

### Create – `POST /api/vehicle/vehicles`

**201** returns the saved vehicle: `id`, `category`, `make`, `model`, `year`, `vin`, `purchasedDate`, `color`, `passengerCapacity`, `licensePlateNumber`, `licensePlateExpirationMonth`, `areaAssigned`, `status`, `createdAt`, and `updatedAt`. Logs are not included.

`category` is `Golf Cart`, `Truck`, `Car`, or `Van`. `areaAssigned` is `Athletics`, `Support Central`, or `Maintenance`. `make` and `model` are required strings of at most 40 characters and are not limited to the suggestion list. For `Truck`, `Car`, and `Van`, `vin` is required, unique, and must match `^[A-HJ-NPR-Z0-9]{17}$`, `licensePlateNumber` is required, unique, and must match `^[A-Z0-9]{2,8}$`, and `licensePlateExpirationMonth` is an integer from 1 through 12. The API does not change case to make a value match. A `Golf Cart` stores those three fields as `null`; values sent for them are discarded, including values that would fail the VIN or plate pattern, and the nulls are not treated as duplicates. Uniqueness is exact after trim and is case-sensitive. `year` is an integer from 1950 through 2027. `passengerCapacity` is an integer from 1 through 15. `purchasedDate` is a real `YYYY-MM-DD` date on the current day or earlier. A later day returns `"Date cannot be in the future."`. `color` is required and at most 30 characters.

**400** messages match the Feature 2 create error table, including `"VIN cannot be empty."`, `"VIN must be a valid 17-character VIN."`, `"VIN already exists."`, `"License Plate Number must be 2 to 8 letters or digits."`, and `"License Plate Number already exists."`.

`status` is optional on create and update. Allowed values are `available`, `checked_out`, `in_repair`, and `out_of_service`. A missing or blank `status` on create is stored as `available`. A missing or blank `status` on update leaves the stored status unchanged. Any other value returns **400** `{ "message": "Status must be available, checked_out, in_repair, or out_of_service." }`. The vehicle screen shows the status and does not send it; a later feature can change it through these same create and update routes.

### List – `GET /api/vehicle/vehicles`

**200** returns a JSON array ordered by `make` ascending, then `model` ascending, then `id` ascending. Each item has the create fields. Logs are not included.

### Fetch one – `GET /api/vehicle/vehicles/:vehicleId`

**200** returns one vehicle plus `mileageLogs` and `serviceLogs`, each ordered by `entryDate` ascending, then `id` ascending.

**404** `{ "message": "Vehicle with id=<vehicleId> not found." }`

### Update – `PUT /api/vehicle/vehicles/:vehicleId`

The body requires the same catalog fields as create. `status` stays optional: omit it to keep the stored value. A duplicate `vin` or `licensePlateNumber` is reported only when another vehicle already has that value.

**200** `{ "message": "Vehicle was updated successfully." }`

**404** `{ "message": "Vehicle with id=<vehicleId> not found." }`

### Delete – `DELETE /api/vehicle/vehicles/:vehicleId`

**200** `{ "message": "Vehicle was deleted successfully!" }`

The vehicle, its mileage logs, and its service logs are removed.

**404** `{ "message": "Vehicle with id=<vehicleId> not found." }`

### Mileage log – `POST /api/vehicle/vehicles/:vehicleId/mileage-logs`

```json
{ "entryDate": "2026-10-01", "currentMileage": 15000 }
```

**201** returns `id`, `vehicleId`, `entryDate`, and `currentMileage`. `currentMileage` is an integer greater than or equal to 0. `entryDate` is a real `YYYY-MM-DD` date on or before the server's local calendar date.

**400** `{ "message": "Date must be a valid date." }`, `{ "message": "Date cannot be in the future." }`, `{ "message": "Current mileage must be zero or greater." }`, or `{ "message": "Current mileage must be greater than the previous mileage of <previous>." }`

A new reading must be greater than the highest `currentMileage` already stored for that vehicle. The first reading may be 0 or greater.

**404** `{ "message": "Vehicle with id=<vehicleId> not found." }`

### Service log – `POST /api/vehicle/vehicles/:vehicleId/service-logs`

```json
{ "entryDate": "2026-09-01", "servicePerformed": "Oil change", "comments": "Used 5W-30." }
```

**201** returns `id`, `vehicleId`, `entryDate`, `servicePerformed`, and `comments`. `servicePerformed` is any non-blank string of at most 80 characters. The form suggests `Repair`, `Oil change`, `Tire replacement`, `Tire rotation`, `Brake service`, `Battery replacement`, `Inspection`, `Air filter replacement`, `Wheel alignment`, and `Wiper replacement`. Other text in that limit is stored as a custom service. `comments` is optional text of at most 500 characters, or `null` when omitted or blank. `entryDate` is a real `YYYY-MM-DD` date on or before the server's local calendar date.

**400** `{ "message": "Date must be a valid date." }`, `{ "message": "Date cannot be in the future." }`, `{ "message": "Service performed cannot be empty." }`, `{ "message": "Service performed cannot exceed 80 characters." }`, `{ "message": "Comments must be text." }`, or `{ "message": "Comments cannot exceed 500 characters." }`

**404** `{ "message": "Vehicle with id=<vehicleId> not found." }`

### Service comment – `PATCH /api/vehicle/vehicles/:vehicleId/service-logs/:serviceLogId`

```json
{ "comments": "Used 5W-30." }
```

**200** returns the service log with the updated `comments`. Blank comments are stored as `null`. `entryDate` and `servicePerformed` stay as they were.

**400** `{ "message": "Comments must be text." }` or `{ "message": "Comments cannot exceed 500 characters." }`

**404** `{ "message": "Vehicle with id=<vehicleId> not found." }` or `{ "message": "Service log with id=<serviceLogId> not found." }`

## Drivers

Driver routes are mounted at `/api/driver`. Every driver route uses `authenticate`. `GET /api/driver/drivers` is allowed for any authenticated role, including `requestor` and `maintenance`. `POST`, `PUT`, and `DELETE` use `requireAnyAdmin`: a system admin (`system_admin` or legacy `admin`) or an `area_admin` passes. A `maintenance` user or `requestor` receives `403` `{ "message": "Admin role required." }` on those writes. The list is not filtered by the caller's area. A system admin or `area_admin` receives every driver, including `expired`. A `maintenance` user or `requestor` receives only drivers whose status is `valid` after the list refreshes stored status.

A `userId` in a create or update body is ignored. The `drivers` table has no `userId` column, and responses do not include `userId`.

### Create – `POST /api/driver/drivers`

```json
{
  "firstName": "Jaxen",
  "lastName": "Roden",
  "driverLicenseNumber": "11111111",
  "driverLicenseExpDate": "2030-09-20",
  "insuranceProvider": "root",
  "insuranceNumber": "11111111",
  "approvedDate": "2026-10-28"
}
```

**201** returns the saved driver: `id`, `firstName`, `lastName`, `driverLicenseNumber`, `driverLicenseExpDate`, `insuranceProvider`, `insuranceNumber`, `approvedDate`, and `status`.

Every string is trimmed before it is stored. `firstName`, `lastName`, `driverLicenseNumber`, `insuranceProvider`, and `insuranceNumber` are required. A missing, empty, or whitespace-only value returns **400** `{ "message": "<Label> cannot be empty." }`. `lastName` is at most 50 characters and is not unique. A longer value returns **400** `{ "message": "Last Name cannot exceed 50 characters." }`. `driverLicenseExpDate` and `approvedDate` are required real calendar dates in `YYYY-MM-DD` form. A missing or invalid date, such as `2030-13-40`, returns **400** `{ "message": "<Label> must be a valid date." }`. `status` is not an input. The server sets it from `approvedDate`: `valid` before the calendar date one year later, and `expired` on that anniversary and after. A `status` property in the body is ignored. February 29 rolls to March 1 in a non-leap year. Listing drivers stores that same status when a saved row is out of date, and startup does the same refresh. The driver form does not ask for a status.

### List – `GET /api/driver/drivers`

**200** returns a JSON array ordered by `lastName` ascending, then `firstName` ascending, then `id` ascending. Each item has the create fields. A system admin or `area_admin` receives every driver, including `expired`. A `maintenance` user or `requestor` receives only `valid` drivers. An `expired` driver is left in the database and is not in that array.

### Update – `PUT /api/driver/drivers/:driverId`

The body uses the same fields and validation as create. A `userId` or `status` in the body is ignored. `status` is recalculated from the new `approvedDate`.

**200** `{ "message": "Driver was updated successfully." }`

**404** `{ "message": "Driver with id=<driverId> not found." }`

### Delete – `DELETE /api/driver/drivers/:driverId`

**200** `{ "message": "Driver was deleted successfully." }`

**404** `{ "message": "Driver with id=<driverId> not found." }`

Missing bearer token is `401` `{ "message": "Unauthorized! No token provided." }`. An invalid or expired token is `401` `{ "message": "Unauthorized! Invalid or expired token." }`.

## Destinations

Destination routes are mounted on the vehicle router at `/api/vehicle`. Every destination route uses `authenticate` only. `GET` and `POST /api/vehicle/destinations` are allowed for any authenticated role, including `requestor` and `maintenance`. Role is not a reason to return `403` on list or create.

`PUT /api/vehicle/destinations/:destinationId` is allowed for a system admin (`system_admin` or legacy `admin`), an `area_admin`, and a `maintenance` user. A `requestor` receives `403` `{ "message": "Requestors cannot update or delete destinations." }` before the id is loaded. The destination is unchanged.

`DELETE /api/vehicle/destinations/:destinationId` is allowed for a system admin (`system_admin` or legacy `admin`) and an `area_admin`. A `requestor` receives `403` `{ "message": "Requestors cannot update or delete destinations." }`. A `maintenance` user receives `403` `{ "message": "Maintenance cannot delete destinations." }`. The requestor check runs first. Both checks run before the id is loaded, so a missing or non-integer id still returns that `403`. The destination is unchanged.

These routes do not use `requireSystemAdmin`, `requireAdmin`, `requireAnyAdmin`, or `requireFleetAccess`.

A `userId` in a create or update body is ignored. The `destinations` table has no `userId` column, and responses do not include `userId`. The list is not filtered by role or area.

### Create – `POST /api/vehicle/destinations`

```json
{
  "name": "Garvey Center",
  "addressLine1": "2501 E Memorial Rd",
  "addressLine2": "Suite 100",
  "city": "Edmond",
  "state": "OK",
  "zip": "73013"
}
```

**201** returns the saved destination: `id`, `name`, `addressLine1`, `addressLine2`, `city`, `state`, `zip`, `createdAt`, and `updatedAt`. `addressLine2` is `null` when it was blank or omitted, and the key is present.

Every string is trimmed before it is stored. `state` is stored uppercase. `name` is not unique. `name` and `addressLine1` are at most 100 characters. `addressLine2`, when present, is at most 100 characters. `city` is at most 50 characters. Fields are checked in this order, and the first error is returned: `name`, `addressLine1`, `addressLine2`, `city`, `state`, `zip`. A missing value, a non-string, an empty string, or whitespace-only text is an empty string.

| Condition | `message` |
|-----------|-----------|
| Missing or blank `name` | `Name cannot be empty.` |
| `name` longer than 100 characters | `Name cannot exceed 100 characters.` |
| Missing or blank `addressLine1` | `Address Line 1 cannot be empty.` |
| `addressLine1` longer than 100 characters | `Address Line 1 cannot exceed 100 characters.` |
| `addressLine2` longer than 100 characters | `Address Line 2 cannot exceed 100 characters.` |
| Missing or blank `city` | `City cannot be empty.` |
| `city` longer than 50 characters | `City cannot exceed 50 characters.` |
| Missing `state`, or `state` is not exactly two letters | `State must be a 2-letter abbreviation.` |
| Missing `zip`, or `zip` does not match `^\d{5}(-\d{4})?$` | `Zip must be 5 digits or ZIP+4.` |

A blank `addressLine2` is not an error.

### List – `GET /api/vehicle/destinations`

**200** returns a JSON array of every destination, ordered by `name` ascending, then `city` ascending, then `id` ascending. Each item has the create fields.

### Update – `PUT /api/vehicle/destinations/:destinationId`

The body uses the same fields and validation as create. A `userId` in the body is ignored.

**200** `{ "message": "Destination was updated successfully." }`

**404** `{ "message": "Destination with id=<destinationId> not found." }` A non-integer `:destinationId` uses this same `404`. The message keeps the raw path param. A `requestor` receives `403` before that lookup.

### Delete – `DELETE /api/vehicle/destinations/:destinationId`

**200** `{ "message": "Destination was deleted successfully." }`

**404** `{ "message": "Destination with id=<destinationId> not found." }` A non-integer `:destinationId` uses this same `404`. The message keeps the raw path param. A `requestor` or `maintenance` user receives `403` before that lookup.

Missing bearer token is `401` `{ "message": "Unauthorized! No token provided." }`. An invalid or expired token is `401` `{ "message": "Unauthorized! Invalid or expired token." }`.

## Areas

All area management endpoints require a system admin (`system_admin` or legacy `admin`). Other roles (`area_admin`, `maintenance`, `requestor`) receive `403` `{ "message": "Access denied. System Administrator role required." }`.

### Create Area – `POST /api/area/areas`

```json
{
  "name": "Athletics",
  "notificationEmail": "athletics@eagles.oc.edu",
  "logo": "https://example.com/logo.png"
}
```

Validation rules:
- `name`: Required, 1 to 50 characters, trimmed. Must be unique (case-insensitive); duplicate name returns `400` `{ "message": "An area with this name already exists." }`.
- `notificationEmail`: Required, valid email format, at most 255 characters, trimmed. Invalid email returns `400` `{ "message": "Notification email must be a valid email address." }`.
- `logo`: Optional string, at most 255 characters, trimmed. Null/empty stored as `null`.

**201** returns the created area JSON object.

### List Areas – `GET /api/area/areas`

**200** returns an array of areas ordered by `name` ascending, then `id` ascending.

### Get Area – `GET /api/area/areas/:areaId`

**200** returns the area JSON object.
**404** `{ "message": "Area not found." }` if not found.

### Update Area – `PUT /api/area/areas/:areaId`

The body uses the same fields and validation rules as create.

**200** `{ "message": "Area was updated successfully." }`
**404** `{ "message": "Area not found." }` if not found.
**400** duplicate name check against other areas.

### Delete Area – `DELETE /api/area/areas/:areaId`

Deletes the area if not referenced by any vehicles or area administrators.

**200** `{ "message": "Area was deleted successfully!" }`
**400** `{ "message": "Cannot delete area because it is currently assigned to vehicles or administrators." }`
**404** `{ "message": "Area not found." }`

### List Area Administrators – `GET /api/area/areas/:areaId/admins`

**200** returns an array of users who are assigned as `area_admin` for this area (`userId`, `fName`, `lName`, `email`, `role`, `areaId`).
**404** `{ "message": "Area not found." }`

### Assign Area Administrator – `POST /api/area/areas/:areaId/admins`

```json
{
  "email": "coach@eagles.oc.edu"
}
```

Finds the user by email, sets their role to `area_admin` and `areaId` to `:areaId`.

**200** `{ "message": "User assigned as area admin successfully." }`
**400** if user is already an admin of an area.
**404** `{ "message": "User not found." }` or `{ "message": "Area not found." }`

### Remove Area Administrator – `DELETE /api/area/areas/:areaId/admins/:userId`

Resets the user's `areaId` to `null` and demotes their role back to `requestor`.

**200** `{ "message": "Area admin removed successfully." }`
**404** `{ "message": "Area admin not found for this area." }`

