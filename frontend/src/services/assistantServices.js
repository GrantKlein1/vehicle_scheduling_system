import { apiClient } from "./services.js";

export function chat(messages) {
  return apiClient.post("assistant/chat", { messages });
}
