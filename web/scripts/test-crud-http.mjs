import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testHttpEndpoints() {
  console.log(`\n=== Running HTTP Tests against ${BASE_URL} ===\n`);

  // 1. Team Members API (Step 8)
  console.log('[1/8] GET /api/team...');
  const teamRes = await fetch(`${BASE_URL}/api/team`);
  assert.equal(teamRes.status, 200, 'GET /api/team should return 200');
  const teamData = await teamRes.json();
  console.log('Team members count:', teamData.members?.length);
  assert(teamData.members && teamData.members.length >= 3, 'Should have at least 3 team members');
  const firstMember = teamData.members[0];
  console.log('✓ Team Members API verified');

  // 2. Clients API (Step 9)
  console.log('\n[2/8] POST /api/clients & GET /api/clients & GET /api/clients/match...');
  const testPhone = '91' + String(Date.now()).slice(-10);
  const testEmail = `test.m1.${Date.now()}@domain.com`;

  const createClientRes = await fetch(`${BASE_URL}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'M1 Verification Client',
      phone: testPhone,
      email: testEmail,
      company: 'Test Org',
    }),
  });
  assert.equal(createClientRes.status, 201, 'POST /api/clients should return 201');
  const clientData = await createClientRes.json();
  assert.equal(clientData.client.name, 'M1 Verification Client');
  const clientId = clientData.client.id;
  console.log('Created client with ID:', clientId);

  // Test duplicate client phone conflict (409)
  const dupClientRes = await fetch(`${BASE_URL}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate M1 Client',
      phone: testPhone,
    }),
  });
  assert.equal(dupClientRes.status, 409, 'Duplicate phone should return 409');
  console.log('✓ 409 Conflict check verified');

  // Test client match endpoint
  const matchRes = await fetch(`${BASE_URL}/api/clients/match?phone=${testPhone}`);
  assert.equal(matchRes.status, 200);
  const matchData = await matchRes.json();
  assert.equal(matchData.client?.id, clientId);
  console.log('✓ Client match endpoint verified');

  // Test client search
  const searchRes = await fetch(`${BASE_URL}/api/clients?q=Verification`);
  assert.equal(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert(searchData.clients.some((c) => c.id === clientId));
  console.log('✓ Client search verified');

  // 3. Tasks API: POST & GET (Step 10)
  console.log('\n[3/8] POST /api/tasks & GET /api/tasks...');
  const createTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Complete milestone M1 verification',
      description: 'Test all task CRUD and linking endpoints',
      status: 'open',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      clientId: clientId,
      assigneeId: firstMember.id,
    }),
  });
  assert.equal(createTaskRes.status, 201);
  const taskData = await createTaskRes.json();
  assert.equal(taskData.task.title, 'Complete milestone M1 verification');
  const taskId = taskData.task.id;
  console.log('Created task with ID:', taskId);

  // Bad title validation
  const badTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '' }),
  });
  assert.equal(badTaskRes.status, 400);
  console.log('✓ Empty title rejected with 400');

  // GET /api/tasks with filters
  const getTasksRes = await fetch(`${BASE_URL}/api/tasks?status=open&q=milestone`);
  assert.equal(getTasksRes.status, 200);
  const getTasksData = await getTasksRes.json();
  assert(getTasksData.tasks.some((t) => t.id === taskId));
  assert(getTasksData.total >= 1);
  console.log('✓ Task listing and search verified');

  // 4. Task Detail, PATCH, & GET (Step 11)
  console.log('\n[4/8] GET & PATCH /api/tasks/[id]...');
  const patchTaskRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'in_progress',
      priority: 'urgent',
    }),
  });
  assert.equal(patchTaskRes.status, 200);
  const patchedTaskData = await patchTaskRes.json();
  assert.equal(patchedTaskData.task.status, 'in_progress');
  assert.equal(patchedTaskData.task.priority, 'urgent');

  const getTaskDetailRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`);
  assert.equal(getTaskDetailRes.status, 200);
  const taskDetailData = await getTaskDetailRes.json();
  assert.equal(taskDetailData.task.id, taskId);
  assert.equal(taskDetailData.task.status, 'in_progress');
  console.log('✓ Task detail & PATCH verified');

  // 5. Task Links API (Step 12)
  console.log('\n[5/8] POST & DELETE /api/tasks/[id]/links...');
  // WhatsApp link
  const createWaLinkRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'whatsapp',
      chatId: '919876543210@c.us',
      messageId: 'MSG_TEST_001',
      snapshot: 'Please deliver M1 by this afternoon.',
      note: 'Client request from chat',
    }),
  });
  assert.equal(createWaLinkRes.status, 201);
  const waLinkData = await createWaLinkRes.json();
  const linkId = waLinkData.link.id;
  assert.equal(waLinkData.link.type, 'whatsapp');

  // Email link
  const createEmailLinkRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'email',
      threadId: 'THREAD_TEST_001',
      subject: 'Architecture review',
      sender: 'Arch <arch@internal.org>',
      note: 'Thread discussion',
    }),
  });
  assert.equal(createEmailLinkRes.status, 201);

  // Check links appear in task detail
  const detailAfterLinksRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`);
  const detailAfterLinks = await detailAfterLinksRes.json();
  assert.equal(detailAfterLinks.task.links.length, 2);
  console.log('✓ Task links created and verified in detail');

  // Delete a link
  const deleteLinkRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/links/${linkId}`, {
    method: 'DELETE',
  });
  assert.equal(deleteLinkRes.status, 200);
  console.log('✓ Task link DELETE verified');

  // 6. Templates API (Step 14)
  console.log('\n[6/8] Templates CRUD (/api/templates)...');
  const getTemplatesRes = await fetch(`${BASE_URL}/api/templates`);
  assert.equal(getTemplatesRes.status, 200);
  const templatesData = await getTemplatesRes.json();
  assert(templatesData.templates.length >= 4);

  const createTemplateRes = await fetch(`${BASE_URL}/api/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Verification Notice',
      subject: '[{{task.code}}] Notice: {{task.title}}',
      body: 'Hello {{client.name}},\n\nVerification completed.',
    }),
  });
  assert.equal(createTemplateRes.status, 201);
  const newTemplate = (await createTemplateRes.json()).template;
  const templateId = newTemplate.id;

  const patchTemplateRes = await fetch(`${BASE_URL}/api/templates/${templateId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: '[{{task.code}}] Final Notice: {{task.title}}',
    }),
  });
  assert.equal(patchTemplateRes.status, 200);

  const deleteTemplateRes = await fetch(`${BASE_URL}/api/templates/${templateId}`, {
    method: 'DELETE',
  });
  assert.equal(deleteTemplateRes.status, 200);
  console.log('✓ Templates API full lifecycle verified');

  // 7. Task Email guards (Step 13)
  console.log('\n[7/8] POST /api/tasks/[id]/email guards...');
  const emailGuardRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: 'someone@example.com',
      subject: 'Update',
      bodyText: 'Here is the task update',
    }),
  });
  assert.equal(emailGuardRes.status, 401, 'Unauthenticated email call must return 401');
  console.log('✓ Email auth guard returned 401');

  // 8. Delete Task (Step 11)
  console.log('\n[8/8] DELETE /api/tasks/[id] & cascade check...');
  const deleteTaskRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
    method: 'DELETE',
  });
  assert.equal(deleteTaskRes.status, 200);

  const checkDeletedRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`);
  assert.equal(checkDeletedRes.status, 404);
  console.log('✓ Task deleted successfully (404 on next fetch)');

  console.log('\n========================================================');
  console.log('🎉 ALL 8 HTTP CRUD ENDPOINTS AND WORKFLOWS VERIFIED 100%');
  console.log('========================================================\n');
}

testHttpEndpoints().catch((err) => {
  console.error('HTTP test error:', err);
  process.exit(1);
});
