import { saveWorkflow } from '../utils/persist';

export const createUiSlice = (set, get) => ({
  view: 'editor', // 'editor' | 'history'
  modal: null, // 'templates' | 'shortcuts' | 'palette' | null
  drawerOpen: true,
  drawerTab: 'issues', // 'issues' | 'log'
  saveState: 'saved', // 'saved' | 'saving'
  savedAt: Date.now(),

  setView: (view) => set({ view }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  openDrawer: (tab) => set({ drawerOpen: true, drawerTab: tab }),
  setDrawerTab: (drawerTab) => set({ drawerTab }),

  saveNow: () => {
    const { workflowName, nodes, edges } = get();
    const at = saveWorkflow(workflowName, nodes, edges);
    set({ saveState: 'saved', savedAt: at ?? get().savedAt });
  },
});
