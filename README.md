# FlowPilot

A visual workflow automation builder. Drag steps onto a canvas, connect them, configure each one in a side panel, validate the graph, and run it in a simulator.

**Stack:** React 18 · JavaScript · React Flow (`@xyflow/react`) · Zustand · Vite · dagre

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Features

- 12 step types: Webhook, Schedule, Manual, API call, Send email, Set variable, Condition, Loop, Delay, Approval, Success, Fail
- Drag from the palette (or click to add), connect steps, side-panel configuration
- Live validation with red outlines on bad steps and connections; click an issue to jump to it
- Undo / redo, autosave to localStorage, copy / paste / duplicate, snap-to-grid, minimap, zoom controls
- Simulation: run, pause, step, stop, 1x/2x/5x speed, approval prompts, retries, loops, `{{variables}}`
- Templates, JSON import/export, auto layout, command palette (Ctrl+K)
- Execution history dashboard with KPIs and a duration chart

## Architecture

```
src/
  nodes/registry.js      one object per step type: look, form fields, validation, behaviour
  engine/
    validate.js          pure: graph -> issues
    simulate.js          pure runner: talks to the UI only through hooks
    graphUtils.js        layout (dagre), edge helpers, reachability
  store/                 Zustand slices: graph, history, ui, validation, run
  hooks/                 useAutosave, useValidation, useShortcuts
  components/            canvas, panels, toolbar, history, ui
  templates/             ready-made workflows
```

### Add a new step type

Add one `define('mykind', { ... })` call in `src/nodes/registry.js` with `label`, `category`, `icon`, `defaults`, `fields`, `summary`, optional `check`, and `execute`. The palette, inspector form, validation and simulator pick it up automatically.

### How undo works

`commit()` snapshots the graph *before* a change. Typing in a field passes a key so rapid edits merge into a single undo step; dragging commits once on drag start.

## Variables and conditions

Trigger payload fields become variables. Use `{{amount}}` in text fields. Conditions are JavaScript on `vars`, e.g. `vars.amount > 1000`.
