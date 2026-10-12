import { create } from 'zustand';
import { createGraphSlice } from './graphSlice';
import { createHistorySlice } from './historySlice';
import { createUiSlice } from './uiSlice';
import { createValidationSlice } from './validationSlice';
import { createRunSlice } from './runSlice';

export const useStore = create((...a) => ({
  ...createGraphSlice(...a),
  ...createHistorySlice(...a),
  ...createUiSlice(...a),
  ...createValidationSlice(...a),
  ...createRunSlice(...a),
}));
