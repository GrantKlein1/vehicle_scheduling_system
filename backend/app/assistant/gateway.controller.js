import crypto from "crypto";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAssistantConfig, isAssistantConfigured } from "../config/assistant.config.js";
import { signToolToken } from "./delegation.js";
import { manifestForRole } from "./tools.registry.js";
import { sanitizeChatMessages } from "./sanitize.js";

const UNAVAILABLE = { message: "The assistant is not available." };
const UPSTREAM_FAILURE = { message: "The assistant could not answer right now. Please try again." };

function upstreamDetail(error) {
  const cause = error?.cause;
  const code = cause?.code || error?.code;
  const message = typeof cause?.message === "string" ? cause.message : error?.message;
  const safe = typeof message === "string" ? message.replace(/\s+/g, " ").slice(0, 200) : "";
  return [code, safe].filter(Boolean).join(" ");
}

function upstreamFailure(res, status, detail = "") {
  const extra = detail ? ` ${detail}` : "";
  logger.warn(`assistant upstream status=${status}${extra}`);
  return res.status(502).json(UPSTREAM_FAILURE);
}

export async function chat(req, res) {
  const cfg = getAssistantConfig();
  if (!isAssistantConfigured(cfg)) {
    return res.status(503).json(UNAVAILABLE);
  }

  const messages = sanitizeChatMessages(req.body?.messages);
  if (!messages) {
    return res.status(400).json({ message: "A message is required." });
  }

  const record = await db.user.findByPk(req.user.id);
  const body = {
    messages,
    user: {
      id: req.user.id,
      role: req.user.role,
      areaName: req.user.areaName,
      firstName: record?.fName ?? "",
    },
    now: new Date().toISOString(),
    timezone: "America/Chicago",
    tools: manifestForRole(req.user),
    toolToken: signToolToken(req.user.id),
  };
  const rawBody = JSON.stringify(body);
  const timestamp = String(Date.now());
  const signature = crypto
    .createHmac("sha256", cfg.sharedSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    const response = await globalThis.fetch(`${cfg.url}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-assistant-timestamp": timestamp,
        "x-assistant-signature": signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
    if (!response.ok) {
      return upstreamFailure(res, response.status);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      return upstreamFailure(res, response.status);
    }
    if (typeof payload?.reply !== "string") {
      return upstreamFailure(res, response.status);
    }
    return res.status(200).json({
      reply: payload.reply,
      draft: payload.draft && typeof payload.draft === "object" ? payload.draft : null,
    });
  } catch (error) {
    const detail = upstreamDetail(error);
    const hint = /ECONNREFUSED|ENOTFOUND|EAI_AGAIN/.test(detail)
      ? "Start the assistant with npm run dev in assistant/ and set ASSISTANT_URL=http://127.0.0.1:3300."
      : "";
    return upstreamFailure(res, "error", [detail, hint].filter(Boolean).join(" "));
  }
}
