import { Op } from "sequelize";
import db from "../models/index.js";
import { isAnyAdmin, isSystemAdmin } from "../authorization/roles.js";
import { refreshDriverStatuses } from "../controllers/driver.controller.js";
import { CATEGORIES } from "../controllers/vehicle.controller.js";
import { VEHICLE_STATUSES } from "../models/vehicle.model.js";
import { RESERVATION_STATUSES } from "../models/reservation.model.js";
import {
  canSeeReservation,
  reservationScopeWhere,
  validateReservationInput,
  vehicleDisplayName,
} from "../services/reservationQueries.js";
import {
  toArea,
  toAvailableVehicle,
  toDestination,
  toDriver,
  toEmailSummary,
  toFleetVehicle,
  toReservationSummary,
} from "./sanitize.js";

const DATE_TIME =
  "ISO 8601 date-time with timezone offset, e.g. 2026-11-20T08:00:00-06:00";

const categoryList = Array.isArray(CATEGORIES) && CATEGORIES.length > 0 ? CATEGORIES : null;

function fail(status, message) {
  return { status, body: { message } };
}

function ok(body) {
  return { status: 200, body };
}

function listMessage(label, values) {
  const last = values[values.length - 1];
  const head = values.slice(0, -1).join(", ");
  return `${label} must be ${head}, or ${last}.`;
}

function parseReservationStatus(value) {
  if (value === undefined || value === null || value === "") {
    return { value: undefined };
  }
  if (!RESERVATION_STATUSES.includes(value)) {
    return { error: listMessage("Status", RESERVATION_STATUSES) };
  }
  return { value };
}

function parseVehicleStatus(value) {
  if (value === undefined || value === null || value === "") {
    return { value: undefined };
  }
  if (!VEHICLE_STATUSES.includes(value)) {
    return { error: listMessage("Status", VEHICLE_STATUSES) };
  }
  return { value };
}

function parseCategory(value) {
  if (value === undefined || value === null || value === "") {
    return { value: undefined };
  }
  if (typeof value !== "string") {
    return {
      error: categoryList
        ? listMessage("Category", categoryList)
        : "Category must be text.",
    };
  }
  if (categoryList && !categoryList.includes(value)) {
    return { error: listMessage("Category", categoryList) };
  }
  return { value };
}

function parseLimit(value) {
  if (value === undefined || value === null || value === "") {
    return { value: 25 };
  }
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isInteger(number) || number < 1) {
    return { error: "Limit must be an integer of at least 1." };
  }
  return { value: Math.min(number, 50) };
}

function parsePassengers(value) {
  if (value === undefined || value === null || value === "") {
    return { value: undefined };
  }
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isInteger(number) || number < 1) {
    return { error: "Passengers must be a positive integer." };
  }
  return { value: number };
}

function parseBound(value, label) {
  if (value === undefined || value === null || value === "") {
    return { value: undefined };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: `${label} must be a valid date-time.` };
  }
  return { value: date };
}

function integerId(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const id = Number(value.trim());
    return id > 0 ? id : null;
  }
  return null;
}

const requestorInclude = [{ model: db.user, as: "requestor", attributes: ["id", "fName", "lName"] }];

async function listReservations(user, args) {
  const scope = reservationScopeWhere(user);
  if (!scope) {
    return fail(403, "You do not have access to this information.");
  }

  const status = parseReservationStatus(args.status);
  if (status.error) {
    return fail(400, status.error);
  }
  const from = parseBound(args.from, "from");
  if (from.error) {
    return fail(400, from.error);
  }
  const to = parseBound(args.to, "to");
  if (to.error) {
    return fail(400, to.error);
  }
  if (from.value && to.value && from.value.getTime() > to.value.getTime()) {
    return fail(400, "from must be on or before to.");
  }
  const limit = parseLimit(args.limit);
  if (limit.error) {
    return fail(400, limit.error);
  }

  const where = { ...scope };
  if (status.value) {
    where.status = status.value;
  }
  if (from.value || to.value) {
    where.start = {};
    if (from.value) {
      where.start[Op.gte] = from.value;
    }
    if (to.value) {
      where.start[Op.lte] = to.value;
    }
  }

  const rows = await db.reservation.findAll({
    where,
    include: requestorInclude,
    order: [
      ["start", "DESC"],
      ["id", "DESC"],
    ],
    limit: limit.value,
  });
  return ok(rows.map(toReservationSummary));
}

async function getReservation(user, args) {
  const id = integerId(args.id);
  if (id == null) {
    return fail(404, "Reservation not found.");
  }
  const reservation = await db.reservation.findByPk(id, { include: requestorInclude });
  if (!reservation || !canSeeReservation(user, reservation)) {
    return fail(404, "Reservation not found.");
  }
  return ok(toReservationSummary(reservation));
}

