# API Reference

**Status:** Feature 1 authentication and Feature 2 vehicle catalog are implemented.

API health stays on `/api/health`. Authentication routes are mounted at `/vehicleScheduling`.

## Endpoints

| Method | Path | Auth | Purpose | Introduced |
|--------|------|------|---------|------------|
| `GET` | `/api/health` | No | Process health check | Starter |
| `POST` | `/vehicleScheduling/login` | No | Verify a Google credential and return a session | Feature 1 |
| `POST` | `/vehicleScheduling/logout` | Yes | Invalidate the current session token | Feature 1 |
| `POST` | `/api/vehicle/vehicles` | `admin` | Create a shared catalog vehicle | Feature 2 |
| `GET` | `/api/vehicle/vehicles` | `admin`, `maintenance` | List vehicles by make, model, then id | Feature 2 |
| `GET` | `/api/vehicle/vehicles/:vehicleId` | `admin`, `maintenance` | Fetch one vehicle with mileage and service logs | Feature 2 |
| `PUT` | `/api/vehicle/vehicles/:vehicleId` | `admin` | Update a vehicle | Feature 2 |
| `DELETE` | `/api/vehicle/vehicles/:vehicleId` | `admin` | Delete a vehicle and its logs | Feature 2 |
| `POST` | `/api/vehicle/vehicles/:vehicleId/mileage-logs` | `admin`, `maintenance` | Append a mileage log | Feature 2 |
| `POST` | `/api/vehicle/vehicles/:vehicleId/service-logs` | `admin`, `maintenance` | Append a service log | Feature 2 |
| `PATCH` | `/api/vehicle/vehicles/:vehicleId/service-logs/:serviceLogId` | `admin`, `maintenance` | Update comments on a service log | Feature 2 |

## Conventions

- Flat JSON responses (no `{ success, data }` envelope).
- Errors: `{ "message": "..." }`.
- Authenticated routes: `Authorization: Bearer <token>`.
- The bearer token is a JWT and must match a non-expired row in `sessions`.

## Login

`POST /vehicleScheduling/login`

```json
{
  "credential": "<Google ID token>"
}
```

A `role` field in the body is ignored. The stored user row decides `role`.

**201** when the Google account creates a new `requestor`. **200** when an existing user signs in, including the first Google sign-in for a seeded `admin` or `maintenance` user.

```json
{
  "userId": 1,
  "email": "jdoe@eagles.oc.edu",
  "fName": "Jane",
  "lName": "Doe",
  "role": "requestor",
  "token": "<jwt>"
}
```

`role` is `requestor`, `admin`, or `maintenance`.

| Status | Body | When |
|--------|------|------|
| `401` | `{ "message": "Google sign-in failed" }` | Credential missing or not a verifiable Google ID token, or the profile has no first and last name |
| `401` | `{ "message": "Only an OC Google account can sign in." }` | Verified account email is not `@eagles.oc.edu` |
| `500` | `{ "message": "Sign-in could not be completed." }` | Unexpected server error |

## Logout

`POST /vehicleScheduling/logout`

Header: `Authorization: Bearer <token>`

**200** `{ "message": "Signed out." }` and the matching `sessions` row is deleted.

| Status | Body | When |
|--------|------|------|
| `401` | `{ "message": "Unauthorized! No token provided." }` | Missing `Authorization: Bearer` token |
| `401` | `{ "message": "Unauthorized! Invalid or expired token." }` | JWT invalid, session missing, or `expirationDate` in the past |
| `500` | `{ "message": "Sign-out could not be completed." }` | Unexpected server error |

Authenticated handlers set `req.user.id` and `req.user.role` from the session's user.

## Vehicles

Vehicle routes are mounted at `/api/vehicle`. Every vehicle route uses `authenticate`. A `requestor` receives `403` `{ "message": "Admin role required." }` on every vehicle route. A `maintenance` user receives that same `403` on `POST`, `PUT`, and `DELETE` `/api/vehicle/vehicles`. List, fetch, mileage logs, service logs, and service comment updates are allowed for `admin` and `maintenance`.

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
