import { Activity, CircleCheck, Timer, CircleX, Trash2, Play } from 'lucide-react';
import { useStore } from '../../store';
import { fmtDuration } from '../../utils/helpers';

const STATUS = { success: 'Succeeded', failed: 'Failed', stopped: 'Stopped' };

function Kpi({ icon: Icon, label, value, tone }) {
  return (
    <div className={`kpi ${tone || ''}`}>
      <Icon size={16} />
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function RunsChart({ runs }) {
  const data = runs.slice(0, 24).reverse();
  const max = Math.max(...data.map((r) => r.durationMs), 1000);
  const W = 720, H = 190, pad = 24, bw = (W - pad * 2) / Math.max(data.length, 1);
  const fill = { success: '#a855f7', failed: '#ec4899', stopped: '#6b6b78' };
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label="Run duration for the most recent runs" className="chart">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad} x2={W - pad} y1={H - t * (H - 16)} y2={H - t * (H - 16)} stroke="#26262d" />
          <text x={0} y={H - t * (H - 16) - 4} fill="#8b8b95" fontSize="10">{fmtDuration(max * t)}</text>
        </g>
      ))}
      {data.map((r, i) => {
        const h = Math.max(4, (r.durationMs / max) * (H - 16));
        return <rect key={r.id} x={pad + i * bw + 3} y={H - h} width={Math.max(bw - 6, 3)} height={h} rx="3" fill={fill[r.status]}><title>{`${STATUS[r.status]} · ${fmtDuration(r.durationMs)}`}</title></rect>;
      })}
    </svg>
  );
}

export default function History() {
  const runs = useStore((s) => s.runs);
  const { clearRuns, setView, startRun } = useStore.getState();

  if (runs.length === 0) {
    return (
      <div className="history empty-state">
        <Activity size={26} />
        <h2>No runs yet</h2>
        <p>Run a workflow in the editor and every execution will show up here.</p>
        <button className="btn primary" onClick={() => { setView('editor'); setTimeout(() => startRun(), 50); }}><Play size={14} /> Run current workflow</button>
      </div>
    );
  }

  const ok = runs.filter((r) => r.status === 'success').length;
  const done = runs.filter((r) => r.status !== 'stopped');
  const avg = done.length ? done.reduce((a, r) => a + r.durationMs, 0) / done.length : 0;

  return (
    <div className="history">
      <div className="history-head">
        <h2>Execution history</h2>
        <button className="btn" onClick={clearRuns}><Trash2 size={14} /> Clear history</button>
      </div>

      <div className="kpis">
        <Kpi icon={Activity} label="Total runs" value={runs.length} />
        <Kpi icon={CircleCheck} label="Success rate" value={`${Math.round((ok / runs.length) * 100)}%`} tone="good" />
        <Kpi icon={Timer} label="Average duration" value={fmtDuration(avg)} />
        <Kpi icon={CircleX} label="Failed runs" value={runs.filter((r) => r.status === 'failed').length} tone="bad" />
      </div>

      <section className="card">
        <h3>Duration of recent runs</h3>
        <p className="muted">Purple bars succeeded, pink bars failed, grey bars were stopped.</p>
        <RunsChart runs={runs} />
      </section>

      <section className="card">
        <h3>Recent runs</h3>
        <table>
          <thead><tr><th>When</th><th>Workflow</th><th>Result</th><th>Duration</th><th>Steps</th><th>Details</th></tr></thead>
          <tbody>
            {runs.slice(0, 20).map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.at).toLocaleTimeString()}</td>
                <td>{r.workflow}</td>
                <td><span className={`status-pill s-${r.status}`}>{STATUS[r.status]}</span></td>
                <td>{fmtDuration(r.durationMs)}</td>
                <td>{r.steps}</td>
                <td className="muted">{r.error || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
