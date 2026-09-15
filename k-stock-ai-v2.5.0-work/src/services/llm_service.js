import OpenAI from "openai";
import { parseAgentJson } from "../utils/json.js";

let client;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30_000,
      maxRetries: 2,
    });
  }

  return client;
}

export async function runAgent({
  systemPrompt,
  userPrompt,
  mockResult,
}) {
  const mode = process.env.KSTOCK_AI_MODE || "mock";

  if (mode === "mock") {
    return mockResult;
  }

  if (mode !== "openai") {
    throw new Error(`Unsupported KSTOCK_AI_MODE: ${mode}`);
  }

  const response = await getClient().responses.create({
    model: process.env.KSTOCK_DEFAULT_MODEL || "gpt-5.5",
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  return parseAgentJson(response.output_text);
}
