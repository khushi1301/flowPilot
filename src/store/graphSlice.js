import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { NODE_DEFS } from '../nodes/registry';
import { buildTemplate } from '../templates';
import { layoutGraph, makeEdge } from '../engine/graphUtils';
import { loadWorkflow } from '../utils/persist';
import { uid } from '../utils/helpers';

const saved = loadWorkflow();
const initial = saved?.nodes?.length ? saved : buildTemplate('order');

export const createGraphSlice = (set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  workflowName: initial.name,
  clipboard: null,

  onNodesChange: (changes) => {
    if (changes.some((c) => c.type === 'remove')) get().commit();
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes) => {
    if (changes.some((c) => c.type === 'remove')) get().commit();
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  onConnect: (c) => {
    get().commit();
    set({ edges: [...get().edges, makeEdge(get().nodes, c.source, c.sourceHandle ?? 'out', c.target)] });
  },

  setWorkflowName: (name) => {
    get().commit('rename');
    set({ workflowName: name });
  },

  addNode: (kind, position) => {
    get().commit();
    const def = NODE_DEFS[kind];
    const node = {
      id: uid(kind),
      type: 'flowNode',
      position,
      selected: true,
      data: { kind, label: def.label, config: { ...def.defaults } },
    };
    set({ nodes: [...get().nodes.map((n) => ({ ...n, selected: false })), node] });
  },

  updateNodeConfig: (id, patch) => {
    get().commit(`cfg:${id}`);
    set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } } : n)) });
  },
  updateNodeLabel: (id, label) => {
    get().commit(`label:${id}`);
    set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)) });
  },

  selectNode: (id) => set({ nodes: get().nodes.map((n) => ({ ...n, selected: n.id === id })) }),
  selectAll: () => set({ nodes: get().nodes.map((n) => ({ ...n, selected: true })) }),

  deleteNode: (id) => {
    get().commit();
    set({ nodes: get().nodes.filter((n) => n.id !== id), edges: get().edges.filter((e) => e.source !== id && e.target !== id) });
  },

  copySelection: () => {
    const { nodes, edges } = get();
    const picked = nodes.filter((n) => n.selected);
    if (!picked.length) return;
    const ids = new Set(picked.map((n) => n.id));
    set({ clipboard: { nodes: picked, edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)) } });
  },
  paste: () => {
    const { clipboard, nodes, edges } = get();
    if (!clipboard) return;
    get().commit();
    const idMap = {};
    const added = clipboard.nodes.map((n) => {
      idMap[n.id] = uid(n.data.kind);
      return { ...n, id: idMap[n.id], selected: true, position: { x: n.position.x + 40, y: n.position.y + 40 }, data: structuredClone(n.data) };
    });
    const addedEdges = clipboard.edges.map((e) => makeEdge([...nodes, ...added], idMap[e.source], e.sourceHandle, idMap[e.target]));
    set({
      nodes: [...nodes.map((n) => ({ ...n, selected: false })), ...added],
      edges: [...edges, ...addedEdges],
      clipboard: { nodes: added.map((n) => ({ ...n, selected: false })), edges: addedEdges },
    });
  },
  duplicate: () => {
    get().copySelection();
    get().paste();
  },

  autoLayout: () => {
    get().commit();
    set({ nodes: layoutGraph(get().nodes, get().edges) });
  },

  loadWorkflow: ({ name, nodes, edges }) => {
    get().commit();
    set({ workflowName: name || 'Untitled workflow', nodes, edges });
    get().resetRun();
  },
  loadTemplate: (id) => get().loadWorkflow(buildTemplate(id)),
  newWorkflow: () => get().loadWorkflow({ name: 'Untitled workflow', nodes: [], edges: [] }),
});
