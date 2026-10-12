import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NODE_DEFS, CATEGORIES } from '../../nodes/registry';
import { useStore } from '../../store';

const STATUS_LABEL = { running: 'Running', success: 'Done', failed: 'Failed', waiting: 'Waiting' };

function FlowNode({ id, data, selected }) {
  const def = NODE_DEFS[data.kind];
  const color = CATEGORIES[def.category].color;
  const status = useStore((s) => s.nodeStatus[id]);
  const hasIssue = useStore((s) => s.issues.some((i) => i.nodeId === id));
  const Icon = def.icon;
  const outs = def.outputs;

  return (
    <div
      className={`fp-node ${selected ? 'selected' : ''} ${status ? `status-${status}` : ''} ${hasIssue ? 'has-issue' : ''}`}
      style={{ '--c': color }}
    >
      {def.inputs && <Handle type="target" position={Position.Top} />}

      <div className="fp-node-head">
        <span className="fp-node-icon"><Icon size={16} /></span>
        <div className="fp-node-title">
          <strong>{data.label}</strong>
          <span>{def.label}</span>
        </div>
        {status && <span className={`fp-chip chip-${status}`}>{STATUS_LABEL[status]}</span>}
      </div>
      <p className="fp-node-body">{def.summary(data.config || {})}</p>

      {outs.map((o, i) => {
        const left = `${((i + 1) / (outs.length + 1)) * 100}%`;
        return (
          <div key={o.id}>
            <Handle id={o.id} type="source" position={Position.Bottom} style={{ left }} />
            {outs.length > 1 && <span className="fp-handle-label" style={{ left }}>{o.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default memo(FlowNode);
