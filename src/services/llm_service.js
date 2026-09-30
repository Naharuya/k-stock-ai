import OpenAI from "openai";
import { parseAgentJson } from "../utils/json.js";
import { runLocalAgent } from "./ollama_service.js";

let client;

const AGENT_STRING_ENUMS = {
  status: ['EXCLUDE', 'WATCH', 'INTEREST', 'CONDITION_MET', 'HOLD_MANAGE'],
  riskLevel: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
  impact: ['VERY_POSITIVE', 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'VERY_NEGATIVE'],
};

function schemaForValue(value, key = '') {
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? schemaForValue(value[0]) : { type: 'string' },
      maxItems: 3,
    };
  }
  if (typeof value === 'boolean') return { type: 'boolean' };
  if (typeof value === 'number') {
    return /score|confidence/i.test(key)
      ? { type: 'number', minimum: 0, maximum: 100 }
      : { type: 'number' };
  }
  if (typeof value === 'string') {
    return AGENT_STRING_ENUMS[key]
      ? { type: 'string', enum: AGENT_STRING_ENUMS[key] }
      : { type: 'string' };
  }
  if (value && typeof value === 'object') {
    return createAgentResponseSchema(value);
  }
  return { type: 'string' };
}

export function createAgentResponseSchema(example) {
  const properties = Object.fromEntries(
    Object.entries(example).map(([key, value]) => [key, schemaForValue(value, key)]),
  );
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

export function validateAgentResult(agentName, result, schema) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error(`${agentName} agent returned an invalid result object`);
  }

  for (const [key, expected] of Object.entries(schema)) {
    if (!Object.hasOwn(result, key)) {
      throw new Error(`${agentName} agent result is missing ${key}`);
    }

    const actual = result[key];
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) throw new Error(`${agentName} agent ${key} must be an array`);
      if (expected.length > 0) {
        const expectedItemType = typeof expected[0];
        if (actual.some((item) => typeof item !== expectedItemType)) {
          throw new Error(`${agentName} agent ${key} contains an invalid item`);
        }
      }
      continue;
    }

    if (typeof expected === "number") {
      if (typeof actual !== "number" || !Number.isFinite(actual) || actual < 0 || actual > 100) {
        throw new Error(`${agentName} agent ${key} must be a score from 0 to 100`);
      }
      continue;
    }

    if (typeof actual !== typeof expected) {
      throw new Error(`${agentName} agent ${key} must be ${typeof expected}`);
    }
    if (typeof expected === 'string' && AGENT_STRING_ENUMS[key] && !AGENT_STRING_ENUMS[key].includes(actual)) {
      throw new Error(`${agentName} agent ${key} must be one of the supported values`);
    }
  }

  return result;
}

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
  agentName,
  systemPrompt,
  userPrompt,
  mockResult,
}) {
  const mode = process.env.KSTOCK_AI_MODE || "mock";

  if (mode === "mock") {
    return validateAgentResult(agentName, mockResult, mockResult);
  }

  if (mode === "local") {
    const result = await runLocalAgent({
      agentName,
      systemPrompt,
      userPrompt,
      responseSchema: createAgentResponseSchema(mockResult),
    });
    return validateAgentResult(agentName, result, mockResult);
  }

  if (mode !== "openai") {
    throw new Error(`Unsupported KSTOCK_AI_MODE: ${mode}. Use mock, local or openai.`);
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

  return validateAgentResult(agentName, parseAgentJson(response.output_text), mockResult);
}
