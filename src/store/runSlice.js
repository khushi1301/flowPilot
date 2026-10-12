import { createRunner } from '../engine/simulate';
import { validate } from '../engine/validate';
import { loadRuns, saveRuns } from '../utils/persist';
import { uid } from '../utils/helpers';

let runner = null; // lives outside React state: it holds timers and promises

export const createRunSlice = (set, get) => ({
  runStatus: 'idle', // idle | running | paused | success | failed | stopped
  nodeStatus: {},
  nodeOutputs: {},
  takenEdges: {},
  logs: [],
  pendingApproval: null,
  speed: 1,
  runs: loadRuns(),

  startRun: ({ step = false } = {}) => {
    const s = get();
    if (s.runStatus === 'running' || s.runStatus === 'paused') return false;

    const issues = validate(s.nodes, s.edges);
    set({ issues });
    if (issues.some((i) => i.level === 'error')) {
      set({ drawerOpen: true, drawerTab: 'issues' });
      return false;
    }

    const t0 = Date.now();
    const log = (level, msg, nodeId) =>
      set((st) => ({ logs: [...st.logs, { id: st.logs.length, t: Date.now() - t0, level, msg, nodeId }] }));

    set({ runStatus: 'running', nodeStatus: {}, nodeOutputs: {}, takenEdges: {}, logs: [], pendingApproval: null, drawerOpen: true, drawerTab: 'log' });

    runner = createRunner({
      nodes: s.nodes,
      edges: s.edges,
      speed: s.speed,
      stepMode: step,
      hooks: {
        onStart: () => log('info', `Run started${step ? ' (step mode)' : ''}`),
        onNode: (id, status, output) =>
          set((st) => ({
            nodeStatus: { ...st.nodeStatus, [id]: status },
            nodeOutputs: output !== undefined ? { ...st.nodeOutputs, [id]: output } : st.nodeOutputs,
          })),
        onEdge: (id) => set((st) => ({ takenEdges: { ...st.takenEdges, [id]: true } })),
        onLog: log,
        onPause: (paused) => set({ runStatus: paused ? 'paused' : 'running' }),
        onApproval: (nodeId) => set({ pendingApproval: nodeId }),
        onFinish: (r) => {
          runner = null;
          const label = { success: 'Run finished successfully', failed: `Run failed${r.error ? `: ${r.error}` : ''}`, stopped: 'Run stopped' }[r.status];
          log(r.status === 'success' ? 'success' : r.status === 'failed' ? 'error' : 'warn', label);
          const entry = { id: uid('run'), at: Date.now(), workflow: get().workflowName, status: r.status, durationMs: r.durationMs, steps: r.steps, error: r.error };
          const runs = [entry, ...get().runs].slice(0, 100);
          saveRuns(runs);
          set({ runStatus: r.status, pendingApproval: null, runs });
        },
      },
    });
    runner.run();
    return true;
  },

  pauseRun: () => { runner?.pause(); },
  resumeRun: () => { runner?.resume(); },
  stepRun: () => {
    if (runner) runner.step();
    else get().startRun({ step: true });
  },
  stopRun: () => { runner?.stop(); },
  resolveApproval: (decision) => { runner?.approve(decision); },
  setSpeed: (speed) => { runner?.setSpeed(speed); set({ speed }); },

  /** Toggle used by the Space shortcut */
  toggleRun: () => {
    const { runStatus } = get();
    if (runStatus === 'running') get().pauseRun();
    else if (runStatus === 'paused') get().resumeRun();
    else get().startRun();
  },

  resetRun: () => {
    runner?.stop();
    set({ runStatus: 'idle', nodeStatus: {}, nodeOutputs: {}, takenEdges: {}, logs: [], pendingApproval: null });
  },
  clearRuns: () => { saveRuns([]); set({ runs: [] }); },
});
