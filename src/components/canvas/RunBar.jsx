import { Play, Pause, SkipForward, Square, Check, X, RotateCcw } from 'lucide-react';
import { useStore } from '../../store';

const LABEL = { idle: 'Ready', running: 'Running', paused: 'Paused', success: 'Succeeded', failed: 'Failed', stopped: 'Stopped' };

export default function RunBar() {
  const status = useStore((s) => s.runStatus);
  const speed = useStore((s) => s.speed);
  const pending = useStore((s) => s.pendingApproval);
  const { startRun, pauseRun, resumeRun, stepRun, stopRun, setSpeed, resolveApproval, resetRun } = useStore.getState();
  const active = status === 'running' || status === 'paused';

  return (
    <div className="fp-runbar">
      {!active ? (
        <button className="btn primary" onClick={() => startRun()} title="Run (Space)"><Play size={14} /> Run</button>
      ) : status === 'running' ? (
        <button className="btn" onClick={pauseRun} title="Pause (Space)"><Pause size={14} /> Pause</button>
      ) : (
        <button className="btn primary" onClick={resumeRun} title="Resume (Space)"><Play size={14} /> Resume</button>
      )}
      <button className="btn icon" onClick={stepRun} disabled={status === 'running'} title="Run one step"><SkipForward size={14} /></button>
      <button className="btn icon" onClick={stopRun} disabled={!active} title="Stop"><Square size={13} /></button>
      {!active && status !== 'idle' && <button className="btn icon" onClick={resetRun} title="Clear results"><RotateCcw size={14} /></button>}

      <select className="speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Simulation speed">
        <option value={1}>1×</option><option value={2}>2×</option><option value={5}>5×</option>
      </select>
      <span className={`status-pill s-${status}`}>{LABEL[status]}</span>

      {pending && (
        <div className="approval">
          <span>Approval needed</span>
          <button className="btn small ok" onClick={() => resolveApproval('approved')}><Check size={13} /> Approve</button>
          <button className="btn small bad" onClick={() => resolveApproval('rejected')}><X size={13} /> Reject</button>
        </div>
      )}
    </div>
  );
}
