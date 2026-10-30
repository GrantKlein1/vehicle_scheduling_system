import db from "../models/index.js";
import { DRIVER_STATUSES } from "../models/driver.model.js";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const LAST_NAME_LIMIT = 50;

const STRING_FIELDS = [
  ["firstName", "First Name"],
  ["lastName", "Last Name", LAST_NAME_LIMIT],
  ["driverLicenseNumber", "Driver License Number"],
  ["insuranceProvider", "Insurance Provider"],
  ["insuranceNumber", "Insurance Number"],
  ["status", "Status"],
];

const DATE_FIELDS = [
  ["driverLicenseExpDate", "Driver License Expiration Date"],
  ["approvedDate", "Approved Date"],
];

function validDateOnly(value) {
  if (typeof value !== "string" || !DATE_ONLY.test(value.trim())) {
    return null;
  }

  const trimmed = value.trim();
  const [year, month, day] = trimmed.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return trimmed;
}

function requireText(value, label, max) {
  if (typeof value !== "string") {
    return { error: `${label} cannot be empty.` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { error: `${label} cannot be empty.` };
  }
  if (max && trimmed.length > max) {
    return { error: `${label} cannot exceed ${max} characters.` };
  }

  return { value: trimmed };
}

function validateDriver(body) {
  const value = {};

  for (const [key, label, max] of STRING_FIELDS) {
    const result = requireText(body?.[key], label, max);
    if (result.error) {
      return result;
    }
    value[key] = result.value;
  }

  for (const [key, label] of DATE_FIELDS) {
    const date = validDateOnly(body?.[key]);
    if (!date) {
      return { error: `${label} must be a valid date.` };
    }
    value[key] = date;
  }

  if (!DRIVER_STATUSES.includes(value.status)) {
    return { error: "Status must be valid or expired." };
  }

  return { value };
}

function dateOnly(value) {
  if (!value) {
    return value;
  }
  return String(value).slice(0, 10);
}

function driverJson(driver) {
  const row = driver.toJSON();
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    driverLicenseNumber: row.driverLicenseNumber,
    driverLicenseExpDate: dateOnly(row.driverLicenseExpDate),
    insuranceProvider: row.insuranceProvider,
    insuranceNumber: row.insuranceNumber,
    approvedDate: dateOnly(row.approvedDate),
    status: row.status,
  };
}

function notFound(res, driverId) {
  return res.status(404).json({ message: `Driver with id=${driverId} not found.` });
}

async function findDriver(driverId) {
  const id = Number(driverId);
  if (!Number.isInteger(id)) {
    return null;
  }
  return db.driver.findByPk(id);
}

export async function createDriver(req, res) {
  const validated = validateDriver(req.body);
  if (validated.error) {
    return res.status(400).json({ message: validated.error });
  }

  const driver = await db.driver.create(validated.value);
  return res.status(201).json(driverJson(driver));
}

export async function listDrivers(_req, res) {
  const drivers = await db.driver.findAll({
    order: [
      ["lastName", "ASC"],
      ["firstName", "ASC"],
      ["id", "ASC"],
    ],
  });

  return res.status(200).json(drivers.map(driverJson));
}

export async function updateDriver(req, res) {
  const driver = await findDriver(req.params.driverId);
  if (!driver) {
    return notFound(res, req.params.driverId);
  }

  const validated = validateDriver(req.body);
  if (validated.error) {
    return res.status(400).json({ message: validated.error });
  }

  await driver.update(validated.value);
  return res.status(200).json({ message: "Driver was updated successfully." });
}

export async function deleteDriver(req, res) {
  const driver = await findDriver(req.params.driverId);
  if (!driver) {
    return notFound(res, req.params.driverId);
  }

  await driver.destroy();
  return res.status(200).json({ message: "Driver was deleted successfully." });
}
