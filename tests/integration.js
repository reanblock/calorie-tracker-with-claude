#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const DATA_FILE = path.join(__dirname, '..', 'data.json');

let passed = 0;
let failed = 0;
const failures = [];

function pass(name) {
  console.log(`PASS: ${name}`);
  passed++;
}

function fail(name, expected, got) {
  const msg = `FAIL: ${name} — Expected ${expected}, got ${got}`;
  console.log(msg);
  failures.push(name);
  failed++;
}

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {},
    };

    let bodyStr;
    if (body !== undefined) {
      bodyStr = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, body: parsed, raw: data });
      });
    });

    req.on('error', reject);

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function resetData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ entries: {} }), 'utf8');
}

async function runTests() {
  console.log('Starting integration tests...\n');

  // ============================================================
  // HAPPY PATHS
  // ============================================================
  console.log('--- Happy Paths ---');

  // Reset to clean state
  resetData();

  // Test 1: Add entry
  let res = await request('POST', '/api/entries', { name: 'Apple', calories: 95 });
  const t1ok = res.status === 201 && res.body && res.body.id && res.body.name === 'Apple' && res.body.calories === 95 && res.body.timestamp;
  if (t1ok) pass('1. Add entry: POST Apple 95 cal → 201 with id/name/calories/timestamp');
  else fail('1. Add entry: POST Apple 95 cal → 201 with id/name/calories/timestamp', '201 with entry fields', `status=${res.status} body=${JSON.stringify(res.body)}`);
  const firstEntryId = res.body && res.body.id;

  // Test 2: List entries
  res = await request('GET', '/api/entries');
  const t2ok = res.status === 200 && Array.isArray(res.body) && res.body.length === 1 && res.body[0].name === 'Apple';
  if (t2ok) pass('2. List entries: GET /api/entries → 200, array with Apple');
  else fail('2. List entries: GET /api/entries → 200, array with Apple', '200, [{Apple}]', `status=${res.status} body=${JSON.stringify(res.body)}`);

  // Test 3: Get total
  res = await request('GET', '/api/total');
  const t3ok = res.status === 200 && res.body && res.body.total === 95;
  if (t3ok) pass('3. Get total: GET /api/total → {"total":95}');
  else fail('3. Get total: GET /api/total → {"total":95}', '{"total":95}', JSON.stringify(res.body));

  // Test 4: Add second entry
  res = await request('POST', '/api/entries', { name: 'Sandwich', calories: 450 });
  const t4ok = res.status === 201 && res.body && res.body.name === 'Sandwich';
  if (t4ok) pass('4. Add second entry: POST Sandwich 450 cal → 201');
  else fail('4. Add second entry: POST Sandwich 450 cal → 201', '201', `status=${res.status}`);

  // Test 5: Total after two entries
  res = await request('GET', '/api/total');
  const t5ok = res.status === 200 && res.body && res.body.total === 545;
  if (t5ok) pass('5. Total after two entries: GET /api/total → {"total":545}');
  else fail('5. Total after two entries: GET /api/total → {"total":545}', '{"total":545}', JSON.stringify(res.body));

  // Test 6: Delete single entry (first one - Apple)
  if (firstEntryId) {
    res = await request('DELETE', `/api/entries/${firstEntryId}`);
    const t6ok = res.status === 204;
    if (t6ok) pass('6. Delete single entry: DELETE /api/entries/:id → 204');
    else fail('6. Delete single entry: DELETE /api/entries/:id → 204', '204', `status=${res.status}`);
  } else {
    fail('6. Delete single entry: DELETE /api/entries/:id → 204', '204', 'no id from test 1');
  }

  // Test 7: List after delete
  res = await request('GET', '/api/entries');
  const t7ok = res.status === 200 && Array.isArray(res.body) && res.body.length === 1 && res.body[0].name === 'Sandwich';
  if (t7ok) pass('7. List after delete: GET /api/entries → [Sandwich only]');
  else fail('7. List after delete: GET /api/entries → [Sandwich only]', '[Sandwich]', JSON.stringify(res.body));

  // Test 8: Total after delete
  res = await request('GET', '/api/total');
  const t8ok = res.status === 200 && res.body && res.body.total === 450;
  if (t8ok) pass('8. Total after delete: GET /api/total → {"total":450}');
  else fail('8. Total after delete: GET /api/total → {"total":450}', '{"total":450}', JSON.stringify(res.body));

  // Test 9: Clear day
  res = await request('DELETE', '/api/entries');
  const t9ok = res.status === 204;
  if (t9ok) pass('9. Clear day: DELETE /api/entries → 204');
  else fail('9. Clear day: DELETE /api/entries → 204', '204', `status=${res.status}`);

  // Test 10: List after clear
  res = await request('GET', '/api/entries');
  const t10ok = res.status === 200 && Array.isArray(res.body) && res.body.length === 0;
  if (t10ok) pass('10. List after clear: GET /api/entries → []');
  else fail('10. List after clear: GET /api/entries → []', '[]', JSON.stringify(res.body));

  // Test 11: Total after clear
  res = await request('GET', '/api/total');
  const t11ok = res.status === 200 && res.body && res.body.total === 0;
  if (t11ok) pass('11. Total after clear: GET /api/total → {"total":0}');
  else fail('11. Total after clear: GET /api/total → {"total":0}', '{"total":0}', JSON.stringify(res.body));

  // ============================================================
  // EDGE CASES
  // ============================================================
  console.log('\n--- Edge Cases ---');

  // Test 12: Zero calories
  res = await request('POST', '/api/entries', { name: 'Water', calories: 0 });
  const t12ok = res.status === 400;
  if (t12ok) pass('12. Zero calories: POST {calories:0} → 400');
  else fail('12. Zero calories: POST {calories:0} → 400', '400', `status=${res.status}`);

  // Test 13: Large calorie count
  res = await request('POST', '/api/entries', { name: 'Feast', calories: 9999 });
  const t13ok = res.status === 201;
  if (t13ok) pass('13. Large calorie count: POST {calories:9999} → 201');
  else fail('13. Large calorie count: POST {calories:9999} → 201', '201', `status=${res.status}`);

  // Test 14: Special characters in name
  res = await request('POST', '/api/entries', { name: 'Mac & Cheese (large)', calories: 800 });
  const t14ok = res.status === 201 && res.body && res.body.name === 'Mac & Cheese (large)';
  if (t14ok) pass('14. Special characters in name: POST {name:"Mac & Cheese (large)"} → 201');
  else fail('14. Special characters in name: POST {name:"Mac & Cheese (large)"} → 201', '201', `status=${res.status} body=${JSON.stringify(res.body)}`);

  // Test 15: Delete nonexistent entry
  res = await request('DELETE', '/api/entries/nonexistent-uuid');
  const t15ok = res.status === 404;
  if (t15ok) pass('15. Delete nonexistent entry: DELETE /api/entries/nonexistent-uuid → 404');
  else fail('15. Delete nonexistent entry: DELETE /api/entries/nonexistent-uuid → 404', '404', `status=${res.status}`);

  // Test 16: Get entries for empty date
  res = await request('GET', '/api/entries?date=2020-01-01');
  const t16ok = res.status === 200 && Array.isArray(res.body) && res.body.length === 0;
  if (t16ok) pass('16. Get entries for empty date: GET /api/entries?date=2020-01-01 → 200, []');
  else fail('16. Get entries for empty date: GET /api/entries?date=2020-01-01 → 200, []', '200, []', `status=${res.status} body=${JSON.stringify(res.body)}`);

  // Test 17: Clear empty day
  res = await request('DELETE', '/api/entries?date=2020-01-01');
  const t17ok = res.status === 204;
  if (t17ok) pass('17. Clear empty day: DELETE /api/entries?date=2020-01-01 → 204');
  else fail('17. Clear empty day: DELETE /api/entries?date=2020-01-01 → 204', '204', `status=${res.status}`);

  // ============================================================
  // FAILURE SCENARIOS
  // ============================================================
  console.log('\n--- Failure Scenarios ---');

  // Test 18: Missing name
  res = await request('POST', '/api/entries', { calories: 100 });
  const t18ok = res.status === 400;
  if (t18ok) pass('18. Missing name: POST {calories:100} → 400');
  else fail('18. Missing name: POST {calories:100} → 400', '400', `status=${res.status}`);

  // Test 19: Missing calories
  res = await request('POST', '/api/entries', { name: 'Test' });
  const t19ok = res.status === 400;
  if (t19ok) pass('19. Missing calories: POST {name:"Test"} → 400');
  else fail('19. Missing calories: POST {name:"Test"} → 400', '400', `status=${res.status}`);

  // Test 20: Negative calories
  res = await request('POST', '/api/entries', { name: 'Test', calories: -50 });
  const t20ok = res.status === 400;
  if (t20ok) pass('20. Negative calories: POST {calories:-50} → 400');
  else fail('20. Negative calories: POST {calories:-50} → 400', '400', `status=${res.status}`);

  // Test 21: Non-numeric calories
  res = await request('POST', '/api/entries', { name: 'Test', calories: 'abc' });
  const t21ok = res.status === 400;
  if (t21ok) pass('21. Non-numeric calories: POST {calories:"abc"} → 400');
  else fail('21. Non-numeric calories: POST {calories:"abc"} → 400', '400', `status=${res.status}`);

  // Test 22: Empty name string
  res = await request('POST', '/api/entries', { name: '', calories: 100 });
  const t22ok = res.status === 400;
  if (t22ok) pass('22. Empty name string: POST {name:""} → 400');
  else fail('22. Empty name string: POST {name:""} → 400', '400', `status=${res.status}`);

  // Test 23: Whitespace-only name
  res = await request('POST', '/api/entries', { name: '   ', calories: 100 });
  const t23ok = res.status === 400;
  if (t23ok) pass('23. Whitespace-only name: POST {name:"   "} → 400');
  else fail('23. Whitespace-only name: POST {name:"   "} → 400', '400', `status=${res.status}`);

  // ============================================================
  // UI FILE VALIDATION
  // ============================================================
  console.log('\n--- UI File Validation ---');

  // Test 24: HTML serves
  res = await request('GET', '/');
  const t24ok = res.status === 200 && typeof res.raw === 'string' && res.raw.includes('Calorie Tracker');
  if (t24ok) pass('24. HTML serves: GET / → 200, contains "Calorie Tracker"');
  else fail('24. HTML serves: GET / → 200, contains "Calorie Tracker"', '200 with "Calorie Tracker"', `status=${res.status} contains=${res.raw && res.raw.includes('Calorie Tracker')}`);

  // Test 25: CSS serves
  res = await request('GET', '/style.css');
  const t25ok = res.status === 200 && typeof res.raw === 'string' && res.raw.length > 0;
  if (t25ok) pass('25. CSS serves: GET /style.css → 200, contains CSS content');
  else fail('25. CSS serves: GET /style.css → 200, contains CSS content', '200 with CSS', `status=${res.status} length=${res.raw && res.raw.length}`);

  // Test 26: JS serves
  res = await request('GET', '/app.js');
  const t26ok = res.status === 200 && typeof res.raw === 'string' && res.raw.length > 0;
  if (t26ok) pass('26. JS serves: GET /app.js → 200, contains JavaScript content');
  else fail('26. JS serves: GET /app.js → 200, contains JavaScript content', '200 with JS', `status=${res.status} length=${res.raw && res.raw.length}`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log(`  - ${f}`));
  }

  // Reset data after tests
  resetData();

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(2);
});
