import { useEffect, useReducer, useRef, useState } from 'react';
import { Undo2, Redo2, Network, Download, Upload, Plus, Check, LoaderCircle } from 'lucide-react';
import { useStore } from '../../store';
import { timeAgo } from '../../utils/helpers';
import { exportWorkflow, importWorkflow } from '../../utils/io';

function SavedIndicator() {
  const saveState = useStore((s) => s.saveState);
  const savedAt = useStore((s) => s.savedAt);
  const [, tick] = useReducer((n) => n + 1, 0);
  useEffect(() => { const t = setInterval(tick, 1000); return () => clearInterval(t); }, []);
  return (
    <span className={`saved ${saveState}`} aria-live="polite">
      {saveState === 'saving' ? <><LoaderCircle size={13} className="spin" /> Saving…</> : <><Check size={13} /> Saved · {timeAgo(savedAt)}</>}
    </span>
  );
}

export default function Toolbar() {
  const name = useStore((s) => s.workflowName);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const errors = useStore((s) => s.issues.filter((i) => i.level === 'error').length);
  const { setWorkflowName, undo, redo, autoLayout, newWorkflow } = useStore.getState();
  const fileRef = useRef(null);
  const [importError, setImportError] = useState('');

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setImportError((await importWorkflow(file)) || '');
  };

  return (
    <header className="fp-topbar">
      <div className="title">
        <input className="name" value={name} onChange={(e) => setWorkflowName(e.target.value)} aria-label="Workflow name" />
        <SavedIndicator />
        {errors > 0 && <span className="badge bad">{errors} to fix</span>}
        {importError && <span className="badge bad" role="alert">{importError}</span>}
      </div>
      <div className="actions">
        <button className="btn icon" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
        <button className="btn icon" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
        <span className="sep" />
        <button className="btn" onClick={autoLayout} title="Arrange steps automatically"><Network size={14} /> Tidy up</button>
        <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={14} /> Import</button>
        <button className="btn" onClick={exportWorkflow}><Download size={14} /> Export</button>
        <button className="btn" onClick={newWorkflow}><Plus size={14} /> New</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
      </div>
    </header>
  );
}
