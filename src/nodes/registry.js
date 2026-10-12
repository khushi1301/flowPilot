import {
  Webhook, CalendarClock, MousePointerClick, Globe, Mail, Braces,
  GitBranch, Repeat, Timer, UserCheck, CircleCheck, CircleX,
} from 'lucide-react';
import { interpolate, parseJSON } from '../utils/helpers';

export const CATEGORIES = {
  trigger: { label: 'Triggers', color: '#22d3ee' },
  action: { label: 'Actions', color: '#a855f7' },
  logic: { label: 'Logic', color: '#ec4899' },
  timing: { label: 'Timing', color: '#f59e0b' },
  human: { label: 'Human', color: '#34d399' },
  end: { label: 'End', color: '#94a3b8' },
};

const NEXT = [{ id: 'out', label: 'Next' }];
const UNIT_MS = { seconds: 1000, minutes: 60000, hours: 3600000 };

/**
 * Every node type is one object: its look, its config form (fields), its
 * validation (check) and its simulated behaviour (execute).
 * Add a new node by adding one entry here.
 */
export const NODE_DEFS = {};
const define = (kind, def) => {
  NODE_DEFS[kind] = { kind, inputs: def.category !== 'trigger', outputs: NEXT, ...def };
};

const payloadTrigger = async (c, ctx, h) => {
  const payload = parseJSON(c.payload, {});
  Object.assign(ctx.vars, payload);
  h.log('info', `Received payload with ${Object.keys(payload).length} field(s)`);
  await h.sleep(250);
  return { output: payload };
};
const checkPayload = (c) => {
  try { JSON.parse(c.payload || '{}'); return null; } catch { return 'Payload must be valid JSON'; }
};

define('webhook', {
  label: 'Webhook', category: 'trigger', icon: Webhook,
  description: 'Start when an HTTP request arrives',
  defaults: { path: '/hooks/new-order', payload: '{\n  "amount": 250\n}' },
  fields: [
    { key: 'path', label: 'Path', type: 'text', required: true, placeholder: '/hooks/my-hook' },
    { key: 'payload', label: 'Sample payload', type: 'textarea', mono: true, rows: 5, hint: 'Fields become variables, e.g. {{amount}}' },
  ],
  summary: (c) => `POST ${c.path}`,
  check: checkPayload,
  execute: payloadTrigger,
});

define('schedule', {
  label: 'Schedule', category: 'trigger', icon: CalendarClock,
  description: 'Start on a cron schedule',
  defaults: { cron: '0 9 * * 1-5' },
  fields: [{ key: 'cron', label: 'Cron expression', type: 'text', mono: true, required: true, hint: 'minute hour day month weekday' }],
  summary: (c) => c.cron,
  check: (c) => (String(c.cron || '').trim().split(/\s+/).length === 5 ? null : 'Cron needs 5 parts, e.g. 0 9 * * 1-5'),
  execute: async (c, ctx, h) => {
    ctx.vars.triggeredAt = new Date().toISOString();
    h.log('info', `Schedule fired (${c.cron})`);
    await h.sleep(250);
    return { output: { triggeredAt: ctx.vars.triggeredAt } };
  },
});

define('manual', {
  label: 'Manual', category: 'trigger', icon: MousePointerClick,
  description: 'Start by pressing Run',
  defaults: { payload: '{\n  "amount": 1500,\n  "customer": "Acme Corp"\n}' },
  fields: [{ key: 'payload', label: 'Input data', type: 'textarea', mono: true, rows: 6, hint: 'Fields become variables, e.g. {{customer}}' }],
  summary: (c) => `${Object.keys(parseJSON(c.payload, {})).length} input field(s)`,
  check: checkPayload,
  execute: payloadTrigger,
});

