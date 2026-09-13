export function createSafeRetry({ sleep = async () => {}, maxAttempts = 3, baseDelayMs = 100 }) {
  if (typeof sleep !== 'function') throw new TypeError('sleep function is required');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new TypeError('maxAttempts must be a positive integer');

  async function run(operation, { shouldRetry } = {}) {
    if (typeof operation !== 'function') throw new TypeError('operation function is required');
    const retryCheck = typeof shouldRetry === 'function' ? shouldRetry : () => false;

    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await operation({ attempt });
      } catch (error) {
        lastError = error;
        const retry = attempt < maxAttempts && retryCheck(error, { attempt });
        if (!retry) throw error;
        await sleep(baseDelayMs * attempt);
      }
    }
    throw lastError;
  }

  return { run };
}

export function isRetryableOpenDartError(error) {
  const code = error?.code ?? error?.status;
  return code === 'RATE_LIMIT' || code === 'TIMEOUT' || code === '020';
}