async function checkVehicleAvailability(_user, args) {
  if (args.start == null || args.start === "" || args.end == null || args.end === "") {
    return fail(400, "Start and end times are required.");
  }
  const startDate = new Date(args.start);
  const endDate = new Date(args.end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return fail(400, "End time must be after start time.");
  }

  const category = parseCategory(args.category);
  if (category.error) {
    return fail(400, category.error);
  }
  const passengers = parsePassengers(args.passengers);
  if (passengers.error) {
    return fail(400, passengers.error);
  }

  const where = {
    status: { [Op.notIn]: ["in_repair", "out_of_service"] },
  };
  if (category.value) {
    where.category = category.value;
  }
  if (passengers.value != null) {
    where.passengerCapacity = { [Op.gte]: passengers.value };
  }

  const vehicles = await db.vehicle.findAll({
    where,
    order: [["id", "ASC"]],
  });
  if (vehicles.length === 0) {
    return ok([]);
  }

  const conflicts = await db.reservation.findAll({
    where: {
      vehicleId: { [Op.in]: vehicles.map((vehicle) => vehicle.id) },
      status: { [Op.in]: ["pending", "approved"] },
      start: { [Op.lt]: endDate },
      end: { [Op.gt]: startDate },
    },
    attributes: ["vehicleId"],
  });
  const blocked = new Set(conflicts.map((row) => row.vehicleId));
  return ok(vehicles.filter((vehicle) => !blocked.has(vehicle.id)).map(toAvailableVehicle));
}

async function listVehicles(_user, args) {
  const category = parseCategory(args.category);
  if (category.error) {
    return fail(400, category.error);
  }
  const status = parseVehicleStatus(args.status);
  if (status.error) {
    return fail(400, status.error);
  }

  const where = {};
  if (category.value) {
    where.category = category.value;
  }
  if (status.value) {
    where.status = status.value;
  }
  const vehicles = await db.vehicle.findAll({
    where,
    order: [
      ["make", "ASC"],
      ["model", "ASC"],
      ["id", "ASC"],
    ],
  });
  return ok(vehicles.map(toFleetVehicle));
}

async function listDrivers(user) {
  await refreshDriverStatuses();
  const where = isAnyAdmin(user) ? {} : { status: "valid" };
  const drivers = await db.driver.findAll({
    where,
    order: [
      ["lastName", "ASC"],
      ["firstName", "ASC"],
      ["id", "ASC"],
    ],
  });
  return ok(drivers.map(toDriver));
}

async function listDestinations() {
  const destinations = await db.destination.findAll({
    order: [
      ["name", "ASC"],
      ["city", "ASC"],
      ["id", "ASC"],
    ],
  });
  return ok(destinations.map(toDestination));
}

async function listAreas() {
  const areas = await db.area.findAll({
    order: [
      ["name", "ASC"],
      ["id", "ASC"],
    ],
  });
  return ok(areas.map(toArea));
}

async function listReservationEmails(user, args) {
  const id = integerId(args.reservationId);
  if (id == null) {
    return fail(404, "Reservation not found.");
  }
  const reservation = await db.reservation.findByPk(id);
  if (!reservation || !canSeeReservation(user, reservation)) {
    return fail(404, "Reservation not found.");
  }
  const rows = await db.email.findAll({
    where: { reservationId: reservation.id },
    order: [
      ["sentAt", "ASC"],
      ["id", "ASC"],
    ],
  });
  return ok(rows.map(toEmailSummary));
}

async function draftReservation(_user, args) {
  const validated = await validateReservationInput(args);
  if (validated.error) {
    return fail(400, validated.error.message);
  }

  const value = validated.value;
  if (value.vehicle.status === "in_repair" || value.vehicle.status === "out_of_service") {
    return fail(400, "This vehicle is not available for reservation.");
  }
  if (value.vehicle.passengerCapacity != null && value.passengers > value.vehicle.passengerCapacity) {
    return fail(400, "Passenger count exceeds this vehicle's capacity.");
  }

  return ok({
    draft: {
      vehicleId: value.vehicle.id,
      vehicleName: vehicleDisplayName(value.vehicle),
      destinationName: value.destinationName,
      start: value.startDate.toISOString(),
      end: value.endDate.toISOString(),
      areaName: value.areaName,
      passengers: value.passengers,
      driverName: value.driverName,
      driverEmail: value.driverEmail,
      purpose: value.purpose,
      notes: value.notes,
    },
  });
}

