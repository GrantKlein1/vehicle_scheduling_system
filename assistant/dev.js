import { createServer } from "node:http";
import { POST } from "./api/chat.js";

try {
  process.loadEnvFile(new URL("./.env", import.meta.url));
} catch {
  // .env is optional. Vercel injects the variables in production.
}

const port = Number(process.env.PORT) || 3300;

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

const server = createServer(async (req, res) => {
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
  } catch {
    console.error("Assistant request failed.");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Model request failed." }));
  }
});

server.listen(port, () => {
  console.log(`Assistant service listening on http://localhost:${port}`);
});
