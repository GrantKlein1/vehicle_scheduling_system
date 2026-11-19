const UNREACHABLE = "The tool could not be reached.";

async function messageFromBody(response) {
  try {
    const body = await response.json();
    if (body && typeof body === "object" && typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
  } catch {
    // A non-JSON error body still becomes error data for the model.
  }
  return undefined;
}

/**
 * POST the tool arguments to the EC2 tool route and return JSON for the model.
 * A non-2xx response is error data. A network failure uses a fixed message.
 */
function toolUrl(apiBaseUrl, name) {
  const base = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;
  return new URL(`assistant/tools/${name}`, base);
}

export async function executeTool({ name, args, toolToken, apiBaseUrl, fetchImpl }) {
  const fetchFn = fetchImpl ?? fetch;
  try {
    const url = toolUrl(apiBaseUrl, name);
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${toolToken}`,
      },
      body: JSON.stringify(args ?? {}),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const message = await messageFromBody(response);
      return message
        ? { error: true, status: response.status, message }
        : { error: true, status: response.status };
    }

    try {
      return await response.json();
    } catch {
      return { error: true, status: response.status, message: UNREACHABLE };
    }
  } catch {
    return { error: true, message: UNREACHABLE };
  }
}
