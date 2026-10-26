import db from "../models/index.js";

const CATEGORIES = ["Golf Cart", "Truck", "Car", "Van"];
const AREAS = ["Athletics", "Support Central", "Maintenance"];
const SERVICE_LIMIT = 80;
const COMMENT_LIMIT = 500;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const PLATE_PATTERN = /^[A-Z0-9]{2,8}$/;

function isIntegerInRange(value, min, max) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

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

function trimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function validateVehicle(body) {
  const category = trimmedString(body?.category);
  if (!category) {
    return { error: "Category cannot be empty." };
  }
  if (!CATEGORIES.includes(category)) {
    return { error: "Category must be Golf Cart, Truck, Car, or Van." };
  }

  const make = trimmedString(body?.make);
  if (!make) {
    return { error: "Make cannot be empty." };
  }
  if (make.length > 40) {
    return { error: "Make cannot exceed 40 characters." };
  }

  const model = trimmedString(body?.model);
  if (!model) {
    return { error: "Model cannot be empty." };
  }
  if (model.length > 40) {
    return { error: "Model cannot exceed 40 characters." };
  }

  if (!isIntegerInRange(body?.year, 1950, 2027)) {
    return { error: "Year must be from 1950 through 2027." };
  }

  const isGolfCart = category === "Golf Cart";
  let vin = null;
  if (!isGolfCart) {
    vin = trimmedString(body?.vin);
    if (!vin) {
      return { error: "VIN cannot be empty." };
    }
    if (!VIN_PATTERN.test(vin)) {
      return { error: "VIN must be a valid 17-character VIN." };
    }
  }

  const purchasedDate = validDateOnly(body?.purchasedDate);
  if (!purchasedDate) {
    return { error: "Purchased Date must be a valid date." };
  }
  if (purchasedDate > localToday()) {
    return { error: "Date cannot be in the future." };
  }

  const color = trimmedString(body?.color);
  if (!color) {
    return { error: "Color cannot be empty." };
  }
  if (color.length > 30) {
    return { error: "Color cannot exceed 30 characters." };
  }

  if (!isIntegerInRange(body?.passengerCapacity, 1, 15)) {
    return { error: "Number of passengers must be from 1 through 15." };
  }

  let licensePlateNumber = null;
  let licensePlateExpirationMonth = null;
  if (!isGolfCart) {
    licensePlateNumber = trimmedString(body?.licensePlateNumber);
    if (!licensePlateNumber) {
      return { error: "License Plate Number cannot be empty." };
    }
    if (!PLATE_PATTERN.test(licensePlateNumber)) {
      return { error: "License Plate Number must be 2 to 8 letters or digits." };
    }

    if (!isIntegerInRange(body?.licensePlateExpirationMonth, 1, 12)) {
      return { error: "License Plate Expiration Month must be from 1 through 12." };
    }
    licensePlateExpirationMonth = body.licensePlateExpirationMonth;
  }

  const areaAssigned = trimmedString(body?.areaAssigned);
  if (!areaAssigned) {
    return { error: "Area Assigned cannot be empty." };
  }
  if (!AREAS.includes(areaAssigned)) {
    return { error: "Area Assigned must be Athletics, Support Central, or Maintenance." };
  }

  return {
    value: {
      category,
      make,
      model,
      year: body.year,
      vin,
      purchasedDate,
      color,
      passengerCapacity: body.passengerCapacity,
      licensePlateNumber,
      licensePlateExpirationMonth,
      areaAssigned,
    },
  };
}

function validateLogDate(value) {
  const entryDate = validDateOnly(value);
  if (!entryDate) {
    return { error: "Date must be a valid date." };
  }
  if (entryDate > localToday()) {
    return { error: "Date cannot be in the future." };
  }
  return { value: entryDate };
}

function validateMileage(body) {
  const dated = validateLogDate(body?.entryDate);
  if (dated.error) {
    return dated;
  }
  const entryDate = dated.value;
  if (
    typeof body?.currentMileage !== "number" ||
    !Number.isInteger(body.currentMileage) ||
    body.currentMileage < 0
  ) {
    return { error: "Current mileage must be zero or greater." };
  }

  return { value: { entryDate, currentMileage: body.currentMileage } };
}

