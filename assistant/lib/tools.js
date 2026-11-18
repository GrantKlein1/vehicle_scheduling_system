import { jsonSchema, tool } from "ai";
import { executeTool } from "./callback.js";

function isSuccessfulDraft(result) {
  return Boolean(
    result
    && typeof result === "object"
    && !result.error
    && result.draft
    && typeof result.draft === "object",
  );
}

/**
 * Build the AI SDK tool set from the request manifest only.
 * A successful draft_reservation result is reported through onDraft.
 * A later failure does not call onDraft, so an earlier draft stays put.
 */
export function buildTools({ manifest, toolToken, apiBaseUrl, fetchImpl, onDraft }) {
  const tools = {};
  for (const entry of manifest) {
    tools[entry.name] = tool({
      description: entry.description,
      inputSchema: jsonSchema(entry.parameters),
      execute: async (args) => {
        const result = await executeTool({
          name: entry.name,
          args,
          toolToken,
          apiBaseUrl,
          fetchImpl,
        });
        if (entry.name === "draft_reservation" && isSuccessfulDraft(result)) {
          onDraft?.(result.draft);
        }
        return result;
      },
    });
  }
  return tools;
}
