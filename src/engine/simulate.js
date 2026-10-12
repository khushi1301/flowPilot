import { NODE_DEFS, isTrigger } from '../nodes/registry';

export const STOP = Symbol('stop');
const MAX_STEPS = 300;

/**
 * Simulation engine. No React, no store: it only talks to the outside world
 * through the `hooks` object, so it can be tested in isolation.
 *
 * hooks: onStart, onNode(id, status, output), onEdge(id), onLog(level, msg, nodeId),
 *        onPause(isPaused), onApproval(nodeId | null), onFinish(result)
 */
export function createRunner({ nodes, edges, hooks, speed = 1, stepMode = false }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ctrl = { speed, paused: false, stopped: false, stepMode, wake: null, cancels: new Set(), resolveApproval: null };
  const startedAt = Date.now();

  const outgoing = (id, handle) =>
    edges.filter((e) => e.source === id && ((e.sourceHandle ?? 'out') === handle));

  // Abortable, speed-aware sleep
  const sleep = (ms) =>
    new Promise((resolve, reject) => {
      if (ctrl.stopped) return reject(STOP);
      const cancel = () => { clearTimeout(timer); ctrl.cancels.delete(cancel); reject(STOP); };
      const timer = setTimeout(() => { ctrl.cancels.delete(cancel); resolve(); }, ms / ctrl.speed);
      ctrl.cancels.add(cancel);
    });

  const requestApproval = (nodeId, seconds) =>
    new Promise((resolve, reject) => {
      hooks.onApproval(nodeId);
      const finish = (decision) => {
        clearTimeout(timer);
        ctrl.resolveApproval = null;
        hooks.onApproval(null);
        decision === STOP ? reject(STOP) : resolve(decision);
      };
      const timer = setTimeout(() => {
        hooks.onLog('warn', 'Approval timed out, rejecting', nodeId);
        finish('rejected');
      }, (seconds * 1000) / ctrl.speed);
      ctrl.resolveApproval = finish;
    });

  // Called before every node: handles stop, pause and step-by-step mode
  async function gate() {
    if (ctrl.stopped) throw STOP;
    if (ctrl.paused || ctrl.stepMode) {
      hooks.onPause(true);
      await new Promise((r) => { ctrl.wake = r; });
      ctrl.wake = null;
      hooks.onPause(false);
      if (ctrl.stopped) throw STOP;
    }
  }

  async function visit(id, ctx) {
    if (++ctx.steps > MAX_STEPS) throw new Error('Step limit reached. Check the workflow for runaway loops');
    await gate();

    const node = byId.get(id);
    const def = NODE_DEFS[node.data.kind];
    const name = node.data.label || def.label;
    const t0 = Date.now();

    hooks.onNode(id, 'running');
    hooks.onLog('info', `${name} started`, id);

    const helpers = {
      sleep,
      log: (level, msg) => hooks.onLog(level, msg, id),
      setStatus: (s) => hooks.onNode(id, s),
      requestApproval: (seconds) => requestApproval(id, seconds),
    };

    let res;
    try {
      res = (await def.execute(node.data.config || {}, ctx, helpers)) || {};
    } catch (err) {
      if (err === STOP) throw err;
      hooks.onNode(id, 'failed', { error: err.message });
      hooks.onLog('error', `${name} failed: ${err.message}`, id);
      const e = new Error(err.message);
      e.failedNode = id;
      throw e;
    }

    ctx.results[id] = res.output;
    const failedEnd = res.terminal === 'failed';
    hooks.onNode(id, failedEnd ? 'failed' : 'success', res.output);
    hooks.onLog(failedEnd ? 'error' : 'success', failedEnd ? `${name} ended the run: ${res.message}` : `${name} completed in ${Date.now() - t0}ms`, id);

    if (res.terminal) {
      ctx.outcome = res.terminal;
      ctx.message = res.message;
      return;
    }

    if (res.loop) {
      for (let i = 0; i < res.loop.count; i++) {
        ctx.vars.index = i;
        hooks.onLog('info', `Loop round ${i + 1} of ${res.loop.count}`, id);
        for (const e of outgoing(id, 'body')) {
          hooks.onEdge(e.id);
          await visit(e.target, ctx);
          if (ctx.outcome) return;
        }
      }
    }

    for (const e of outgoing(id, res.loop ? 'done' : res.branch ?? 'out')) {
      hooks.onEdge(e.id);
      await visit(e.target, ctx);
      if (ctx.outcome) return;
    }
  }

  async function run() {
    hooks.onStart();
    const ctx = { vars: {}, results: {}, steps: 0, outcome: null, message: null };
    const trigger = nodes.find(isTrigger);
    let status = 'success';
    let error = null;
    let failedNode = null;
    try {
      await visit(trigger.id, ctx);
      status = ctx.outcome ?? 'success';
      if (status === 'failed') error = ctx.message;
    } catch (e) {
      if (e === STOP) status = 'stopped';
      else { status = 'failed'; error = e.message; failedNode = e.failedNode ?? null; }
    }
    hooks.onFinish({ status, error, failedNode, durationMs: Date.now() - startedAt, steps: ctx.steps });
  }

  return {
    run,
    pause: () => { ctrl.paused = true; },
    resume: () => { ctrl.paused = false; ctrl.stepMode = false; ctrl.wake?.(); },
    step: () => { ctrl.paused = false; ctrl.stepMode = true; ctrl.wake?.(); },
    stop: () => {
      ctrl.stopped = true;
      [...ctrl.cancels].forEach((c) => c());
      ctrl.resolveApproval?.(STOP);
      ctrl.wake?.();
    },
    approve: (decision) => ctrl.resolveApproval?.(decision),
    setSpeed: (s) => { ctrl.speed = s; },
  };
}
