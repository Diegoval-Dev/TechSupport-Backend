import {
  MAX_LOGGED_BODY_BYTES,
  REDACTED,
  redactJsonLikeString,
  toLoggableBody,
  toLoggableQuery,
  truncate,
} from '../src/infrastructure/logger/logPayload';

describe('logPayload helpers', () => {
  describe('toLoggableBody', () => {
    it('redacts secrets at any depth, case-insensitive', () => {
      const body = {
        email: 'user@example.com',
        Password: 'hunter2',
        newPassword: 'hunter3',
        accessToken: 'a.b.c',
        refreshToken: 'd.e.f',
        nested: { token: 't', Authorization: 'Bearer x', clientSecret: 's' },
        list: [{ password: 'p' }],
      };

      const logged = JSON.parse(toLoggableBody(body) as string);

      expect(logged).toEqual({
        email: 'user@example.com',
        Password: REDACTED,
        newPassword: REDACTED,
        accessToken: REDACTED,
        refreshToken: REDACTED,
        nested: { token: REDACTED, Authorization: REDACTED, clientSecret: REDACTED },
        list: [{ password: REDACTED }],
      });
    });

    it('keeps dates and plain values', () => {
      const logged = toLoggableBody({ createdAt: new Date('2026-11-15T00:00:00.000Z'), n: 1 });
      expect(logged).toBe('{"createdAt":"2026-11-15T00:00:00.000Z","n":1}');
    });

    it('parses and redacts JSON strings', () => {
      expect(toLoggableBody('{"refreshToken":"abc","ok":true}')).toBe(
        `{"refreshToken":"${REDACTED}","ok":true}`,
      );
    });

    it('returns undefined when there is nothing to log', () => {
      expect(toLoggableBody(undefined)).toBeUndefined();
      expect(toLoggableBody(null)).toBeUndefined();
      expect(toLoggableBody('')).toBeUndefined();
      expect(toLoggableBody({})).toBeUndefined();
    });

    it('does not dump binary payloads', () => {
      expect(toLoggableBody(Buffer.from('abc'))).toBe('[binary 3 bytes]');
    });

    it('survives circular structures', () => {
      const body: Record<string, unknown> = {};
      body.self = body;
      expect(toLoggableBody(body)).toBe('[unserializable body]');
    });

    it('truncates long bodies with a marker', () => {
      const logged = toLoggableBody({ description: 'x'.repeat(10_000) }) as string;
      expect(logged.length).toBeLessThan(MAX_LOGGED_BODY_BYTES + 100);
      expect(logged).toMatch(/\.\.\.\[truncated, \d+ bytes total\]$/);
    });
  });

  describe('redactJsonLikeString', () => {
    it('hides secret values in malformed JSON', () => {
      const raw = '{"email":"a@b.com","password":"hunter2",';
      const redacted = redactJsonLikeString(raw);
      expect(redacted).not.toContain('hunter2');
      expect(redacted).toContain('"email":"a@b.com"');
      expect(redacted).toContain(`"password":"${REDACTED}"`);
    });

    it('hides unterminated secret values', () => {
      expect(redactJsonLikeString('{"password":"hunter2')).not.toContain('hunter2');
    });
  });

  describe('toLoggableQuery', () => {
    it('redacts sensitive query parameters only', () => {
      expect(toLoggableQuery('page=2&token=abc&status=OPEN')).toBe(
        `page=2&token=${REDACTED}&status=OPEN`,
      );
    });

    it('returns undefined for an empty query', () => {
      expect(toLoggableQuery('')).toBeUndefined();
    });
  });

  describe('truncate', () => {
    it('leaves short text untouched', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('cuts on a byte limit without breaking multi-byte characters', () => {
      const cut = truncate('ñññññ', 3);
      expect(cut).toBe('ñ...[truncated, 10 bytes total]');
    });
  });
});
