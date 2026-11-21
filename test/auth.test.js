import test from 'node:test';
import assert from 'node:assert';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyAdmin, verifyVendor, verifyCustomer } from '../middleware/verifyRole.js';
import { closeDB } from '../config/db.js';

test.after(async () => {
  await closeDB();
});

test('Auth Middleware — verifyToken rejects missing Authorization header', async () => {
  let statusCode = null;
  let responseBody = null;

  const req = { headers: {} };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    },
  };

  await verifyToken(req, res, () => {
    assert.fail('Should not call next() when header is missing');
  });

  assert.strictEqual(statusCode, 401);
  assert.strictEqual(responseBody?.success, false);
  assert.strictEqual(responseBody?.message, 'Unauthorized: Missing Authorization header');
});

test('Auth Middleware — verifyToken rejects malformed Bearer header', async () => {
  let statusCode = null;
  let responseBody = null;

  const req = { headers: { authorization: 'Basic 123456' } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    },
  };

  await verifyToken(req, res, () => {
    assert.fail('Should not call next() for malformed header');
  });

  assert.strictEqual(statusCode, 401);
  assert.strictEqual(responseBody?.success, false);
  assert.ok(responseBody?.message?.includes('Malformed Authorization header'));
});

test('Auth Middleware — verifyToken rejects invalid/tampered token', async () => {
  let statusCode = null;
  let responseBody = null;

  const req = { headers: { authorization: 'Bearer invalid.tampered.token.xyz' } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    },
  };

  await verifyToken(req, res, () => {
    assert.fail('Should not call next() for invalid token');
  });

  assert.strictEqual(statusCode, 401);
  assert.strictEqual(responseBody?.success, false);
});

test('Role Middleware — verifyAdmin blocks non-admin users with 403', () => {
  let statusCode = null;
  let responseBody = null;

  const req = { user: { role: 'customer' } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    },
  };

  verifyAdmin(req, res, () => {
    assert.fail('Customer should not pass verifyAdmin');
  });

  assert.strictEqual(statusCode, 403);
  assert.ok(responseBody?.message?.includes('Administrator privileges required'));
});

test('Role Middleware — verifyVendor blocks customer users with 403', () => {
  let statusCode = null;
  let responseBody = null;

  const req = { user: { role: 'customer' } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    },
  };

  verifyVendor(req, res, () => {
    assert.fail('Customer should not pass verifyVendor');
  });

  assert.strictEqual(statusCode, 403);
  assert.ok(responseBody?.message?.includes('Vendor (Restaurant) privileges required'));
});

test('Role Middleware — verifyCustomer blocks vendor users with 403', () => {
  let statusCode = null;
  let responseBody = null;

  const req = { user: { role: 'vendor' } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    },
  };

  verifyCustomer(req, res, () => {
    assert.fail('Vendor should not pass verifyCustomer');
  });

  assert.strictEqual(statusCode, 403);
  assert.ok(responseBody?.message?.includes('Customer privileges required'));
});
