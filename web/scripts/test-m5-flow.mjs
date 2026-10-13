import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testMilestoneM5() {
  console.log(`\n=== Running Milestone M5 Verification Tests against ${BASE_URL} ===\n`);

  // 1. Check /api/email/linked-tasks guards (Step 32)
  console.log('[1/6] Testing /api/email/linked-tasks parameter validation...');
  const guardRes = await fetch(`${BASE_URL}/api/email/linked-tasks`);
  assert.equal(guardRes.status, 400, 'Missing threadId parameter must return 400');
  const guardData = await guardRes.json();
  assert(guardData.error, 'Should contain error description');
  console.log('✓ Validation guard verified (400 returned on missing threadId)');

  // 2. Client match by email (Step 30)
  console.log('\n[2/6] Testing client match by email (Step 30)...');
  const testEmail = 'ananya@client.com';
  const matchRes = await fetch(`${BASE_URL}/api/clients/match?email=${encodeURIComponent(testEmail)}`);
  assert.equal(matchRes.status, 200);
  const matchData = await matchRes.json();
  assert(matchData.client, 'Seeded client with email ananya@client.com must be found');
  assert.equal(matchData.client.email, testEmail);
  const clientId = matchData.client.id;
  console.log(`✓ Client matched: "${matchData.client.name}" <${matchData.client.email}> (ID: ${clientId})`);

  // 3. Convert Email to Task flow simulation (Step 30)
  console.log('\n[3/6] Testing Convert Email to Task creation + linking (Step 30)...');
  const testThreadId = `THREAD_M5_${Date.now()}`;
  const testSubject = 'Urgent: GST Return Filing Query for TechCorp';
  const testSender = 'ananya@client.com';

  const createTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: testSubject,
      description: 'Customer requested assistance with invoice reconciliation.',
      status: 'open',
      priority: 'urgent',
      clientId: clientId,
    }),
  });
  assert.equal(createTaskRes.status, 201);
  const createdTask = (await createTaskRes.json()).task;
  const taskId = createdTask.id;
  console.log(`Created Task ID: ${taskId} (${createdTask.title})`);

  // Link initial email thread
  const linkRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'email',
      threadId: testThreadId,
      subject: testSubject,
      sender: testSender,
      note: 'Converted directly from email inbox thread',
    }),
  });
  assert.equal(linkRes.status, 201);
  const linkData = await linkRes.json();
  assert.equal(linkData.link.type, 'email');
  assert.equal(linkData.link.threadId, testThreadId);
  console.log('✓ Email thread linked to task successfully');

  // 4. Test /api/email/linked-tasks returns the task (Step 32)
  console.log('\n[4/6] Testing GET /api/email/linked-tasks returns link badge...');
  const linkedTasksRes = await fetch(
    `${BASE_URL}/api/email/linked-tasks?threadId=${encodeURIComponent(testThreadId)}`
  );
  assert.equal(linkedTasksRes.status, 200);
  const linkedTasksData = await linkedTasksRes.json();
  assert(linkedTasksData.count >= 1, 'Should have at least 1 linked task');
  const expectedCode = `TSK${String(taskId).padStart(4, '0')}`;
  assert(
    linkedTasksData.taskCodes.includes(expectedCode),
    `taskCodes must include ${expectedCode}`
  );
  console.log(`✓ Email thread linked-tasks count: ${linkedTasksData.count}`);
  console.log(`✓ Badges returned: [${linkedTasksData.taskCodes.join(', ')}]`);

  // 5. Test Link to Existing Task flow (Step 29)
  console.log('\n[5/6] Testing Link to Existing Task flow (Step 29)...');
  const secondThreadId = `THREAD_M5_FOLLOWUP_${Date.now()}`;
  const secondSubject = 'Follow-up regarding documents';

  const secondLinkRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'email',
      threadId: secondThreadId,
      subject: secondSubject,
      sender: 'suresh@biz.in',
      note: 'Attached supplemental thread to existing task',
    }),
  });
  assert.equal(secondLinkRes.status, 201);
  console.log('✓ Second email thread attached to existing task successfully');

  // 6. Verify task detail timeline aggregates all links (M3 + M5)
  console.log('\n[6/6] Verifying Task detail communication timeline (M3 + M5)...');
  const detailRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`);
  assert.equal(detailRes.status, 200);
  const detailData = await detailRes.json();
  assert.equal(detailData.task.client?.id, clientId);
  const emailLinks = detailData.task.links.filter((l) => l.type === 'email');
  assert.equal(emailLinks.length, 2, 'Task must contain both linked email threads');
  console.log('✓ Task detail timeline verified with multiple linked email communications');

  console.log('\n============================================================');
  console.log('🎉 ALL MILESTONE M5 WORKFLOWS AND ENDPOINTS VERIFIED 100%');
  console.log('============================================================\n');
}

testMilestoneM5().catch((err) => {
  console.error('M5 Verification Error:', err);
  process.exit(1);
});
