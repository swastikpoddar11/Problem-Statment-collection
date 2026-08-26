process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DATA = 'true';

import http from 'http';
import { app } from '../server.js';

let server;
let baseUrl;

async function startTestServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`🧪 Test server started on ${baseUrl}`);
      resolve();
    });
    server.on('error', reject);
  });
}

function stopTestServer() {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => {
      console.log('🧪 Test server stopped');
      resolve();
    });
  });
}

async function runTests() {
  console.log('\n--- 🚀 Running Automated API & Security Verification Suite ---\n');
  await startTestServer();

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    await test('Health check endpoint returns status online', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      const json = await res.json();
      if (res.status !== 200 || json.status !== 'online') {
        throw new Error(`Expected 200 online, got ${res.status}: ${JSON.stringify(json)}`);
      }
    });

    // 2. Search by Team Name
    await test('Phase 1: Search teams by partial team name', async () => {
      const res = await fetch(`${baseUrl}/api/teams/search?q=alpha`);
      const json = await res.json();
      if (!json.success || !json.data.length || json.data[0].teamId !== 'T101') {
        throw new Error(`Expected T101 in results, got ${JSON.stringify(json)}`);
      }
      // Ensure private fields like members or full sheet data are NOT in search suggestion
      if (json.data[0].members) {
        throw new Error('Security violation: Private member details leaked in search suggestions');
      }
    });

    // 3. Search by USN
    await test('Phase 1: Search teams by USN identifier', async () => {
      const res = await fetch(`${baseUrl}/api/teams/search?q=1RV21CS045`);
      const json = await res.json();
      if (!json.success || !json.data.length || json.data[0].teamId !== 'T101') {
        throw new Error(`Expected T101 for USN query, got ${JSON.stringify(json)}`);
      }
    });

    // 4. Retrieve Full Team Details
    await test('Phase 1: Retrieve complete locked team details by ID', async () => {
      const res = await fetch(`${baseUrl}/api/teams/T101`);
      const json = await res.json();
      if (!json.success || json.data.teamName !== 'Team Alpha' || !json.data.members) {
        throw new Error(`Expected full details for T101, got ${JSON.stringify(json)}`);
      }
    });

    // 5. Retrieve Themes
    await test('Phase 2: Retrieve unique list of active themes', async () => {
      const res = await fetch(`${baseUrl}/api/themes`);
      const json = await res.json();
      if (!json.success || !json.data.includes('AI & Automation') || !json.data.includes('Cybersecurity')) {
        throw new Error(`Expected themes array, got ${JSON.stringify(json)}`);
      }
    });

    // 6. Filter Problem Statements by Theme
    await test('Phase 2: Filter problem statements strictly by selected theme', async () => {
      const res = await fetch(`${baseUrl}/api/problem-statements?theme=${encodeURIComponent('AI & Automation')}`);
      const json = await res.json();
      if (!json.success || !json.data.length) {
        throw new Error(`Expected problem statements for AI & Automation, got ${JSON.stringify(json)}`);
      }
      const allMatch = json.data.every(ps => ps.theme === 'AI & Automation');
      if (!allMatch) {
        throw new Error('Found problem statements not matching the requested theme');
      }
    });

    // 7. Successful Submission
    await test('Phase 3: Submit valid problem statement for team T101', async () => {
      const res = await fetch(`${baseUrl}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: 'T101', psId: 'PS002' })
      });
      const json = await res.json();
      if (res.status !== 201 || !json.success || json.data.teamId !== 'T101' || json.data.psId !== 'PS002') {
        throw new Error(`Expected 201 Created, got ${res.status}: ${JSON.stringify(json)}`);
      }
    });

    // 8. Duplicate Submission Prevention
    await test('Phase 3: Duplicate submission for team T101 is rejected with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: 'T101', psId: 'PS003' })
      });
      const json = await res.json();
      if (res.status !== 409 || json.success !== false) {
        throw new Error(`Expected 409 Conflict, got ${res.status}: ${JSON.stringify(json)}`);
      }
    });

    // 9. Invalid Problem Statement Submission
    await test('Phase 3: Submission with non-existent PS ID is rejected with 404', async () => {
      const res = await fetch(`${baseUrl}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: 'T102', psId: 'PS999' })
      });
      const json = await res.json();
      if (res.status !== 404 || json.success !== false) {
        throw new Error(`Expected 404 Not Found, got ${res.status}: ${JSON.stringify(json)}`);
      }
    });

  } finally {
    await stopTestServer();
  }

  console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
