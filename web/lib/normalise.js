// web/lib/normalise.js

/** Strip @c.us / @g.us, +, spaces → raw digit string */
export function normalisePhone(raw = '') {
  return raw.replace(/@(c|g)\.us$/, '').replace(/[\s+\-()]/g, '');
}

/** Extract email address from "Name <email@x.com>" or bare email */
export function extractEmail(from = '') {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

/** Format task code from numeric id */
export function taskCode(id) {
  return 'TSK' + String(id).padStart(4, '0');
}

/** Replace template placeholders with task/client data */
export function renderTemplate(body = '', { client = {}, task = {} } = {}) {
  if (!body || typeof body !== 'string') return '';
  return body
    .replace(/\{\{client\.name\}\}/g, client?.name ?? '')
    .replace(/\{\{task\.code\}\}/g, task?.id ? taskCode(task.id) : '')
    .replace(/\{\{task\.title\}\}/g, task?.title ?? '')
    .replace(/\{\{task\.dueDate\}\}/g,
      task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'TBD');
}
