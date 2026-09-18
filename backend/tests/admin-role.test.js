const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const sequelize = require('../config/database');
const User = require('../models/User');

// Helper to simulate express request/response against router handlers
const express = require('express');

let app;
let server;
let baseUrl;

function startTestServer() {
  return new Promise((resolve, reject) => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/auth'));
    app.use('/api/admin', require('../routes/admin'));
    app.use('/api/tasks', require('../routes/tasks'));
    app.use('/api/plans', require('../routes/plans'));
    app.use('/api/users', require('../routes/users'));
    app.use('/api/history', require('../routes/history'));

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

// Simple fetch wrapper
async function apiRequest(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json'
  };
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
  console.log('🚀 Running Operational Manager & Admin Role Separation Tests');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${extraInfo}`);
      failed++;
    }
  }

  try {
    await sequelize.authenticate();
    await startTestServer();

    // 1. Verify User 91 is Operational Manager (Anura Senaratne)
    const opsUser = await User.findByPk(91);
    assert(
      opsUser && opsUser.role === 'operational_manager' && opsUser.email === 'anura.company@altrium.com',
      'User 91 is Anura Senaratne with role operational_manager'
    );

    // 2. Verify Admin is a distinct account
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    assert(
      adminUser && adminUser.id !== 91 && adminUser.email === 'admin@altrium.com',
      `Admin is a separate account (ID ${adminUser?.id}: ${adminUser?.email})`
    );

    // 3. Generate Auth Tokens
    const adminToken = jwt.sign(
      { id: adminUser.id, role: adminUser.role, email: adminUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const opsToken = jwt.sign(
      { id: opsUser.id, role: opsUser.role, email: opsUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const empUser = await User.findByPk(14); // Avishka Wijesinghe (employee)
    const empToken = jwt.sign(
      { id: empUser.id, role: empUser.role, email: empUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const tmUser = await User.findByPk(4); // Sarah Fernando (team_manager)
    const tmToken = jwt.sign(
      { id: tmUser.id, role: tmUser.role, email: tmUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Test GET /api/admin/members with Admin Token
    const resMembers = await apiRequest('/api/admin/members', { token: adminToken });
    assert(resMembers.status === 200, 'Admin can fetch /api/admin/members');
    assert(Array.isArray(resMembers.data?.members) && resMembers.data.members.length >= 94, 'Admin receives organization members list');

    // 5. Test Operational Manager is forbidden from /api/admin/members
    const resForbiddenOps = await apiRequest('/api/admin/members', { token: opsToken });
    assert(resForbiddenOps.status === 403, 'Operational Manager is strictly forbidden (403) from /api/admin/members');

    // 6. Test Non-Admin roles forbidden from /api/admin/members
    const resForbiddenEmp = await apiRequest('/api/admin/members', { token: empToken });
    assert(resForbiddenEmp.status === 403, 'Employee is forbidden (403) from /api/admin/members');

    const resForbiddenTM = await apiRequest('/api/admin/members', { token: tmToken });
    assert(resForbiddenTM.status === 403, 'Team Manager is forbidden (403) from /api/admin/members');

    // 7. Test Admin forbidden from assigning reviews and plans
    const resAdminAssignSelf = await apiRequest('/api/tasks/assign-self', {
      method: 'POST',
      token: adminToken,
      body: { employeeIds: [14], quarter: 'Q3', year: 2026 }
    });
    assert(resAdminAssignSelf.status === 403, 'Admin is strictly forbidden (403) from assigning self reviews');

    const resAdminAssignPeer = await apiRequest('/api/tasks/assign-peer', {
      method: 'POST',
      token: adminToken,
      body: { peerType: 'manager_to_reports', department: 'IT', quarter: 'Q3', year: 2026 }
    });
    assert(resAdminAssignPeer.status === 403, 'Admin is strictly forbidden (403) from assigning peer reviews');

    const resAdminAssignPlan = await apiRequest('/api/plans', {
      method: 'POST',
      token: adminToken,
      body: { recipient_id: 14, type: 'PIP', title: 'Test PIP Assignment', description: 'Detailed instruction description for testing purposes', quarter: 'Q3', year: 2026 }
    });
    assert(resAdminAssignPlan.status === 403, 'Admin is strictly forbidden (403) from assigning PIP/PDP plans');

    // 8. Test Operational Manager CAN fetch eligible recipients for plans
    const resOpsEligible = await apiRequest('/api/plans/eligible-recipients', { token: opsToken });
    assert(resOpsEligible.status === 200, 'Operational Manager can fetch eligible recipients for plans');

    // 9. Test Admin Add Member validation (password length < 12 fails)
    const testEmail = `test.member.${Date.now()}@altrium.com`;
    const resShortPass = await apiRequest('/api/admin/members', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Short Pass User',
        email: testEmail,
        password: 'short',
        role: 'employee',
        department: 'IT',
        team: 'Software Development'
      }
    });
    assert(resShortPass.status === 400, 'Password under 12 characters is rejected with 400');

    // 10. Test Admin Add Member successfully (password >= 12 chars)
    const resAddSuccess = await apiRequest('/api/admin/members', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Auto Test Engineer',
        email: testEmail,
        password: 'TemporaryValidPassword2026!',
        role: 'employee',
        department: 'IT',
        team: 'Software Development',
        quarter_batch: 'Q3',
        manager_id: 4
      }
    });
    assert(resAddSuccess.status === 201, 'Admin can add a new member with 12+ char temporary password');
    const createdMemberId = resAddSuccess.data?.member?.id;
    assert(createdMemberId, 'Created member returns valid ID');

    // 11. Test Edit Member details & Role appointment
    const resEdit = await apiRequest(`/api/admin/members/${createdMemberId}`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        name: 'Auto Test Engineer Updated',
        quarter_batch: 'Q1'
      }
    });
    assert(resEdit.status === 200, 'Admin can edit member details');
    assert(resEdit.data?.member?.name === 'Auto Test Engineer Updated', 'Member name was updated');

    // 12. Test Reassignment Guard: Cannot modify role/dept of manager with active direct reports
    const resGuardCheck = await apiRequest(`/api/admin/members/4`, { // Sarah Fernando has active subordinates
      method: 'PATCH',
      token: adminToken,
      body: {
        role: 'employee',
        department: 'Finance'
      }
    });
    assert(resGuardCheck.status === 400, 'Reassignment guard prevents changing role/dept of manager with active reports');

    // 13. Test Soft Deactivate and Restore
    const resDeactivate = await apiRequest(`/api/admin/members/${createdMemberId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { is_active: false }
    });
    assert(resDeactivate.status === 200 && resDeactivate.data?.member?.is_active === false, 'Admin can soft-deactivate a member');

    // 14. Inactive member cannot log in
    const resLoginInactive = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: 'TemporaryValidPassword2026!' }
    });
    assert(resLoginInactive.status === 400, 'Deactivated member is rejected on login');

    // 15. Restore member
    const resRestore = await apiRequest(`/api/admin/members/${createdMemberId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { is_active: true }
    });
    assert(resRestore.status === 200 && resRestore.data?.member?.is_active === true, 'Admin can restore member access');

    // Clean up created test user
    if (createdMemberId) {
      await User.destroy({ where: { id: createdMemberId } });
      console.log('🧹 Cleaned up temporary test user');
    }

    console.log('\n================================================================');
    console.log(`Summary: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await stopTestServer();
  }
}

runTests();
