const WF_KEY = 'flowpilot:workflow';
const RUNS_KEY = 'flowpilot:runs';

export function loadWorkflow() {
  try {
    return JSON.parse(localStorage.getItem(WF_KEY));
  } catch {
    return null;
  }
}

export function saveWorkflow(name, nodes, edges) {
  try {
    const clean = {
      name,
      savedAt: Date.now(),
      nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
      edges: edges.map(({ selected, ...e }) => e),
    };
    localStorage.setItem(WF_KEY, JSON.stringify(clean));
    return clean.savedAt;
  } catch {
    return null;
  }
}

export function loadRuns() {
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveRuns(runs) {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs.slice(0, 100)));
  } catch {
    /* storage full or unavailable */
  }
}
