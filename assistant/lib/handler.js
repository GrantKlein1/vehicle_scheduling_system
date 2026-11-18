import { createGroq } from "@ai-sdk/groq";
import { generateText as defaultGenerateText, isStepCount } from "ai";
import { buildSystemPrompt } from "./prompt.js";
import { buildTools } from "./tools.js";
import { verifySignature } from "./verify.js";

const REQUIRED_ENV = ["GROQ_API_KEY", "GROQ_MODEL", "ASSISTANT_SHARED_SECRET", "APP_API_BASE_URL"];
const TOOL_NAME = /^[a-z][a-z0-9_]*$/;
const STEP_LIMIT = 6;

function defaultCreateModel(env) {
  const groq = createGroq({ apiKey: env.GROQ_API_KEY });
  return groq(env.GROQ_MODEL);
}

function isConfigured(env) {
  return REQUIRED_ENV.every((key) => {
    const value = env?.[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function isValidChatBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  if (!Array.isArray(body.messages) || body.messages.length === 0) return false;
  for (const message of body.messages) {
    if (!message || typeof message !== "object") return false;
    if (message.role !== "user" && message.role !== "assistant") return false;
    if (typeof message.content !== "string") return false;
  }

  const user = body.user;
  if (!user || typeof user !== "object" || Array.isArray(user)) return false;
  if (typeof user.id !== "string" && typeof user.id !== "number") return false;
  if (typeof user.role !== "string" || user.role.trim().length === 0) return false;
  if (typeof user.firstName !== "string") return false;
  if (user.areaName != null && typeof user.areaName !== "string") return false;

  if (typeof body.now !== "string" || !Number.isFinite(Date.parse(body.now))) return false;
  if (typeof body.timezone !== "string" || !isValidTimeZone(body.timezone)) return false;
  if (typeof body.toolToken !== "string" || body.toolToken.length === 0) return false;
  if (!Array.isArray(body.tools)) return false;

  const names = new Set();
  for (const entry of body.tools) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    if (typeof entry.name !== "string" || !TOOL_NAME.test(entry.name) || names.has(entry.name)) return false;
    names.add(entry.name);
    if (typeof entry.description !== "string") return false;
    if (!entry.parameters || typeof entry.parameters !== "object" || Array.isArray(entry.parameters)) {
      return false;
    }
  }
  return true;
}

export function createChatHandler({
  generateText = defaultGenerateText,
  createModel = defaultCreateModel,
  fetchImpl = globalThis.fetch,
  env = process.env,
  nowMs = () => Date.now(),
} = {}) {
  return async function POST(request) {
    if (!isConfigured(env)) {
      return Response.json({ message: "Assistant service is not configured." }, { status: 503 });
    }

    const rawBody = await request.text();
    const timestamp = request.headers.get("x-assistant-timestamp");
    const signature = request.headers.get("x-assistant-signature");
    const clock = typeof nowMs === "function" ? nowMs() : nowMs;
    const signed = verifySignature({
      rawBody,
      timestamp,
      signature,
      secret: env.ASSISTANT_SHARED_SECRET,
      nowMs: clock,
    });
    if (!signed) {
      return Response.json({ message: "Unauthorized." }, { status: 401 });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json({ message: "Invalid request." }, { status: 400 });
    }
    if (!isValidChatBody(body)) {
      return Response.json({ message: "Invalid request." }, { status: 400 });
    }

    let lastDraft = null;
    const tools = buildTools({
      manifest: body.tools,
      toolToken: body.toolToken,
      apiBaseUrl: env.APP_API_BASE_URL,
      fetchImpl,
      onDraft(draft) {
        lastDraft = draft;
      },
    });

    try {
      const result = await generateText({
        model: createModel(env),
        instructions: buildSystemPrompt({
          user: body.user,
          now: body.now,
          timezone: body.timezone,
        }),
        messages: body.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        tools,
        stopWhen: isStepCount(STEP_LIMIT),
      });
      const reply = typeof result.text === "string" ? result.text : "";
      return Response.json({ reply, draft: lastDraft ?? null });
    } catch {
      console.error("Model request failed.");
      return Response.json({ message: "Model request failed." }, { status: 502 });
    }
  };
}
