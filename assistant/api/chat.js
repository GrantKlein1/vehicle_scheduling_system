import { createChatHandler } from "../lib/handler.js";

export const maxDuration = 60;

const handleChat = createChatHandler();

export async function POST(request) {
  return handleChat(request);
}
