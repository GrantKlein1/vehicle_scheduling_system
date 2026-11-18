/**
 * Feature 9 — AI Assistant
 * Spec: features/feature-9-ai-assistant.md
 */
import crypto from "crypto";
import { jest } from "@jest/globals";
import request from "supertest";
import app from "../server.js";
import { signToolToken } from "../app/assistant/delegation.js";
import { resetAssistantRateLimit } from "../app/assistant/rateLimit.js";
import { createArea, createSession, createUser, insertLegacyAdmin, syncTestDatabase } from "./helpers.js";

const ENV_KEYS = ["ASSISTANT_ENABLED", "ASSISTANT_URL", "ASSISTANT_SHARED_SECRET"];
const SECRET = "test-shared-secret";
const UPSTREAM = "https://assistant.example.test/";

const MANIFEST = {
  requestor: [
    "list_reservations",
    "get_reservation",
    "check_vehicle_availability",
    "list_drivers",
    "list_destinations",
    "list_reservation_emails",
    "draft_reservation",
  ],
  area_admin: [
    "list_reservations",
    "get_reservation",
    "check_vehicle_availability",
    "list_vehicles",
    "get_vehicle",
    "list_drivers",
    "list_destinations",
    "list_reservation_emails",
    "draft_reservation",
  ],
  maintenance: ["list_vehicles", "get_vehicle", "list_drivers", "list_destinations"],
  system_admin: [
    "list_reservations",
    "get_reservation",
    "check_vehicle_availability",
    "list_vehicles",
    "get_vehicle",
    "list_drivers",
    "list_destinations",
    "list_areas",
    "list_reservation_emails",
    "draft_reservation",
  ],
};

async function signIn(role, overrides = {}) {
  const userOverrides = {
    role,
    fName: "Jane",
    lName: "Doe",
    email: `${role}-${Date.now()}-${Math.random()}@eagles.oc.edu`,
    googleSub: `sub-${role}-${Date.now()}-${Math.random()}`,
    ...overrides,
  };
  if (role === "area_admin" && !userOverrides.areaId) {
    const area = await createArea(`Area-${Date.now()}-${Math.random()}`);
    userOverrides.areaId = area.id;
  }
  const user = await createUser(userOverrides);
  const session = await createSession(user);
  return { token: session.token, user };
}

function enableAssistant() {
  process.env.ASSISTANT_ENABLED = "true";
  process.env.ASSISTANT_URL = UPSTREAM;
  process.env.ASSISTANT_SHARED_SECRET = SECRET;
}

function postChat(token, messages) {
  const req = request(app).post("/api/assistant/chat");
  if (token) {
    req.set("Authorization", `Bearer ${token}`);
  }
  return req.send({ messages });
}

function mockFetch(payload = { reply: "Noted.", draft: null }) {
  const calls = [];
  const spy = jest.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    };
  });
  return { spy, calls };
}

