'use strict';

/**
 * Unit tests for core utility functions in utils.js.
 * Uses Node's built-in test runner (node:test) — no external dependencies.
 *
 * Run with:  npm test
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');

const { getTodayDate, sendJSON, parseBody } = require('../utils');

// ─── getTodayDate ──────────────────────────────────────────────────────────────

test('getTodayDate returns a string in YYYY-MM-DD format', () => {
  const result = getTodayDate();
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test('getTodayDate matches the actual current date', () => {
  const now = new Date();
  const expected = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  assert.equal(getTodayDate(), expected);
});

// ─── sendJSON ─────────────────────────────────────────────────────────────────

test('sendJSON writes the correct status code and JSON body', () => {
  let capturedStatus;
  let capturedHeaders = {};
  let capturedBody;

  const res = {
    writeHead(code, headers) {
      capturedStatus = code;
      Object.assign(capturedHeaders, headers);
    },
    end(data) {
      capturedBody = data;
    },
  };

  sendJSON(res, 200, { total: 42 });

  assert.equal(capturedStatus, 200);
  assert.equal(capturedHeaders['Content-Type'], 'application/json');
  assert.equal(capturedBody, JSON.stringify({ total: 42 }));
});

test('sendJSON sets Content-Length to the exact byte length of the payload', () => {
  let capturedHeaders = {};
  const res = {
    writeHead(_, headers) { Object.assign(capturedHeaders, headers); },
    end() {},
  };

  const body = { error: 'Not found' };
  sendJSON(res, 404, body);

  assert.equal(
    capturedHeaders['Content-Length'],
    Buffer.byteLength(JSON.stringify(body))
  );
});

// ─── parseBody ────────────────────────────────────────────────────────────────

test('parseBody resolves with the parsed JSON object', async () => {
  const req = new EventEmitter();
  const promise = parseBody(req);

  req.emit('data', '{"name":"Apple","calories":95}');
  req.emit('end');

  const result = await promise;
  assert.deepEqual(result, { name: 'Apple', calories: 95 });
});

test('parseBody resolves with an empty object when the body is empty', async () => {
  const req = new EventEmitter();
  const promise = parseBody(req);

  req.emit('end');

  const result = await promise;
  assert.deepEqual(result, {});
});

test('parseBody rejects with "Invalid JSON" on malformed input', async () => {
  const req = new EventEmitter();
  const promise = parseBody(req);

  req.emit('data', 'this is not json');
  req.emit('end');

  await assert.rejects(promise, /Invalid JSON/);
});

test('parseBody rejects when the request emits an error', async () => {
  const req = new EventEmitter();
  const promise = parseBody(req);

  req.emit('error', new Error('socket hang up'));

  await assert.rejects(promise, /socket hang up/);
});
