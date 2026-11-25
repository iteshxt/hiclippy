import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('../src/middleware/fingerprint.js', () => ({
  fingerprintMiddleware: (req, res, next) => { req.fingerprint = 'test-fingerprint'; next(); }
}));
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB, clearDB } from './dbUtils.js';
import { Paste } from '../src/models/Paste.js';

// Pin expiry config so results don't depend on the developer's .env.
// The route reads these on every request.
const savedEnv = {};
beforeAll(async () => {
  for (const [k, v] of Object.entries({ PASTE_DEFAULT_EXPIRY_MINUTES: '5', PASTE_MAX_EXPIRY_MINUTES: '10' })) {
    savedEnv[k] = process.env[k];
    process.env[k] = v;
  }
  await connectDB();
});

afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('POST /api/paste', () => {

  it('1.1 Should create a valid text paste', async () => {
    const res = await request(app)
      .post('/api/paste')
      .send({ content: 'hello', contentType: 'text', duration: '1' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('expiresAt');
    expect(res.body.expiryMinutes).toBe(1);
  });

  it('1.2 Should create a valid link paste', async () => {
    const res = await request(app)
      .post('/api/paste')
      .send({ content: 'https://google.com', contentType: 'link', duration: '5' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('1.3 Should create a valid image URL paste', async () => {
    const res = await request(app)
      .post('/api/paste')
      .send({ content: 'https://img.com/x.png', contentType: 'image', duration: '1' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('1.4 Should create a valid file upload', async () => {
    const res = await request(app)
      .post('/api/paste')
      .field('contentType', 'file')
      .field('duration', '1')
      .attach('file', Buffer.from('hello file'), 'test.txt');
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('1.5 Should return 400 when missing content AND file', async () => {
    const res = await request(app).post('/api/paste').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No content provided');
  });

  it('1.6 Should return 413 if file exceeds max size', async () => {
    // Generate a buffer larger than 10MB
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'a');
    const res = await request(app)
      .post('/api/paste')
      .field('contentType', 'file')
      .attach('file', largeBuffer, 'big.txt');
    
    expect(res.status).toBe(413);
  });

  it('1.7 Should clamp duration to max if exceeded', async () => {
    const res = await request(app)
      .post('/api/paste')
      .send({ content: 'x', duration: '9999' });
    
    expect(res.status).toBe(201);
    expect(res.body.expiryMinutes).toBe(10); // Since max is set to 10 in our env/fallback
  });

  it('1.8 Should default duration when omitted', async () => {
    const res = await request(app)
      .post('/api/paste')
      .send({ content: 'x', contentType: 'text' });
    
    expect(res.status).toBe(201);
    expect(res.body.expiryMinutes).toBe(5); // Default is 5
  });

  it('1.9 Should fallback duration on invalid input', async () => {
    const res = await request(app)
      .post('/api/paste')
      .send({ content: 'x', duration: 'abc' });
    
    expect(res.status).toBe(201);
    expect(res.body.expiryMinutes).toBe(5); // Default is 5
  });

  it('1.9b Should retry with a new code if the chosen one is taken at save time', async () => {
    await Paste.init(); // make sure the unique index on `id` exists
    await new Paste({
      id: '1234', content: 'existing', contentType: 'text', fileSize: 8,
      expiresAt: new Date(Date.now() + 60_000), fingerprint: 'other',
    }).save();

    // Simulate the race: the pre-check misses the existing paste once,
    // and the random generator picks 1234 first, then 5678.
    const findSpy = vi.spyOn(Paste, 'findOne').mockResolvedValueOnce(null);
    const randSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.1234).mockReturnValueOnce(0.5678);

    try {
      const res = await request(app)
        .post('/api/paste')
        .send({ content: 'new', contentType: 'text' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('5678');
      expect((await Paste.findOne({ id: '1234' })).content).toBe('existing');
    } finally {
      findSpy.mockRestore();
      randSpy.mockRestore();
    }
  });

  it('1.10 Should return exactly 4 digits id', async () => {
    const res = await request(app)
      .post('/api/paste')
      .send({ content: 'test', contentType: 'text' });
    
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^\d{4}$/);
  });

  it('1.11 Should return expiresAt in the future', async () => {
    const res = await request(app)
      .post('/api/paste')
      .send({ content: 'test', contentType: 'text' });
    
    expect(res.status).toBe(201);
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('1.12 Should detect mimeType for image uploads correctly', async () => {
    const res = await request(app)
      .post('/api/paste')
      .field('contentType', 'image')
      .attach('file', Buffer.from('fake image data'), 'test.png');
    
    expect(res.status).toBe(201);

    // Fetch it to verify it was saved as image/png
    const fetchRes = await request(app).get(`/api/paste/${res.body.id}`);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.contentType).toBe('image');
    expect(fetchRes.body.mimeType).toBe('image/png'); // Would be application/octet-stream if not overridden or if file was recognized
  });

});
