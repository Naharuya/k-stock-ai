export function parseAgentJson(text) {
  if (typeof text !== "string") return text;

  const trimmed = text.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(trimmed);
  } catch {
    return {
      parseError: true,
      raw: text,
    };
  }
}
