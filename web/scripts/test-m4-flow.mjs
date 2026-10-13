import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testMilestoneM4() {
  console.log(`\n=== Running Milestone M4 Verification Tests against ${BASE_URL} ===\n`);

  // 1. Check /api/chats/linked-tasks guards
  console.log('[1/5] Testing /api/chats/linked-tasks validation...');
  const guardRes = await fetch(`${BASE_URL}/api/chats/linked-tasks`);
  assert.equal(guardRes.status, 400, 'Missing chatId should return 400');
  const guardData = await guardRes.json();
  assert(guardData.error, 'Should have error message');
  console.log('✓ Validation guard verified (400 on missing chatId)');

  // 2. Client match by phone (Ananya Iyer seeded phone: 919876543210)
  console.log('\n[2/5] Testing client match by normalized phone (Step 24)...');
  const matchRes = await fetch(`${BASE_URL}/api/clients/match?phone=919876543210`);
  assert.equal(matchRes.status, 200);
  const matchData = await matchRes.json();
  assert(matchData.client, 'Seeded client Ananya Iyer should be found');
  assert.equal(matchData.client.name, 'Ananya Iyer');
  const matchedClientId = matchData.client.id;
  console.log(`✓ Client matched: "${matchData.client.name}" (ID: ${matchedClientId})`);

  // 3. Create task and link WhatsApp message (Convert to Task flow)
  console.log('\n[3/5] Testing Task creation + WhatsApp linking (Steps 24-25)...');
  const testChatId = '919876543210@c.us';
  const testMessageId = `MSG_WA_M4_${Date.now()}`;
  const testSnapshot = 'Please send over the updated project schedule when possible.';

  const createTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'M4 WhatsApp converted task',
      description: testSnapshot,
      status: 'open',
      priority: 'high',
      clientId: matchedClientId,
    }),
  });
  assert.equal(createTaskRes.status, 201, 'POST /api/tasks should return 201');
  const taskData = await createTaskRes.json();
  const taskId = taskData.task.id;
  console.log(`Created Task ID: ${taskId}`);

  const linkRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'whatsapp',
      chatId: testChatId,
      messageId: testMessageId,
      snapshot: testSnapshot,
      note: 'Converted from WhatsApp conversation',
    }),
  });
  assert.equal(linkRes.status, 201, 'POST /api/tasks/[id]/links should return 201');
  const linkData = await linkRes.json();
  assert.equal(linkData.link.type, 'whatsapp');
  assert.equal(linkData.link.chatId, testChatId);
  console.log('✓ WhatsApp message linked successfully to Task');

  // 4. Verify /api/chats/linked-tasks returns the linked task
  console.log('\n[4/5] Testing GET /api/chats/linked-tasks (Step 28)...');
  const linkedTasksRes = await fetch(
    `${BASE_URL}/api/chats/linked-tasks?chatId=${encodeURIComponent(testChatId)}`
  );
  assert.equal(linkedTasksRes.status, 200);
  const linkedTasksData = await linkedTasksRes.json();
  assert(linkedTasksData.count >= 1, 'Should have at least 1 linked task');
  const expectedCode = `TSK${String(taskId).padStart(4, '0')}`;
  assert(
    linkedTasksData.taskCodes.includes(expectedCode),
    `taskCodes should include ${expectedCode}`
  );
  console.log(`✓ Linked tasks for chatId returned count: ${linkedTasksData.count}`);
  console.log(`✓ Badges returned: [${linkedTasksData.taskCodes.join(', ')}]`);

  // 5. Verify task detail has the link with snapshot
  console.log('\n[5/5] Testing Task detail timeline verification (M3 + M4)...');
  const taskDetailRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`);
  assert.equal(taskDetailRes.status, 200);
  const taskDetail = await taskDetailRes.json();
  assert.equal(taskDetail.task.client?.name, 'Ananya Iyer');
  assert(taskDetail.task.links?.some((l) => l.messageId === testMessageId));
  console.log('✓ Task detail includes client association and WhatsApp link snapshot');

  console.log('\n============================================================');
  console.log('🎉 ALL MILESTONE M4 WORKFLOWS AND ENDPOINTS VERIFIED 100%');
  console.log('============================================================\n');
}

testMilestoneM4().catch((err) => {
  console.error('M4 Verification Error:', err);
  process.exit(1);
});