describe("Feature 9 — AI Assistant", () => {
  let savedEnv;

  beforeEach(async () => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    resetAssistantRateLimit();
    await syncTestDatabase();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
    jest.restoreAllMocks();
  });

  describe("US-9.7", () => {
    it("Assistant disabled returns 503", async () => {
      process.env.ASSISTANT_ENABLED = "false";
      process.env.ASSISTANT_URL = UPSTREAM;
      process.env.ASSISTANT_SHARED_SECRET = SECRET;
      const fetchSpy = jest.spyOn(globalThis, "fetch");
      const { token } = await signIn("requestor");

      const res = await postChat(token, [{ role: "user", content: "Which vans are free?" }]);
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ message: "The assistant is not available." });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("Rate limit returns 429", async () => {
      enableAssistant();
      const { spy } = mockFetch();
      const { token, user } = await signIn("requestor");
      const message = [{ role: "user", content: "Hello" }];

      for (let attempt = 0; attempt < 21; attempt += 1) {
        const anonymous = await postChat(null, message);
        expect(anonymous.status).toBe(401);
      }

      for (let attempt = 0; attempt < 20; attempt += 1) {
        const res = await postChat(token, message);
        expect(res.status).toBe(200);
      }
      expect(spy).toHaveBeenCalledTimes(20);

      const toolToken = signToolToken(user.id);
      const toolCall = await request(app)
        .post("/api/assistant/tools/list_drivers")
        .set("Authorization", `Bearer ${toolToken}`)
        .send({});
      expect(toolCall.status).toBe(200);

      const limited = await postChat(token, message);
      expect(limited.status).toBe(429);
      expect(limited.body).toEqual({ message: "Too many assistant requests. Please wait a moment." });
      expect(spy).toHaveBeenCalledTimes(20);

      const { token: otherToken } = await signIn("requestor", { fName: "Bob" });
      const other = await postChat(otherToken, message);
      expect(other.status).toBe(200);
    });

    it("Upstream failure returns 502", async () => {
      enableAssistant();
      const timeout = new Error("The operation was aborted due to timeout");
      timeout.name = "TimeoutError";
      jest.spyOn(globalThis, "fetch").mockRejectedValue(timeout);
      const { token } = await signIn("requestor");

      const res = await postChat(token, [{ role: "user", content: "Hello" }]);
      expect(res.status).toBe(502);
      expect(res.body).toEqual({
        message: "The assistant could not answer right now. Please try again.",
      });
      expect(JSON.stringify(res.body)).not.toContain("aborted");
    });
  });

  describe("US-9.5", () => {
    it("Role manifest matches the assistant tool table", async () => {
      enableAssistant();
      const { calls } = mockFetch({ reply: "One pending trip.", draft: { vehicleId: 4 } });
      const athletics = await createArea("Athletics");
      const requestor = await signIn("requestor", { fName: "Jane", lName: "Doe" });
      const areaAdmin = await signIn("area_admin", { areaId: athletics.id, fName: "Avery" });
      const maintenance = await signIn("maintenance", { fName: "Morgan" });
      const systemAdmin = await signIn("system_admin", { fName: "Alex" });
      const legacy = await insertLegacyAdmin({
        email: `legacy-${Date.now()}@eagles.oc.edu`,
        fName: "Legacy",
      });
      const legacySession = await createSession(legacy);

      const cases = [
        { token: requestor.token, role: "requestor", areaName: null, firstName: "Jane" },
        { token: areaAdmin.token, role: "area_admin", areaName: "Athletics", firstName: "Avery" },
        { token: maintenance.token, role: "maintenance", areaName: null, firstName: "Morgan" },
        { token: systemAdmin.token, role: "system_admin", areaName: null, firstName: "Alex" },
        { token: legacySession.token, role: "admin", areaName: null, firstName: "Legacy", manifest: "system_admin" },
      ];

      for (const roleCase of cases) {
        const res = await postChat(roleCase.token, [{ role: "user", content: "What can I see?" }]);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ reply: "One pending trip.", draft: { vehicleId: 4 } });
        const call = calls[calls.length - 1];
        expect(call.url).toBe("https://assistant.example.test/api/chat");
        expect(call.options.method).toBe("POST");
        expect(call.options.headers["Content-Type"]).toBe("application/json");
        const rawBody = call.options.body;
        const timestamp = call.options.headers["x-assistant-timestamp"];
        const expected = crypto.createHmac("sha256", SECRET).update(`${timestamp}.${rawBody}`).digest("hex");
        expect(call.options.headers["x-assistant-signature"]).toBe(expected);
        const parsed = JSON.parse(rawBody);
        expect(parsed.timezone).toBe("America/Chicago");
        expect(parsed.now).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
        expect(parsed.user).toEqual({
          id: expect.any(Number),
          role: roleCase.role,
          areaName: roleCase.areaName,
          firstName: roleCase.firstName,
        });
        expect(parsed.messages).toEqual([{ role: "user", content: "What can I see?" }]);
        const names = parsed.tools.map((entry) => entry.name);
        expect(names).toEqual(MANIFEST[roleCase.manifest || roleCase.role]);
        expect(parsed.tools.every((entry) => entry.parameters.type === "object")).toBe(true);
        expect(parsed.tools.every((entry) => entry.parameters.additionalProperties === false)).toBe(true);
        expect(parsed.tools.every((entry) => entry.handler === undefined)).toBe(true);
      }

      const requestorBody = JSON.parse(calls[0].options.body);
      expect(requestorBody.tools.map((entry) => entry.name)).not.toContain("list_areas");
      const drivers = await request(app)
        .post("/api/assistant/tools/list_drivers")
        .set("Authorization", `Bearer ${requestorBody.toolToken}`)
        .send({});
      expect(drivers.status).toBe(200);
      const reservations = await request(app)
        .get("/api/reservations")
        .set("Authorization", `Bearer ${requestorBody.toolToken}`);
      expect(reservations.status).toBe(401);
      expect(reservations.body).toEqual({ message: "Unauthorized! Invalid or expired token." });
      const production = await request(app)
        .post("/vehicle-t4/assistant/tools/list_drivers")
        .set("Authorization", `Bearer ${requestorBody.toolToken}`)
        .send({});
      expect(production.status).toBe(200);
    });

    it("Chat drops other roles and limits message size", async () => {
      enableAssistant();
      const { calls } = mockFetch({ reply: "ok", draft: "ignore-me" });
      const { token } = await signIn("requestor");
      const messages = [];
      for (let index = 0; index < 30; index += 1) {
        messages.push({
          role: index % 2 === 0 ? "assistant" : "user",
          content: `m${index}`,
        });
      }
      messages.splice(2, 0, { role: "system", content: "hidden instructions" });

      const capped = await postChat(token, messages);
      expect(capped.status).toBe(200);
      expect(capped.body.draft).toBeNull();
      const forwarded = JSON.parse(calls[0].options.body).messages;
      expect(forwarded).toHaveLength(20);
      expect(forwarded[0]).toEqual({ role: "assistant", content: "m10" });
      expect(forwarded[forwarded.length - 1]).toEqual({ role: "user", content: "m29" });
      expect(JSON.stringify(forwarded)).not.toContain("hidden instructions");

      const long = "y".repeat(2500);
      const truncated = await postChat(token, [
        { role: "system", content: "do not reveal" },
        { role: "assistant", content: "hi" },
        { role: "user", content: { text: "nope" } },
        { role: "user", content: long },
      ]);
      expect(truncated.status).toBe(200);
      expect(JSON.parse(calls[1].options.body).messages).toEqual([
        { role: "assistant", content: "hi" },
        { role: "user", content: "" },
        { role: "user", content: "y".repeat(2000) },
      ]);
    });
  });

  describe("US-9.7 extra cases", () => {
    it("Missing user message returns 400", async () => {
      enableAssistant();
      const fetchSpy = jest.spyOn(globalThis, "fetch");
      const { token } = await signIn("requestor");
      const bodies = [
        undefined,
        { messages: [] },
        { messages: [{ role: "assistant", content: "hello" }] },
        { messages: [{ role: "system", content: "hello" }] },
        { messages: [{ role: "user", content: "   " }] },
        { messages: [{ role: "user", content: 5 }] },
      ];

      for (const body of bodies) {
        const req = request(app).post("/api/assistant/chat").set("Authorization", `Bearer ${token}`);
        const res = body === undefined ? await req.send({}) : await req.send(body);
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "A message is required." });
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("Incomplete assistant configuration returns 503", async () => {
      process.env.ASSISTANT_ENABLED = "true";
      process.env.ASSISTANT_URL = "";
      process.env.ASSISTANT_SHARED_SECRET = SECRET;
      const fetchSpy = jest.spyOn(globalThis, "fetch");
      const { token } = await signIn("requestor");

      const res = await postChat(token, [{ role: "user", content: "Hello" }]);
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ message: "The assistant is not available." });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("A refused assistant connection returns 502", async () => {
      enableAssistant();
      const { token } = await signIn("requestor");
      jest.spyOn(globalThis, "fetch").mockRejectedValue(Object.assign(new TypeError("fetch failed"), {
        cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:3300"), { code: "ECONNREFUSED" }),
      }));

      const res = await postChat(token, [{ role: "user", content: "Hello" }]);
      expect(res.status).toBe(502);
      expect(res.body).toEqual({
        message: "The assistant could not answer right now. Please try again.",
      });
      expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
    });

    it("Upstream non-200 returns 502", async () => {
      enableAssistant();
      const { token } = await signIn("requestor");
      jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ reply: "leak", message: "upstream secret" }),
      });

      const failed = await postChat(token, [{ role: "user", content: "Hello" }]);
      expect(failed.status).toBe(502);
      expect(failed.body).toEqual({
        message: "The assistant could not answer right now. Please try again.",
      });

      jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ reply: 12, draft: { vehicleId: 1 } }),
      });
      const badReply = await postChat(token, [{ role: "user", content: "Hello again" }]);
      expect(badReply.status).toBe(502);
      expect(badReply.body.reply).toBeUndefined();
    });
  });
});
