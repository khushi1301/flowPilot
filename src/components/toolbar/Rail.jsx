import { Workflow, History, LayoutTemplate, Keyboard, Command } from 'lucide-react';
import { useStore } from '../../store';

export default function Rail() {
  const view = useStore((s) => s.view);
  const { setView, openModal } = useStore.getState();
  const Item = ({ icon: Icon, label, active, onClick }) => (
    <button className={`rail-btn ${active ? 'active' : ''}`} onClick={onClick} title={label} aria-label={label}>
      <Icon size={18} /><span>{label}</span>
    </button>
  );
  return (
    <nav className="fp-rail">
      <div className="logo" aria-label="FlowPilot"><Workflow size={18} /></div>
      <Item icon={Workflow} label="Editor" active={view === 'editor'} onClick={() => setView('editor')} />
      <Item icon={History} label="History" active={view === 'history'} onClick={() => setView('history')} />
      <Item icon={LayoutTemplate} label="Templates" onClick={() => openModal('templates')} />
      <div className="spacer" />
      <Item icon={Command} label="Search" onClick={() => openModal('palette')} />
      <Item icon={Keyboard} label="Shortcuts" onClick={() => openModal('shortcuts')} />
    </nav>
  );
}
