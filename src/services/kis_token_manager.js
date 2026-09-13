export function createKisTokenManager({ requestToken, now = () => Date.now(), refreshSkewMs = 60_000 }) {
  if (typeof requestToken !== 'function') {
    throw new TypeError('KIS token request function is required');
  }
  if (typeof now !== 'function') {
    throw new TypeError('now function is required');
  }

  let cachedToken = null;
  let expiresAtMs = 0;

  function isUsable() {
    return Boolean(cachedToken) && (now() + refreshSkewMs) < expiresAtMs;
  }

  async function refresh() {
    const response = await requestToken({ service: 'kis', operation: 'token' });
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid KIS token response');
    }
    if (response.error_code || response.rt_cd === '1') {
      throw new Error(`KIS token error: ${response.error_code ?? response.msg_cd ?? 'unknown'}`);
    }

    const accessToken = response.access_token;
    const expiresInSec = Number(response.expires_in ?? 0);
    if (!accessToken || !Number.isFinite(expiresInSec) || expiresInSec <= 0) {
      throw new Error('Invalid KIS token payload');
    }

    cachedToken = accessToken;
    expiresAtMs = now() + (expiresInSec * 1000);
    return cachedToken;
  }

  async function getToken() {
    if (isUsable()) return cachedToken;
    return refresh();
  }

  function clear() {
    cachedToken = null;
    expiresAtMs = 0;
  }

  function inspect() {
    return {
      hasToken: Boolean(cachedToken),
      expiresAtMs,
      usable: isUsable(),
    };
  }

  return { getToken, refresh, clear, inspect };
}
