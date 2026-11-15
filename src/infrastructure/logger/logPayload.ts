// Helpers that turn request/response payloads into bounded, secret-free strings for the logs.

export const REDACTED = '[REDACTED]';
export const MAX_LOGGED_BODY_BYTES = 4096;

// Any key containing one of these words is treated as a secret (case-insensitive):
// password, newPassword, accessToken, refreshToken, token, authorization, secret, ...
const SENSITIVE_KEY = /password|passwd|token|secret|authorization|cookie|api[-_]?key/i;

export const isSensitiveKey = (key: string) => SENSITIVE_KEY.test(key);

const redactReplacer = (key: string, value: unknown) =>
  key !== '' && isSensitiveKey(key) ? REDACTED : value;

// Best effort for payloads that are not valid JSON (e.g. a malformed login body):
// hide the value of any "sensitive": ... pair.
const SENSITIVE_JSON_PAIR =
  /("[^"]*(?:password|passwd|token|secret|authorization|cookie|api[-_]?key)[^"]*"\s*:\s*)("(?:[^"\\]|\\.)*"?|[^,}\]\s]*)/gi;

export const redactJsonLikeString = (text: string) =>
  text.replace(SENSITIVE_JSON_PAIR, `$1"${REDACTED}"`);

export const truncate = (text: string, maxBytes = MAX_LOGGED_BODY_BYTES) => {
  const totalBytes = Buffer.byteLength(text);
  if (totalBytes <= maxBytes) return text;
  const head = Buffer.from(text).subarray(0, maxBytes).toString('utf8').replace(/�$/, '');
  return `${head}...[truncated, ${totalBytes} bytes total]`;
};

const serializeRedacted = (value: unknown): string => {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), redactReplacer);
    } catch {
      return redactJsonLikeString(value);
    }
  }
  if (Buffer.isBuffer(value)) return `[binary ${value.length} bytes]`;
  try {
    return JSON.stringify(value, redactReplacer) ?? String(value);
  } catch {
    return '[unserializable body]';
  }
};

const isEmptyObject = (value: unknown) =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !Buffer.isBuffer(value) &&
  Object.keys(value).length === 0;

// Returns the payload as a redacted, truncated string, or undefined when there is nothing to log.
export const toLoggableBody = (value: unknown, maxBytes = MAX_LOGGED_BODY_BYTES) => {
  if (value === undefined || value === null || value === '' || isEmptyObject(value)) {
    return undefined;
  }
  return truncate(serializeRedacted(value), maxBytes);
};

// Redacts the values of sensitive query parameters (e.g. ?token=...) and bounds the length.
export const toLoggableQuery = (query: string, maxBytes = MAX_LOGGED_BODY_BYTES) => {
  if (!query) return undefined;
  const redacted = query
    .split('&')
    .map((pair) => {
      const [key] = pair.split('=', 1);
      let decodedKey = key;
      try {
        decodedKey = decodeURIComponent(key);
      } catch {
        // keep the raw key
      }
      return isSensitiveKey(decodedKey) ? `${key}=${REDACTED}` : pair;
    })
    .join('&');
  return truncate(redacted, maxBytes);
};
