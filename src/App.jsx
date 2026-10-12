import { ReactFlowProvider } from '@xyflow/react';
import { useStore } from './store';
import { useAutosave } from './hooks/useAutosave';
import { useValidation } from './hooks/useValidation';
import { useShortcuts } from './hooks/useShortcuts';
import Rail from './components/toolbar/Rail';
import Toolbar from './components/toolbar/Toolbar';
import Palette from './components/panels/Palette';
import Inspector from './components/panels/Inspector';
import Drawer from './components/panels/Drawer';
import FlowCanvas from './components/canvas/FlowCanvas';
import History from './components/history/History';
import Modals from './components/ui/Modals';

function Shell() {
  const view = useStore((s) => s.view);
  useAutosave();
  useValidation();
  useShortcuts();

  return (
    <div className="fp-app">
      <Rail />
      <main className="fp-main">
        {view === 'editor' ? (
          <>
            <Toolbar />
            <div className="fp-body">
              <Palette />
              <div className="fp-center">
                <FlowCanvas />
                <Drawer />
              </div>
              <Inspector />
            </div>
          </>
        ) : (
          <History />
        )}
      </main>
      <Modals />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Shell />
    </ReactFlowProvider>
  );
}
