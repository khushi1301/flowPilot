import { Trash2, MousePointerClick } from 'lucide-react';
import { NODE_DEFS, CATEGORIES } from '../../nodes/registry';
import { useStore } from '../../store';

function Field({ field, value, onChange }) {
  const id = `f_${field.key}`;
  const common = { id, value: value ?? '', placeholder: field.placeholder, className: field.mono ? 'mono' : '' };
  let input;
  if (field.type === 'textarea') {
    input = <textarea {...common} rows={field.rows || 3} onChange={(e) => onChange(e.target.value)} spellCheck={false} />;
  } else if (field.type === 'select') {
    input = (
      <select {...common} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
    );
  } else if (field.type === 'number') {
    input = <input {...common} type="number" min={field.min} max={field.max} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
  } else {
    input = <input {...common} type="text" onChange={(e) => onChange(e.target.value)} spellCheck={false} />;
  }
  return (
    <div className="field">
      <label htmlFor={id}>{field.label}{field.required && <b title="Required"> *</b>}</label>
      {input}
      {field.hint && <small>{field.hint}</small>}
    </div>
  );
}

function WorkflowSummary() {
  const name = useStore((s) => s.workflowName);
  const nodes = useStore((s) => s.nodes.length);
  const edges = useStore((s) => s.edges.length);
  const issues = useStore((s) => s.issues);
  const setName = useStore((s) => s.setWorkflowName);
  const errors = issues.filter((i) => i.level === 'error').length;
  return (
    <>
      <div className="panel-title">Workflow</div>
      <div className="inspector-body">
        <div className="field"><label htmlFor="wf-name">Name</label><input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="stat-row">
          <div><strong>{nodes}</strong><span>steps</span></div>
          <div><strong>{edges}</strong><span>connections</span></div>
          <div className={errors ? 'bad' : 'good'}><strong>{errors}</strong><span>issues</span></div>
        </div>
        <div className="hint-card">
          <MousePointerClick size={16} />
          <p>Select a step to edit it. Connect two steps by dragging from the dot at the bottom of one to the dot at the top of the next.</p>
        </div>
      </div>
    </>
  );
}

export default function Inspector() {
  const node = useStore((s) => s.nodes.find((n) => n.selected));
  const output = useStore((s) => (node ? s.nodeOutputs[node.id] : undefined));
  const issues = useStore((s) => s.issues);
  const { updateNodeConfig, updateNodeLabel, deleteNode } = useStore.getState();

  if (!node) return <aside className="fp-panel fp-inspector"><WorkflowSummary /></aside>;

  const def = NODE_DEFS[node.data.kind];
  const cat = CATEGORIES[def.category];
  const mine = issues.filter((i) => i.nodeId === node.id);

  return (
    <aside className="fp-panel fp-inspector">
      <div className="panel-title" style={{ '--c': cat.color }}>
        <span className="dot" /> {def.label}
        <button className="btn icon danger" onClick={() => deleteNode(node.id)} title="Delete step"><Trash2 size={14} /></button>
      </div>
      <div className="inspector-body" key={node.id}>
        <div className="field">
          <label htmlFor="node-label">Step name</label>
          <input id="node-label" value={node.data.label} onChange={(e) => updateNodeLabel(node.id, e.target.value)} />
        </div>

        {mine.length > 0 && (
          <ul className="issue-box">{mine.map((i) => <li key={i.id}>{i.message}</li>)}</ul>
        )}

        {def.fields.map((f) => (
          <Field key={f.key} field={f} value={node.data.config?.[f.key]} onChange={(v) => updateNodeConfig(node.id, { [f.key]: v })} />
        ))}

        {output !== undefined && (
          <div className="field">
            <label>Last result</label>
            <pre className="result">{JSON.stringify(output, null, 2)}</pre>
          </div>
        )}
      </div>
    </aside>
  );
}
