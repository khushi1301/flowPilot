import { NODE_DEFS, isTrigger } from '../nodes/registry';
import { reachableFrom } from './graphUtils';

/**
 * Pure function: graph in, list of issues out.
 * Issue = { id, level: 'error' | 'warning', message, nodeId?, edgeId? }
 */
export function validate(nodes, edges) {
  const issues = [];
  const add = (level, message, extra = {}) => issues.push({ id: issues.length, level, message, ...extra });
  const name = (n) => n.data.label || NODE_DEFS[n.data.kind].label;

  if (!nodes.length) return issues;

  const triggers = nodes.filter(isTrigger);
  if (triggers.length === 0) add('error', 'Add a trigger so the workflow knows when to start');
  if (triggers.length > 1) triggers.forEach((n) => add('error', `${name(n)}: only one trigger is allowed`, { nodeId: n.id }));

  edges.forEach((e) => {
    const t = nodes.find((n) => n.id === e.target);
    if (t && isTrigger(t)) add('error', 'Triggers cannot have incoming connections', { edgeId: e.id, nodeId: t.id });
  });

  // Unreachable nodes
  const reached = reachableFrom(triggers.map((t) => t.id), edges);
  nodes.forEach((n) => {
    if (!reached.has(n.id) && !isTrigger(n)) add('error', `${name(n)} is not connected to the trigger`, { nodeId: n.id });
  });

  // Nodes inside a loop body may end without an End node
  const bodyStarts = edges.filter((e) => nodes.find((n) => n.id === e.source)?.data.kind === 'loop' && e.sourceHandle === 'body').map((e) => e.target);
  const inLoopBody = reachableFrom(bodyStarts, edges);

  nodes.forEach((n) => {
    const def = NODE_DEFS[n.data.kind];
    const cfg = n.data.config || {};

    // Required fields and node-specific checks
    def.fields.forEach((f) => {
      const v = cfg[f.key];
      const empty = v === undefined || v === null || String(v).trim() === '' || (f.type === 'number' && Number.isNaN(Number(v)));
      if (f.required && empty) add('error', `${name(n)}: "${f.label}" is required`, { nodeId: n.id });
    });
    const msg = def.check?.(cfg);
    if (msg) add('error', `${name(n)}: ${msg}`, { nodeId: n.id });

    // Every output must lead somewhere
    const outs = edges.filter((e) => e.source === n.id);
    if (def.outputs.length > 1) {
      def.outputs.forEach((o) => {
        if (!outs.some((e) => (e.sourceHandle ?? 'out') === o.id)) add('error', `${name(n)}: connect the "${o.label}" branch`, { nodeId: n.id });
      });
    } else if (def.outputs.length === 1 && outs.length === 0 && !inLoopBody.has(n.id) && reached.has(n.id)) {
      add('error', `${name(n)} has no next step. End the path with Success or Fail`, { nodeId: n.id });
    }
  });

  // Cycles (DFS)
  const color = new Map();
  const visit = (id) => {
    color.set(id, 1);
    for (const e of edges.filter((x) => x.source === id)) {
      if (color.get(e.target) === 1) add('error', 'Loop detected. Use a Loop node to repeat steps', { edgeId: e.id, nodeId: e.target });
      else if (!color.get(e.target) && nodes.some((n) => n.id === e.target)) visit(e.target);
    }
    color.set(id, 2);
  };
  nodes.forEach((n) => { if (!color.get(n.id)) visit(n.id); });

  return issues;
}
