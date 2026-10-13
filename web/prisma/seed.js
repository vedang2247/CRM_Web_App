const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CRM database...');

  // 1. Team Members
  const teamMembers = [
    { name: 'Vedang Sharma', email: 'vedang@crm.internal' },
    { name: 'Priya Mehta', email: 'priya@crm.internal' },
    { name: 'Ravi Kumar', email: 'ravi@crm.internal' },
  ];

  for (const member of teamMembers) {
    await prisma.teamMember.upsert({
      where: { email: member.email },
      update: { name: member.name },
      create: member,
    });
  }

  // 2. Clients
  const clients = [
    { name: 'Ananya Iyer', phone: '919876543210', email: 'ananya@client.com', company: null },
    { name: 'Suresh Gupta', phone: '919123456789', email: 'suresh@biz.in', company: null },
    { name: 'TechCorp Ltd', phone: null, email: 'contact@techcorp.io', company: 'TechCorp' },
    { name: 'Nisha Reddy', phone: '917890123456', email: 'nisha@example.com', company: null },
  ];

  for (const client of clients) {
    await prisma.client.upsert({
      where: { email: client.email },
      update: { name: client.name, phone: client.phone, company: client.company },
      create: client,
    });
  }

  // 3. Email Templates
  const templates = [
    {
      name: 'Request Documents',
      subject: '[{{task.code}}] Documents Required — {{task.title}}',
      body: 'Dear {{client.name}},\n\nWe need the following documents for {{task.title}}...\n\nBest regards,\nSupport Team',
    },
    {
      name: 'Clarification Needed',
      subject: '[{{task.code}}] Clarification Required',
      body: 'Dear {{client.name}},\n\nWe need clarification regarding {{task.title}}...\n\nBest regards,\nSupport Team',
    },
    {
      name: 'Status Update',
      subject: '[{{task.code}}] Status Update — {{task.title}}',
      body: 'Dear {{client.name}},\n\nHere is an update on {{task.title}} (due {{task.dueDate}})...\n\nBest regards,\nSupport Team',
    },
    {
      name: 'Follow Up',
      subject: '[{{task.code}}] Following Up on {{task.title}}',
      body: 'Dear {{client.name}},\n\nJust following up on {{task.title}}...\n\nBest regards,\nSupport Team',
    },
  ];

  for (const template of templates) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { name: template.name },
    });
    if (existing) {
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: template,
      });
    } else {
      await prisma.emailTemplate.create({
        data: template,
      });
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
