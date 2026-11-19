import logger from "../config/logger.js";
import { CATEGORIES } from "../controllers/vehicle.controller.js";
import { findTool, isToolAllowed } from "./tools.registry.js";

const UNAVAILABLE = { message: "You do not have access to this information." };

function logOutcome(req, status) {
  logger.info(`assistant trip userId=${req.user?.id} role=${req.user?.role} status=${status}`);
}

function requiredDestination(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return { error: "Destination is required." };
  }
  return { value: value.trim() };
}

function requiredCategory(value) {
  if (value == null || value === "") {
    return { error: "Vehicle type is required." };
  }
  if (!CATEGORIES.includes(value)) {
    return { error: "Vehicle type is required." };
  }
  return { value };
}

function requiredPassengers(value) {
  if (value == null || value === "") {
    return { error: "Passengers are required." };
  }
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 1) {
    return { error: "Enter a passenger count of at least 1." };
  }
  return { value: parsed };
}

export async function planTrip(req, res) {
  const draftTool = findTool("draft_reservation");
  const availabilityTool = findTool("check_vehicle_availability");
  if (!draftTool || !availabilityTool || !isToolAllowed(draftTool, req.user)) {
    logOutcome(req, 403);
    return res.status(403).json(UNAVAILABLE);
  }

  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const destination = requiredDestination(body.destinationName);
  if (destination.error) {
    logOutcome(req, 400);
    return res.status(400).json({ message: destination.error });
  }
  const category = requiredCategory(body.category);
  if (category.error) {
    logOutcome(req, 400);
    return res.status(400).json({ message: category.error });
  }
  const passengers = requiredPassengers(body.passengers);
  if (passengers.error) {
    logOutcome(req, 400);
    return res.status(400).json({ message: passengers.error });
  }

  try {
    const availability = await availabilityTool.handler(req.user, {
      start: body.start,
      end: body.end,
      category: category.value,
      passengers: passengers.value,
    });
    if (availability.status !== 200) {
      logOutcome(req, availability.status);
      return res.status(availability.status).json(availability.body);
    }

    const vehicles = Array.isArray(availability.body) ? availability.body : [];
    const vehicleId = body.vehicleId;
    if (vehicleId == null || vehicleId === "") {
      logOutcome(req, 200);
      return res.status(200).json({ vehicles, draft: null });
    }

    const selectedId = Number(vehicleId);
    const selected = vehicles.find((vehicle) => vehicle.id === selectedId);
    if (!selected || selected.category !== category.value) {
      logOutcome(req, 400);
      return res.status(400).json({ message: "That vehicle is not available for this trip." });
    }

    const drafted = await draftTool.handler(req.user, {
      vehicleId: selectedId,
      destinationName: destination.value,
      start: body.start,
      end: body.end,
      passengers: passengers.value,
    });
    logOutcome(req, drafted.status);
    if (drafted.status !== 200) {
      return res.status(drafted.status).json(drafted.body);
    }
    return res.status(200).json({ vehicles, draft: drafted.body.draft });
  } catch (err) {
    logOutcome(req, 500);
    logger.error(`assistant trip failed name=${err?.name ?? "Error"}`);
    return res.status(500).json({ message: "The tool failed." });
  }
}
