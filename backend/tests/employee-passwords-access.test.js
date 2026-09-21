const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const sequelize = require('../config/database');
const User = require('../models/User');

let app;
let server;
let baseUrl;

function startTestServer() {
  return new Promise((resolve, reject) => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/auth'));
    app.use('/api/admin', require('../routes/admin'));
    app.use('/api/users', require('../routes/users'));

    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
    server.on('error', reject);
  });
}

function stopTestServer() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

async function apiRequest(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: Employee Passwords & Login Activity Tracker');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  await startTestServer();

  try {
    // 1. Find or create an Admin user
    let admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      // Look for operational_manager or hr
      const anyUser = await User.findOne();
      if (anyUser) {
        admin = await User.create({
          name: 'System Administrator',
          email: 'admin.test@altrium.com',
          password: anyUser.password,
          plain_password: 'Password12345!',
          role: 'admin',
          is_active: true
        });
      }
    }

    const adminToken = jwt.sign(
      { id: admin.id, role: 'admin', email: admin.email, name: admin.name },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );

    // Test 1: Admin GET /api/admin/passwords
    console.log('\n--- 1. Testing GET /api/admin/passwords ---');
    const passwordsRes = await apiRequest('/api/admin/passwords', { token: adminToken });
    assert(passwordsRes.status === 200, 'Admin can fetch passwords and access log', `Status: ${passwordsRes.status}`);
    assert(Array.isArray(passwordsRes.data?.members), 'Returns members array');
    assert(passwordsRes.data?.stats !== undefined, 'Returns KPI stats');
    assert(typeof passwordsRes.data?.stats?.total === 'number', 'Stats total is a number');
    assert(typeof passwordsRes.data?.stats?.activeLogins === 'number', 'Stats activeLogins is a number');
    assert(typeof passwordsRes.data?.stats?.neverLoggedIn === 'number', 'Stats neverLoggedIn is a number');

    const firstMember = passwordsRes.data?.members?.[0];
    assert(firstMember !== undefined, 'At least one member in database');
    assert(firstMember?.plain_password !== undefined, 'plain_password field is exposed to admin');
    assert(firstMember?.login_count !== undefined, 'login_count field is returned');

    // Test 2: Non-admin access denied
    console.log('\n--- 2. Testing Access Control Guard ---');
    const employeeUser = await User.findOne({ where: { role: 'employee' } });
    if (employeeUser) {
      const empToken = jwt.sign(
        { id: employeeUser.id, role: 'employee', email: employeeUser.email, name: employeeUser.name },
        process.env.JWT_SECRET || 'testsecret',
        { expiresIn: '1h' }
      );
      const empForbidden = await apiRequest('/api/admin/passwords', { token: empToken });
      assert(empForbidden.status === 403, 'Employees are forbidden from accessing admin passwords API');
    }

    // Test 3: Login tracking increment
    console.log('\n--- 3. Testing Login Count & Timestamp Tracking ---');
    if (employeeUser) {
      const initialCount = employeeUser.login_count || 0;
      const empPassword = employeeUser.plain_password || '12345678';

      const loginRes = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: employeeUser.email, password: empPassword }
      });

      assert(loginRes.status === 200, 'Employee login succeeds', `Status: ${loginRes.status}`);

      // Verify in DB that login_count increased by 1 and last_login_at is updated
      const updatedEmp = await User.findByPk(employeeUser.id);
      assert(updatedEmp.login_count === initialCount + 1, 'Employee login_count incremented by 1', `Expected: ${initialCount + 1}, Got: ${updatedEmp.login_count}`);
      assert(updatedEmp.last_login_at !== null, 'Employee last_login_at timestamp is populated');
    }

    // Test 4: Password Reset by Admin
    console.log('\n--- 4. Testing Admin Password Reset ---');
    if (employeeUser) {
      const newTestPassword = 'NewSecretPassword2026!';
      const resetRes = await apiRequest(`/api/admin/members/${employeeUser.id}/reset-password`, {
        method: 'PATCH',
        token: adminToken,
        body: { password: newTestPassword }
      });

      assert(resetRes.status === 200, 'Admin reset-password succeeds');
      assert(resetRes.data?.plain_password === newTestPassword, 'Returns updated plain_password');

      // Verify DB
      const refreshedEmp = await User.findByPk(employeeUser.id);
      assert(refreshedEmp.plain_password === newTestPassword, 'Database plain_password matches new password');

      // Verify employee can log in with new password
      const reLoginRes = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: employeeUser.email, password: newTestPassword }
      });
      assert(reLoginRes.status === 200, 'Employee can log in with new reset password');

      // Restore default password
      await apiRequest(`/api/admin/members/${employeeUser.id}/reset-password`, {
        method: 'PATCH',
        token: adminToken,
        body: { password: '12345678' }
      });
    }

    // Test 5: Filter by Login Activity Status
    console.log('\n--- 5. Testing Login Activity Filtering ---');
    const activeFilterRes = await apiRequest('/api/admin/passwords?login_status=active', { token: adminToken });
    assert(activeFilterRes.status === 200, 'Filter login_status=active works');
    const allActive = activeFilterRes.data.members.every(m => m.login_count > 0);
    assert(allActive, 'All members returned by active filter have login_count > 0');

    const neverFilterRes = await apiRequest('/api/admin/passwords?login_status=never', { token: adminToken });
    assert(neverFilterRes.status === 200, 'Filter login_status=never works');
    const allNever = neverFilterRes.data.members.every(m => m.login_count === 0);
    assert(allNever, 'All members returned by never filter have login_count === 0');

    console.log('\n================================================================');
    console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await stopTestServer();
  }
}

runTests();
