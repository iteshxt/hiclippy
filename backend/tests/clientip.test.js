import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getClientIp } from '../src/middleware/fingerprint.js';
import { connectDB, disconnectDB, clearDB } from './dbUtils.js';

/*
  Simulates production on Render: Cloudflare → Render's proxy → API.
  With TRUST_PROXY=1, req.ip is the last X-Forwarded-For entry, which on
  Render is the Cloudflare edge address. Here that "edge" is whatever we
  put in X-Forwarded-For; the visitor's real IP is in CF-Connecting-IP.
*/
const EDGE_A = '172.70.1.1';
const EDGE_B = '172.70.2.2';

const savedHeader = process.env.CLIENT_IP_HEADER;
const restoreHeader = () => {
  if (savedHeader === undefined) delete process.env.CLIENT_IP_HEADER;
  else process.env.CLIENT_IP_HEADER = savedHeader;
};

const save = (ua, headers) => {
  const req = request(app).post('/api/paste').set('User-Agent', ua);
  for (const [k, v] of Object.entries(headers)) req.set(k, v);
  return req.send({ content: 'ip test', contentType: 'text', duration: 1 });
};

const remove = (id, ua, headers) => {
  const req = request(app).delete(`/api/paste/${id}`).set('User-Agent', ua);
  for (const [k, v] of Object.entries(headers)) req.set(k, v);
  return req;
};

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  restoreHeader();
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

afterEach(restoreHeader);

describe('Client IP behind Cloudflare (CLIENT_IP_HEADER=cf-connecting-ip)', () => {
  beforeEach(() => { process.env.CLIENT_IP_HEADER = 'cf-connecting-ip'; });

  it('6.1 Same visitor through a different edge keeps the same fingerprint (can delete own clip)', async () => {
    const ua = 'test-ip-edge-change';
    const created = await save(ua, { 'CF-Connecting-IP': '203.0.113.10', 'X-Forwarded-For': EDGE_A });
    expect(created.status).toBe(201);

    const res = await remove(created.body.id, ua, { 'CF-Connecting-IP': '203.0.113.10', 'X-Forwarded-For': EDGE_B });
    expect(res.status).toBe(200);
  });

  it('6.2 Different visitors on the same edge get separate rate limits', async () => {
    const ua = 'test-ip-shared-edge';
    for (let i = 0; i < 5; i++) {
      const r = await save(ua, { 'CF-Connecting-IP': '203.0.113.20', 'X-Forwarded-For': EDGE_A });
      expect(r.status).toBe(201);
    }
    const blocked = await save(ua, { 'CF-Connecting-IP': '203.0.113.20', 'X-Forwarded-For': EDGE_B });
    expect(blocked.status).toBe(429);

    const otherVisitor = await save(ua, { 'CF-Connecting-IP': '203.0.113.21', 'X-Forwarded-For': EDGE_A });
    expect(otherVisitor.status).toBe(201);
  });

  it('6.3 Header missing or not a single IP falls back to req.ip', () => {
    const fakeReq = (headers) => ({
      ip: EDGE_A,
      get: (name) => headers[name.toLowerCase()],
    });
    expect(getClientIp(fakeReq({ 'cf-connecting-ip': '203.0.113.30' }))).toBe('203.0.113.30');
    expect(getClientIp(fakeReq({ 'cf-connecting-ip': ' 2001:db8::1 ' }))).toBe('2001:db8::1');
    expect(getClientIp(fakeReq({}))).toBe(EDGE_A);
    expect(getClientIp(fakeReq({ 'cf-connecting-ip': '203.0.113.30, 198.51.100.1' }))).toBe(EDGE_A);
    expect(getClientIp(fakeReq({ 'cf-connecting-ip': 'not-an-ip' }))).toBe(EDGE_A);
  });
});

describe('Client IP without CLIENT_IP_HEADER (local dev, Docker/nginx)', () => {
  beforeEach(() => { delete process.env.CLIENT_IP_HEADER; });

  it('6.4 A CF-Connecting-IP sent by the client is ignored (cannot dodge rate limits)', async () => {
    const ua = 'test-ip-spoof';
    for (let i = 0; i < 5; i++) {
      const r = await save(ua, { 'CF-Connecting-IP': `198.51.100.${i + 1}`, 'X-Forwarded-For': EDGE_A });
      expect(r.status).toBe(201);
    }
    const blocked = await save(ua, { 'CF-Connecting-IP': '198.51.100.99', 'X-Forwarded-For': EDGE_A });
    expect(blocked.status).toBe(429);
  });

  it('6.5 A spoofed CF-Connecting-IP cannot take over another visitor\'s clip', async () => {
    const ua = 'test-ip-spoof-delete';
    const created = await save(ua, { 'X-Forwarded-For': EDGE_A });
    expect(created.status).toBe(201);

    // Attacker on another IP claims to be the owner via the header.
    const res = await remove(created.body.id, ua, { 'CF-Connecting-IP': EDGE_A, 'X-Forwarded-For': EDGE_B });
    expect(res.status).toBe(404);
  });
});
