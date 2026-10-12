import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { ChevronDown, ChevronUp, CircleAlert, TriangleAlert, CircleCheck } from 'lucide-react';
import { useStore } from '../../store';
import { fmtDuration } from '../../utils/helpers';

export default function Drawer() {
  const open = useStore((s) => s.drawerOpen);
  const tab = useStore((s) => s.drawerTab);
  const issues = useStore((s) => s.issues);
  const logs = useStore((s) => s.logs);
  const { toggleDrawer, setDrawerTab, selectNode, openDrawer } = useStore.getState();
  const { fitView } = useReactFlow();
  const endRef = useRef(null);

  useEffect(() => { if (open && tab === 'log') endRef.current?.scrollIntoView({ block: 'end' }); }, [logs, open, tab]);

  const focus = (nodeId) => {
    if (!nodeId) return;
    selectNode(nodeId);
    fitView({ nodes: [{ id: nodeId }], duration: 350, maxZoom: 1.1, padding: 0.8 });
  };

  const tabBtn = (id, label, count) => (
    <button className={`tab ${tab === id && open ? 'active' : ''}`} onClick={() => openDrawer(id)}>
      {label}{count > 0 && <span className={`count ${id === 'issues' ? 'bad' : ''}`}>{count}</span>}
    </button>
  );

  return (
    <div className={`fp-drawer ${open ? 'open' : ''}`}>
      <div className="drawer-head">
        {tabBtn('issues', 'Issues', issues.length)}
        {tabBtn('log', 'Run log', logs.length)}
        <button className="btn icon ghost" onClick={toggleDrawer} title={open ? 'Collapse' : 'Expand'}>{open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}</button>
      </div>

      {open && tab === 'issues' && (
        <div className="drawer-body">
          {issues.length === 0 ? (
            <p className="empty"><CircleCheck size={15} /> No issues. This workflow is ready to run.</p>
          ) : issues.map((i) => (
            <button key={i.id} className="row issue" onClick={() => focus(i.nodeId)} disabled={!i.nodeId}>
              {i.level === 'error' ? <CircleAlert size={14} className="bad" /> : <TriangleAlert size={14} className="warn" />}
              <span>{i.message}</span>
            </button>
          ))}
        </div>
      )}

      {open && tab === 'log' && (
        <div className="drawer-body mono">
          {logs.length === 0 ? (
            <p className="empty">Nothing has run yet. Press Run to simulate this workflow.</p>
          ) : logs.map((l) => (
            <div key={l.id} className={`row log ${l.level}`} onClick={() => focus(l.nodeId)}>
              <time>{fmtDuration(l.t)}</time>
              <span>{l.msg}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}