function validateComments(value) {
  if (value === undefined || value === null) {
    return { value: null };
  }
  if (typeof value !== "string") {
    return { error: "Comments must be text." };
  }
  const comments = value.trim();
  if (!comments) {
    return { value: null };
  }
  if (comments.length > COMMENT_LIMIT) {
    return { error: "Comments cannot exceed 500 characters." };
  }
  return { value: comments };
}

function validateService(body) {
  const dated = validateLogDate(body?.entryDate);
  if (dated.error) {
    return dated;
  }
  const entryDate = dated.value;

  const servicePerformed = trimmedString(body?.servicePerformed);
  if (!servicePerformed) {
    return { error: "Service performed cannot be empty." };
  }
  if (servicePerformed.length > SERVICE_LIMIT) {
    return { error: "Service performed cannot exceed 80 characters." };
  }

  const comments = validateComments(body?.comments);
  if (comments.error) {
    return comments;
  }

  return { value: { entryDate, servicePerformed, comments: comments.value } };
}

function dateOnly(value) {
  if (!value) {
    return value;
  }
  return String(value).slice(0, 10);
}

function vehicleJson(vehicle) {
  const row = vehicle.toJSON();
  return {
    id: row.id,
    category: row.category,
    make: row.make,
    model: row.model,
    year: row.year,
    vin: row.vin,
    purchasedDate: dateOnly(row.purchasedDate),
    color: row.color,
    passengerCapacity: row.passengerCapacity,
    licensePlateNumber: row.licensePlateNumber,
    licensePlateExpirationMonth: row.licensePlateExpirationMonth,
    areaAssigned: row.areaAssigned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mileageJson(log) {
  const row = log.toJSON();
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    entryDate: dateOnly(row.entryDate),
    currentMileage: row.currentMileage,
  };
}

function serviceJson(log) {
  const row = log.toJSON();
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    entryDate: dateOnly(row.entryDate),
    servicePerformed: row.servicePerformed,
    comments: row.comments ?? null,
  };
}

function notFound(res, vehicleId) {
  return res.status(404).json({ message: `Vehicle with id=${vehicleId} not found.` });
}

async function findVehicle(vehicleId) {
  const id = Number(vehicleId);
  if (!Number.isInteger(id)) {
    return null;
  }
  return db.vehicle.findByPk(id);
}

function duplicateMessage(error) {
  if (error?.name !== "SequelizeUniqueConstraintError") {
    return null;
  }

  const names = new Set([
    ...Object.keys(error.fields || {}),
    ...(error.errors || []).map((entry) => entry.path),
  ]);

  if (names.has("vin")) {
    return "VIN already exists.";
  }
  if (names.has("licensePlateNumber")) {
    return "License Plate Number already exists.";
  }
  return null;
}

async function rejectDuplicate(value, vehicleId) {
  const vehicles = await db.vehicle.findAll({
    attributes: ["id", "vin", "licensePlateNumber"],
  });

  if (
    value.vin &&
    vehicles.some((vehicle) => vehicle.id !== vehicleId && vehicle.vin === value.vin)
  ) {
    return "VIN already exists.";
  }
  if (
    value.licensePlateNumber &&
    vehicles.some(
      (vehicle) => vehicle.id !== vehicleId && vehicle.licensePlateNumber === value.licensePlateNumber
    )
  ) {
    return "License Plate Number already exists.";
  }
  return null;
}

export async function createVehicle(req, res) {
  const validated = validateVehicle(req.body);
  if (validated.error) {
    return res.status(400).json({ message: validated.error });
  }

  const duplicate = await rejectDuplicate(validated.value);
  if (duplicate) {
    return res.status(400).json({ message: duplicate });
  }

  try {
    const vehicle = await db.vehicle.create(validated.value);
    return res.status(201).json(vehicleJson(vehicle));
  } catch (error) {
    const message = duplicateMessage(error);
    if (message) {
      return res.status(400).json({ message });
    }
    throw error;
  }
}

export async function listVehicles(_req, res) {
  const vehicles = await db.vehicle.findAll({
    order: [
      ["make", "ASC"],
      ["model", "ASC"],
      ["id", "ASC"],
    ],
  });

  return res.status(200).json(vehicles.map(vehicleJson));
}

