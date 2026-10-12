import { NODE_DEFS } from '../nodes/registry';
import { layoutGraph, makeEdge } from '../engine/graphUtils';

// node: [id, kind, configOverrides, label?]   edge: [from, handle, to]
const SPECS = [
  {
    id: 'order',
    name: 'Order approval',
    description: 'Send large orders to a manager before fulfilling them.',
    nodes: [
      ['t', 'manual', {}],
      ['c', 'condition', { expression: 'vars.amount > 1000' }, 'Large order?'],
      ['a', 'approval', { approvers: 'finance@acme.co' }],
      ['f', 'api', { method: 'POST', url: 'https://api.acme.co/orders/fulfil', saveAs: 'order' }, 'Fulfil order'],
      ['m', 'email', { to: 'sales@acme.co', subject: 'Order approved for {{customer}}' }, 'Notify sales'],
      ['ok', 'success', { message: 'Order fulfilled' }],
      ['r', 'email', { to: 'sales@acme.co', subject: 'Order rejected for {{customer}}' }, 'Notify rejection'],
      ['no', 'fail', { message: 'Order rejected by finance' }],
      ['auto', 'api', { method: 'POST', url: 'https://api.acme.co/orders/auto-approve' }, 'Auto-approve'],
      ['ok2', 'success', { message: 'Order auto-approved' }],
    ],
    edges: [['t', 'out', 'c'], ['c', 'true', 'a'], ['c', 'false', 'auto'], ['a', 'approved', 'f'], ['a', 'rejected', 'r'], ['f', 'out', 'm'], ['m', 'out', 'ok'], ['r', 'out', 'no'], ['auto', 'out', 'ok2']],
  },
  {
    id: 'lead',
    name: 'Lead follow-up',
    description: 'Greet a new lead, wait, then follow up if they have not replied.',
    nodes: [
      ['t', 'webhook', { path: '/hooks/new-lead', payload: '{\n  "email": "sam@lead.io",\n  "customer": "Sam"\n}' }],
      ['v', 'setvar', { key: 'replied', value: 'false' }, 'Mark as not replied'],
      ['e1', 'email', { to: '{{email}}', subject: 'Thanks for your interest, {{customer}}' }, 'Welcome email'],
      ['d', 'delay', { amount: 2, unit: 'hours' }],
      ['c', 'condition', { expression: 'vars.replied === true' }, 'Replied?'],
      ['ok', 'success', { message: 'Lead replied' }],
      ['e2', 'email', { to: '{{email}}', subject: 'Following up, {{customer}}' }, 'Follow-up email'],
      ['ok2', 'success', { message: 'Follow-up sent' }],
    ],
    edges: [['t', 'out', 'v'], ['v', 'out', 'e1'], ['e1', 'out', 'd'], ['d', 'out', 'c'], ['c', 'true', 'ok'], ['c', 'false', 'e2'], ['e2', 'out', 'ok2']],
  },
  {
    id: 'incident',
    name: 'Incident alert',
    description: 'Check service health every 5 minutes and page on-call when it is slow.',
    nodes: [
      ['t', 'schedule', { cron: '*/5 * * * *' }],
      ['h', 'api', { url: 'https://status.acme.co/health', saveAs: 'health' }, 'Check health'],
      ['v', 'setvar', { key: 'latency', value: '1800' }, 'Record latency'],
      ['c', 'condition', { expression: 'vars.latency > 1000' }, 'Slow?'],
      ['l', 'loop', { count: 3 }, 'Page 3 times'],
      ['p', 'email', { to: 'oncall@acme.co', subject: 'Service is slow (page {{index}})' }, 'Page on-call'],
      ['f', 'fail', { message: 'Incident escalated to on-call' }],
      ['ok', 'success', { message: 'Service healthy' }],
    ],
    edges: [['t', 'out', 'h'], ['h', 'out', 'v'], ['v', 'out', 'c'], ['c', 'true', 'l'], ['c', 'false', 'ok'], ['l', 'body', 'p'], ['l', 'done', 'f']],
  },
];

export const TEMPLATES = SPECS.map(({ id, name, description, nodes }) => ({ id, name, description, count: nodes.length }));

export function buildTemplate(id) {
  const spec = SPECS.find((s) => s.id === id) ?? SPECS[0];
  const raw = spec.nodes.map(([nid, kind, cfg, label]) => ({
    id: nid,
    type: 'flowNode',
    position: { x: 0, y: 0 },
    data: { kind, label: label ?? NODE_DEFS[kind].label, config: { ...NODE_DEFS[kind].defaults, ...cfg } },
  }));
  const edges = spec.edges.map(([s, h, t]) => makeEdge(raw, s, h, t));
  return { name: spec.name, nodes: layoutGraph(raw, edges), edges };
}