define('api', {
  label: 'API call', category: 'action', icon: Globe,
  description: 'Send an HTTP request',
  defaults: { method: 'GET', url: 'https://api.example.com/items', headers: '{\n  "Authorization": "Bearer {{token}}"\n}', body: '', retries: 1, saveAs: 'response', outcome: 'succeed' },
  fields: [
    { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    { key: 'url', label: 'URL', type: 'text', required: true, placeholder: 'https://…', hint: 'Supports {{variables}}' },
    { key: 'headers', label: 'Headers (JSON)', type: 'textarea', mono: true, rows: 3 },
    { key: 'body', label: 'Body', type: 'textarea', mono: true, rows: 3 },
    { key: 'retries', label: 'Retries', type: 'number', min: 0, max: 5 },
    { key: 'saveAs', label: 'Save response as', type: 'text', hint: 'Available later as {{name}}' },
    { key: 'outcome', label: 'Simulated result', type: 'select', options: [{ value: 'succeed', label: 'Always succeeds' }, { value: 'random', label: 'Fails 25% of the time' }, { value: 'fail', label: 'Always fails' }] },
  ],
  summary: (c) => `${c.method} ${String(c.url).replace(/^https?:\/\//, '')}`,
  check: (c) => (/^https?:\/\/.+/i.test(c.url || '') || String(c.url).includes('{{') ? null : 'URL must start with http:// or https://'),
  execute: async (c, ctx, h) => {
    const url = interpolate(c.url, ctx.vars);
    const attempts = (Number(c.retries) || 0) + 1;
    for (let a = 1; a <= attempts; a++) {
      h.log('info', `${c.method} ${url}${a > 1 ? ` (retry ${a - 1})` : ''}`);
      await h.sleep(400 + Math.random() * 700);
      const fail = c.outcome === 'fail' || (c.outcome === 'random' && Math.random() < 0.25);
      if (!fail) {
        const body = { ok: true, id: Math.floor(Math.random() * 9000 + 1000) };
        ctx.vars[c.saveAs || 'response'] = body;
        return { output: { status: 200, body } };
      }
      h.log('warn', 'Request failed with status 503');
    }
    throw new Error(`${url} returned 503 after ${attempts} attempt(s)`);
  },
});

define('email', {
  label: 'Send email', category: 'action', icon: Mail,
  description: 'Send a message to someone',
  defaults: { to: 'team@example.com', subject: 'Update for {{customer}}', body: 'Hi,\n\nHere is your update.' },
  fields: [
    { key: 'to', label: 'To', type: 'text', required: true },
    { key: 'subject', label: 'Subject', type: 'text', required: true, hint: 'Supports {{variables}}' },
    { key: 'body', label: 'Message', type: 'textarea', rows: 5 },
  ],
  summary: (c) => `To ${c.to}`,
  check: (c) => (/.+@.+|\{\{/.test(c.to || '') ? null : 'Recipient must be an email address'),
  execute: async (c, ctx, h) => {
    await h.sleep(500);
    const to = interpolate(c.to, ctx.vars);
    h.log('info', `Email "${interpolate(c.subject, ctx.vars)}" sent to ${to}`);
    return { output: { to, sent: true } };
  },
});

define('setvar', {
  label: 'Set variable', category: 'action', icon: Braces,
  description: 'Store a value for later steps',
  defaults: { key: 'status', value: 'processed' },
  fields: [
    { key: 'key', label: 'Variable name', type: 'text', required: true },
    { key: 'value', label: 'Value', type: 'text', required: true, hint: 'Plain text, a JSON value, or {{variables}}' },
  ],
  summary: (c) => `${c.key} = ${c.value}`,
  execute: async (c, ctx, h) => {
    await h.sleep(150);
    const raw = interpolate(c.value, ctx.vars);
    const value = parseJSON(raw, raw);
    ctx.vars[c.key] = value;
    h.log('info', `${c.key} = ${JSON.stringify(value)}`);
    return { output: { [c.key]: value } };
  },
});

define('condition', {
  label: 'Condition', category: 'logic', icon: GitBranch,
  description: 'Branch on true or false',
  outputs: [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }],
  defaults: { expression: 'vars.amount > 1000' },
  fields: [{ key: 'expression', label: 'Expression', type: 'text', mono: true, required: true, hint: 'JavaScript using vars, e.g. vars.amount > 1000' }],
  summary: (c) => c.expression,
  check: (c) => {
    try { new Function('vars', 'results', `return (${c.expression});`); return null; } catch { return 'Expression is not valid JavaScript'; }
  },
  execute: async (c, ctx, h) => {
    await h.sleep(250);
    let result;
    try {
      result = Boolean(new Function('vars', 'results', `"use strict"; return (${c.expression});`)(ctx.vars, ctx.results));
    } catch (e) {
      throw new Error(`Expression error: ${e.message}`);
    }
    h.log('info', `${c.expression} → ${result}`);
    return { branch: result ? 'true' : 'false', output: { result } };
  },
});

define('loop', {
  label: 'Loop', category: 'logic', icon: Repeat,
  description: 'Repeat a branch several times',
  outputs: [{ id: 'body', label: 'Each time' }, { id: 'done', label: 'When done' }],
  defaults: { count: 3 },
  fields: [{ key: 'count', label: 'Repeat', type: 'number', min: 1, max: 20, required: true, hint: 'Current round is available as {{index}}' }],
  summary: (c) => `Repeat ${c.count}×`,
  check: (c) => (Number(c.count) >= 1 ? null : 'Repeat count must be at least 1'),
  execute: async (c) => ({ loop: { count: Math.max(1, Number(c.count) || 1) }, output: { count: Number(c.count) } }),
});

define('delay', {
  label: 'Delay', category: 'timing', icon: Timer,
  description: 'Wait before continuing',
  defaults: { amount: 2, unit: 'hours' },
  fields: [
    { key: 'amount', label: 'Wait for', type: 'number', min: 1, required: true },
    { key: 'unit', label: 'Unit', type: 'select', options: ['seconds', 'minutes', 'hours'], hint: 'Simulation shortens waits to a few seconds' },
  ],
  summary: (c) => `Wait ${c.amount} ${c.unit}`,
  check: (c) => (Number(c.amount) > 0 ? null : 'Wait time must be greater than 0'),
  execute: async (c, ctx, h) => {
    const real = Number(c.amount) * UNIT_MS[c.unit];
    const sim = Math.min(real, 2500);
    h.log('info', `Waiting ${c.amount} ${c.unit} (simulated as ${(sim / 1000).toFixed(1)}s)`);
    await h.sleep(sim);
    return { output: { waitedMs: real } };
  },
});

define('approval', {
  label: 'Approval', category: 'human', icon: UserCheck,
  description: 'Pause until someone decides',
  outputs: [{ id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }],
  defaults: { approvers: 'manager@example.com', timeout: 60 },
  fields: [
    { key: 'approvers', label: 'Approvers', type: 'text', required: true },
    { key: 'timeout', label: 'Auto-reject after (seconds)', type: 'number', min: 5, required: true },
  ],
  summary: (c) => `Ask ${c.approvers}`,
  execute: async (c, ctx, h) => {
    h.setStatus('waiting');
    h.log('info', `Waiting for approval from ${c.approvers}`);
    const decision = await h.requestApproval(Number(c.timeout) || 60);
    h.setStatus('running');
    h.log(decision === 'approved' ? 'success' : 'warn', `Request ${decision}`);
    return { branch: decision, output: { decision, approvers: c.approvers } };
  },
});

define('success', {
  label: 'Success', category: 'end', icon: CircleCheck,
  description: 'Finish the workflow successfully',
  outputs: [],
  defaults: { message: 'Workflow completed' },
  fields: [{ key: 'message', label: 'Message', type: 'text' }],
  summary: (c) => c.message,
  execute: async (c, ctx, h) => {
    await h.sleep(150);
    return { terminal: 'success', message: c.message, output: { message: c.message } };
  },
});

define('fail', {
  label: 'Fail', category: 'end', icon: CircleX,
  description: 'Stop the workflow with an error',
  outputs: [],
  defaults: { message: 'Workflow stopped' },
  fields: [{ key: 'message', label: 'Error message', type: 'text', required: true }],
  summary: (c) => c.message,
  execute: async (c, ctx, h) => {
    await h.sleep(150);
    return { terminal: 'failed', message: c.message, output: { error: c.message } };
  },
});

export const NODE_LIST = Object.values(NODE_DEFS);
export const isTrigger = (node) => NODE_DEFS[node.data.kind]?.category === 'trigger';
export const nodeColor = (kind) => CATEGORIES[NODE_DEFS[kind]?.category]?.color ?? '#888';
