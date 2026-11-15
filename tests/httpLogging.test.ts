import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { app } from '../src/app';
import { logger } from '../src/infrastructure/logger/logger';
import { httpLoggingMiddleware } from '../src/infrastructure/http/middlewares/httpLogging.middleware';
import { errorMiddleware } from '../src/infrastructure/http/middlewares/error.middleware';
import { REDACTED } from '../src/infrastructure/logger/logPayload';

type LogLine = {
  event: { action: string };
  http: {
    request: { method: string; mime_type?: string; body?: { bytes?: number; content?: string } };
    response: { status_code: number; body?: { bytes?: number; content?: string } };
  };
  url: { path: string; query?: string };
  error?: { type?: string; message?: string; code?: string; stack_trace?: string };
};

const levels = ['info', 'warn', 'error'] as const;
let spies: jest.SpyInstance[] = [];

beforeEach(() => {
  spies = levels.map((level) => jest.spyOn(logger, level).mockImplementation(() => undefined));
});

afterEach(() => {
  spies.forEach((spy) => spy.mockRestore());
});

const loggedCalls = () =>
  spies.flatMap((spy) => spy.mock.calls).map(([fields, message]) => ({ fields, message }));

// The http_request line is written on 'finish', which can land just after supertest resolves.
const httpCall = async (): Promise<{ fields: LogLine; message: string }> => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const call = loggedCalls().find(
      ({ fields }) => (fields as LogLine)?.event?.action === 'http_request',
    );
    if (call) return call as { fields: LogLine; message: string };
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('no http_request log line');
};

const httpLine = async () => (await httpCall()).fields;

describe('HTTP request logging', () => {
  it('logs the login request body with the password redacted', async () => {
    await request(app)
      .post('/api/auth/login')
      .set('Authorization', 'Bearer super-secret-jwt')
      .send({ email: 'not-an-email', password: 'hunter2-password' });

    const line = await httpLine();
    const serialized = JSON.stringify(line);
    expect(line.http.request.mime_type).toBe('application/json');
    expect(JSON.parse(line.http.request.body?.content as string)).toEqual({
      email: 'not-an-email',
      password: REDACTED,
    });
    expect(line.http.response.body?.content).toContain('Invalid request body');
    expect(serialized).not.toContain('hunter2-password');
    expect(serialized).not.toContain('super-secret-jwt');
  });

  it('explains a malformed JSON 500 on the http_request line', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":"a@b.com","password":"hunter2-password",');

    expect(res.status).toBe(500);
    const line = await httpLine();
    expect(line.http.response.status_code).toBe(500);
    expect(line.error?.type).toBe('SyntaxError');
    expect(line.error?.message).toBeTruthy();
    expect(line.error?.code).toBe('entity.parse.failed');
    expect(line.error?.stack_trace).toBeTruthy();
    expect(line.http.request.body?.content).toContain('"email":"a@b.com"');
    expect((await httpCall()).message).toMatch(
      /^POST \/api\/auth\/login 500 · SyntaxError \(entity\.parse\.failed\): .+\nrequest: \{"email":"a@b\.com","password":"\[REDACTED\]",\nresponse: \{"message":"Internal server error"\}$/,
    );
    expect(line.http.request.body?.bytes).toBeGreaterThan(0);
    expect(line.http.response.body?.content).toBe('{"message":"Internal server error"}');
    expect(JSON.stringify(line)).not.toContain('hunter2-password');
  });

  it('bounds long request bodies', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'x'.repeat(20_000), password: 'whatever-123' });

    const line = await httpLine();
    expect(line.http.request.body?.bytes).toBeGreaterThan(20_000);
    expect(line.http.request.body?.content).toMatch(/\[truncated, \d+ bytes total\]$/);
    expect((line.http.request.body?.content as string).length).toBeLessThan(5_000);
  });

  it('logs the query string with secrets redacted', async () => {
    await request(app).get('/api/nonexistent?page=2&token=abc123');

    const line = await httpLine();
    expect(line.url.path).toBe('/api/nonexistent');
    expect(line.url.query).toBe(`page=2&token=${REDACTED}`);
    expect((await httpCall()).message).toContain(`query: page=2&token=${REDACTED}`);
  });

  it('keeps successful request messages on one line', async () => {
    await request(app).get('/health/metrics');

    expect((await httpCall()).message).toBe('GET /health/metrics 200');
  });

  it('keeps monitoring lines small', async () => {
    await request(app).get('/health');

    const line = await httpLine();
    expect(line.http.request.body).toBeUndefined();
    expect(line.http.response.body).toBeUndefined();
    expect(line.http.request.mime_type).toBeUndefined();
  });
});

describe('HTTP request logging (isolated app)', () => {
  const testApp = express();
  testApp.use(httpLoggingMiddleware);
  testApp.use(express.json());
  testApp.post('/login', (_req, res) => {
    res.json({ accessToken: 'a.b.c', refreshToken: 'd.e.f', user: { id: 1, email: 'a@b.com' } });
  });
  const prismaMessage = [
    '',
    'Invalid `prisma_1.prisma.ticket.create()` invocation in',
    '/app/dist/infrastructure/repositories/PrismaTicketRepository.js:11:54',
    '',
    '  10     async create(ticket) {',
    '→ 11         const created = await prisma_1.prisma.ticket.create(',
    'Foreign key constraint violated: `Ticket_clientId_fkey (index)`',
  ].join('\n');
  testApp.post('/tickets', (_req: Request, _res: Response, next: NextFunction) => {
    const err = Object.assign(new Error(prismaMessage), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2003',
    });
    next(err);
  });
  testApp.use(errorMiddleware);

  it('redacts tokens in the response body', async () => {
    await request(testApp).post('/login').send({ email: 'a@b.com', password: 'x' });

    const line = await httpLine();
    expect(JSON.parse(line.http.response.body?.content as string)).toEqual({
      accessToken: REDACTED,
      refreshToken: REDACTED,
      user: { id: 1, email: 'a@b.com' },
    });
    expect(line.http.response.body?.bytes).toBeGreaterThan(0);
  });

  it('puts the cause of a 500 on the http_request line', async () => {
    await request(testApp).post('/tickets').send({ clientId: 'missing', title: 'Printer' });

    const { fields: line, message } = await httpCall();
    expect(line.http.response.status_code).toBe(500);
    expect(line.error).toMatchObject({
      type: 'PrismaClientKnownRequestError',
      message: prismaMessage,
      code: 'P2003',
    });
    expect(message).toBe(
      [
        'POST /tickets 500 · PrismaClientKnownRequestError (P2003): Foreign key constraint violated: `Ticket_clientId_fkey (index)`',
        'request: {"clientId":"missing","title":"Printer"}',
        'response: {"message":"Internal server error"}',
      ].join('\n'),
    );
    expect(loggedCalls().map((call) => call.message)).toContain(
      'Unexpected error on POST /tickets: PrismaClientKnownRequestError (P2003): Foreign key constraint violated: `Ticket_clientId_fkey (index)`',
    );
    expect(line.error?.stack_trace).toBeTruthy();
    expect(JSON.parse(line.http.request.body?.content as string)).toEqual({
      clientId: 'missing',
      title: 'Printer',
    });
  });
});
