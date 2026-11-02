import db from "../models/index.js";

const STATE_PATTERN = /^[A-Za-z]{2}$/;
const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

function trimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateDestination(body) {
  const name = trimmedString(body?.name);
  if (!name) {
    return { error: "Name cannot be empty." };
  }
  if (name.length > 100) {
    return { error: "Name cannot exceed 100 characters." };
  }

  const addressLine1 = trimmedString(body?.addressLine1);
  if (!addressLine1) {
    return { error: "Address Line 1 cannot be empty." };
  }
  if (addressLine1.length > 100) {
    return { error: "Address Line 1 cannot exceed 100 characters." };
  }

  const addressLine2 = trimmedString(body?.addressLine2);
  if (addressLine2.length > 100) {
    return { error: "Address Line 2 cannot exceed 100 characters." };
  }

  const city = trimmedString(body?.city);
  if (!city) {
    return { error: "City cannot be empty." };
  }
  if (city.length > 50) {
    return { error: "City cannot exceed 50 characters." };
  }

  const state = trimmedString(body?.state);
  if (!STATE_PATTERN.test(state)) {
    return { error: "State must be a 2-letter abbreviation." };
  }

  const zip = trimmedString(body?.zip);
  if (!ZIP_PATTERN.test(zip)) {
    return { error: "Zip must be 5 digits or ZIP+4." };
  }

  return {
    value: {
      name,
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state: state.toUpperCase(),
      zip,
    },
  };
}

function destinationJson(destination) {
  const row = destination.toJSON();
  return {
    id: row.id,
    name: row.name,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2 ?? null,
    city: row.city,
    state: row.state,
    zip: row.zip,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function notFound(res, destinationId) {
  return res.status(404).json({ message: `Destination with id=${destinationId} not found.` });
}

async function findDestination(destinationId) {
  const id = Number(destinationId);
  if (!Number.isInteger(id)) {
    return null;
  }
  return db.destination.findByPk(id);
}

function requestorForbidden(res) {
  return res.status(403).json({ message: "Requestors cannot update or delete destinations." });
}

export async function createDestination(req, res) {
  const validated = validateDestination(req.body);
  if (validated.error) {
    return res.status(400).json({ message: validated.error });
  }

  const destination = await db.destination.create(validated.value);
  return res.status(201).json(destinationJson(destination));
}

export async function listDestinations(_req, res) {
  const destinations = await db.destination.findAll({
    order: [
      ["name", "ASC"],
      ["city", "ASC"],
      ["id", "ASC"],
    ],
  });

  return res.status(200).json(destinations.map(destinationJson));
}

export async function updateDestination(req, res) {
  if (req.user?.role === "requestor") {
    return requestorForbidden(res);
  }

  const destination = await findDestination(req.params.destinationId);
  if (!destination) {
    return notFound(res, req.params.destinationId);
  }

  const validated = validateDestination(req.body);
  if (validated.error) {
    return res.status(400).json({ message: validated.error });
  }

  await destination.update(validated.value);
  return res.status(200).json({ message: "Destination was updated successfully." });
}

export async function deleteDestination(req, res) {
  if (req.user?.role === "requestor") {
    return requestorForbidden(res);
  }
  if (req.user?.role === "maintenance") {
    return res.status(403).json({ message: "Maintenance cannot delete destinations." });
  }

  const destination = await findDestination(req.params.destinationId);
  if (!destination) {
    return notFound(res, req.params.destinationId);
  }

  await destination.destroy();
  return res.status(200).json({ message: "Destination was deleted successfully." });
}
