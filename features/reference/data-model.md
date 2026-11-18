# Data Model Reference

**Status:** Feature 1 users and sessions, plus system admin / area admin, Feature 2 vehicles, mileage logs, and service logs, Feature 3 drivers, Feature 4 destinations, and Feature 5 areas.

Sequelize model names: `user` → table `users`, `session` → table `sessions`, `area` → table `areas`.

## Tables

### `users`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `fName` | STRING | Required |
| `lName` | STRING | Required |
| `email` | STRING | Required, unique |
| `googleSub` | STRING(255) | Unique, nullable until the first successful sign-in |
| `role` | STRING(20) | `requestor`, `system_admin`, `area_admin`, or `maintenance`. A stored `admin` is a legacy system admin. |
| `areaId` | INTEGER FK | Nullable. Required when `role` is `area_admin`. Null for every other role. References `areas.id` |

Introduced in Feature 1. `areaId`, `system_admin`, and `area_admin` extend the original `admin` role.

Startup seed inserts these rows only when the email is not already present. It does not change an existing row.

| email | fName | lName | role | googleSub | areaId |
|-------|-------|-------|------|-----------|--------|
| `admin@eagles.oc.edu` | Admin | User | `system_admin` | null | null |
| `maint@eagles.oc.edu` | Maintenance | User | `maintenance` | null | null |

`db.prepareAdminTypes()` runs after sync, outside tests:

1. Create `areas` and `users.areaId` when an older database does not have them.
2. Ensure `areas.logo`, `areas.notificationEmail`, `areas.createdAt`, and `areas.updatedAt` exist.
3. Set `role` to `system_admin` and `areaId` to null where `role` is `admin`.
4. Insert the placeholder areas below when the name is missing.
5. Insert the two users above when the email is missing.

### `areas`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING(50) | Required, unique. Trimmed. At most 50 characters |
| `logo` | STRING(255) | Nullable. Logo URL or path. At most 255 characters |
| `notificationEmail` | STRING(255) | Required in API validation. Valid email format. At most 255 characters |
| `createdAt` | DATE | Managed by Sequelize |
| `updatedAt` | DATE | Managed by Sequelize |

Startup seed inserts these default areas when missing:

| name | notificationEmail |
|------|-------------------|
| `Athletics` | `athletics@eagles.oc.edu` |
| `Support Central` | `supportcentral@eagles.oc.edu` |
| `Maintenance` | `maint@eagles.oc.edu` |

### `sessions`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `token` | STRING(512) | Required. JWT stored server-side |
| `email` | STRING | Required. Copy of the user's email at creation. Reuse looks up `userId` |
| `expirationDate` | DATETIME | Required. Sequelize `DATE`. Set to 24 hours after creation |
| `userId` | INTEGER FK | Required, references `users.id` |

Introduced in Feature 1.

The spec names `expirationDate` as `DATE`. The column is a datetime so the 24-hour lifetime can be enforced.

### `vehicles`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `category` | STRING | Required. `Golf Cart`, `Truck`, `Car`, or `Van` |
| `make` | STRING(40) | Required. Any non-blank value |
| `model` | STRING(40) | Required. Any non-blank value |
| `year` | INTEGER | Required. 1950 through 2027 |
| `vin` | STRING(17) | Required and unique for `Truck`, `Car`, and `Van`. Must match `^[A-HJ-NPR-Z0-9]{17}$`. `null` for `Golf Cart`. Case-sensitive after trim |
| `purchasedDate` | DATEONLY | Required. `YYYY-MM-DD`. The current day or a past date |
| `color` | STRING(30) | Required |
| `passengerCapacity` | INTEGER | Required. 1 through 15 |
| `licensePlateNumber` | STRING(8) | Required and unique for `Truck`, `Car`, and `Van`. Must match `^[A-Z0-9]{2,8}$`. `null` for `Golf Cart`. Case-sensitive after trim |
| `licensePlateExpirationMonth` | INTEGER | Required, 1 through 12, for `Truck`, `Car`, and `Van`. `null` for `Golf Cart` |
| `areaAssigned` | STRING | Required. `Athletics`, `Support Central`, or `Maintenance` |
| `status` | STRING(32) | Required. `available`, `checked_out`, `in_repair`, or `out_of_service`. Default `available`. A string code, not a database enum, so a later feature can add a value without changing the column type |
| `createdAt` | DATE | Set by Sequelize |
| `updatedAt` | DATE | Set by Sequelize |

