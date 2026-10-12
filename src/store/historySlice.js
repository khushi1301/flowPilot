const LIMIT = 50;

const snap = (s) => ({
  nodes: s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
  edges: s.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
  name: s.workflowName,
});

export const createHistorySlice = (set, get) => ({
  past: [],
  future: [],
  lastCommit: { key: null, t: 0 },

  /**
   * Save the current graph so it can be undone. Call BEFORE a change.
   * Pass a key to merge rapid edits (typing in a field) into one undo step.
   */
  commit: (key = null) => {
    const now = Date.now();
    const { lastCommit } = get();
    if (key && lastCommit.key === key && now - lastCommit.t < 1200) {
      set({ lastCommit: { key, t: now } });
      return;
    }
    if (!key && now - lastCommit.t < 30) return; // one action may emit several change events
    set((s) => ({ past: [...s.past.slice(-(LIMIT - 1)), snap(s)], future: [], lastCommit: { key, t: now } }));
  },

  undo: () => {
    const { past } = get();
    if (!past.length) return;
    const prev = past[past.length - 1];
    set((s) => ({
      past: past.slice(0, -1),
      future: [snap(s), ...s.future],
      nodes: prev.nodes, edges: prev.edges, workflowName: prev.name,
      lastCommit: { key: null, t: 0 },
    }));
  },
  redo: () => {
    const { future } = get();
    if (!future.length) return;
    const next = future[0];
    set((s) => ({
      future: future.slice(1),
      past: [...s.past, snap(s)],
      nodes: next.nodes, edges: next.edges, workflowName: next.name,
      lastCommit: { key: null, t: 0 },
    }));
  },
});
