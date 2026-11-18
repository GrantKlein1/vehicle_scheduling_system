import logger from "../config/logger.js";
import { findTool, isToolAllowed } from "./tools.registry.js";

function logOutcome(req, toolName, status) {
  logger.info(
    `assistant tool userId=${req.user?.id} role=${req.user?.role} tool=${toolName} status=${status}`
  );
}

export async function runTool(req, res) {
  const toolName = req.params.name;
  const tool = findTool(toolName);
  if (!tool) {
    logOutcome(req, toolName, 404);
    return res.status(404).json({ message: "Unknown assistant tool." });
  }
  if (!isToolAllowed(tool, req.user)) {
    logOutcome(req, tool.name, 403);
    return res.status(403).json({ message: "You do not have access to this information." });
  }

  const args =
    req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  try {
    const result = await tool.handler(req.user, args);
    logOutcome(req, tool.name, result.status);
    return res.status(result.status).json(result.body);
  } catch (err) {
    logOutcome(req, tool.name, 500);
    logger.error(`assistant tool failed name=${err?.name ?? "Error"}`);
    return res.status(500).json({ message: "The tool failed." });
  }
}
