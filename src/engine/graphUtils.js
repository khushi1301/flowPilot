import dagre from '@dagrejs/dagre';
import { MarkerType } from '@xyflow/react';
import { NODE_DEFS } from '../nodes/registry';

export const NODE_W = 240;
export const NODE_H = 92;

/** Label shown on an edge, only for nodes with more than one output (Condition, Loop, Approval). */
export function edgeLabel(nodes, sourceId, handle) {
  const n = nodes.find((x) => x.id === sourceId);
  const def = n && NODE_DEFS[n.data.kind];
  if (!def || def.outputs.length < 2) return undefined;
  return def.outputs.find((o) => o.id === handle)?.label;
}

export function makeEdge(nodes, source, sourceHandle, target) {
  return {
    id: `e_${source}_${sourceHandle}_${target}`,
    source,
    sourceHandle,
    target,
    type: 'smoothstep',
    label: edgeLabel(nodes, source, sourceHandle),
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#6b6b78' },
  };
}

export function layoutGraph(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 90 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const p = g.node(n.id);
    return { ...n, position: { x: Math.round(p.x - NODE_W / 2), y: Math.round(p.y - NODE_H / 2) } };
  });
}

/** Ids of nodes reachable from the given start ids. */
export function reachableFrom(startIds, edges) {
  const seen = new Set(startIds);
  const stack = [...startIds];
  while (stack.length) {
    const id = stack.pop();
    for (const e of edges) {
      if (e.source === id && !seen.has(e.target)) {
        seen.add(e.target);
        stack.push(e.target);
      }
    }
  }
  return seen;
}