There is no `userId` column. Introduced in Feature 2.

`status` was added after the original vehicle table. On an existing database, run `backend/migrations/20261028-add-vehicle-status.sql`, or start the API with schema alter enabled (`NODE_ENV=development`, or `SEQUELIZE_SYNC_ALTER=true`). After sync, startup calls `backfillVehicleStatuses()`, which sets a null or blank `status` to `available`. New rows get that default when `status` is omitted.

### `mileage_logs`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `entryDate` | DATEONLY | Required. `YYYY-MM-DD`. The current day or a past date |
| `currentMileage` | INTEGER | Required. Integer greater than or equal to 0, and greater than the highest mileage already logged for that vehicle |
| `vehicleId` | INTEGER FK | Required, references `vehicles.id` |

No `createdAt` or `updatedAt`. Introduced in Feature 2.

### `service_logs`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `entryDate` | DATEONLY | Required. `YYYY-MM-DD`. The current day or a past date |
| `servicePerformed` | STRING(80) | Required. Any non-blank service of at most 80 characters |
| `comments` | TEXT | Optional. At most 500 characters. `null` when omitted or blank |
| `vehicleId` | INTEGER FK | Required, references `vehicles.id` |

No `createdAt` or `updatedAt`. Introduced in Feature 2.

### `drivers`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `firstName` | STRING | Required. Trimmed |
| `lastName` | STRING(50) | Required. Trimmed. At most 50 characters. Not unique |
| `driverLicenseNumber` | STRING | Required. Trimmed |
| `driverLicenseExpDate` | DATEONLY | Required. Real `YYYY-MM-DD` date |
| `insuranceProvider` | STRING | Required. Trimmed |
| `insuranceNumber` | STRING | Required. Trimmed |
| `approvedDate` | DATEONLY | Required. Real `YYYY-MM-DD` date |
| `status` | STRING | Required. `valid` or `expired`. Stored from `approvedDate`: `valid` before the one-year anniversary, `expired` on that date and after. Not accepted from the request body. A string code, not a database enum |

There is no `userId` column. No `createdAt` or `updatedAt`. Introduced in Feature 3.

Reservation rows are Feature 6. This feature does not create a `reservations` table or a `driverId` foreign key.

### `destinations`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING(100) | Required. Trimmed. Not unique |
| `addressLine1` | STRING(100) | Required. Trimmed |
| `addressLine2` | STRING(100) | Optional. Trimmed. Blank or omitted stored as `null` |
| `city` | STRING(50) | Required. Trimmed |
| `state` | STRING(2) | Required. Exactly two letters. Stored uppercase |
| `zip` | STRING(10) | Required. Trimmed. Matches `^\d{5}(-\d{4})?$` |
| `createdAt` | DATE | Set by Sequelize |
| `updatedAt` | DATE | Set by Sequelize |

There is no `userId` column. Destinations are one shared catalog and are not scoped to an area. Introduced in Feature 4.

Feature 6 adds `Reservation` belongsTo `Destination`. This feature does not create a `reservations` table or a destination association.

## Associations

| From | To | Relationship | On delete |
|------|----|--------------|-----------|
| `users` | `sessions` | one-to-many (`sessions.userId`) | CASCADE |
| `areas` | `users` | one-to-many (`users.areaId`) | RESTRICT |

An area admin must reference an existing area. That rule is enforced in a `users` `beforeValidate` hook. Deleting an area that still has users is restricted by the foreign key.
| `vehicles` | `mileage_logs` | one-to-many (`mileage_logs.vehicleId`) | CASCADE |
| `vehicles` | `service_logs` | one-to-many (`service_logs.vehicleId`) | CASCADE |
