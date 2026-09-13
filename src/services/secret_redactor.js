const SECRET_KEYS = new Set([
  'authorization',
  'access_token',
  'appkey',
  'appsecret',
  'api_key',
  'apikey',
  'token',
]);

export function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redactSecrets(entry),
    ]),
  );
}

export function safeErrorMessage(error) {
  const message = String(error?.message ?? error ?? 'Unknown error');
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/(access[_-]?token|app[_-]?key|app[_-]?secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
}