function objectSchema(properties, required = []) {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function dateTimeProperty(description) {
  return { type: "string", description: `${description} ${DATE_TIME}` };
}

const emptyParameters = objectSchema({});

export const TOOLS = [
  {
    name: "list_reservations",
    description:
      "List reservations in the caller's scope, newest start first. A requestor sees only their own rows, an area admin sees their area, and a system admin sees every area. Use this for questions about existing trips.",
    parameters: objectSchema({
      status: {
        type: "string",
        enum: [...RESERVATION_STATUSES],
        description: "Keep only this reservation status.",
      },
      from: dateTimeProperty("Include reservations whose start is on or after this time."),
      to: dateTimeProperty("Include reservations whose start is on or before this time."),
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        description: "Maximum number of rows. Defaults to 25. Values above 50 are treated as 50.",
      },
    }),
    allowedRoles: ["requestor", "area_admin", "system_admin"],
    handler: listReservations,
  },
  {
    name: "get_reservation",
    description:
      "Fetch one reservation by id when the caller is allowed to see it. Returns the same fields as list_reservations. Use this when a list row is not enough detail.",
    parameters: objectSchema(
      {
        id: { type: "integer", description: "Reservation id." },
      },
      ["id"]
    ),
    allowedRoles: ["requestor", "area_admin", "system_admin"],
    handler: getReservation,
  },
  {
    name: "check_vehicle_availability",
    description:
      "List vehicles free for a time window. Omits vehicles that are in repair, out of service, or have a pending or approved reservation overlapping the window. Use this before drafting a reservation. This is the only vehicle list a requestor may see.",
    parameters: objectSchema(
      {
        start: dateTimeProperty("Window start, inclusive."),
        end: dateTimeProperty("Window end, exclusive."),
        category: {
          type: "string",
          enum: categoryList ? [...categoryList] : undefined,
          description: "Keep only this vehicle category.",
        },
        passengers: {
          type: "integer",
          minimum: 1,
          description: "Keep vehicles whose passenger capacity is at least this number.",
        },
      },
      ["start", "end"]
    ),
    allowedRoles: ["requestor", "area_admin", "system_admin"],
    handler: checkVehicleAvailability,
  },
  {
    name: "list_vehicles",
    description:
      "List the whole fleet for an administrator or maintenance user, including status and license plate. Use this for catalog questions, not for booking availability. VINs are not included.",
    parameters: objectSchema({
      category: {
        type: "string",
        enum: categoryList ? [...categoryList] : undefined,
        description: "Keep only this vehicle category.",
      },
      status: {
        type: "string",
        enum: [...VEHICLE_STATUSES],
        description: "Keep only this vehicle status.",
      },
    }),
    allowedRoles: ["area_admin", "maintenance", "system_admin"],
    handler: listVehicles,
  },
  {
    name: "list_drivers",
    description:
      "List drivers the caller may see. Administrators see every driver and status. Requestors and maintenance see valid drivers only. Use this to name a driver. License and insurance numbers are not included.",
    parameters: emptyParameters,
    allowedRoles: ["requestor", "area_admin", "maintenance", "system_admin"],
    handler: listDrivers,
  },
  {
    name: "list_destinations",
    description:
      "List every destination in the catalog. Use this to choose a destinationName before drafting a reservation.",
    parameters: emptyParameters,
    allowedRoles: ["requestor", "area_admin", "maintenance", "system_admin"],
    handler: listDestinations,
  },
  {
    name: "list_areas",
    description:
      "List areas and their notification emails. System administrators only. Use this when the caller asks which areas exist.",
    parameters: emptyParameters,
    allowedRoles: ["system_admin"],
    handler: listAreas,
  },
  {
    name: "list_reservation_emails",
    description:
      "List email log headers for one reservation the caller can see: recipient role, event, status, sent time, and subject. Use this to answer whether a notice was sent. The body and recipient address are not included.",
    parameters: objectSchema(
      {
        reservationId: { type: "integer", description: "Reservation id." },
      },
      ["reservationId"]
    ),
    allowedRoles: ["requestor", "area_admin", "system_admin"],
    handler: listReservationEmails,
  },
  {
    name: "draft_reservation",
    description:
      "Check trip details and return a reservation draft without saving it. Use this after the caller has chosen a vehicle, destination, and time window. Never creates, approves, denies, or cancels a reservation.",
    parameters: objectSchema(
      {
        vehicleId: { type: "integer", description: "Vehicle id from check_vehicle_availability." },
        destinationName: { type: "string", description: "Destination name, at most 255 characters." },
        start: dateTimeProperty("Trip start."),
        end: dateTimeProperty("Trip end."),
        areaName: {
          type: "string",
          description: "Area name. Defaults to the vehicle's assigned area when omitted.",
        },
        passengers: {
          type: "integer",
          minimum: 1,
          description: "Passenger count. Defaults to 1 when omitted.",
        },
        driverName: { type: "string", description: "Optional driver name." },
        driverEmail: { type: "string", description: "Optional driver email." },
        purpose: { type: "string", description: "Optional purpose." },
        notes: { type: "string", description: "Optional notes." },
      },
      ["vehicleId", "destinationName", "start", "end"]
    ),
    allowedRoles: ["requestor", "area_admin", "system_admin"],
    handler: draftReservation,
  },
];

export function findTool(name) {
  return TOOLS.find((tool) => tool.name === name) ?? null;
}

export function isToolAllowed(tool, user) {
  if (!tool || !user) {
    return false;
  }
  const role = isSystemAdmin(user) ? "system_admin" : user.role;
  return tool.allowedRoles.includes(role);
}

export function manifestForRole(user) {
  return TOOLS.filter((tool) => isToolAllowed(tool, user)).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}
