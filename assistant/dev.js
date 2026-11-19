import { createServer } from "node:http";
import { POST } from "./api/chat.js";

try {
  process.loadEnvFile(new URL("./.env", import.meta.url));
} catch {
  // .env is optional. Vercel injects the variables in production.
}

const port = Number(process.env.PORT) || 3300;
const REQUIRED_ENV = ["GROQ_API_KEY", "GROQ_MODEL", "ASSISTANT_SHARED_SECRET", "APP_API_BASE_URL"];
const missingEnv = REQUIRED_ENV.filter((key) => {
  const value = process.env[key];
  return typeof value !== "string" || value.trim().length === 0;
});
if (missingEnv.length > 0) {
  console.error(`Assistant is missing ${missingEnv.join(", ")}. Requests will fail until assistant/.env sets them.`);
}

function toHeaders(incoming) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  headers.delete("transfer-encoding");
  headers.delete("content-length");
  return headers;
}

function onRequest(req, res) {
  handleRequest(req, res).catch((error) => {
    console.error(`Assistant request failed. ${error instanceof Error ? error.message : "request failed"}`);
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Model request failed." }));
  });
}

async function handleRequest(req, res) {
  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
  if (req.method !== "POST" || url.pathname !== "/api/chat") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Not found." }));
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);

  try {
    const request = new Request(url, {
      method: "POST",
      headers: toHeaders(req.headers),
      body: raw,
    });
    const response = await POST(request);
    const payload = Buffer.from(await response.arrayBuffer());
    const out = {};
    response.headers.forEach((value, key) => {
      out[key] = value;
    });
    res.writeHead(response.status, out);
    res.end(payload);
  } catch (error) {
    console.error(`Assistant request failed. ${error instanceof Error ? error.message : "request failed"}`);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Model request failed." }));
  }
}

for (const host of ["127.0.0.1", "::1"]) {
  const server = createServer(onRequest);
  server.on("error", (error) => {
    console.error(`Assistant could not listen on ${host}:${port} (${error.code || error.message}).`);
  });
  server.listen(port, host, () => {
    const shown = host.includes(":") ? `[${host}]` : host;
    console.log(`Assistant service listening on http://${shown}:${port}`);
  });
}
