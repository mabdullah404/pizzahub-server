import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../index.js';
import { closeDB } from '../config/db.js';

test('GET / (Server Health Check)', async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    const data = await res.json();

    assert.strictEqual(res.status, 200, 'Health check should return status 200');
    assert.strictEqual(data?.status, 'ok', 'Status should be ok');
    assert.ok(data?.message?.includes('PizzaHub'), 'Message should mention PizzaHub');
  } finally {
    server.close();
    await closeDB();
  }
});