export async function getVehicle(req, res) {
  const vehicle = await findVehicle(req.params.vehicleId);
  if (!vehicle) {
    return notFound(res, req.params.vehicleId);
  }

  const mileageLogs = await db.mileageLog.findAll({
    where: { vehicleId: vehicle.id },
    order: [
      ["entryDate", "ASC"],
      ["id", "ASC"],
    ],
  });
  const serviceLogs = await db.serviceLog.findAll({
    where: { vehicleId: vehicle.id },
    order: [
      ["entryDate", "ASC"],
      ["id", "ASC"],
    ],
  });

  return res.status(200).json({
    ...vehicleJson(vehicle),
    mileageLogs: mileageLogs.map(mileageJson),
    serviceLogs: serviceLogs.map(serviceJson),
  });
}

export async function updateVehicle(req, res) {
  const vehicle = await findVehicle(req.params.vehicleId);
  if (!vehicle) {
    return notFound(res, req.params.vehicleId);
  }

  const validated = validateVehicle(req.body);
  if (validated.error) {
    return res.status(400).json({ message: validated.error });
  }

  const duplicate = await rejectDuplicate(validated.value, vehicle.id);
  if (duplicate) {
    return res.status(400).json({ message: duplicate });
  }

  try {
    await vehicle.update(validated.value);
    return res.status(200).json({ message: "Vehicle was updated successfully." });
  } catch (error) {
    const message = duplicateMessage(error);
    if (message) {
      return res.status(400).json({ message });
    }
    throw error;
  }
}

export async function deleteVehicle(req, res) {
  const vehicle = await findVehicle(req.params.vehicleId);
  if (!vehicle) {
    return notFound(res, req.params.vehicleId);
  }

  await db.mileageLog.destroy({ where: { vehicleId: vehicle.id } });
  await db.serviceLog.destroy({ where: { vehicleId: vehicle.id } });
  await vehicle.destroy();

  return res.status(200).json({ message: "Vehicle was deleted successfully!" });
}

export async function createMileageLog(req, res) {
  const vehicle = await findVehicle(req.params.vehicleId);
  if (!vehicle) {
    return notFound(res, req.params.vehicleId);
  }

  const validated = validateMileage(req.body);
  if (validated.error) {
    return res.status(400).json({ message: validated.error });
  }

  const previousMileage = await db.mileageLog.max("currentMileage", {
    where: { vehicleId: vehicle.id },
  });
  if (previousMileage !== null && previousMileage !== undefined) {
    const previous = Number(previousMileage);
    if (validated.value.currentMileage <= previous) {
      return res.status(400).json({
        message: `Current mileage must be greater than the previous mileage of ${previous}.`,
      });
    }
  }

  const log = await db.mileageLog.create({
    ...validated.value,
    vehicleId: vehicle.id,
  });

  return res.status(201).json(mileageJson(log));
}

export async function createServiceLog(req, res) {
  const vehicle = await findVehicle(req.params.vehicleId);
  if (!vehicle) {
    return notFound(res, req.params.vehicleId);
  }

  const validated = validateService(req.body);
  if (validated.error) {
    return res.status(400).json({ message: validated.error });
  }

  const log = await db.serviceLog.create({
    ...validated.value,
    vehicleId: vehicle.id,
  });

  return res.status(201).json(serviceJson(log));
}

export async function updateServiceComment(req, res) {
  const vehicle = await findVehicle(req.params.vehicleId);
  if (!vehicle) {
    return notFound(res, req.params.vehicleId);
  }

  const serviceLogId = Number(req.params.serviceLogId);
  if (!Number.isInteger(serviceLogId)) {
    return res.status(404).json({ message: `Service log with id=${req.params.serviceLogId} not found.` });
  }

  const log = await db.serviceLog.findOne({
    where: { id: serviceLogId, vehicleId: vehicle.id },
  });
  if (!log) {
    return res.status(404).json({ message: `Service log with id=${serviceLogId} not found.` });
  }

  const comments = validateComments(req.body?.comments);
  if (comments.error) {
    return res.status(400).json({ message: comments.error });
  }

  await log.update({ comments: comments.value });
  return res.status(200).json(serviceJson(log));
}
